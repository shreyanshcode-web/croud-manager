/**
 * Traffic Sentinel Service — SmartVenue AI
 * 
 * Background orchestrator that polls Google Maps Directions API
 * to detect ingress pressure points from major transit hubs.
 */
import { getTrafficData } from './google-maps-traffic.js';
import { cacheSet, cacheGet } from '../redis-cache.js';
import { logger } from '../cloud-logger.js';
import { broadcastAlert } from '../api/websocket.js';

const POLL_INTERVAL_MS = 1000 * 60 * 5; // 5 minutes

const STRATEGIC_ROUTES = [
  { id: 'airport', name: 'International Airport', origin: 'Kempegowda International Airport Bengaluru', destination: 'Kanteerava Stadium Bengaluru' },
  { id: 'downtown', name: 'Central District (MG Road)', origin: 'MG Road Metro Station Bengaluru', destination: 'Kanteerava Stadium Bengaluru' },
  { id: 'transit_hub', name: 'Majestic Metro/Railway', origin: 'KSR Bengaluru City Railway Station', destination: 'Kanteerava Stadium Bengaluru' },
  { id: 'south_tech', name: 'Electronic City Tech Hub', origin: 'Electronic City Bengaluru', destination: 'Kanteerava Stadium Bengaluru' }
];

let intervalId = null;

/**
 * Executes a full sweep of all strategic routes
 */
export async function runTrafficSweep() {
  logger.info('[TrafficSentinel] Executing ingress sweep...');
  
  const results = [];
  let totalStress = 0;

  for (const route of STRATEGIC_ROUTES) {
    try {
      // getTrafficData is already in your codebase fetching duration_in_traffic
      const data = await getTrafficData(route.origin, route.destination);
      
      if (!data) continue;

      const congestionRatio = data.duration_in_traffic / data.duration;
      const delayMinutes = Math.max(0, Math.round((data.duration_in_traffic - data.duration) / 60));
      
      // Stress score: 0 (free) to 100 (gridlock)
      // ratio 1.0 = 0, ratio 2.0 = 100
      const stressScore = Math.min(100, Math.max(0, (congestionRatio - 1) * 100));
      
      const payload = {
        ...route,
        ...data,
        congestionRatio: congestionRatio.toFixed(2),
        delayMinutes,
        stressScore,
        status: stressScore > 75 ? 'CRITICAL' : stressScore > 40 ? 'HIGH' : 'OPTIMAL'
      };

      results.push(payload);
      totalStress += stressScore;

      // Alert if a route suddenly enters Critical state
      if (payload.status === 'CRITICAL') {
        broadcastAlert({
          type: 'TRAFFIC_CONGESTION',
          title: `Traffic Surge: ${route.name}`,
          message: `${delayMinutes} min delay detected. Ingress delay is now critical.`,
          severity: 'high'
        }).catch(() => {});
      }

    } catch (err) {
      logger.error(`[TrafficSentinel] Failed route ${route.id}:`, err.message);
    }
  }

  const aggregate = {
    updatedAt: new Date().toISOString(),
    routes: results,
    avgStress: results.length ? Math.round(totalStress / results.length) : 0,
    source: 'google_directions_api'
  };

  await cacheSet('traffic:live', aggregate, 3600);
  return aggregate;
}

/**
 * Start the sentinel loop
 */
export function startTrafficSentinel() {
  if (intervalId) return;
  
  // Initial sweep
  runTrafficSweep().catch(() => {});
  
  intervalId = setInterval(runTrafficSweep, POLL_INTERVAL_MS);
  logger.info('[TrafficSentinel] Service started (5 min cycle)');
}

export function stopTrafficSentinel() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[TrafficSentinel] Service stopped');
  }
}

export default {
  startTrafficSentinel,
  stopTrafficSentinel,
  runTrafficSweep
};
