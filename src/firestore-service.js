/**
 * Firestore Service — SmartVenue AI
 * Syncs live crowd snapshots and active incidents to Cloud Firestore.
 * Collections:
 *   /publicDashboard/latest   — latest venue snapshot (readable by all)
 *   /incidents/{id}           — active operator incidents
 *   /operatorActions/{id}     — actions taken by operators
 */
import { Firestore } from '@google-cloud/firestore';

let db = null;

function getDb() {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'nth-bounty-477010-h8',
      // In Cloud Run, ADC picks up the service account automatically.
      // Locally, set GOOGLE_APPLICATION_CREDENTIALS or FIRESTORE_EMULATOR_HOST.
    });
  }
  return db;
}

/**
 * Write the latest venue intelligence snapshot to Firestore.
 * Throttled to once per simulation tick from the server.
 */
export async function syncVenueSnapshot(snapshot) {
  try {
    const firestore = getDb();
    await firestore.collection('publicDashboard').doc('latest').set({
      venueScore: snapshot.venueScore,
      topDrivers: snapshot.drivers.slice(0, 3),
      topGateAlerts: snapshot.gatePredictions.slice(0, 3),
      topSectionAlerts: snapshot.sectionPredictions.slice(0, 3),
      updatedAt: Firestore.Timestamp.now(),
    }, { merge: true });
  } catch (err) {
    // Non-fatal — local simulator keeps running even if Firestore is unreachable
    console.warn('[Firestore] syncVenueSnapshot failed:', err.message);
  }
}

/**
 * Create an incident record when an operator triggers an action.
 */
export async function createIncident({ title, location, severity, operatorEmail }) {
  const firestore = getDb();
  const ref = firestore.collection('incidents').doc();
  await ref.set({
    id: ref.id,
    title,
    location,
    severity,
    operatorEmail,
    status: 'open',
    createdAt: Firestore.Timestamp.now(),
    updatedAt: Firestore.Timestamp.now(),
  });
  return ref.id;
}

/**
 * Log an operator action (gate redirect, evacuation trigger, etc.)
 */
export async function logOperatorAction({ action, target, operatorEmail, metadata }) {
  try {
    const firestore = getDb();
    const ref = firestore.collection('operatorActions').doc();
    await ref.set({
      id: ref.id,
      action,
      target,
      operatorEmail: operatorEmail || 'system',
      metadata: metadata || {},
      createdAt: Firestore.Timestamp.now(),
    });
    return ref.id;
  } catch (err) {
    console.warn('[Firestore] logOperatorAction failed:', err.message);
    return null;
  }
}

/**
 * Fetch the latest public snapshot (used by the client via API).
 */
export async function getLatestSnapshot() {
  try {
    const firestore = getDb();
    const doc = await firestore.collection('publicDashboard').doc('latest').get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.warn('[Firestore] getLatestSnapshot failed:', err.message);
    return null;
  }
}
