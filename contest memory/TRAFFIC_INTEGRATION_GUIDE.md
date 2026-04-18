# SmartVenue AI — Traffic Integration Guide

## Overview

SmartVenue AI now uses a **hybrid density model** that combines:
- **Simulation data** (particle system, local behavior)
- **Traffic data** (Google Maps, real-world signal)
- **Event data** (nearby events, special occasions)
- **Time-based patterns** (rush hours, weekends)

This makes the system **actually smart** — not just a simulation, but a real-world model.

---

## The Hybrid Model

### Formula

```
density = (trafficDensity × trafficWeight) + 
          (simulationDensity × simulationWeight) + 
          (eventBoost × eventWeight)
```

### Example

```
Traffic Density:     75 (from Google Maps)
Simulation Density:  60 (from particle system)
Event Boost:         +10 (concert nearby)
Zone Type:           mall

Weights (for mall):
- Traffic:     30%
- Simulation:  70%
- Event:       varies

Final Density = (75 × 0.3) + (60 × 0.7) + 10
              = 22.5 + 42 + 10
              = 74.5 → 75 (ROUNDED)
```

---

## How Traffic Conversion Works

### Step 1: Get Traffic Data

**Input**: Two points (origin, destination)

```
Origin:      40.7128, -74.0060  (Times Square)
Destination: 40.7580, -73.9855  (Central Park)
```

**Google Directions API Response**:
```json
{
  "duration": 400,              // Normal: 6 min 40 sec
  "duration_in_traffic": 600,   // Current: 10 min
  "distance": 15000             // 15 km
}
```

### Step 2: Calculate Congestion Ratio

```
congestionRatio = duration_in_traffic / duration
                = 600 / 400
                = 1.5
```

**Interpretation**:
- 1.0 = No congestion (free flow)
- 1.5 = 50% slower (moderate congestion)
- 2.0+ = Severe congestion

### Step 3: Convert to Density

```javascript
function trafficToDensity(congestionRatio) {
  if (congestionRatio >= 2.0) return 90;   // Severe
  if (congestionRatio >= 1.5) return 75;   // High
  if (congestionRatio >= 1.2) return 55;   // Moderate
  if (congestionRatio >= 1.0) return 35;   // Light
  return 20;                               // Free flow
}

// Example: 1.5 → 75 density
```

### Step 4: Apply Zone-Type Weighting

Different zones have different traffic/crowd relationships:

```javascript
const weights = {
  highway:  { traffic: 0.7, simulation: 0.3 },  // Traffic dominates
  arterial: { traffic: 0.6, simulation: 0.4 },  // Traffic important
  mall:     { traffic: 0.3, simulation: 0.7 },  // Simulation dominates
  stadium:  { traffic: 0.4, simulation: 0.6 },  // Mixed
  transit:  { traffic: 0.5, simulation: 0.5 },  // Equal weight
};
```

**Why?**
- **Highway**: Traffic is the primary signal
- **Mall**: Simulation (foot traffic) is more important
- **Stadium**: Mixed (parking + foot traffic)

### Step 5: Apply Time-Based Adjustment

```javascript
function applyTimeAdjustment(density, hour) {
  // Morning rush (6-9 AM)
  if (hour >= 6 && hour <= 9) {
    return Math.min(100, density + 15);
  }
  // Evening rush (5-7 PM)
  if (hour >= 17 && hour <= 19) {
    return Math.min(100, density + 20);
  }
  // Night (10 PM - 5 AM)
  if (hour >= 22 || hour <= 5) {
    return Math.max(0, density - 20);
  }
  return density;
}
```

### Step 6: Detect Spikes

```javascript
function detectSpike(currentDensity, previousDensity, threshold = 20) {
  if (!previousDensity) return false;
  const change = Math.abs(currentDensity - previousDensity);
  return change > threshold;  // Alert if >20% change
}
```

---

## API Endpoints

### Get Traffic Density for One Zone

```bash
GET /api/v1/traffic/density/:zoneId?simulation_density=60&use_cache=true
```

**Response**:
```json
{
  "zoneId": "downtown",
  "density": 74,
  "risk": "HIGH",
  "sources": {
    "traffic": 75,
    "simulation": 60,
    "event": 0
  },
  "congestionRatio": "1.50",
  "spike": false,
  "timestamp": "2024-04-17T10:30:00Z",
  "source": "traffic-derived"
}
```

