/**
 * Alerts System Routes
 * GET    /api/v1/alerts       — list all active alerts
 * POST   /api/v1/alerts       — create alert
 * DELETE /api/v1/alerts/:id   — dismiss alert
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

/**
 * GET /api/v1/alerts
 * Returns all active alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await cacheGet('alerts:active') || [];
    res.json({ alerts, count: alerts.length });
  } catch (err) {
    logger.error('GET /alerts error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/v1/alerts
 * Create a new alert
 * Body: { type, zone, severity, message }
 */
router.post('/', async (req, res) => {
  try {
    const { type, zone, severity, message } = req.body;

    // Validate inputs
    if (!['OVERCROWDING', 'EVACUATION', 'BOTTLENECK', 'SYSTEM'].includes(type)) {
      return res.status(400).json({ error: 'invalid alert type' });
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      return res.status(400).json({ error: 'invalid severity' });
    }

    const alert = {
      id: `alert-${Date.now()}`,
      type,
      zone: zone || 'SYSTEM',
      severity,
      message: message || '',
      createdAt: new Date().toISOString(),
      dismissed: false,
    };

    // Add to active alerts
    const alerts = await cacheGet('alerts:active') || [];
    alerts.unshift(alert);
    await cacheSet('alerts:active', alerts.slice(0, 100), TTL.SESSION);

    logger.info('Alert created', { type, zone, severity });
    res.json({ ok: true, alert });
  } catch (err) {
    logger.error('POST /alerts error', { message: err.message });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * DELETE /api/v1/alerts/:id
 * Dismiss an alert
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alerts = await cacheGet('alerts:active') || [];
    
    const filtered = alerts.filter(a => a.id !== id);
    await cacheSet('alerts:active', filtered, TTL.SESSION);

    logger.info('Alert dismissed', { alertId: id });
    res.json({ ok: true });
  } catch (err) {
    logger.error('DELETE /alerts/:id error', { message: err.message });
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

export default router;
