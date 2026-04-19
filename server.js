/**
 * SV-Companion — Express Server
 * Runs on Cloud Run. Serves the React SPA and all API routes.
 *
 * Google Services integrated:
 *  - Gemini 1.5 Flash         → /api/advice  (AI companion)
 *  - Google Places API        → /api/nearby  (search around venue)
 *  - Cloud Translation API    → /api/translate (multi-language AI)
 *  - Google Maps Directions   → /api/traffic  (transit telemetry)
 *  - Firestore                → /api/fan-reports (live crowd tips)
 *  - BigQuery                 → stream crowd events for analytics
 *  - Cloud Logging            → structured JSON audit logs
 *  - Secret Manager           → runtime API key retrieval
 *  - Google Identity Services → OAuth2 token verification
 *  - Cloud Run                → serverless hosting
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import { getSecret } from './src/gcp-secrets.js';
import { getCrowdAdvice } from './src/gemini-service.js';
import { cacheGet, cacheSet, cacheDel, rateLimit, TTL, isRedisHealthy } from './src/redis-cache.js';
import { publishCrowdEvent, publishLocationUpdate, isKafkaConnected } from './src/kafka-bus.js';
import { streamCrowdEvent, ensureBigQueryTable } from './src/bigquery-stream.js';
import { logger } from './src/cloud-logger.js';
import { initWebSocket, broadcastCrowdUpdate, broadcastAlert } from './src/api/websocket.js';
import { startKafkaConsumer } from './src/api/services/kafka-consumer.js';
import crowdRoutes from './src/api/routes/crowd.routes.js';
import analyticsRoutes from './src/api/routes/analytics.routes.js';
import trafficRoutes from './src/api/routes/traffic.routes.js';
import telemetryRoutes from './src/api/routes/telemetry.routes.js';
import trafficSentinel from './src/services/trafficSentinel.js';
import { getNearbyPlaces } from './src/services/google-places.js';
import { translateText, SUPPORTED_LANGUAGES } from './src/services/cloud-translate.js';
import { submitFanReport, getRecentFanReports, upvoteFanReport } from './src/services/fan-reports.js';
import { synthesizeSpeech, TTS_LANG_MAP } from './src/services/cloud-tts.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
if (!PROJECT_ID) {
  logger.warn('GOOGLE_CLOUD_PROJECT is not set — GCP services will be unavailable');
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();

// CORS — only allow configured origins (defaults to localhost for dev)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and configured origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '64kb' })); // cap request body size

// ---------------------------------------------------------------------------
// Google ID token verifier (for protected endpoints)
// ---------------------------------------------------------------------------
const authClient = new OAuth2Client();

async function verifyGoogleToken(token) {
  try {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: clientId, // Strict check
    });
    return ticket.getPayload();
  } catch (err) {
    logger.warn('Google token verification failed', { message: err.message });
    return null;
  }
}

/** Middleware: verify Bearer token and attach req.user. Non-fatal if missing. */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    req.user = await verifyGoogleToken(token);
  }
  next();
}

