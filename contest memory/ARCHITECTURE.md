# SmartVenue AI — Data Flow Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTVENUE AI ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Simulation      │
│  Engine          │
│  (Frontend)      │
└────────┬─────────┘
         │ POST /api/v1/crowd/update
         │ (every 3 seconds)
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ API Routes (REST)                                          │  │
│  │ - GET  /api/v1/crowd          (reads from Redis)          │  │
│  │ - GET  /api/v1/simulation     (reads from Redis)          │  │
│  │ - POST /api/v1/crowd/update   (writes to Kafka)           │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
    ┌─────────────┐                                        ┌──────────────┐
    │   KAFKA     │                                        │   REDIS      │
    │  (Event     │                                        │  (Fast       │
    │   Stream)   │                                        │   State)     │
    │             │                                        │              │
    │ Topics:     │                                        │ Keys:        │
    │ - crowd.    │                                        │ - crowd:all  │
    │   events    │                                        │ - crowd:zone │
    │ - crowd.    │                                        │ - alerts:    │
    │   alerts    │                                        │   active     │
    │ - location. │                                        │ - simulation │
    │   updates   │                                        │   :status    │
    └─────────────┘                                        └──────────────┘
         ▲                                                         ▲
         │                                                         │
         │ Publish                                                 │ Subscribe
         │ (Kafka Producer)                                        │ (Redis Pub/Sub)
         │                                                         │
    ┌────┴─────────────────────────────────────────────────────────┴────┐
    │                                                                    │
    │  ┌──────────────────────────────────────────────────────────┐    │
    │  │  KAFKA CONSUMER SERVICE                                  │    │
    │  │  (The "Brain" - Processes & Enriches Data)              │    │
    │  │                                                          │    │
    │  │  1. Read from Kafka (crowd.events)                      │    │
    │  │  2. Calculate risk level (density → risk)               │    │
    │  │  3. Store in Redis (fast access)                        │    │
    │  │  4. Publish to Redis Pub/Sub (real-time)               │    │
    │  │                                                          │    │
    │  │  Process Flow:                                           │    │
    │  │  Kafka Event → Risk Calculation → Redis Store           │    │
    │  │                                  → Redis Pub/Sub         │    │
    │  └──────────────────────────────────────────────────────────┘    │
    │                                                                    │
    └────────────────────────────────────────────────────────────────────┘
         │
         │ Subscribe to Redis Pub/Sub
         │
         ▼
    ┌──────────────────────────────────────────────────────────────┐
    │  WEBSOCKET SERVER                                            │
    │  (Real-Time Broadcasting)                                    │
    │                                                              │
    │  - Receives updates from Redis Pub/Sub                      │
    │  - Broadcasts to all connected clients                      │
    │  - Fallback: polls Redis every 2 seconds                    │
    └──────────────────────────────────────────────────────────────┘
         │
         │ WS /api/v1/stream
         │
         ▼
    ┌──────────────────────────────────────────────────────────────┐
    │  FRONTEND (React)                                            │
    │                                                              │
    │  - WebSocket client connects                                │
    │  - Receives real-time updates                               │
    │  - Renders live dashboard                                   │
    │  - Sends simulation updates via REST API                    │
    └──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1. Simulation Tick (Every 3 seconds)

```
Frontend Simulation
    │
    ├─ Calculate crowd state
    │  (200 particles, density, risk)
    │
    └─ POST /api/v1/crowd/update
       {
         "zoneId": "A1",
         "density": 78,
         "risk": "HIGH",
         "flowRate": 62,
         "peopleCount": 340
       }
       │
       ▼
    Express Server
       │
       ├─ Validate input
       ├─ Publish to Kafka (crowd.events)
       ├─ Stream to BigQuery
       │
       └─ Return 200 OK
```

### 2. Kafka Consumer Processing

```
Kafka Topic: crowd.events
    │
    ▼
Kafka Consumer Service
    │
    ├─ Parse message
    ├─ Calculate risk level
    │  (density > 80 → CRITICAL)
    │  (density > 60 → HIGH)
    │  (density > 40 → MEDIUM)
    │  (else → LOW)
    │
    ├─ Enrich event with risk
    │
    ├─ Store in Redis
    │  Key: crowd:zone:A1
    │  TTL: 3 seconds
    │
    └─ Publish to Redis Pub/Sub
       Channel: crowd-updates
       Message: {
         "type": "CROWD_UPDATE",
         "zoneId": "A1",
         "density": 78,
         "risk": "HIGH",
         ...
       }
```

### 3. Real-Time WebSocket Broadcast

