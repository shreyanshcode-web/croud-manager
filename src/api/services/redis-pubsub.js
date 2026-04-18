/**
 * Redis Pub/Sub Service
 * Publishes crowd updates to Redis channels
 * WebSocket server subscribes to these channels for real-time updates
 */
import Redis from 'ioredis';
import { logger } from '../../cloud-logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let publisher = null;
let subscriber = null;
let listeners = new Map();

function getPublisher() {
  if (publisher) return publisher;

  publisher = new Redis(REDIS_URL, {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3000,
  });

  publisher.on('error', (err) => {
    logger.warn('Redis publisher error:', { message: err.message });
  });

  publisher.connect().catch(() => {});
  return publisher;
}

function getSubscriber() {
  if (subscriber) return subscriber;

  subscriber = new Redis(REDIS_URL, {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 3000,
  });

  subscriber.on('error', (err) => {
    logger.warn('Redis subscriber error:', { message: err.message });
  });

  subscriber.connect().catch(() => {});
  return subscriber;
}

/**
 * Publish a crowd update to Redis channel
 * Called by the Kafka consumer after processing
 */
export async function publishCrowdUpdate(zoneId, data) {
  try {
    const pub = getPublisher();
    await pub.publish('crowd-updates', JSON.stringify({
      type: 'CROWD_UPDATE',
      zoneId,
      data,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn('Failed to publish crowd update', { message: err.message });
  }
}

/**
 * Publish an alert to Redis channel
 */
export async function publishAlert(alert) {
  try {
    const pub = getPublisher();
    await pub.publish('alerts', JSON.stringify({
      type: 'ALERT',
      data: alert,
      timestamp: new Date().toISOString(),
    }));
  } catch (err) {
    logger.warn('Failed to publish alert', { message: err.message });
  }
}

/**
 * Subscribe to crowd updates
 * Used by WebSocket server to broadcast to clients
 */
export async function subscribeToCrowdUpdates(callback) {
  try {
    const sub = getSubscriber();
    await sub.subscribe('crowd-updates');

    sub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (err) {
        logger.warn('Failed to parse crowd update', { message: err.message });
      }
    });

    listeners.set('crowd-updates', callback);
    logger.info('Subscribed to crowd-updates channel');
  } catch (err) {
    logger.error('Failed to subscribe to crowd updates', { message: err.message });
  }
}

/**
 * Subscribe to alerts
 */
export async function subscribeToAlerts(callback) {
  try {
    const sub = getSubscriber();
    await sub.subscribe('alerts');

    sub.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        callback(data);
      } catch (err) {
        logger.warn('Failed to parse alert', { message: err.message });
      }
    });

    listeners.set('alerts', callback);
    logger.info('Subscribed to alerts channel');
  } catch (err) {
    logger.error('Failed to subscribe to alerts', { message: err.message });
  }
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel) {
  try {
    if (subscriber) {
      await subscriber.unsubscribe(channel);
      listeners.delete(channel);
      logger.info('Unsubscribed from channel', { channel });
    }
  } catch (err) {
    logger.warn('Failed to unsubscribe', { message: err.message });
  }
}

export function getListenerCount() {
  return listeners.size;
}
