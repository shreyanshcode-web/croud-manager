/**
 * Analytics Routes
 * GET /api/v1/analytics/summary  — overall stats
 * GET /api/v1/analytics/history  — historical data for zone
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

/**
 * GET /api/v1/analytics/summary
 * Returns overall system analytics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await cacheGet('analytics:summary') || {
      totalPeople: 0,
      avgDensity: 0,
      peakDensity: 0,
      alertsTriggered: 0,
      uptime: '100%',
      timestamp: new Date().toISOString(),
    };
    res.json(summary);
  } catch (err) {
    logger.error('GET /analytics/summary error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/v1/analytics/history?zoneId=A1
 * Returns historical data for a specific zone
 */
router.get('/history', async (req, res) => {
  try {
    const { zoneId } = req.query;

    if (!zoneId) {
      return res.status(400).json({ error: 'zoneId query parameter is required' });
    }

    const history = await cacheGet(`analytics:history:${zoneId}`) || {
      zoneId,
      dataPoints: [],
      averageDensity: 0,
      peakDensity: 0,
      minDensity: 0,
    };

    res.json(history);
  } catch (err) {
    logger.error('GET /analytics/history error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
