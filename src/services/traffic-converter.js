/**
 * Traffic Converter Service
 * Converts Google Maps traffic data → crowd density
 * 
 * Key insight: Traffic congestion is a proxy for crowd behavior
 * - High traffic = people are moving slowly = high density
 * - Low traffic = people are moving freely = low density
 */

/**
 * Convert traffic congestion ratio to density percentage
 * 
 * Congestion Ratio = duration_in_traffic / normal_duration
 * - 1.0 = no congestion
 * - 1.5 = 50% slower (moderate congestion)
 * - 2.0+ = severe congestion
 */
function trafficToDensity(congestionRatio) {
  if (congestionRatio >= 2.0) return 90; // Severe congestion
  if (congestionRatio >= 1.5) return 75; // High congestion
  if (congestionRatio >= 1.2) return 55; // Moderate congestion
  if (congestionRatio >= 1.0) return 35; // Light congestion
  return 20; // Free flow
}

/**
 * Calculate risk level from density
 */
function calculateRisk(density) {
  if (density > 80) return 'CRITICAL';
  if (density > 60) return 'HIGH';
  if (density > 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Apply time-based adjustments
 * Morning/evening rush hours have higher baseline density
 */
function applyTimeAdjustment(density, hour) {
  // Morning rush (6-9 AM)
  if (hour >= 6 && hour <= 9) {
    return Math.min(100, density + 15);
  }
  // Evening rush (5-7 PM)
  if (hour >= 17 && hour <= 19) {
    return Math.min(100, density + 20);
  }
  // Night (10 PM - 5 AM)
  if (hour >= 22 || hour <= 5) {
    return Math.max(0, density - 20);
  }
  return density;
}

/**
 * Apply zone-type weighting
 * Different zones have different traffic/crowd relationships
 */
function applyZoneWeighting(trafficDensity, simulationDensity, zoneType) {
  let weights = {
    highway: { traffic: 0.7, simulation: 0.3 },      // Traffic dominates
    arterial: { traffic: 0.6, simulation: 0.4 },     // Traffic important
    mall: { traffic: 0.3, simulation: 0.7 },         // Simulation dominates
    stadium: { traffic: 0.4, simulation: 0.6 },      // Mixed
    transit: { traffic: 0.5, simulation: 0.5 },      // Equal weight
    default: { traffic: 0.5, simulation: 0.5 },
  };

  const w = weights[zoneType] || weights.default;
  return (trafficDensity * w.traffic) + (simulationDensity * w.simulation);
}

/**
 * Detect sudden spikes (anomaly detection)
 * If density jumps >20% in one update, trigger alert
 */
function detectSpike(currentDensity, previousDensity, threshold = 20) {
  if (!previousDensity) return false;
  const change = Math.abs(currentDensity - previousDensity);
  return change > threshold;
}

/**
 * Main function: Convert traffic data to crowd density
 * 
 * Input: {
 *   trafficDuration: 600,        // seconds in traffic
 *   normalDuration: 400,         // normal duration
 *   simulationDensity: 60,       // from simulation
 *   eventBoost: 0,               // +density if event nearby
 *   zoneType: 'mall',            // zone type
 *   previousDensity: 55,         // for spike detection
 * }
 * 
 * Output: {
 *   density: 74,
 *   risk: 'HIGH',
 *   sources: { traffic: 75, simulation: 60, event: 0 },
 *   spike: false,
 * }
 */
export function convertTrafficToDensity(input) {
  const {
    trafficDuration,
    normalDuration,
    simulationDensity = 50,
    eventBoost = 0,
    zoneType = 'default',
    previousDensity = null,
  } = input;

  // Step 1: Calculate congestion ratio
  const congestionRatio = trafficDuration / normalDuration;

  // Step 2: Convert traffic to density
  let trafficDensity = trafficToDensity(congestionRatio);

  // Step 3: Apply zone-type weighting
  let blendedDensity = applyZoneWeighting(trafficDensity, simulationDensity, zoneType);

  // Step 4: Add event boost (if event nearby)
  blendedDensity = Math.min(100, blendedDensity + eventBoost);

  // Step 5: Apply time-based adjustment
  const hour = new Date().getHours();
  blendedDensity = applyTimeAdjustment(blendedDensity, hour);

  // Step 6: Round to nearest integer
  const finalDensity = Math.round(blendedDensity);

  // Step 7: Calculate risk level
  const risk = calculateRisk(finalDensity);

  // Step 8: Detect spikes
  const spike = detectSpike(finalDensity, previousDensity);

  return {
    density: finalDensity,
    risk,
    sources: {
      traffic: Math.round(trafficDensity),
      simulation: simulationDensity,
      event: eventBoost,
    },
    congestionRatio: congestionRatio.toFixed(2),
    spike,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch convert multiple zones
 */
export function convertMultipleZones(zones) {
  return zones.map(zone => convertTrafficToDensity(zone));
}

/**
 * Get traffic-based density for a specific zone
 * Used by API endpoint
 */
export async function getTrafficDensityForZone(zoneId, trafficData, previousDensity) {
  if (!trafficData) {
    return {
      density: 50,
      risk: 'MEDIUM',
      source: 'default',
      message: 'No traffic data available',
    };
  }

  const result = convertTrafficToDensity({
    trafficDuration: trafficData.duration_in_traffic || trafficData.duration,
    normalDuration: trafficData.duration,
    simulationDensity: trafficData.simulation_density || 50,
    eventBoost: trafficData.event_boost || 0,
    zoneType: trafficData.zone_type || 'default',
    previousDensity,
  });

  return {
    zoneId,
    ...result,
    source: 'traffic-derived',
  };
}

export default {
  convertTrafficToDensity,
  convertMultipleZones,
  getTrafficDensityForZone,
  trafficToDensity,
  calculateRisk,
  applyTimeAdjustment,
  applyZoneWeighting,
  detectSpike,
};
