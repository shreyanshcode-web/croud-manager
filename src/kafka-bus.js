/**
 * Kafka Event Bus — SmartVenue AI
 *
 * Uses kafkajs. Gracefully degrades when no broker is reachable.
 *
 * Environment variables:
 *   KAFKA_BROKERS   — comma-separated, e.g. "localhost:9092" or Confluent bootstrap server
 *   KAFKA_USERNAME  — SASL username (Confluent Cloud / MSK)
 *   KAFKA_PASSWORD  — SASL password
 *   KAFKA_SSL       — "true" to enable TLS (required for Confluent Cloud)
 *
 * Topics:
 *   crowd.events        — raw simulation ticks published every 3 s
 *   crowd.alerts        — high-severity incidents (band === 'critical')
 *   location.updates    — user location pings from the frontend
 *
 * The consumer group "smartvenue-analytics" is defined here so BigQuery or
 * a Dataflow job can independently consume crowd.events for training data.
 */
import { Kafka, logLevel, CompressionTypes } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const USE_SASL = process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD;
const USE_SSL = process.env.KAFKA_SSL === 'true' || Boolean(USE_SASL);

const kafkaConfig = {
  clientId: 'smartvenue-ai',
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  ...(USE_SSL && { ssl: true }),
  ...(USE_SASL && {
    sasl: {
      mechanism: 'plain',
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
  }),
  retry: {
    initialRetryTime: 300,
    retries: 3,         // give up quickly so startup stays fast in local dev
  },
};

export const TOPICS = {
  CROWD_EVENTS: 'crowd.events',
  CROWD_ALERTS: 'crowd.alerts',
  LOCATION_UPDATES: 'location.updates',
};

let kafka = null;
let producer = null;
let connected = false;

function getKafka() {
  if (!kafka) kafka = new Kafka(kafkaConfig);
  return kafka;
}

async function getProducer() {
  if (producer && connected) return producer;

  producer = getKafka().producer({
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
  });

  try {
    await producer.connect();
    connected = true;
    console.log('[Kafka] producer connected to', BROKERS.join(', '));
  } catch (err) {
    connected = false;
    console.warn('[Kafka] producer unavailable — events will be dropped:', err.message);
  }

  producer.on(producer.events.DISCONNECT, () => { connected = false; });

  return producer;
}

/**
 * Publish a single message to a Kafka topic.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export async function publish(topic, payload, key = null) {
  try {
    const p = await getProducer();
    if (!connected) return;

    await p.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [{
        key: key ? String(key) : null,
        value: JSON.stringify({
          ...payload,
          _publishedAt: new Date().toISOString(),
        }),
      }],
    });
  } catch (err) {
    // Non-fatal — simulation keeps running without Kafka
    console.warn(`[Kafka] publish failed (${topic}):`, err.message);
  }
}

/**
 * Publish a crowd event tick. Called from the /api/snapshot route.
 */
export async function publishCrowdEvent(snapshot, intelligence) {
  const { stats } = snapshot;
  await publish(TOPICS.CROWD_EVENTS, {
    venue_id: 'apex-arena',
    avg_gate_wait: stats.avgGateWait,
    avg_gate_utilization: snapshot.gates.reduce((s, g) => s + g.utilization, 0) / snapshot.gates.length,
    restricted_gate_ratio: snapshot.gates.filter(g => g.status === 'restricted').length / snapshot.gates.length,
    queue_pressure: snapshot.gates.reduce((s, g) => s + g.peopleInQueue, 0),
    avg_section_density: snapshot.sections.reduce((s, sec) => s + sec.density, 0) / snapshot.sections.length,
    critical_section_ratio: snapshot.sections.filter(s => s.status === 'critical').length / snapshot.sections.length,
    avg_concession_wait: stats.avgConcessionWait,
    restroom_pressure: snapshot.restrooms.reduce((s, r) => s + r.occupancyPercent, 0) / snapshot.restrooms.length,
    parking_utilization: stats.parkingUtilization,
    predicted_arrival_load: snapshot.transport.filter(t => t.eta <= 8).reduce((s, t) => s + t.passengers, 0),
    blocked_exit_count: stats.blockedExits,
    safety_score: stats.safetyScore,
    attendance_percent: stats.attendancePercent,
    net_parking_inflow: snapshot.parking.reduce((s, p) => s + Math.max(p.entryRate - p.exitRate, 0), 0),
    risk_score: intelligence?.venueScore?.score ?? null,
    risk_band: intelligence?.venueScore?.band ?? null,
    incident_probability: intelligence?.venueScore?.incidentProbability ?? null,
  }, 'apex-arena');

  // Publish a separate alert if crowd is at critical band
  if (intelligence?.venueScore?.band === 'critical') {
    await publish(TOPICS.CROWD_ALERTS, {
      venue_id: 'apex-arena',
      severity: 'critical',
      score: intelligence.venueScore.score,
      incident_probability: intelligence.venueScore.incidentProbability,
      top_driver: intelligence.drivers?.[0]?.label ?? 'unknown',
      message: intelligence.venueScore.summary,
    }, 'apex-arena');
  }
}

/**
 * Publish a user location ping. Called from /api/location route.
 */
export async function publishLocationUpdate(lat, lng, accuracy, venueId = 'apex-arena') {
  await publish(TOPICS.LOCATION_UPDATES, {
    venue_id: venueId,
    lat,
    lng,
    accuracy,
  }, venueId);
}

/**
 * Create a consumer for a given group + topic (used by analytics workers).
 * Returns a { consumer, run } object. Caller is responsible for disconnect.
 */
export async function createConsumer(groupId, topics) {
  const consumer = getKafka().consumer({ groupId });
  try {
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    console.log(`[Kafka] consumer "${groupId}" subscribed to [${topics.join(', ')}]`);
  } catch (err) {
    console.warn(`[Kafka] consumer unavailable (${groupId}):`, err.message);
  }
  return consumer;
}

export function isKafkaConnected() {
  return connected;
}

// Connect producer eagerly at import so first publish has no cold-start delay
getProducer().catch(() => {});
