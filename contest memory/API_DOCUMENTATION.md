# SmartVenue AI — API Documentation

## Overview

SmartVenue AI is a production-grade crowd management system with a clean REST API, real-time WebSocket streaming, and a state machine architecture.

**Base URL:** `/api/v1`

---

## Architecture

### Backend Structure
```
/src
  /api
    /routes
      crowd.routes.js        # Crowd data endpoints
      simulation.routes.js   # Simulation control
      alerts.routes.js       # Alert management
      zones.routes.js        # Zone configuration
      analytics.routes.js    # Analytics & history
    websocket.js             # Real-time streaming
  /services
    redis-cache.js           # Caching layer
    kafka-bus.js             # Event publishing
    bigquery-stream.js       # Analytics ingestion
    cloud-logger.js          # Structured logging
```

### Frontend Structure
```
/src
  /pages
    Dashboard.jsx            # Main command center
  /services
    api.js                   # Axios API client
    websocket.js             # WebSocket client
  /hooks
    useCrowdData.js          # State management hook
```

---

## API Endpoints

### 1. Crowd Data

#### GET `/api/v1/crowd`
Returns all zones with current crowd data.

**Response:**
```json
{
  "zones": [
    {
      "zoneId": "A1",
      "density": 78,
      "risk": "HIGH",
      "flowRate": 62,
      "peopleCount": 340,
      "timestamp": "2024-04-17T10:30:00Z"
    }
  ],
  "lastUpdate": "2024-04-17T10:30:00Z"
}
```

#### GET `/api/v1/crowd/:zoneId`
Returns specific zone crowd data.

**Response:**
```json
{
  "zoneId": "A1",
  "density": 78,
  "risk": "HIGH",
  "flowRate": 62,
  "peopleCount": 340,
  "timestamp": "2024-04-17T10:30:00Z"
}
```

#### POST `/api/v1/crowd/update`
Ingest crowd data from simulation or sensors.

**Request Body:**
```json
{
  "zoneId": "A1",
  "density": 78,
  "risk": "HIGH",
  "flowRate": 62,
  "peopleCount": 340
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "zoneId": "A1",
    "density": 78,
    "risk": "HIGH",
    "flowRate": 62,
    "peopleCount": 340,
    "timestamp": "2024-04-17T10:30:00Z"
  }
}
```

---

### 2. Simulation Control

#### GET `/api/v1/simulation/status`
Returns current simulation state.

**Response:**
```json
{
  "state": "SIMULATING",
  "startedAt": "2024-04-17T10:30:00Z",
  "crowdSize": 200,
  "speed": 1
}
```

**States:** `IDLE`, `SIMULATING`, `ALERT`, `CRITICAL`

#### POST `/api/v1/simulation/start`
Start the simulation.

**Request Body:**
```json
{
  "crowdSize": 200,
  "speed": 1
}
```

**Response:**
```json
{
  "ok": true,
  "status": {
    "state": "SIMULATING",
    "startedAt": "2024-04-17T10:30:00Z",
    "crowdSize": 200,
    "speed": 1
  }
}
```

#### POST `/api/v1/simulation/stop`
Stop the simulation.

**Response:**
```json
{
  "ok": true,
  "status": {
    "state": "IDLE",
    "startedAt": null,
    "crowdSize": 0,
    "speed": 1
  }
}
```

#### POST `/api/v1/simulation/reset`
Reset simulation to initial state.

**Response:**
```json
{
  "ok": true,
  "status": {
    "state": "IDLE",
    "startedAt": null,
    "crowdSize": 0,
    "speed": 1
  }
}
```

---

### 3. Alerts System

