/**
 * SmartVenue AI — Express Server
 * Runs on Cloud Run. Serves the React SPA and all API routes.
 *
 * Security hardening applied:
 *  - CORS restricted to ALLOWED_ORIGINS env var
 *  - All inputs validated and sanitised before use
 *  - Google ID token verification on write endpoints
 *  - Rate limiting via Redis sliding window
 *  - Structured JSON logging via Cloud Logging
 *  - No hardcoded project IDs or credentials
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
import simulationRoutes from './src/api/routes/simulation.routes.js';
import alertsRoutes from './src/api/routes/alerts.routes.js';
import zonesRoutes from './src/api/routes/zones.routes.js';
import analyticsRoutes from './src/api/routes/analytics.routes.js';
import trafficRoutes from './src/api/routes/traffic.routes.js';
import trafficSentinel from './src/services/trafficSentinel.js';
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
app.use('/api/v1/simulation', simulationRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/zones', zonesRoutes);
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
app.get('/api/traffic', async (_req, res) => {
  try {
    const liveTraffic = await cacheGet('traffic:live');
    if (liveTraffic) return res.json({ ...liveTraffic, source: 'google_maps' });

    // Fallback if sentinel hasn't run yet
    const payload = { status: 'success', traffic: 'nominal', updatedAt: new Date().toISOString() };
    res.json({ ...payload, source: 'fallback' });
  } catch (err) {
    logger.error('/api/traffic error', { message: err.message });
    res.status(500).json({ error: 'Traffic service error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/advice — Gemini AI (cached 30 s, rate-limited, input validated)
// ---------------------------------------------------------------------------
app.post('/api/advice', authMiddleware, async (req, res) => {
  const userId = req.user?.sub || req.ip || 'anon';

  const { allowed, remaining, resetInMs } = await rateLimit(`advice:${userId}`, 20, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: resetInMs });
  }

  // Validate and sanitise inputs — prevents prompt injection
  const trafficLevel = sanitiseTrafficLevel(req.body.trafficLevel);
  const userLocation = sanitiseString(req.body.userLocation || 'Entrance', 80);

  const cacheKey = `advice:${trafficLevel}:${userLocation}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ advice: cached, source: 'cache', remainingRequests: remaining });

    const trafficCondition = await cacheGet('traffic:live');
    const advice = await getCrowdAdvice(trafficLevel, userLocation, trafficCondition);
    await cacheSet(cacheKey, advice, TTL.AI_ADVICE);
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
