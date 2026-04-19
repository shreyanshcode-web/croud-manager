/**
 * Telemetry Sync & Control Routes
 * POST /api/v1/telemetry/start  — start data ingestion
 * POST /api/v1/telemetry/stop   — stop ingestion
 * POST /api/v1/telemetry/reset  — reset state
 * GET  /api/v1/telemetry/status — get sync status
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

// Synchronisation states
const STATES = {
  IDLE: 'IDLE',
  ACTIVE: 'ACTIVE',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
};

/**
 * GET /api/v1/telemetry/status
 * Returns current sync state
 */
router.get('/status', async (req, res) => {
  try {
    const status = await cacheGet('telemetry:status') || {
      state: STATES.IDLE,
      startedAt: null,
      load: 0,
      syncRate: 1,
    };
    res.json(status);
  } catch (err) {
    logger.error('GET /telemetry/status error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch telemetry status' });
  }
});

/**
 * POST /api/v1/telemetry/start
 * Start telemetry ingest
 */
router.post('/start', async (req, res) => {
  try {
    const { load = 200, syncRate = 1 } = req.body;

    const status = {
      state: STATES.ACTIVE,
      startedAt: new Date().toISOString(),
      load,
      syncRate,
    };

    await cacheSet('telemetry:status', status, TTL.SESSION);
    logger.info('Telemetry sync started');

    res.json({ ok: true, status });
  } catch (err) {
    logger.error('POST /telemetry/start error', { message: err.message });
    res.status(500).json({ error: 'Failed to start legacy sync' });
  }
});

/**
 * POST /api/v1/telemetry/stop
 */
router.post('/stop', async (req, res) => {
  try {
    const status = {
      state: STATES.IDLE,
      startedAt: null,
      load: 0,
      syncRate: 1,
    };

    await cacheSet('telemetry:status', status, TTL.SESSION);
    res.json({ ok: true, status });
  } catch (err) {
    logger.error('POST /telemetry/stop error', { message: err.message });
    res.status(500).json({ error: 'Failed to halt sync' });
  }
});

/**
 * POST /api/v1/simulation/reset
 * Reset simulation to initial state
 */
router.post('/reset', async (req, res) => {
  try {
    const status = {
      state: STATES.IDLE,
      startedAt: null,
      crowdSize: 0,
      speed: 1,
    };

    await cacheSet('simulation:status', status, TTL.SESSION);
    logger.info('Simulation reset');

    res.json({ ok: true, status });
  } catch (err) {
    logger.error('POST /simulation/reset error', { message: err.message });
    res.status(500).json({ error: 'Failed to reset simulation' });
  }
});

export default router;
