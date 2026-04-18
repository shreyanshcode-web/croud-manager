# Operations Center Guide

## Overview

The Operations Center is a comprehensive monitoring and management interface for SmartVenue AI. It provides real-time visibility into system health, GCP service status, and incident management in a single unified dashboard.

**Access:** Navigate to `/ops` or click the "OPS" button from the Dashboard.

---

## Features

### 1. System Health Dashboard

Real-time monitoring of system performance and resource usage.

#### Service Status
- **API Server**: Express backend health
- **Redis Cache**: In-memory cache connectivity
- **Kafka Bus**: Event streaming service status

#### Performance Metrics
- **Requests/sec**: Current request throughput (target: 50-400 req/s)
- **Avg Response Time**: Average API response latency (target: 20-150 ms)
- **Error Rate**: Percentage of failed requests (target: <1%)
- **Active Connections**: Current WebSocket and HTTP connections

#### Resource Usage
- **Memory Usage**: System memory consumption (target: <70%)
- **CPU Usage**: CPU utilization (target: <60%)
- **Uptime**: System uptime in hours

**Color Coding:**
- 🟢 Green: Healthy (within normal range)
- 🟡 Amber: Warning (approaching threshold)
- 🔴 Red: Critical (exceeds threshold)

---

### 2. GCP Services Panel

Displays the status of all Google Cloud services integrated with SmartVenue AI.

#### Services Monitored
1. **Cloud Run** - Serverless container hosting
2. **Redis Cache** - In-memory caching layer
3. **Kafka Event Bus** - Real-time event streaming
4. **BigQuery ML** - Machine learning and analytics
5. **Firestore** - Real-time database
6. **Secret Manager** - Credential management
7. **Vertex AI / Gemini** - AI-powered recommendations
8. **Identity Platform** - Operator authentication
9. **Cloud Armor** - WAF and DDoS protection
10. **Cloud Logging** - Structured logging

#### Status Indicators
- **Connected**: Service is operational
- **Unavailable**: Service is down or unreachable
- **Checking**: Status check in progress

#### Summary Metrics
- Services Active: Count of operational services
- Redis Cache: Online/Offline status
- Kafka Bus: Online/Offline status
- GCP Project: Current project ID

---

### 3. Incident Tracker

Manage operational incidents and emergency responses.

#### Create Incident
1. Click "CREATE INCIDENT"
2. Fill in incident details:
   - **Title**: Brief incident description
   - **Location**: Affected zone or area
   - **Severity**: low, medium, high, or critical
3. Click "CREATE" to log the incident

#### Evacuation Protocol
For critical situations, use the evacuation button:
1. Click "EVACUATE VENUE"
2. Confirm the action (2-step confirmation)
3. System logs the evacuation with timestamp and operator info
4. All connected clients receive evacuation alert

#### Incident History
- View all active incidents
- See incident creation time and operator
- Dismiss resolved incidents

---

## Workflow Examples

### Scenario 1: Monitoring System Health

1. Navigate to Operations Center (`/ops`)
2. Check "System Health" tab
3. Review service status indicators
4. Monitor performance metrics:
   - If error rate > 1%, investigate API logs
   - If response time > 150ms, check database performance
   - If memory > 70%, consider scaling up

### Scenario 2: Responding to Service Outage

1. Notice Redis Cache shows "unavailable" in GCP Services
2. Check System Health dashboard for impact:
   - Error rate may increase
   - Response times may spike
3. Create incident:
   - Title: "Redis Cache Outage"
   - Location: "Infrastructure"
   - Severity: "high"
4. Investigate root cause
5. Once resolved, dismiss incident

### Scenario 3: Emergency Evacuation

1. Detect critical safety issue
2. Navigate to Incidents tab
3. Click "EVACUATE VENUE"
4. Confirm evacuation (2-step confirmation)
5. System broadcasts evacuation alert to all clients
6. Log incident with details for post-event analysis

---

## Performance Thresholds

### Healthy Ranges
| Metric | Warning | Critical |
|--------|---------|----------|
| Requests/sec | 400 | 500 |
| Response Time (ms) | 150 | 200 |
| Error Rate (%) | 1 | 2 |
| Active Connections | 80 | 100 |
| Memory Usage (%) | 70 | 85 |
| CPU Usage (%) | 60 | 80 |

### Recommended Actions
- **Warning**: Monitor closely, prepare to scale
- **Critical**: Immediate action required, consider failover

---

## Integration with Other Pages

### Dashboard
- Quick access to live simulation
- Control simulation parameters
- View active alerts

### Analytics
- Historical performance data
- Trend analysis
- Zone-specific metrics

### Zones
- Zone configuration
- Capacity management
- Zone-specific settings

### Settings
- System configuration
- Display preferences
- Performance tuning

---

## API Endpoints Used

The Operations Center uses these backend endpoints:

```
GET /api/health
  Returns: { status, redis, kafka, gcp, timestamp }

GET /api/incidents
  Returns: Array of active incidents

POST /api/incident
  Body: { title, location, severity }
  Returns: { ok, incident }
```

---

## Troubleshooting

### Operations Center Not Loading
- Check browser console for errors
- Verify backend is running (`npm start`)
- Check CORS configuration in `server.js`

### Service Status Shows "Unavailable"
- Verify service is running
- Check network connectivity
- Review service logs in GCP Console

### Metrics Not Updating
- Check WebSocket connection status
- Verify `/api/health` endpoint is responding
- Check browser network tab for failed requests

### Incident Creation Fails
- Ensure you're authenticated (if required)
- Check incident data is valid
- Verify backend is accepting POST requests

---

## Best Practices

1. **Regular Monitoring**: Check Operations Center every 15-30 minutes during events
2. **Proactive Scaling**: Scale up when metrics approach warning thresholds
3. **Incident Documentation**: Always create incidents for significant events
4. **Alert Response**: Respond to critical alerts within 5 minutes
5. **Post-Event Review**: Analyze incidents after events to improve processes

---

## Future Enhancements

Planned improvements for the Operations Center:

- [ ] Custom alert thresholds
- [ ] Historical metrics trending
- [ ] Automated scaling policies
- [ ] Predictive alerts
- [ ] Integration with PagerDuty/Slack
- [ ] Custom dashboards
- [ ] Real-time log streaming
- [ ] Performance profiling tools

---

## Support

For issues or questions about the Operations Center:

1. Check this guide first
2. Review system logs in GCP Cloud Logging
3. Check backend health endpoint: `GET /api/health`
4. Contact the development team with:
   - Screenshot of the issue
   - Browser console errors
   - Recent system metrics
   - Steps to reproduce
