# SmartVenue AI — Deployment Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker (for Kafka & Redis)
- GCP Project (optional, for cloud services)

### 1. Start Infrastructure

```bash
# Start Kafka
docker run -d \
  --name kafka \
  -p 9092:9092 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  confluentinc/cp-kafka:latest

# Start Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest

# Start Zookeeper (required by Kafka)
docker run -d \
  --name zookeeper \
  -p 2181:2181 \
  confluentinc/cp-zookeeper:latest
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env`:
```bash
# Server
PORT=8080
NODE_ENV=development

# Kafka
KAFKA_BROKERS=localhost:9092

# Redis
REDIS_URL=redis://localhost:6379

# GCP (optional)
GOOGLE_CLOUD_PROJECT=your-project-id
GEMINI_API_KEY=your-gemini-key
```

### 4. Start Server

```bash
npm run start
```

### 5. Start Frontend (separate terminal)

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## Production Deployment (GCP Cloud Run)

### 1. Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Set Up GCP Services

```bash
# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  bigquery.googleapis.com \
  pubsub.googleapis.com \
  logging.googleapis.com \
  secretmanager.googleapis.com

# Create Firestore database
gcloud firestore databases create --region=us-central1

# Create BigQuery dataset
bq mk --dataset smartvenue

# Create Pub/Sub topics
gcloud pubsub topics create crowd-events
gcloud pubsub topics create crowd-alerts
gcloud pubsub topics create location-updates
```

### 3. Set Up Kafka (Confluent Cloud)

```bash
# Create Confluent Cloud account
# https://confluent.cloud

# Create cluster and topics:
# - crowd.events
# - crowd.alerts
# - location.updates

# Get bootstrap server and credentials
export KAFKA_BROKERS="your-bootstrap-server:9092"
export KAFKA_USERNAME="your-username"
export KAFKA_PASSWORD="your-password"
```

### 4. Set Up Redis (Google Cloud Memorystore)

```bash
# Create Redis instance
gcloud redis instances create smartvenue-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=7.0

# Get connection string
gcloud redis instances describe smartvenue-redis \
  --region=us-central1 \
  --format="value(host)"
```

### 5. Store Secrets

```bash
# Store Gemini API key
echo -n "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Store Kafka credentials
echo -n "your-kafka-username" | gcloud secrets create KAFKA_USERNAME --data-file=-
echo -n "your-kafka-password" | gcloud secrets create KAFKA_PASSWORD --data-file=-

# Store Redis password (if applicable)
echo -n "your-redis-password" | gcloud secrets create REDIS_PASSWORD --data-file=-
```

### 6. Deploy to Cloud Run

```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/smartvenue-ai

# Deploy to Cloud Run
gcloud run deploy smartvenue-ai \
  --image gcr.io/YOUR_PROJECT_ID/smartvenue-ai \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars \
    GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,\
    KAFKA_BROKERS=your-bootstrap-server:9092,\
    KAFKA_SSL=true,\
    REDIS_URL=redis://your-redis-host:6379,\
    ALLOWED_ORIGINS=https://your-domain.com \
  --set-secrets \
    GEMINI_API_KEY=GEMINI_API_KEY:latest,\
    KAFKA_USERNAME=KAFKA_USERNAME:latest,\
    KAFKA_PASSWORD=KAFKA_PASSWORD:latest,\
    REDIS_PASSWORD=REDIS_PASSWORD:latest \
  --allow-unauthenticated
```

### 7. Verify Deployment

```bash
# Get service URL
gcloud run services describe smartvenue-ai --region us-central1 --format="value(status.url)"

# Test health endpoint
curl https://your-service-url/api/health

# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=smartvenue-ai" \
  --limit 50 \
  --format json
```

---

## Data Flow in Production

### 1. Simulation Tick (Frontend)
```
Frontend Canvas Simulation
  ↓
POST /api/v1/crowd/update
  ↓
Express Server (validates input)
  ↓
Kafka Producer (publishes to crowd.events)
  ↓
BigQuery Streaming (ingests for analytics)
```

### 2. Kafka Consumer Processing
```
Kafka Topic: crowd.events
  ↓
Consumer Service (smartvenue-processor group)
  ↓
Risk Calculation (density → risk level)
  ↓
Redis Store (crowd:zone:A1, TTL=3s)
  ↓
Redis Pub/Sub (publish to crowd-updates channel)
```

### 3. Real-Time WebSocket
```
Redis Pub/Sub: crowd-updates
  ↓
WebSocket Server (subscribed)
  ↓
Broadcast to all connected clients
  ↓
Frontend Dashboard (live update)
```

### 4. API Reads
```
Frontend API Call: GET /api/v1/crowd
  ↓
Express Route Handler
  ↓
Redis Read (crowd:all, <1ms)
  ↓
Return JSON response
```

---

## Monitoring & Observability

