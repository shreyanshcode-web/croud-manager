/**
 * Kafka Consumer Service
 * Reads crowd events from Kafka, processes them, and stores in Redis
 * This is the "brain" of the system — enriches raw data with risk scoring
 */
import { createConsumer, TOPICS } from '../../kafka-bus.js';
import { cacheGet, cacheSet, TTL } from '../../redis-cache.js';
import { logger } from '../../cloud-logger.js';

let consumer = null;
let running = false;

/**
 * Calculate risk level based on density
 */
function calculateRisk(density) {
  if (density > 80) return 'CRITICAL';
  if (density > 60) return 'HIGH';
  if (density > 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * Process a crowd event from Kafka
 * Enriches with risk scoring and stores in Redis
 */
async function processCrowdEvent(message) {
  try {
    const data = JSON.parse(message.value.toString());

    // Extract zone ID from the event (or use a default)
    const zoneId = data.zoneId || data.zone_id || 'DEFAULT';
    const density = data.density || data.avg_section_density || 0;
    const risk = calculateRisk(density);

    // Enrich the event
    const enriched = {
      zoneId,
      density: Math.round(density),
      risk,
      flowRate: data.flowRate || data.queue_pressure || 0,
      peopleCount: data.peopleCount || 0,
      safetyScore: data.safety_score || 100,
      timestamp: data._publishedAt || new Date().toISOString(),
      source: 'kafka',
    };

    // Store in Redis for fast API access
    await cacheSet(`crowd:zone:${zoneId}`, enriched, TTL.VENUE_SNAPSHOT);

    // Also update the "all zones" aggregate
    const allZones = (await cacheGet(`crowd:all`)) || { zones: [], lastUpdate: new Date().toISOString() };
    const zoneIndex = allZones.zones.findIndex(z => z.zoneId === zoneId);
    if (zoneIndex >= 0) {
      allZones.zones[zoneIndex] = enriched;
    } else {
      allZones.zones.push(enriched);
    }
    allZones.lastUpdate = new Date().toISOString();
    await cacheSet('crowd:all', allZones, TTL.VENUE_SNAPSHOT);

    logger.debug('Crowd event processed', { zoneId, density, risk });
  } catch (err) {
    logger.error('Failed to process crowd event', { message: err.message });
  }
}

/**
 * Process a crowd alert from Kafka
 */
async function processCrowdAlert(message) {
  try {
    const data = JSON.parse(message.value.toString());

    const alert = {
      id: `alert-${Date.now()}`,
      type: 'OVERCROWDING',
      zone: data.venue_id || 'SYSTEM',
      severity: data.severity || 'HIGH',
      message: data.message || 'Crowd alert triggered',
      createdAt: new Date().toISOString(),
      dismissed: false,
    };

    // Add to active alerts
    const alerts = (await cacheGet('alerts:active')) || [];
    alerts.unshift(alert);
    await cacheSet('alerts:active', alerts.slice(0, 100), TTL.SESSION);

    logger.info('Alert processed', { zone: alert.zone, severity: alert.severity });
  } catch (err) {
    logger.error('Failed to process alert', { message: err.message });
  }
}

/**
 * Process a location update from Kafka
 */
async function processLocationUpdate(message) {
  try {
    const data = JSON.parse(message.value.toString());

    const location = {
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      timestamp: new Date().toISOString(),
    };

    // Store location (short TTL, only for real-time tracking)
    await cacheSet(`location:${data.venue_id}`, location, 10);

    logger.debug('Location update processed', { venue: data.venue_id });
  } catch (err) {
    logger.error('Failed to process location', { message: err.message });
  }
}

/**
 * Start the Kafka consumer
 * Reads from all crowd topics and processes messages
 */
export async function startKafkaConsumer() {
  if (running) return;

  try {
    consumer = await createConsumer('smartvenue-processor', [
      TOPICS.CROWD_EVENTS,
      TOPICS.CROWD_ALERTS,
      TOPICS.LOCATION_UPDATES,
    ]);

    running = true;

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (topic === TOPICS.CROWD_EVENTS) {
          await processCrowdEvent(message);
        } else if (topic === TOPICS.CROWD_ALERTS) {
          await processCrowdAlert(message);
        } else if (topic === TOPICS.LOCATION_UPDATES) {
          await processLocationUpdate(message);
        }
      },
    });

    logger.info('Kafka consumer started', { topics: [TOPICS.CROWD_EVENTS, TOPICS.CROWD_ALERTS, TOPICS.LOCATION_UPDATES] });
  } catch (err) {
    logger.error('Failed to start Kafka consumer', { message: err.message });
    running = false;
  }
}

/**
 * Stop the Kafka consumer
 */
export async function stopKafkaConsumer() {
  if (!consumer || !running) return;

  try {
    await consumer.disconnect();
    running = false;
    logger.info('Kafka consumer stopped');
  } catch (err) {
    logger.error('Failed to stop Kafka consumer', { message: err.message });
  }
}

export function isConsumerRunning() {
  return running;
}
