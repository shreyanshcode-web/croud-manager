/**
 * BigQuery Streaming Ingest — SmartVenue AI
 * Streams crowd event rows directly into BigQuery using the insertAll API.
 * This feeds the training pipeline in cloud/bigquery/train_crowd_risk_model.sql.
 *
 * Table: crowd_ai.training_crowd_events
 * Partition: event_timestamp (DATE)
 *
 * Schema matches the feature set expected by the BigQuery ML model.
 * Gracefully degrades when BigQuery is unreachable.
 */
import { BigQuery } from '@google-cloud/bigquery';
import { logger } from './cloud-logger.js';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const DATASET = 'crowd_ai';
const TABLE = 'training_crowd_events';

let bq = null;

function getClient() {
  if (!bq && PROJECT_ID) {
    bq = new BigQuery({ projectId: PROJECT_ID });
  }
  return bq;
}

/**
 * Stream a crowd snapshot tick into BigQuery for model training.
 * Fire-and-forget — never throws or blocks the caller.
 */
export async function streamCrowdEvent(snapshot, intelligence) {
  const client = getClient();
  if (!client) return; // BigQuery unavailable locally without project ID

  const { stats, gates, sections, restrooms, transport, parking } = snapshot;

  const avgGateUtilization = gates.reduce((s, g) => s + g.utilization, 0) / gates.length;
  const restrictedGateRatio = gates.filter(g => g.status === 'restricted').length / gates.length;
  const queuePressure = gates.reduce((s, g) => s + g.peopleInQueue, 0);
  const avgSectionDensity = sections.reduce((s, sec) => s + sec.density, 0) / sections.length;
  const criticalSectionRatio = sections.filter(s => s.status === 'critical').length / sections.length;
  const restroomPressure = restrooms.reduce((s, r) => s + r.occupancyPercent, 0) / restrooms.length;
  const predictedArrivalLoad = transport.filter(t => t.eta <= 8).reduce((s, t) => s + t.passengers, 0);
  const netParkingInflow = parking.reduce((s, p) => s + Math.max(p.entryRate - p.exitRate, 0), 0);

  const row = {
    insertId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    json: {
      event_timestamp: new Date().toISOString(),
      venue_id: 'apex-arena',
      avg_gate_wait: stats.avgGateWait,
      avg_gate_utilization: +avgGateUtilization.toFixed(2),
      restricted_gate_ratio: +restrictedGateRatio.toFixed(4),
      queue_pressure: queuePressure,
      avg_section_density: +avgSectionDensity.toFixed(2),
      critical_section_ratio: +criticalSectionRatio.toFixed(4),
      avg_concession_wait: stats.avgConcessionWait,
      restroom_pressure: +restroomPressure.toFixed(2),
      parking_utilization: stats.parkingUtilization,
      predicted_arrival_load: predictedArrivalLoad,
      blocked_exit_count: stats.blockedExits,
      safety_score: stats.safetyScore,
      attendance_percent: stats.attendancePercent,
      net_parking_inflow: netParkingInflow,
      // Label: will be backfilled from incident reports in production
      incident_within_15m: false,
      // Extra columns for monitoring
      risk_score: intelligence?.venueScore?.score ?? null,
      risk_band: intelligence?.venueScore?.band ?? null,
      incident_probability: intelligence?.venueScore?.incidentProbability ?? null,
    },
  };

  try {
    await client.dataset(DATASET).table(TABLE).insert([row], {
      skipInvalidRows: true,
      ignoreUnknownValues: true,
    });
    logger.debug('[BigQuery] row streamed', { venue_id: 'apex-arena' });
  } catch (err) {
    // Log but never crash — BQ streaming errors are non-fatal
    if (err.name === 'PartialFailureError') {
      logger.warn('[BigQuery] partial insert failure', { errors: err.errors?.slice(0, 3) });
    } else {
      logger.warn('[BigQuery] insert failed', { message: err.message });
    }
  }
}

/**
 * Create the dataset and table if they don't exist (called once on startup).
 */
export async function ensureBigQueryTable() {
  const client = getClient();
  if (!client) return;

  try {
    const [datasetExists] = await client.dataset(DATASET).exists();
    if (!datasetExists) {
      await client.createDataset(DATASET, { location: 'US' });
      logger.info(`[BigQuery] dataset ${DATASET} created`);
    }

    const [tableExists] = await client.dataset(DATASET).table(TABLE).exists();
    if (!tableExists) {
      await client.dataset(DATASET).createTable(TABLE, {
        schema: CROWD_EVENT_SCHEMA,
        timePartitioning: { type: 'DAY', field: 'event_timestamp' },
      });
      logger.info(`[BigQuery] table ${TABLE} created`);
    }
  } catch (err) {
    logger.warn('[BigQuery] table setup failed — streaming will fail until resolved', { message: err.message });
  }
}

const CROWD_EVENT_SCHEMA = {
  fields: [
    { name: 'event_timestamp', type: 'TIMESTAMP' },
    { name: 'venue_id', type: 'STRING' },
    { name: 'avg_gate_wait', type: 'FLOAT' },
    { name: 'avg_gate_utilization', type: 'FLOAT' },
    { name: 'restricted_gate_ratio', type: 'FLOAT' },
    { name: 'queue_pressure', type: 'INTEGER' },
    { name: 'avg_section_density', type: 'FLOAT' },
    { name: 'critical_section_ratio', type: 'FLOAT' },
    { name: 'avg_concession_wait', type: 'FLOAT' },
    { name: 'restroom_pressure', type: 'FLOAT' },
    { name: 'parking_utilization', type: 'FLOAT' },
    { name: 'predicted_arrival_load', type: 'INTEGER' },
    { name: 'blocked_exit_count', type: 'INTEGER' },
    { name: 'safety_score', type: 'FLOAT' },
    { name: 'attendance_percent', type: 'FLOAT' },
    { name: 'net_parking_inflow', type: 'INTEGER' },
    { name: 'incident_within_15m', type: 'BOOLEAN' },
    { name: 'risk_score', type: 'INTEGER' },
    { name: 'risk_band', type: 'STRING' },
    { name: 'incident_probability', type: 'INTEGER' },
  ],
};