### Get Traffic Densities for Multiple Zones

```bash
POST /api/v1/traffic/zones
Content-Type: application/json

{
  "zones": [
    {
      "id": "downtown",
      "origin": "40.7128,-74.0060",
      "destination": "40.7580,-73.9855",
      "type": "mall"
    },
    {
      "id": "airport",
      "origin": "40.7769,-73.8740",
      "destination": "40.7128,-74.0060",
      "type": "transit"
    }
  ],
  "simulation_densities": {
    "downtown": 60,
    "airport": 45
  }
}
```

**Response**:
```json
{
  "zones": [
    {
      "zoneId": "downtown",
      "density": 74,
      "risk": "HIGH",
      ...
    },
    {
      "zoneId": "airport",
      "density": 68,
      "risk": "HIGH",
      ...
    }
  ],
  "timestamp": "2024-04-17T10:30:00Z"
}
```

### Estimate Density (Fallback)

```bash
GET /api/v1/traffic/estimate/:zoneId
```

**Response**:
```json
{
  "zoneId": "downtown",
  "density": 75,
  "risk": "HIGH",
  "source": "time-based-estimate",
  "timestamp": "2024-04-17T10:30:00Z"
}
```

### Compare Traffic vs Simulation

```bash
GET /api/v1/traffic/comparison/:zoneId
```

**Response**:
```json
{
  "zoneId": "downtown",
  "traffic": {
    "density": 74,
    "risk": "HIGH",
    "source": "traffic-derived"
  },
  "simulation": {
    "density": 60,
    "risk": "MEDIUM",
    "source": "simulation"
  },
  "comparison": {
    "trafficDensity": 74,
    "simulationDensity": 60,
    "difference": 14
  },
  "timestamp": "2024-04-17T10:30:00Z"
}
```

---

## Frontend Usage

### Get Traffic Density

```javascript
import * as trafficApi from '../services/traffic-api.js';

// Get traffic density for one zone
const result = await trafficApi.getTrafficDensity('downtown', 60);
console.log(result.data.density); // 74

// Get traffic densities for multiple zones
const results = await trafficApi.getMultipleTrafficDensities(
  [
    { id: 'downtown', origin: '40.7128,-74.0060', destination: '40.7580,-73.9855', type: 'mall' },
    { id: 'airport', origin: '40.7769,-73.8740', destination: '40.7128,-74.0060', type: 'transit' }
  ],
  { downtown: 60, airport: 45 }
);
```

### Use in React Component

```javascript
import { useState, useEffect } from 'react';
import * as trafficApi from '../services/traffic-api.js';

export function TrafficDensityDisplay({ zoneId, simulationDensity }) {
  const [trafficDensity, setTrafficDensity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrafficDensity = async () => {
      try {
        const res = await trafficApi.getTrafficDensity(zoneId, simulationDensity);
        setTrafficDensity(res.data);
      } catch (err) {
        console.error('Failed to fetch traffic density:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrafficDensity();
    const interval = setInterval(fetchTrafficDensity, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [zoneId, simulationDensity]);

  if (loading) return <div>Loading...</div>;
  if (!trafficDensity) return <div>No data</div>;

  return (
    <div>
      <div>Density: {trafficDensity.density}%</div>
      <div>Risk: {trafficDensity.risk}</div>
      <div>Traffic: {trafficDensity.sources.traffic}%</div>
      <div>Simulation: {trafficDensity.sources.simulation}%</div>
      {trafficDensity.spike && <div style={{ color: 'red' }}>⚠️ SPIKE DETECTED</div>}
    </div>
  );
}
```

---

## Configuration

### Environment Variables

```bash
# Google Maps API Key (required for traffic data)
GOOGLE_MAPS_API_KEY=your-api-key-here

# Zone Configuration (in database or config file)
ZONES=[
  {
    "id": "downtown",
    "name": "Downtown",
    "origin": "40.7128,-74.0060",
    "destination": "40.7580,-73.9855",
    "type": "mall",
    "capacity": 5000
  }
]
```

### Zone Types

```javascript
const zoneTypes = {
  highway:  'Major road/highway',
  arterial: 'Arterial road',
  mall:     'Shopping mall',
  stadium:  'Stadium/venue',
  transit:  'Transit hub',
  default:  'Generic zone'
};
```

---

## Caching Strategy

