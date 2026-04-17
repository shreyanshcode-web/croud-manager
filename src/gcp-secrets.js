/**
 * Secret Manager Service — SmartVenue AI
 * Fetches secrets from GCP Secret Manager with a TTL-based cache (5 min)
 * so rotated secrets are picked up without a full restart.
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

// Cache: { value, expiresAt }
const secretCache = new Map();
const SECRET_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName) {
  const cached = secretCache.get(secretName);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  // Local dev shortcut — read from process.env before hitting Secret Manager
  if (process.env.NODE_ENV !== 'production' && process.env[secretName]) {
    return process.env[secretName];
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('GOOGLE_CLOUD_PROJECT env var is not set');

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const value = version.payload.data.toString('utf8');
    secretCache.set(secretName, { value, expiresAt: Date.now() + SECRET_TTL_MS });
    return value;
  } catch (err) {
    // If we have a stale cached value, use it as a fallback rather than crashing
    if (cached) {
      console.warn(`[SecretManager] refresh failed for ${secretName}, using stale cache:`, err.message);
      return cached.value;
    }
    console.error(`[SecretManager] failed to fetch ${secretName}:`, err.message);
    throw err;
  }
}

/** Force-expire a secret so the next call fetches a fresh value (e.g. after rotation). */
export function invalidateSecret(secretName) {
  secretCache.delete(secretName);
}
