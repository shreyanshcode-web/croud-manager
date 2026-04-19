/**
 * Firestore Fan Reports Service (Backend)
 * Allows event attendees to submit live crowd reports.
 * Reports are stored in Firestore /fanReports collection
 * and surfaced to other users via /api/fan-reports API.
 *
 * Google Service: Google Cloud Firestore
 */
import { Firestore } from '@google-cloud/firestore';

let db = null;

function getDb() {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'nth-bounty-477010-h8',
    });
  }
  return db;
}

/**
 * Submit a fan crowd report.
 * @param {{ location: string, type: string, message: string, userId: string }}
 */
export async function submitFanReport({ location, type, message, userId }) {
  try {
    const firestore = getDb();
    const ref = firestore.collection('fanReports').doc();
    await ref.set({
      id:        ref.id,
      location:  location.slice(0, 80),
      type,      // 'crowded' | 'blocked' | 'incident' | 'clean' | 'tip'
      message:   message.slice(0, 200),
      userId:    userId || 'anonymous',
      votes:     0,
      createdAt: Firestore.Timestamp.now(),
      expiresAt: Firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // 30 min TTL
    });
    return ref.id;
  } catch (err) {
    console.warn('[Firestore] submitFanReport failed:', err.message);
    return null;
  }
}

/**
 * Fetch the most recent fan reports (last 30 minutes, max 10).
 */
export async function getRecentFanReports() {
  try {
    const firestore = getDb();
    const cutoff = Firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
    const snap = await firestore
      .collection('fanReports')
      .where('createdAt', '>=', cutoff)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (err) {
    console.warn('[Firestore] getRecentFanReports failed:', err.message);
    return [];
  }
}

/**
 * Upvote a fan report.
 */
export async function upvoteFanReport(reportId) {
  try {
    const firestore = getDb();
    const ref = firestore.collection('fanReports').doc(reportId);
    await ref.update({ votes: Firestore.FieldValue.increment(1) });
  } catch (err) {
    console.warn('[Firestore] upvoteFanReport failed:', err.message);
  }
}
