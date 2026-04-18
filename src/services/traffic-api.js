/**
 * Traffic API Service
 * Frontend client for traffic-based density endpoints
 */
import API from './api.js';

/**
 * Get traffic-derived density for a zone
 */
export const getTrafficDensity = (zoneId, simulationDensity = 50, useCache = true) =>
  API.get(`/traffic/density/${zoneId}`, {
    params: {
      simulation_density: simulationDensity,
      use_cache: useCache,
    },
  });

/**
 * Get traffic densities for multiple zones
 */
export const getMultipleTrafficDensities = (zones, simulationDensities = {}) =>
  API.post('/traffic/zones', {
    zones,
    simulation_densities: simulationDensities,
  });

/**
 * Get time-based density estimate (fallback)
 */
export const estimateDensity = (zoneId) =>
  API.get(`/traffic/estimate/${zoneId}`);

/**
 * Compare traffic vs simulation density
 */
export const compareDensities = (zoneId) =>
  API.get(`/traffic/comparison/${zoneId}`);

export default {
  getTrafficDensity,
  getMultipleTrafficDensities,
  estimateDensity,
  compareDensities,
};