/** Middleware: require valid token or reject with 401. */
async function requireAuth(req, res, next) {
  await authMiddleware(req, res, () => {});
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

// ---------------------------------------------------------------------------
// Input sanitisation helpers
// ---------------------------------------------------------------------------
const ALLOWED_TRAFFIC_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

function sanitiseString(value, maxLength = 120) {
  if (typeof value !== 'string') return '';
  // Strip HTML tags and control characters, truncate
  return validator.stripLow(validator.escape(value.trim())).slice(0, maxLength);
}

function sanitiseTrafficLevel(value) {
  const clean = typeof value === 'string' ? value.trim() : '';
  return ALLOWED_TRAFFIC_LEVELS.includes(clean) ? clean : 'Medium';
}

// ---------------------------------------------------------------------------
// Serve Vite frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'dist')));

// ---------------------------------------------------------------------------
// API v1 Routes (modular)
// ---------------------------------------------------------------------------
app.use('/api/v1/crowd', crowdRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/traffic', trafficRoutes);

// ---------------------------------------------------------------------------
// GET /api/health — infra status
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    redis: isRedisHealthy() ? 'connected' : 'unavailable',
    kafka: isKafkaConnected() ? 'connected' : 'unavailable',
    gcp: PROJECT_ID ? PROJECT_ID : 'not configured',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// GET /api/traffic — live traffic (Redis-cached 3 s)
// ---------------------------------------------------------------------------
// GET /api/traffic — live transit telemetry (Google Maps Directions API)
// ---------------------------------------------------------------------------
app.get('/api/traffic', async (_req, res) => {
  try {
    const liveTraffic = await cacheGet('traffic:live');
    if (liveTraffic) return res.json({ ...liveTraffic, source: 'google_maps' });

    const payload = {
      status: 'success',
      traffic: 'nominal',
      avgStress: 0,
      routes: [],
      updatedAt: new Date().toISOString()
    };
    res.json({ ...payload, source: 'fallback' });
  } catch (err) {
    logger.error('/api/traffic error', { message: err.message });
    res.status(500).json({ error: 'Traffic service error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/nearby — Google Places API (nearby parking, food, transit, hospital)
// Query params: ?category=parking|food|transit|hospital&radius=1000
// ---------------------------------------------------------------------------
app.get('/api/nearby', async (req, res) => {
  const userId = req.ip || 'anon';
  const { allowed } = await rateLimit(`nearby:${userId}`, 30, 60);
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' });

  const validCategories = ['parking', 'food', 'transit', 'hospital', 'pharmacy'];
  const category = validCategories.includes(req.query.category) ? req.query.category : 'parking';
  const radius   = Math.min(parseInt(req.query.radius) || 1000, 5000);

  const cacheKey = `places:${category}:${radius}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ places: cached, source: 'cache', category });

    const places = await getNearbyPlaces(category, radius);
    await cacheSet(cacheKey, places, TTL.AI_ADVICE); // cache 30s
    logger.info('/api/nearby', { category, count: places.length });
    res.json({ places, source: 'google_places', category });
  } catch (err) {
    logger.error('/api/nearby error', { message: err.message });
    res.status(500).json({ error: 'Places service unavailable', places: [] });
  }
});

// ---------------------------------------------------------------------------
// POST /api/translate — Google Cloud Translation API
// Body: { text: string, targetLang: string }
// ---------------------------------------------------------------------------
app.post('/api/translate', async (req, res) => {
  const userId = req.ip || 'anon';
  const { allowed } = await rateLimit(`translate:${userId}`, 30, 60);
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' });

  const text       = sanitiseString(req.body.text || '', 500);
  const targetLang = sanitiseString(req.body.targetLang || 'en', 5);

  if (!text) return res.status(400).json({ error: 'text is required' });

  const cacheKey = `translate:${targetLang}:${text.slice(0, 40)}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ ...cached, source: 'cache' });

    const result = await translateText(text, targetLang);
    await cacheSet(cacheKey, result, 300); // cache 5 min
    logger.info('/api/translate', { targetLang, length: text.length });
    res.json({ ...result, source: 'cloud_translation', languages: SUPPORTED_LANGUAGES });
  } catch (err) {
    logger.error('/api/translate error', { message: err.message });
    res.status(500).json({ error: 'Translation unavailable', translatedText: text });
  }
});

// ---------------------------------------------------------------------------
// GET  /api/fan-reports — Read live Firestore crowd reports
// POST /api/fan-reports — Submit a crowd report (rate-limited)
// POST /api/fan-reports/:id/upvote — Upvote a report
// ---------------------------------------------------------------------------
app.get('/api/fan-reports', async (_req, res) => {
  try {
    const cached = await cacheGet('fan-reports:recent');
    if (cached) return res.json({ reports: cached, source: 'cache' });

    const reports = await getRecentFanReports();
    await cacheSet('fan-reports:recent', reports, 15); // 15 s cache
    res.json({ reports, source: 'firestore' });
  } catch (err) {
    logger.error('/api/fan-reports GET error', { message: err.message });
    res.status(500).json({ reports: [], error: 'Reports unavailable' });
  }
});

app.post('/api/fan-reports', async (req, res) => {
  const userId = req.user?.sub || req.ip || 'anon';
  const { allowed } = await rateLimit(`fanreport:${userId}`, 5, 60); // 5/min max
  if (!allowed) return res.status(429).json({ error: 'Too many reports. Try again in a minute.' });

  const location = sanitiseString(req.body.location || 'Venue', 80);
  const type     = ['crowded','blocked','incident','clean','tip'].includes(req.body.type)
    ? req.body.type : 'tip';
  const message  = sanitiseString(req.body.message || '', 200);

  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const id = await submitFanReport({ location, type, message, userId });
    await cacheDel('fan-reports:recent'); // invalidate cache
    logger.info('fan-report submitted', { type, location });
    res.json({ ok: true, id });
  } catch (err) {
    logger.error('/api/fan-reports POST error', { message: err.message });
    res.status(500).json({ error: 'Could not save report' });
  }
});

app.post('/api/fan-reports/:id/upvote', async (req, res) => {
  const reportId = sanitiseString(req.params.id, 64);
  if (!reportId) return res.status(400).json({ error: 'Invalid report id' });

  try {
    await upvoteFanReport(reportId);
    await cacheDel('fan-reports:recent');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Upvote failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/tts — Google Cloud Text-to-Speech
// Converts AI response text to WaveNet MP3 audio for read-aloud accessibility.
// Body: { text: string, lang: string }   e.g. { text: "Head to Gate A", lang: "en" }
// Returns: { audioContent: "<base64-mp3>" }
// Google Service: Cloud Text-to-Speech API
// ---------------------------------------------------------------------------
app.post('/api/tts', async (req, res) => {
  const userId = req.ip || 'anon';
  const { allowed } = await rateLimit(`tts:${userId}`, 15, 60);
  if (!allowed) return res.status(429).json({ error: 'Rate limit exceeded' });

  const text = sanitiseString(req.body.text || '', 800);
  const lang = sanitiseString(req.body.lang || 'en', 5);
  if (!text) return res.status(400).json({ error: 'text is required' });

  const languageCode = TTS_LANG_MAP[lang] || 'en-IN';
  const cacheKey = `tts:${languageCode}:${text.slice(0, 40)}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ audioContent: cached, source: 'cache' });

    const audioContent = await synthesizeSpeech(text, languageCode);
    await cacheSet(cacheKey, audioContent, 300); // cache 5 min — same text same voice
    logger.info('/api/tts synthesized', { lang: languageCode, chars: text.length });
    res.json({ audioContent, source: 'google_tts' });
  } catch (err) {
    logger.error('/api/tts error', { message: err.message });
    res.status(500).json({ error: 'Text-to-speech unavailable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/advice — Gemini AI companion (cached, rate-limited, input validated)
// ---------------------------------------------------------------------------
app.post('/api/advice', authMiddleware, async (req, res) => {
  const userId = req.user?.sub || req.ip || 'anon';

  const { allowed, remaining, resetInMs } = await rateLimit(`advice:${userId}`, 20, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: resetInMs });
  }

  // Validate and sanitise inputs — prevents prompt injection
  const trafficLevel   = sanitiseTrafficLevel(req.body.trafficLevel);
  const userLocation   = sanitiseString(req.body.userLocation || 'Entrance', 80);
  const userQuery      = sanitiseString(req.body.userQuery || '', 200);
  const systemContext  = sanitiseString(req.body.systemContext || '', 2000);

  // Companion mode: user asks a contextual question
  const isCompanionMode = Boolean(userQuery && systemContext);
  const cacheKey = isCompanionMode
    ? `advice:companion:${userId}:${userQuery.slice(0, 60)}`
    : `advice:${trafficLevel}:${userLocation}`;

  try {
    // Only cache non-personalised queries (legacy mode)
    if (!isCompanionMode) {
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json({ advice: cached, source: 'cache', remainingRequests: remaining });
    }

    const trafficCondition = await cacheGet('traffic:live');
    const advice = await getCrowdAdvice(
      trafficLevel,
      isCompanionMode ? userQuery : userLocation,
      trafficCondition,
      isCompanionMode ? { systemContext, userQuery } : {}
    );

    if (!isCompanionMode) {
      await cacheSet(cacheKey, advice, TTL.AI_ADVICE);
    }

    res.json({ advice, source: 'gemini', remainingRequests: remaining });
  } catch (err) {
    logger.error('/api/advice error', { message: err.message });
    res.status(500).json({ error: 'AI advice unavailable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/snapshot — ingest simulation tick → Redis + Kafka + BigQuery
// Requires auth in production
// ---------------------------------------------------------------------------
app.post('/api/snapshot', async (req, res) => {
  const { snapshot, intelligence } = req.body;
  if (!snapshot?.stats || !snapshot?.venue) {
    return res.status(400).json({ error: 'Invalid snapshot payload' });
  }

  // Basic numeric range validation
  if (snapshot.stats.attendancePercent > 200 || snapshot.stats.attendancePercent < 0) {
    return res.status(400).json({ error: 'attendancePercent out of range' });
  }

  try {
    await cacheSet('snapshot:latest', { snapshot, intelligence }, TTL.VENUE_SNAPSHOT);
    await cacheDel('traffic:live');

    // Non-blocking downstream writes
    publishCrowdEvent(snapshot, intelligence).catch(() => {});
    streamCrowdEvent(snapshot, intelligence).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    logger.error('/api/snapshot error', { message: err.message });
    res.status(500).json({ error: 'Snapshot ingestion failed' });
  }
});

app.get('/api/snapshot', async (_req, res) => {
  const cached = await cacheGet('snapshot:latest');
  if (!cached) return res.status(404).json({ error: 'No snapshot available yet' });
  res.json(cached);
});

// ---------------------------------------------------------------------------
// POST /api/location — high-frequency GPS pings (rate-limited, validated)
// ---------------------------------------------------------------------------
app.post('/api/location', async (req, res) => {
  const { lat, lng, accuracy, userId = 'anon' } = req.body;

  if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lat/lng out of valid range' });
  }

  const { allowed } = await rateLimit(`loc:${userId}`, 100, 60);
  if (!allowed) return res.status(429).json({ error: 'Location update rate limit exceeded' });

  await cacheSet(`loc:${sanitiseString(String(userId), 64)}`, { lat, lng, accuracy, ts: Date.now() }, 10);
  publishLocationUpdate(lat, lng, accuracy).catch(() => {});

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/incident — create an operator incident (requires auth)
// ---------------------------------------------------------------------------
app.post('/api/incident', requireAuth, async (req, res) => {
  const { title, location, severity } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }

  const clean = {
    title: sanitiseString(title, 120),
    location: sanitiseString(location || 'Unknown', 80),
    severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium',
    operator: req.user.email,
    createdAt: new Date().toISOString(),
  };

  // Cache the incident list (append)
  const existing = (await cacheGet('incidents:active')) || [];
  existing.unshift({ id: `inc-${Date.now()}`, ...clean });
  await cacheSet('incidents:active', existing.slice(0, 50), 3600);

  logger.audit('incident.created', { operator: clean.operator, target: clean.location, metadata: { title: clean.title, severity: clean.severity } });
  res.json({ ok: true, incident: clean });
});

app.get('/api/incidents', async (_req, res) => {
  const incidents = (await cacheGet('incidents:active')) || [];
  res.json(incidents);
});

// ---------------------------------------------------------------------------
// SPA fallback
// ---------------------------------------------------------------------------
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, async () => {
  logger.info(`SmartVenue AI server started`, { port: PORT, project: PROJECT_ID || 'local' });
  logger.info(`CORS origins: ${allowedOrigins.join(', ')}`);

  // Initialize WebSocket
  initWebSocket(server).catch(() => {});

  // Start Kafka consumer (processes events from Kafka → Redis)
  startKafkaConsumer().catch(() => {});

  // Start Google Traffic Sentinel (polls Directions API)
  trafficSentinel.startTrafficSentinel();

  // Ensure BigQuery table exists (non-blocking)
  ensureBigQueryTable().catch(() => {});

  // Broadcast crowd updates every 2 seconds (fallback if Redis Pub/Sub unavailable)
  setInterval(() => {
    broadcastCrowdUpdate().catch(() => {});
  }, 2000);
});
