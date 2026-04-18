/**
 * Simulation Control Routes
 * POST /api/v1/simulation/start  — start simulation
 * POST /api/v1/simulation/stop   — stop simulation
 * POST /api/v1/simulation/reset  — reset to initial state
 * GET  /api/v1/simulation/status — get current status
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

// Simulation state machine: IDLE → SIMULATING → ALERT → CRITICAL
const STATES = {
  IDLE: 'IDLE',
  SIMULATING: 'SIMULATING',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
};

/**
 * GET /api/v1/simulation/status
 * Returns current simulation state
 */
router.get('/status', async (req, res) => {
  try {
    const status = await cacheGet('simulation:status') || {
      state: STATES.IDLE,
      startedAt: null,
      crowdSize: 0,
      speed: 1,
    };
    res.json(status);
  } catch (err) {
    logger.error('GET /simulation/status error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch simulation status' });
  }
});

/**
 * POST /api/v1/simulation/start
 * Start the simulation
 * Body: { crowdSize?: number, speed?: number }
 */
router.post('/start', async (req, res) => {
  try {
    const { crowdSize = 200, speed = 1 } = req.body;

    // Validate inputs
    if (crowdSize < 10 || crowdSize > 5000) {
      return res.status(400).json({ error: 'crowdSize must be 10-5000' });
    }
    if (speed < 0.1 || speed > 5) {
      return res.status(400).json({ error: 'speed must be 0.1-5' });
    }

    const status = {
      state: STATES.SIMULATING,
      startedAt: new Date().toISOString(),
      crowdSize,
      speed,
    };

    await cacheSet('simulation:status', status, TTL.SESSION);
    logger.info('Simulation started', { crowdSize, speed });

    res.json({ ok: true, status });
  } catch (err) {
    logger.error('POST /simulation/start error', { message: err.message });
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});

/**
 * POST /api/v1/simulation/stop
 * Stop the simulation
 */
router.post('/stop', async (req, res) => {
  try {
    const status = {
      state: STATES.IDLE,
      startedAt: null,
      crowdSize: 0,
      speed: 1,
    };

    await cacheSet('simulation:status', status, TTL.SESSION);
    logger.info('Simulation stopped');

    res.json({ ok: true, status });
  } catch (err) {
    logger.error('POST /simulation/stop error', { message: err.message });
    res.status(500).json({ error: 'Failed to stop simulation' });
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