### Cloud Logging

```bash
# View all logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 100 \
  --format json

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --limit 50

# Real-time tail
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 10 \
  --follow
```

### Kafka Consumer Lag

```bash
# Check consumer group status
kafka-consumer-groups --bootstrap-server $KAFKA_BROKERS \
  --group smartvenue-processor \
  --describe
```

### Redis Monitoring

```bash
# Connect to Redis
redis-cli -h your-redis-host

# Check memory
INFO memory

# Monitor pub/sub
PUBSUB CHANNELS

# Check key count
DBSIZE
```

### BigQuery Analytics

```bash
# Query crowd events
bq query --use_legacy_sql=false '
  SELECT
    zoneId,
    AVG(density) as avg_density,
    MAX(density) as peak_density,
    COUNT(*) as event_count
  FROM `YOUR_PROJECT.smartvenue.crowd_events`
  WHERE timestamp > TIMESTAMP_SUB(NOW(), INTERVAL 1 HOUR)
  GROUP BY zoneId
'
```

---

## Troubleshooting

### Kafka Consumer Not Processing

```bash
# Check if consumer is running
gcloud logging read "Kafka consumer started" --limit 1

# Check for errors
gcloud logging read "Kafka consumer error" --limit 10

# Restart service
gcloud run services update-traffic smartvenue-ai --to-revisions LATEST=100
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h your-redis-host ping

# Check Redis memory
redis-cli -h your-redis-host INFO memory

# Clear cache if needed
redis-cli -h your-redis-host FLUSHALL
```

### WebSocket Clients Not Receiving Updates

```bash
# Check WebSocket connections
curl https://your-service-url/api/health

# Check Redis Pub/Sub
redis-cli -h your-redis-host PUBSUB CHANNELS

# Check logs for WebSocket errors
gcloud logging read "WebSocket" --limit 20
```

### High Latency

```bash
# Check Kafka lag
kafka-consumer-groups --bootstrap-server $KAFKA_BROKERS \
  --group smartvenue-processor \
  --describe

# Check Redis latency
redis-cli -h your-redis-host --latency

# Check Cloud Run metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision"'
```

---

## Performance Tuning

### Kafka Consumer
```bash
# Increase consumer parallelism
# In kafka-consumer.js, adjust:
# - sessionTimeout
# - heartbeatInterval
# - maxBytesPerPartition
```

### Redis
```bash
# Increase memory
gcloud redis instances update smartvenue-redis \
  --size=5 \
  --region=us-central1

# Enable persistence
gcloud redis instances update smartvenue-redis \
  --persistence-mode=rdb \
  --region=us-central1
```

### Cloud Run
```bash
# Increase CPU/Memory
gcloud run services update smartvenue-ai \
  --cpu 4 \
  --memory 4Gi \
  --region us-central1

# Increase concurrency
gcloud run services update smartvenue-ai \
  --concurrency 100 \
  --region us-central1
```

---

## Scaling Strategy

### Horizontal Scaling
- **Cloud Run**: Auto-scales based on traffic
- **Kafka**: Add more partitions for higher throughput
- **Redis**: Use Redis Cluster for distributed caching

### Vertical Scaling
- **Cloud Run**: Increase CPU/Memory
- **Kafka**: Increase broker resources
- **Redis**: Increase instance size

### Load Testing

```bash
# Install Apache Bench
apt-get install apache2-utils

# Load test API
ab -n 10000 -c 100 https://your-service-url/api/health

# Load test WebSocket
# Use tools like Artillery or k6
```

---

## Disaster Recovery

### Backup Strategy
```bash
# Backup BigQuery data
bq extract smartvenue.crowd_events gs://your-bucket/backup/crowd_events_*.json

# Backup Firestore
gcloud firestore export gs://your-bucket/firestore-backup
```

### Recovery Procedure
```bash
# Restore from backup
bq load smartvenue.crowd_events gs://your-bucket/backup/crowd_events_*.json

# Restart Kafka consumer
gcloud run services update-traffic smartvenue-ai --to-revisions LATEST=100
```

---

## Cost Optimization

### GCP Services
- **Cloud Run**: Pay per request (~$0.40 per million requests)
- **Firestore**: Pay per read/write (~$0.06 per 100k reads)
- **BigQuery**: Pay per GB scanned (~$6.25 per TB)
- **Redis**: Pay per hour (~$0.05/hour for 1GB)

### Recommendations
1. Use Redis TTL to limit memory usage
2. Archive old BigQuery data to Cloud Storage
3. Use Cloud Run's auto-scaling
4. Monitor and optimize Kafka partitions

---

## Support & Resources

- **GCP Documentation**: https://cloud.google.com/docs
- **Kafka Documentation**: https://kafka.apache.org/documentation
- **Redis Documentation**: https://redis.io/documentation
- **SmartVenue Issues**: Check GitHub issues
