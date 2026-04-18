/**
 * WebSocket Handler
 * WS /api/v1/stream
 * Receives updates from Redis Pub/Sub and broadcasts to connected clients
 */
import { cacheGet } from '../redis-cache.js';
import { subscribeToCrowdUpdates, subscribeToAlerts } from './services/redis-pubsub.js';
import { logger } from '../cloud-logger.js';

const clients = new Set();
let pubsubInitialized = false;

export async function initWebSocket(server) {
  const WebSocket = (await import('ws')).default;
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/api/v1/stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    logger.info('WebSocket client connected', { clientCount: clients.size });

    // Send initial state
    sendInitialState(ws).catch(() => {});

    ws.on('close', () => {
      clients.delete(ws);
      logger.info('WebSocket client disconnected', { clientCount: clients.size });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { message: err.message });
    });
  });

  // Initialize Redis Pub/Sub listeners (only once)
  if (!pubsubInitialized) {
    pubsubInitialized = true;

    // Listen for crowd updates from Redis
    subscribeToCrowdUpdates((message) => {
      broadcastToClients(message);
    }).catch(() => {});

    // Listen for alerts from Redis
    subscribeToAlerts((message) => {
      broadcastToClients(message);
    }).catch(() => {});
  }

  return wss;
}

/**
 * Send initial state to a newly connected client
 */
async function sendInitialState(ws) {
  try {
    const crowdData = await cacheGet('crowd:all');
    const simulationStatus = await cacheGet('simulation:status');
    const alerts = await cacheGet('alerts:active') || [];

    const payload = {
      type: 'INITIAL_STATE',
      data: {
        crowd: crowdData,
        simulation: simulationStatus,
        alerts: alerts.slice(0, 10),
      },
      timestamp: new Date().toISOString(),
    };

    if (ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify(payload));
    }
  } catch (err) {
    logger.warn('Failed to send initial state', { message: err.message });
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToClients(message) {
  if (clients.size === 0) return;

  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}

/**
 * Broadcast crowd update to all connected clients
 */
export async function broadcastCrowdUpdate() {
  if (clients.size === 0) return;

  try {
    const crowdData = await cacheGet('crowd:all');
    const simulationStatus = await cacheGet('simulation:status');
    const alerts = await cacheGet('alerts:active') || [];

    const payload = {
      type: 'CROWD_UPDATE',
      data: {
        crowd: crowdData,
        simulation: simulationStatus,
        alerts: alerts.slice(0, 10),
      },
      timestamp: new Date().toISOString(),
    };

    broadcastToClients(payload);
  } catch (err) {
    logger.error('broadcastCrowdUpdate error', { message: err.message });
  }
}

/**
 * Broadcast alert to all connected clients
 */
export function broadcastAlert(alert) {
  if (clients.size === 0) return;

  const payload = {
    type: 'ALERT',
    data: alert,
    timestamp: new Date().toISOString(),
  };

  broadcastToClients(payload);
}

export function getClientCount() {
  return clients.size;
}
