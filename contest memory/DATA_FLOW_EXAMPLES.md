# SmartVenue AI — Data Flow Examples

## Complete Data Flow with Code

### 1. Frontend Simulation Sends Update

**File**: `src/components/CrowdSimulation.jsx`

```javascript
// Simulation calculates crowd state
const crowdUpdate = {
  zoneId: 'A1',
  density: 78,
  risk: 'HIGH',
  flowRate: 62,
  peopleCount: 340,
};

// Send to backend
await api.updateCrowd(crowdUpdate);
```

### 2. Express Server Receives & Publishes to Kafka

**File**: `src/api/routes/crowd.routes.js`

```javascript
router.post('/update', async (req, res) => {
  const { zoneId, density, risk, flowRate, peopleCount } = req.body;

  // Validate
  if (density < 0 || density > 100) {
    return res.status(400).json({ error: 'Invalid density' });
  }

  const crowdUpdate = {
    zoneId,
    density: Math.round(density),
    risk,
    flowRate: Math.round(flowRate || 0),
    peopleCount: Math.round(peopleCount || 0),
    timestamp: new Date().toISOString(),
  };

  // Publish to Kafka (non-blocking)
  publishCrowdEvent(crowdUpdate).catch(() => {});

  // Stream to BigQuery (non-blocking)
  streamCrowdEvent(crowdUpdate).catch(() => {});

  res.json({ ok: true, data: crowdUpdate });
});
```

### 3. Kafka Producer Publishes Event

**File**: `src/kafka-bus.js`

```javascript
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
    console.warn(`[Kafka] publish failed (${topic}):`, err.message);
  }
}

// Called from crowd.routes.js
export async function publishCrowdEvent(snapshot) {
  await publish(TOPICS.CROWD_EVENTS, {
    zoneId: snapshot.zoneId,
    density: snapshot.density,
    risk: snapshot.risk,
    flowRate: snapshot.flowRate,
    peopleCount: snapshot.peopleCount,
  }, snapshot.zoneId);
}
```

**Kafka Message**:
```json
{
  "zoneId": "A1",
  "density": 78,
  "risk": "HIGH",
  "flowRate": 62,
  "peopleCount": 340,
  "_publishedAt": "2024-04-17T10:30:00Z"
}
```

### 4. Kafka Consumer Processes Event

**File**: `src/api/services/kafka-consumer.js`

```javascript
async function processCrowdEvent(message) {
  try {
    const data = JSON.parse(message.value.toString());

    // Extract data
    const zoneId = data.zoneId || 'DEFAULT';
    const density = data.density || 0;

    // 🧠 BRAIN: Calculate risk level
    const risk = calculateRisk(density);

    // Enrich the event
    const enriched = {
      zoneId,
      density: Math.round(density),
      risk,
      flowRate: data.flowRate || 0,
      peopleCount: data.peopleCount || 0,
      safetyScore: data.safety_score || 100,
      timestamp: data._publishedAt || new Date().toISOString(),
      source: 'kafka',
    };

    // 🔥 Store in Redis (fast access)
    await cacheSet(`crowd:zone:${zoneId}`, enriched, TTL.VENUE_SNAPSHOT);

    // Update aggregate
    const allZones = (await cacheGet(`crowd:all`)) || { zones: [], lastUpdate: new Date().toISOString() };
    const zoneIndex = allZones.zones.findIndex(z => z.zoneId === zoneId);
    if (zoneIndex >= 0) {
      allZones.zones[zoneIndex] = enriched;
    } else {
      allZones.zones.push(enriched);
    }
    allZones.lastUpdate = new Date().toISOString();
    await cacheSet('crowd:all', allZones, TTL.VENUE_SNAPSHOT);

    // 📡 Publish to Redis Pub/Sub (real-time)
    await publishCrowdUpdate(zoneId, enriched);

    logger.debug('Crowd event processed', { zoneId, density, risk });
  } catch (err) {
    logger.error('Failed to process crowd event', { message: err.message });
  }
}

function calculateRisk(density) {
  if (density > 80) return 'CRITICAL';
  if (density > 60) return 'HIGH';
  if (density > 40) return 'MEDIUM';
  return 'LOW';
}
```

**Redis Store**:
```
Key: crowd:zone:A1
Value: {
  "zoneId": "A1",
  "density": 78,
  "risk": "HIGH",
  "flowRate": 62,
  "peopleCount": 340,
  "safetyScore": 100,
  "timestamp": "2024-04-17T10:30:00Z",
  "source": "kafka"
}
TTL: 3 seconds
```

### 5. Redis Pub/Sub Publishes to WebSocket

**File**: `src/api/services/redis-pubsub.js`

```javascript
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
```

**Redis Pub/Sub Message**:
```json
{
  "type": "CROWD_UPDATE",
  "zoneId": "A1",
  "data": {
    "zoneId": "A1",
    "density": 78,
    "risk": "HIGH",
    "flowRate": 62,
    "peopleCount": 340,
    "safetyScore": 100,
    "timestamp": "2024-04-17T10:30:00Z",
    "source": "kafka"
  },
  "timestamp": "2024-04-17T10:30:00Z"
}
```

### 6. WebSocket Server Broadcasts to Clients

