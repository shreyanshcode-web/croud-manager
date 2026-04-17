import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecret } from './src/gcp-secrets.js';
import { getCrowdAdvice } from './src/gemini-service.js';
import { cacheGet, cacheSet, cacheDel, rateLimit, TTL, isRedisHealthy } from './src/redis-cache.js';
import { publishCrowdEvent, publishLocationUpdate, isKafkaConnected, TOPICS } from './src/kafka-bus.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve Vite frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// ---------------------------------------------------------------------------
// GET /api/health — infra status for ops dashboards and GCP uptime checks
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    redis: isRedisHealthy() ? 'connected' : 'unavailable',
    kafka: isKafkaConnected() ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// GET /api/traffic — live traffic stub (Redis-cached 3 s)
// ---------------------------------------------------------------------------
app.get('/api/traffic', async (_req, res) => {
  try {
    const cached = await cacheGet('traffic:live');
    if (cached) return res.json({ ...cached, source: 'cache' });

    const payload = { status: 'success', traffic: 'high', updatedAt: new Date().toISOString() };
    await cacheSet('traffic:live', payload, TTL.VENUE_SNAPSHOT);
    res.json({ ...payload, source: 'live' });
  } catch (err) {
    res.status(500).json({ error: 'Traffic service error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/advice — Gemini AI crowd advice (Redis-cached 30 s, rate-limited)
// ---------------------------------------------------------------------------
app.post('/api/advice', async (req, res) => {
  const { trafficLevel = 'Medium', userLocation = 'Entrance', userId = 'anon' } = req.body;

  // Rate limit: 20 requests per minute per userId
  const { allowed, remaining, resetInMs } = await rateLimit(`advice:${userId}`, 20, 60);
  if (!allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfterMs: resetInMs,
    });
  }

  const cacheKey = `advice:${trafficLevel}:${userLocation}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json({ advice: cached, source: 'cache', remainingRequests: remaining });
    }

    const advice = await getCrowdAdvice(trafficLevel, userLocation);
    await cacheSet(cacheKey, advice, TTL.AI_ADVICE);
    res.json({ advice, source: 'gemini', remainingRequests: remaining });
  } catch (err) {
    res.status(500).json({ error: 'AI Advice unavailable' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/snapshot — receive simulation tick, publish to Kafka + cache in Redis
// Body: { snapshot, intelligence }
// ---------------------------------------------------------------------------
app.post('/api/snapshot', async (req, res) => {
  const { snapshot, intelligence } = req.body;
  if (!snapshot) return res.status(400).json({ error: 'snapshot required' });

  try {
    // Cache the latest snapshot so /api/snapshot GET can serve it instantly
    await cacheSet('snapshot:latest', { snapshot, intelligence }, TTL.VENUE_SNAPSHOT);

    // Publish to Kafka asynchronously — don't await so response is instant
    publishCrowdEvent(snapshot, intelligence).catch(() => {});

    // Invalidate the traffic cache so next poll gets fresh data
    await cacheDel('traffic:live');

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Snapshot ingestion failed' });
  }
});

// GET /api/snapshot — serve latest cached snapshot to any connected client
app.get('/api/snapshot', async (_req, res) => {
  const cached = await cacheGet('snapshot:latest');
  if (!cached) return res.status(404).json({ error: 'No snapshot available yet' });
  res.json(cached);
});

// ---------------------------------------------------------------------------
// POST /api/location — receive high-frequency GPS pings from the frontend
// Body: { lat, lng, accuracy, userId }
// Rate-limited to 100 pings/min per user (40 ms * 1500 = comfortable headroom)
// ---------------------------------------------------------------------------
app.post('/api/location', async (req, res) => {
  const { lat, lng, accuracy, userId = 'anon' } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });

  const { allowed } = await rateLimit(`loc:${userId}`, 100, 60);
  if (!allowed) return res.status(429).json({ error: 'Location update rate limit exceeded' });

  // Cache the latest location for this user (useful for server-side proximity checks)
  await cacheSet(`loc:${userId}`, { lat, lng, accuracy, ts: Date.now() }, 10);

  // Publish to Kafka — fire and forget
  publishLocationUpdate(lat, lng, accuracy).catch(() => {});

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// React SPA fallback — Express v5 wildcard syntax
// ---------------------------------------------------------------------------
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SmartVenue AI server on :${PORT}`);
  console.log(`  Redis  : ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
  console.log(`  Kafka  : ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
});