```
Redis Pub/Sub Channel: crowd-updates
    │
    ▼
WebSocket Server (subscribed)
    │
    ├─ Receives message
    │
    └─ Broadcast to all connected clients
       │
       ├─ Client 1 (Dashboard)
       ├─ Client 2 (Analytics)
       └─ Client 3 (Mobile)
```

### 4. API Read (Fast from Redis)

```
Frontend API Call
    │
    └─ GET /api/v1/crowd
       │
       ▼
    Express Route Handler
       │
       ├─ Read from Redis
       │  Key: crowd:all
       │  (instant response, no DB query)
       │
       └─ Return 200 OK
          {
            "zones": [
              {
                "zoneId": "A1",
                "density": 78,
                "risk": "HIGH",
                ...
              }
            ]
          }
```

---

## Component Responsibilities

### Kafka (Event Stream)
- **Role**: Backbone of the system
- **Throughput**: High (many zones, many events)
- **Decoupling**: Producers and consumers are independent
- **Topics**:
  - `crowd.events` — Raw simulation ticks
  - `crowd.alerts` — High-severity incidents
  - `location.updates` — User location pings

### Redis (Fast State)
- **Role**: Real-time state store
- **Speed**: Sub-millisecond reads
- **TTL**: 3-5 seconds (matches simulation tick)
- **Keys**:
  - `crowd:all` — All zones aggregate
  - `crowd:zone:A1` — Specific zone
  - `alerts:active` — Active alerts
  - `simulation:status` — Simulation state

### Kafka Consumer Service
- **Role**: The "brain" of the system
- **Responsibility**: Process raw events → enrich → store
- **Logic**:
  - Parse Kafka messages
  - Calculate risk levels
  - Enrich with metadata
  - Store in Redis
  - Publish to Redis Pub/Sub

### WebSocket Server
- **Role**: Real-time broadcasting
- **Connection**: Redis Pub/Sub subscriber
- **Broadcast**: To all connected clients
- **Fallback**: Polls Redis every 2 seconds if Pub/Sub unavailable

### Express API
- **Role**: REST endpoints for client requests
- **Read**: From Redis (fast)
- **Write**: To Kafka (async)
- **Validation**: Input sanitization, rate limiting

---

## Why This Architecture?

### Scalability
- **Kafka** handles unlimited events
- **Redis** serves instant reads
- **Decoupled** services scale independently

### Resilience
- **Kafka** persists events (replay capability)
- **Redis** has fallback polling
- **Graceful degradation** if any component fails

### Real-Time
- **Redis Pub/Sub** for instant updates
- **WebSocket** for live dashboard
- **Sub-second latency** from event to UI

### Maintainability
- **Clear separation** of concerns
- **Modular** services
- **Easy to test** each component

---

## Deployment Checklist

### Local Development
```bash
# Start Kafka (Docker)
docker run -d --name kafka -p 9092:9092 confluentinc/cp-kafka:latest

# Start Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:latest

# Start server
npm run start
```

### Production (GCP)
```bash
# Kafka → Confluent Cloud or Google Cloud Pub/Sub
# Redis → Google Cloud Memorystore
# Server → Cloud Run

./deploy.sh
```

### Environment Variables
```bash
KAFKA_BROKERS=kafka-broker-1:9092,kafka-broker-2:9092
KAFKA_USERNAME=your-username
KAFKA_PASSWORD=your-password
KAFKA_SSL=true

REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password

GOOGLE_CLOUD_PROJECT=your-project-id
```

---

## Monitoring

### Kafka Consumer
```bash
# Check consumer lag
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group smartvenue-processor --describe
```

### Redis
```bash
# Check memory usage
redis-cli INFO memory

# Monitor pub/sub
redis-cli PUBSUB CHANNELS
```

### WebSocket
```bash
# Check connected clients
curl http://localhost:8080/api/health
```

---

## Performance Metrics

| Component | Latency | Throughput |
|-----------|---------|-----------|
| Kafka Publish | ~10ms | 100k+ events/sec |
| Redis Read | <1ms | 1M+ ops/sec |
| WebSocket Broadcast | ~50ms | 10k+ clients |
| API Response | ~5ms | 10k+ req/sec |

---

## Future Enhancements

1. **Aggregation Service**
   - Average density per 10 seconds
   - Peak detection
   - Trend analysis

2. **Historical Storage**
   - MongoDB for long-term data
   - BigQuery for analytics

3. **ML Pipeline**
   - Anomaly detection
   - Predictive alerts
   - Crowd flow optimization

4. **Multi-Region**
   - Kafka replication
   - Redis cluster
   - Global WebSocket mesh
