/**
 * Google Maps Traffic Integration
 * Fetches real-time traffic data and converts to crowd density
 * 
 * Uses Google Maps Directions API with traffic_model=best_guess
 * This gives us duration_in_traffic vs normal duration
 */

import { convertTrafficToDensity } from './traffic-converter.js';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Fetch traffic data between two points using Google Directions API
 * 
 * Returns: {
 *   duration: 400,              // normal duration in seconds
 *   duration_in_traffic: 600,   // current duration in traffic
 *   distance: 15000,            // distance in meters
 *   status: 'OK'
 * }
 */
export async function getTrafficData(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('GOOGLE_MAPS_API_KEY not set — traffic data unavailable');
    return null;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.append('origin', origin);
    url.searchParams.append('destination', destination);
    url.searchParams.append('departure_time', 'now');
    url.searchParams.append('traffic_model', 'best_guess');
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('Google Maps API error:', data.status);
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      duration: leg.duration.value,                    // seconds
      duration_in_traffic: leg.duration_in_traffic.value, // seconds
      distance: leg.distance.value,                    // meters
      status: 'OK',
    };
  } catch (err) {
    console.error('Failed to fetch traffic data:', err.message);
    return null;
  }
}

/**
 * Get traffic density for a zone
 * 
 * Zone config: {
 *   id: 'downtown',
 *   name: 'Downtown',
 *   origin: '40.7128,-74.0060',      // lat,lng
 *   destination: '40.7580,-73.9855', // lat,lng
 *   type: 'mall',
 *   capacity: 5000,
 * }
 */
export async function getZoneTrafficDensity(zone, simulationDensity = 50, previousDensity = null) {
  const trafficData = await getTrafficData(zone.origin, zone.destination);

  if (!trafficData) {
    return {
      zoneId: zone.id,
      density: simulationDensity,
      risk: 'MEDIUM',
      source: 'simulation-only',
      message: 'Traffic data unavailable, using simulation',
    };
  }

  const result = convertTrafficToDensity({
    trafficDuration: trafficData.duration_in_traffic,
    normalDuration: trafficData.duration,
    simulationDensity,
    eventBoost: 0,
    zoneType: zone.type,
    previousDensity,
  });

  return {
    zoneId: zone.id,
    ...result,
    source: 'traffic-derived',
    trafficData,
  };
}

/**
 * Get traffic density for multiple zones
 * Fetches in parallel for performance
 */
export async function getMultipleZonesTrafficDensity(zones, simulationDensities = {}, previousDensities = {}) {
  const promises = zones.map(zone =>
    getZoneTrafficDensity(
      zone,
      simulationDensities[zone.id] || 50,
      previousDensities[zone.id] || null
    )
  );

  return Promise.all(promises);
}

/**
 * Estimate crowd density from traffic patterns
 * Used when exact traffic data is unavailable
 * 
 * This is a fallback heuristic based on time of day
 */
export function estimateDensityFromTimeOfDay() {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  // Weekday vs weekend
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Time-based baseline
  let baseline = 30;

  if (isWeekend) {
    // Weekend patterns
    if (hour >= 10 && hour <= 14) baseline = 75; // Lunch rush
    if (hour >= 14 && hour <= 18) baseline = 80; // Afternoon peak
    if (hour >= 18 && hour <= 21) baseline = 70; // Evening
  } else {
    // Weekday patterns
    if (hour >= 6 && hour <= 9) baseline = 85;   // Morning rush
    if (hour >= 12 && hour <= 13) baseline = 70; // Lunch
    if (hour >= 17 && hour <= 19) baseline = 90; // Evening rush
  }

  // Add random variation (±10%)
  const variation = (Math.random() - 0.5) * 20;
  return Math.max(0, Math.min(100, baseline + variation));
}

/**
 * Cache for traffic data (to avoid hitting API too often)
 * TTL: 5 minutes
 */
const trafficCache = new Map();

export function cacheTrafficData(key, data, ttlSeconds = 300) {
  trafficCache.set(key, {
    data,
    expiresAt: Date.now() + (ttlSeconds * 1000),
  });
}

export function getCachedTrafficData(key) {
  const cached = trafficCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    trafficCache.delete(key);
    return null;
  }

  return cached.data;
}

export function clearTrafficCache() {
  trafficCache.clear();
}

export default {
  getTrafficData,
  getZoneTrafficDensity,
  getMultipleZonesTrafficDensity,
  estimateDensityFromTimeOfDay,
  cacheTrafficData,
  getCachedTrafficData,
  clearTrafficCache,
};
