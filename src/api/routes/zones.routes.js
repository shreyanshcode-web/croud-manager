/**
 * Zones Management Routes
 * GET    /api/v1/zones       — list all zones
 * POST   /api/v1/zones       — create zone
 * PUT    /api/v1/zones/:id   — update zone
 * DELETE /api/v1/zones/:id   — delete zone
 */
import express from 'express';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

/**
 * GET /api/v1/zones
 * Returns all zones
 */
router.get('/', async (req, res) => {
  try {
    const zones = await cacheGet('zones:all') || [];
    res.json({ zones, count: zones.length });
  } catch (err) {
    logger.error('GET /zones error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * POST /api/v1/zones
 * Create a new zone
 * Body: { name, capacity, location }
 */
router.post('/', async (req, res) => {
  try {
    const { name, capacity, location } = req.body;

    // Validate inputs
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (capacity == null || capacity < 10 || capacity > 100000) {
      return res.status(400).json({ error: 'capacity must be 10-100000' });
    }

    const zone = {
      id: `zone-${Date.now()}`,
      name: name.slice(0, 100),
      capacity,
      location: location || 'Unknown',
      createdAt: new Date().toISOString(),
      density: 0,
      risk: 'LOW',
    };

    // Add to zones list
    const zones = await cacheGet('zones:all') || [];
    zones.push(zone);
    await cacheSet('zones:all', zones, TTL.SESSION);

    logger.info('Zone created', { zoneId: zone.id, name: zone.name, capacity });
    res.json({ ok: true, zone });
  } catch (err) {
    logger.error('POST /zones error', { message: err.message });
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

/**
 * PUT /api/v1/zones/:id
 * Update a zone
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity, location } = req.body;

    const zones = await cacheGet('zones:all') || [];
    const zoneIndex = zones.findIndex(z => z.id === id);

    if (zoneIndex === -1) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Update fields
    if (name) zones[zoneIndex].name = name.slice(0, 100);
    if (capacity) zones[zoneIndex].capacity = capacity;
    if (location) zones[zoneIndex].location = location;

    await cacheSet('zones:all', zones, TTL.SESSION);

    logger.info('Zone updated', { zoneId: id });
    res.json({ ok: true, zone: zones[zoneIndex] });
  } catch (err) {
    logger.error('PUT /zones/:id error', { message: err.message });
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

/**
 * DELETE /api/v1/zones/:id
 * Delete a zone
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const zones = await cacheGet('zones:all') || [];
    
    const filtered = zones.filter(z => z.id !== id);
    await cacheSet('zones:all', filtered, TTL.SESSION);

    logger.info('Zone deleted', { zoneId: id });
    res.json({ ok: true });
  } catch (err) {
    logger.error('DELETE /zones/:id error', { message: err.message });
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

export default router;
