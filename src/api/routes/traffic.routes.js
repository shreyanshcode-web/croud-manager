/**
 * Traffic-Based Density Routes
 * GET  /api/v1/traffic/density/:zoneId  — Get traffic-derived density
 * POST /api/v1/traffic/zones            — Get density for multiple zones
 */
import express from 'express';
import { getZoneTrafficDensity, getMultipleZonesTrafficDensity, estimateDensityFromTimeOfDay } from '../../services/google-maps-traffic.js';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

const router = express.Router();

/**
 * GET /api/v1/traffic/density/:zoneId
 * Get traffic-derived crowd density for a specific zone
 * 
 * Query params:
 * - simulation_density: override simulation density (default: 50)
 * - use_cache: use cached data if available (default: true)
 */
router.get('/density/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { simulation_density = 50, use_cache = 'true' } = req.query;

    // Check cache first
    if (use_cache === 'true') {
      const cached = await cacheGet(`traffic:density:${zoneId}`);
      if (cached) {
        return res.json({ ...cached, source: 'cache' });
      }
    }

    // Get zone configuration
    const zones = await cacheGet('zones:all') || [];
    const zone = zones.find(z => z.id === zoneId);

    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Get previous density for spike detection
    const previousDensity = (await cacheGet(`crowd:zone:${zoneId}`))?.density || null;

    // Get traffic-derived density
    const result = await getZoneTrafficDensity(
      zone,
      Number(simulation_density),
      previousDensity
    );

    // Cache the result
    await cacheSet(`traffic:density:${zoneId}`, result, TTL.VENUE_SNAPSHOT);

    logger.debug('Traffic density calculated', { zoneId, density: result.density, risk: result.risk });
    res.json(result);
  } catch (err) {
    logger.error('GET /traffic/density/:zoneId error', { message: err.message });
    res.status(500).json({ error: 'Failed to calculate traffic density' });
  }
});

/**
 * POST /api/v1/traffic/zones
 * Get traffic-derived density for multiple zones
 * 
 * Body: {
 *   zones: [
 *     { id: 'downtown', origin: '40.7128,-74.0060', destination: '40.7580,-73.9855', type: 'mall' },
 *     { id: 'airport', origin: '40.7769,-73.8740', destination: '40.7128,-74.0060', type: 'transit' }
 *   ],
 *   simulation_densities: { downtown: 60, airport: 45 }
 * }
 */
router.post('/zones', async (req, res) => {
  try {
    const { zones, simulation_densities = {} } = req.body;

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return res.status(400).json({ error: 'zones array is required' });
    }

    // Get previous densities for spike detection
    const previousDensities = {};
    for (const zone of zones) {
      const cached = await cacheGet(`crowd:zone:${zone.id}`);
      if (cached) {
        previousDensities[zone.id] = cached.density;
      }
    }

    // Get traffic densities for all zones
    const results = await getMultipleZonesTrafficDensity(
      zones,
      simulation_densities,
      previousDensities
    );

    // Cache results
    for (const result of results) {
      await cacheSet(`traffic:density:${result.zoneId}`, result, TTL.VENUE_SNAPSHOT);
    }

    logger.debug('Traffic densities calculated', { count: results.length });
    res.json({ zones: results, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('POST /traffic/zones error', { message: err.message });
    res.status(500).json({ error: 'Failed to calculate traffic densities' });
  }
});

/**
 * GET /api/v1/traffic/estimate/:zoneId
 * Estimate density based on time of day (fallback when traffic API unavailable)
 */
router.get('/estimate/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;

    const estimatedDensity = estimateDensityFromTimeOfDay();

    const result = {
      zoneId,
      density: estimatedDensity,
      risk: estimatedDensity > 80 ? 'CRITICAL' : estimatedDensity > 60 ? 'HIGH' : 'MEDIUM',
      source: 'time-based-estimate',
      timestamp: new Date().toISOString(),
    };

    res.json(result);
  } catch (err) {
    logger.error('GET /traffic/estimate/:zoneId error', { message: err.message });
    res.status(500).json({ error: 'Failed to estimate density' });
  }
});

/**
 * GET /api/v1/traffic/comparison/:zoneId
 * Compare traffic-derived vs simulation density
 * Useful for debugging and understanding the hybrid model
 */
router.get('/comparison/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Get traffic-derived density
    const trafficDensity = await cacheGet(`traffic:density:${zoneId}`);

    // Get simulation density
    const simulationData = await cacheGet(`crowd:zone:${zoneId}`);

    if (!trafficDensity && !simulationData) {
      return res.status(404).json({ error: 'No data available for zone' });
    }

    res.json({
      zoneId,
      traffic: trafficDensity || { density: null, source: 'unavailable' },
      simulation: simulationData || { density: null, source: 'unavailable' },
      comparison: {
        trafficDensity: trafficDensity?.density || null,
        simulationDensity: simulationData?.density || null,
        difference: trafficDensity && simulationData ? Math.abs(trafficDensity.density - simulationData.density) : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('GET /traffic/comparison/:zoneId error', { message: err.message });
    res.status(500).json({ error: 'Failed to compare densities' });
  }
});

export default router;
