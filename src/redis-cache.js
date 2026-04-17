/**
 * Redis Cache Layer — SmartVenue AI
 *
 * Uses ioredis. Gracefully degrades when Redis is unavailable so the app
 * keeps running in dev/local without a Redis server.
 *
 * Environment variables:
 *   REDIS_URL      — e.g. redis://localhost:6379 or rediss://user:pass@host:6380
 *   REDIS_PASSWORD — optional, overrides URL password
 *
 * TTL strategy:
 *   AI advice responses   → 30 s  (Gemini calls are expensive)
 *   Venue snapshots       → 3 s   (matches the simulation tick)
 *   Geocode results       → 24 h  (static data)
 *   Rate-limit counters   → 60 s  (sliding window)
 */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;
let healthy = false;

function getClient() {
  if (client) return client;

  client = new Redis(REDIS_URL, {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,       // fail fast — don't block the request
    enableOfflineQueue: false,     // drop commands when disconnected
    lazyConnect: true,
    connectTimeout: 3000,
  });

  client.on('ready', () => {
    healthy = true;
    console.log('[Redis] connected');
  });

  client.on('error', (err) => {
    if (healthy) console.warn('[Redis] connection error — cache disabled:', err.message);
    healthy = false;
  });

  client.on('close', () => { healthy = false; });

  // Attempt connection; swallow the error so startup never blocks
  client.connect().catch(() => {});

  return client;
}

// --- Public helpers ---

/**
 * Get a cached value. Returns null on miss or when Redis is down.
 */
export async function cacheGet(key) {
  if (!healthy) return null;
  try {
    const raw = await getClient().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 */
export async function cacheSet(key, value, ttlSeconds = 30) {
  if (!healthy) return;
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // non-fatal
  }
}

/**
 * Delete a cached key immediately (e.g. after an operator action invalidates state).
 */
export async function cacheDel(key) {
  if (!healthy) return;
  try {
    await getClient().del(key);
  } catch {
    // non-fatal
  }
}

/**
 * Sliding-window rate limiter.
 * Returns { allowed: boolean, remaining: number, resetInMs: number }
 */
export async function rateLimit(key, maxRequests = 20, windowSeconds = 60) {
  if (!healthy) return { allowed: true, remaining: maxRequests, resetInMs: 0 };
  try {
    const redis = getClient();
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

    const count = await redis.incr(windowKey);
    if (count === 1) await redis.expire(windowKey, windowSeconds + 1);

    const remaining = Math.max(0, maxRequests - count);
    const resetInMs = windowMs - (now % windowMs);
    return { allowed: count <= maxRequests, remaining, resetInMs };
  } catch {
    return { allowed: true, remaining: maxRequests, resetInMs: 0 };
  }
}

/**
 * Cache TTL constants (seconds) — centralised so they're easy to tune.
 */
export const TTL = {
  AI_ADVICE: 30,
  VENUE_SNAPSHOT: 3,
  GEOCODE: 86400,   // 24 h
  RATE_LIMIT: 60,
};

export function isRedisHealthy() {
  return healthy;
}

// Initialise connection at import time (server startup)
getClient();