#### GET `/api/v1/alerts`
Returns all active alerts.

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert-1713347400000",
      "type": "OVERCROWDING",
      "zone": "A1",
      "severity": "HIGH",
      "message": "Zone A1 approaching capacity",
      "createdAt": "2024-04-17T10:30:00Z",
      "dismissed": false
    }
  ],
  "count": 1
}
```

#### POST `/api/v1/alerts`
Create a new alert.

**Request Body:**
```json
{
  "type": "OVERCROWDING",
  "zone": "A1",
  "severity": "HIGH",
  "message": "Zone A1 approaching capacity"
}
```

**Alert Types:** `OVERCROWDING`, `EVACUATION`, `BOTTLENECK`, `SYSTEM`
**Severity Levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**Response:**
```json
{
  "ok": true,
  "alert": {
    "id": "alert-1713347400000",
    "type": "OVERCROWDING",
    "zone": "A1",
    "severity": "HIGH",
    "message": "Zone A1 approaching capacity",
    "createdAt": "2024-04-17T10:30:00Z",
    "dismissed": false
  }
}
```

#### DELETE `/api/v1/alerts/:id`
Dismiss an alert.

**Response:**
```json
{
  "ok": true
}
```

---

### 4. Zones Management

#### GET `/api/v1/zones`
Returns all zones.

**Response:**
```json
{
  "zones": [
    {
      "id": "zone-1713347400000",
      "name": "Main Entrance",
      "capacity": 500,
      "location": "North Gate",
      "createdAt": "2024-04-17T10:30:00Z",
      "density": 0,
      "risk": "LOW"
    }
  ],
  "count": 1
}
```

#### POST `/api/v1/zones`
Create a new zone.

**Request Body:**
```json
{
  "name": "Main Entrance",
  "capacity": 500,
  "location": "North Gate"
}
```

**Response:**
```json
{
  "ok": true,
  "zone": {
    "id": "zone-1713347400000",
    "name": "Main Entrance",
    "capacity": 500,
    "location": "North Gate",
    "createdAt": "2024-04-17T10:30:00Z",
    "density": 0,
    "risk": "LOW"
  }
}
```

#### PUT `/api/v1/zones/:id`
Update a zone.

**Request Body:**
```json
{
  "name": "Main Entrance",
  "capacity": 600,
  "location": "North Gate"
}
```

**Response:**
```json
{
  "ok": true,
  "zone": { ... }
}
```

#### DELETE `/api/v1/zones/:id`
Delete a zone.

**Response:**
```json
{
  "ok": true
}
```

---

### 5. Analytics

#### GET `/api/v1/analytics/summary`
Returns overall system analytics.

**Response:**
```json
{
  "totalPeople": 1250,
  "avgDensity": 65,
  "peakDensity": 92,
  "alertsTriggered": 3,
  "uptime": "100%",
  "timestamp": "2024-04-17T10:30:00Z"
}
```

#### GET `/api/v1/analytics/history?zoneId=A1`
Returns historical data for a specific zone.

**Response:**
```json
{
  "zoneId": "A1",
  "dataPoints": [
    { "timestamp": "2024-04-17T10:00:00Z", "density": 45 },
    { "timestamp": "2024-04-17T10:05:00Z", "density": 52 }
  ],
  "averageDensity": 48,
  "peakDensity": 78,
  "minDensity": 20
}
```

---

## Real-Time WebSocket

### Connection
```
WS /api/v1/stream
```

### Message Types

#### CROWD_UPDATE
Sent every 2 seconds with latest crowd data.

```json
{
  "type": "CROWD_UPDATE",
  "data": {
    "crowd": { ... },
    "simulation": { ... },
    "alerts": [ ... ]
  },
  "timestamp": "2024-04-17T10:30:00Z"
}
```

#### ALERT
Sent when a new alert is created.

```json
{
  "type": "ALERT",
  "data": {
    "id": "alert-1713347400000",
    "type": "OVERCROWDING",
    "zone": "A1",
    "severity": "HIGH",
    "message": "Zone A1 approaching capacity",
    "createdAt": "2024-04-17T10:30:00Z",
    "dismissed": false
  },
  "timestamp": "2024-04-17T10:30:00Z"
}
```

---

## Frontend Usage

### Using the API Service

```javascript
import * as api from '../services/api.js';

// Fetch crowd data
const crowdData = await api.getCrowd();

// Start simulation
await api.startSimulation(200, 1);

// Create alert
await api.createAlert('OVERCROWDING', 'A1', 'HIGH', 'Zone A1 overcrowded');
```

### Using the WebSocket Service

```javascript
import ws from '../services/websocket.js';

// Connect
await ws.connect();

// Listen for updates
ws.on('CROWD_UPDATE', (data) => {
  console.log('Crowd data:', data);
});

ws.on('ALERT', (alert) => {
  console.log('New alert:', alert);
});

// Check connection status
if (ws.isConnected()) {
  console.log('Connected');
}
```

### Using the useCrowdData Hook

```javascript
import { useCrowdData } from '../hooks/useCrowdData.js';

function MyComponent() {
  const {
    crowd,
    simulation,
    alerts,
    loading,
    error,
    startSimulation,
    stopSimulation,
    resetSimulation,
    dismissAlert,
    wsConnected,
  } = useCrowdData();

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {crowd && <p>Density: {crowd.density}%</p>}
    </div>
  );
}
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Description of the error"
}
```

**HTTP Status Codes:**
- `200` — Success
- `400` — Bad Request (validation error)
- `404` — Not Found
- `429` — Rate Limited
- `500` — Server Error

---

## Rate Limiting

- `/api/v1/advice` — 20 requests per minute per user
- `/api/v1/location` — 100 requests per minute per user

---

## Deployment

### Environment Variables

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
ALLOWED_ORIGINS=https://yourdomain.com
GEMINI_API_KEY=your-gemini-key
```

### Cloud Run

```bash
./deploy.sh
```

---

## State Machine

The simulation follows a state machine:

```
IDLE → SIMULATING → ALERT → CRITICAL
  ↑                           ↓
  └───────────────────────────┘
```

- **IDLE**: No simulation running
- **SIMULATING**: Normal operation
- **ALERT**: High density detected (>60%)
- **CRITICAL**: Critical density (>80%)

---

## Performance

- **WebSocket broadcasts:** Every 2 seconds
- **Redis cache TTL:** 5 minutes (configurable)
- **BigQuery ingestion:** Real-time streaming
- **Kafka topics:** `crowd.events`, `crowd.alerts`, `location.updates`

---

## Support

For issues or questions, check the logs:

```bash
gcloud logging read "resource.type=cloud_run_revision" --project=your-project-id
```
