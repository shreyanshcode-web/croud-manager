/**
 * Crowd Data Routes
 * GET  /api/v1/crowd           — all zones
 * GET  /api/v1/crowd/:zoneId   — specific zone
 * POST /api/v1/crowd/update    — ingest crowd data
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { publishCrowdEvent } from '../../kafka-bus.js';
import { streamCrowdEvent } from '../../bigquery-stream.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

/**
 * GET /api/v1/crowd
 * Returns all zones with current crowd data
 */
router.get('/', async (req, res) => {
  try {
    const crowdData = await cacheGet('crowd:all') || {
      zones: [],
      lastUpdate: new Date().toISOString(),
    };
    res.json(crowdData);
  } catch (err) {
    logger.error('GET /crowd error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch crowd data' });
  }
});

/**
 * GET /api/v1/crowd/:zoneId
 * Returns specific zone crowd data
 */
router.get('/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;
    const zoneData = await cacheGet(`crowd:zone:${zoneId}`);
    
    if (!zoneData) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    res.json(zoneData);
  } catch (err) {
    logger.error(`GET /crowd/:zoneId error`, { message: err.message });
    res.status(500).json({ error: 'Failed to fetch zone data' });
  }
});

/**
 * POST /api/v1/crowd/update
 * Ingest crowd data from simulation or sensors
 * Body: { zoneId, density, risk, flowRate, peopleCount }
 */
router.post('/update', async (req, res) => {
  try {
    const { zoneId, density, risk, flowRate, peopleCount } = req.body;

    // Validate inputs
    if (!zoneId || typeof zoneId !== 'string') {
      return res.status(400).json({ error: 'zoneId is required' });
    }
    if (density == null || density < 0 || density > 100) {
      return res.status(400).json({ error: 'density must be 0-100' });
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(risk)) {
      return res.status(400).json({ error: 'invalid risk level' });
    }

    const crowdUpdate = {
      zoneId,
      density: Math.round(density),
      risk,
      flowRate: Math.round(flowRate || 0),
      peopleCount: Math.round(peopleCount || 0),
      timestamp: new Date().toISOString(),
    };

    // Cache zone data
    await cacheSet(`crowd:zone:${zoneId}`, crowdUpdate, TTL.VENUE_SNAPSHOT);

    // Publish to Kafka (non-blocking)
    publishCrowdEvent(crowdUpdate).catch(() => {});

    // Stream to BigQuery (non-blocking)
    streamCrowdEvent(crowdUpdate).catch(() => {});

    res.json({ ok: true, data: crowdUpdate });
  } catch (err) {
    logger.error('POST /crowd/update error', { message: err.message });
    res.status(500).json({ error: 'Failed to update crowd data' });
  }
});

export default router;