Traffic data is cached for **5 minutes** to avoid hitting the API too often:

```javascript
// Cache key: traffic:density:{zoneId}
// TTL: 300 seconds (5 minutes)

// Check cache first
const cached = await cacheGet(`traffic:density:${zoneId}`);
if (cached) return cached;

// If not cached, fetch from API
const result = await getZoneTrafficDensity(zone);

// Cache the result
await cacheSet(`traffic:density:${zoneId}`, result, 300);
```

---

## Fallback Strategy

If Google Maps API is unavailable:

1. **Use cached data** (if available)
2. **Use time-based estimate** (based on hour of day)
3. **Use simulation data** (particle system)

```javascript
// Fallback chain
const trafficData = await getTrafficData(origin, destination);

if (!trafficData) {
  // Fallback 1: Use cached data
  const cached = await cacheGet(`traffic:density:${zoneId}`);
  if (cached) return cached;

  // Fallback 2: Use time-based estimate
  const estimated = estimateDensityFromTimeOfDay();
  return { density: estimated, source: 'time-based-estimate' };

  // Fallback 3: Use simulation data
  // (handled by frontend)
}
```

---

## Anomaly Detection

### Spike Detection

If density changes by >20% in one update, trigger an alert:

```javascript
const spike = detectSpike(currentDensity, previousDensity, threshold = 20);

if (spike) {
  // Trigger alert
  await createAlert('DENSITY_SPIKE', zoneId, 'HIGH', `Density jumped from ${previousDensity}% to ${currentDensity}%`);
}
```

### Example

```
Previous Density: 50%
Current Density:  75%
Change: 25% (> 20% threshold)
→ SPIKE DETECTED → Alert triggered
```

---

## Performance Considerations

### API Calls
- **Per zone**: 1 call to Google Directions API
- **Rate limit**: 50 requests per second (Google Maps)
- **Cost**: ~$0.005 per request

### Caching
- **TTL**: 5 minutes
- **Reduces API calls**: By ~95% (assuming 5-min update interval)
- **Cost savings**: Significant

### Optimization
```javascript
// Batch multiple zones in one request
const results = await getMultipleZonesTrafficDensity(zones);

// Use caching
const cached = getCachedTrafficData(key);

// Use time-based estimates as fallback
const estimated = estimateDensityFromTimeOfDay();
```

---

## Troubleshooting

### No Traffic Data

```bash
# Check if Google Maps API key is set
echo $GOOGLE_MAPS_API_KEY

# Check if API key is valid
curl "https://maps.googleapis.com/maps/api/directions/json?origin=40.7128,-74.0060&destination=40.7580,-73.9855&key=$GOOGLE_MAPS_API_KEY"
```

### High Latency

```bash
# Check cache hit rate
redis-cli KEYS "traffic:density:*" | wc -l

# Check API response time
time curl "https://maps.googleapis.com/maps/api/directions/json?..."
```

### Inaccurate Density

```bash
# Compare traffic vs simulation
curl http://localhost:8080/api/v1/traffic/comparison/downtown

# Adjust zone weights
# Edit zone configuration and change traffic/simulation weights
```

---

## Advanced: Custom Weighting

### Adjust Zone Weights

```javascript
// In traffic-converter.js
const weights = {
  highway: { traffic: 0.8, simulation: 0.2 },  // Increase traffic weight
  mall: { traffic: 0.2, simulation: 0.8 },     // Increase simulation weight
};
```

### Adjust Time-Based Boost

```javascript
// In traffic-converter.js
function applyTimeAdjustment(density, hour) {
  if (hour >= 6 && hour <= 9) {
    return Math.min(100, density + 25);  // Increase morning rush boost
  }
  // ...
}
```

### Add Event Boost

```javascript
// When event is nearby
const eventBoost = 20;  // +20% density

const result = convertTrafficToDensity({
  trafficDuration,
  normalDuration,
  simulationDensity,
  eventBoost,  // Add this
  zoneType,
  previousDensity,
});
```

---

## Summary

The hybrid model makes SmartVenue AI **actually smart**:

✅ **Real-world signal** (traffic data)
✅ **Local behavior** (simulation)
✅ **Time patterns** (rush hours)
✅ **Event awareness** (nearby events)
✅ **Anomaly detection** (spike alerts)
✅ **Graceful fallback** (when API unavailable)

This is how **real crowd management systems** work.