**File**: `src/api/websocket.js`

```javascript
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
  });

  // Subscribe to Redis Pub/Sub
  if (!pubsubInitialized) {
    pubsubInitialized = true;

    subscribeToCrowdUpdates((message) => {
      broadcastToClients(message);
    }).catch(() => {});
  }

  return wss;
}

function broadcastToClients(message) {
  if (clients.size === 0) return;

  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}
```

### 7. Frontend WebSocket Client Receives Update

**File**: `src/services/websocket.js`

```javascript
class WebSocketService {
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}/api/v1/stream`;

        this.ws = new WebSocket(url);

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.emit(message.type, message.data);
          } catch (err) {
            console.error('WebSocket message parse error:', err);
          }
        };

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.emit('connected');
          resolve();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      });
    }
  }
}
```

### 8. Frontend Hook Updates State

**File**: `src/hooks/useCrowdData.js`

```javascript
export function useCrowdData() {
  const [crowd, setCrowd] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Connect to WebSocket
  useEffect(() => {
    ws.connect().catch(() => {});

    const handleCrowdUpdate = (data) => {
      setCrowd(data.crowd);
      setAlerts(data.alerts || []);
    };

    ws.on('CROWD_UPDATE', handleCrowdUpdate);

    return () => {
      ws.off('CROWD_UPDATE', handleCrowdUpdate);
    };
  }, []);

  return {
    crowd,
    alerts,
    // ... other state
  };
}
```

### 9. Frontend Dashboard Renders Live Data

**File**: `src/pages/Dashboard.jsx`

```javascript
export default function Dashboard() {
  const { crowd, simulation, alerts } = useCrowdData();

  return (
    <div>
      {/* LEFT: Simulation Canvas */}
      <div style={{ width: '70%' }}>
        <CrowdSimulation />
      </div>

      {/* RIGHT: Live Metrics */}
      <div style={{ width: '30%' }}>
        {crowd && (
          <div>
            <div>Density: {crowd.density}%</div>
            <div>Risk: {crowd.risk}</div>
            <div>People: {crowd.peopleCount}</div>
          </div>
        )}

        {alerts.map((alert) => (
          <div key={alert.id}>
            {alert.type}: {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Alternative: API Polling (Fallback)

If WebSocket is unavailable, frontend can poll Redis via API:

**Frontend**:
```javascript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await api.getCrowd();
    setCrowd(res.data);
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(interval);
}, []);
```

**Backend** (already implemented):
```javascript
router.get('/', async (req, res) => {
  try {
    const crowdData = await cacheGet('crowd:all') || {
      zones: [],
      lastUpdate: new Date().toISOString(),
    };
    res.json(crowdData);
  } catch (err) {
    logger.error('GET /crowd error', { message: err.message });
    res.status(500).json({ error: 'Failed to fetch crowd data' });
  }
});
```

---

## Latency Breakdown

```
Frontend Simulation Tick
  ↓ (0ms)
POST /api/v1/crowd/update
  ↓ (5ms - network + validation)
Express Server
  ↓ (10ms - Kafka publish)
Kafka Broker
  ↓ (50ms - consumer processing)
Kafka Consumer Service
  ↓ (1ms - Redis write)
Redis Store
  ↓ (1ms - Redis Pub/Sub publish)
Redis Pub/Sub
  ↓ (5ms - WebSocket broadcast)
WebSocket Server
  ↓ (50ms - network to client)
Frontend WebSocket Client
  ↓ (0ms - state update)
React Component Re-render
  ↓ (16ms - browser paint)
Dashboard Display Update

TOTAL: ~138ms (end-to-end)
```

---

## Error Handling

### Kafka Producer Fails
```javascript
// Non-blocking — simulation continues
publishCrowdEvent(crowdUpdate).catch(() => {});
```

### Redis Unavailable
```javascript
// Graceful degradation — API still works
export async function cacheGet(key) {
  if (!healthy) return null; // Return null, don't throw
  try {
    const raw = await getClient().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // Fail gracefully
  }
}
```

### WebSocket Connection Lost
```javascript
// Auto-reconnect with exponential backoff
attemptReconnect() {
  if (this.reconnectAttempts < this.maxReconnectAttempts) {
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {});
    }, this.reconnectDelay);
  }
}
```

---

## Monitoring Data Flow

### Check Kafka Messages
```bash
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic crowd.events \
  --from-beginning \
  --max-messages 10
```

### Check Redis Keys
```bash
redis-cli
> KEYS crowd:*
> GET crowd:zone:A1
> PUBSUB CHANNELS
```

### Check WebSocket Connections
```bash
curl http://localhost:8080/api/health
# Returns: { "status": "ok", "redis": "connected", "kafka": "connected" }
```

### Check API Response
```bash
curl http://localhost:8080/api/v1/crowd
# Returns: { "zones": [...], "lastUpdate": "..." }
```

---

## Performance Optimization Tips

1. **Kafka**: Use compression (GZIP) for large messages
2. **Redis**: Set appropriate TTLs to limit memory
3. **WebSocket**: Batch updates if too frequent
4. **API**: Cache responses in browser (HTTP caching headers)
5. **Frontend**: Use React.memo to prevent unnecessary re-renders
