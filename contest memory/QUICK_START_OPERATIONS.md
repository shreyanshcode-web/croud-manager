# Quick Start: Operations Center

## Access the Operations Center

**URL:** `http://localhost:5173/ops` (development) or `/ops` (production)

**Navigation:**
- From Dashboard: Click "OPS" button in top-right
- From Landing Page: Click "DASHBOARD" → Click "OPS"
- Direct URL: `/ops`

---

## Three Main Tabs

### 1️⃣ System Health
**What it shows:** Real-time system performance

**Key Metrics:**
- 🟢 Service Status (API, Redis, Kafka)
- 📊 Performance (requests/sec, response time, error rate)
- 💾 Resources (memory, CPU, uptime)

**What to look for:**
- Green indicators = healthy
- Amber indicators = warning (approaching limits)
- Red indicators = critical (action needed)

**Quick Actions:**
- If error rate > 1%: Check API logs
- If response time > 150ms: Check database
- If memory > 70%: Consider scaling

---

### 2️⃣ GCP Services
**What it shows:** Status of all Google Cloud services

**Services Monitored:**
- Cloud Run (API hosting)
- Redis Cache (data caching)
- Kafka (event streaming)
- BigQuery (analytics)
- Firestore (database)
- Secret Manager (credentials)
- Vertex AI (AI/ML)
- Identity Platform (auth)
- Cloud Armor (security)
- Cloud Logging (logs)

**Status Meanings:**
- 🟢 Connected = service is running
- 🟡 Unavailable = service is down
- ⏳ Checking = status check in progress

---

### 3️⃣ Incidents
**What it shows:** Operational incidents and emergencies

**Create Incident:**
1. Click "CREATE INCIDENT"
2. Fill in:
   - Title (what happened)
   - Location (where it happened)
   - Severity (low/medium/high/critical)
3. Click "CREATE"

**Emergency Evacuation:**
1. Click "EVACUATE VENUE"
2. Confirm (2-step confirmation)
3. System broadcasts evacuation alert

**View Incidents:**
- See all active incidents
- View creation time and operator
- Dismiss resolved incidents

---

## Common Scenarios

### Scenario A: Everything is Green ✅
- System is healthy
- No action needed
- Continue monitoring

### Scenario B: Amber Warning ⚠️
- System approaching limits
- Monitor closely
- Prepare to scale if needed
- Example: Memory at 65% → prepare to scale

### Scenario C: Red Critical 🔴
- System needs immediate attention
- Take action now
- Example: Error rate at 2% → investigate API

### Scenario D: Service Down 🔴
- GCP service is unavailable
- Check GCP Console
- Create incident
- Contact GCP support if needed

### Scenario E: Emergency 🚨
- Safety issue detected
- Click "EVACUATE VENUE"
- Confirm evacuation
- System alerts all operators

---

## Performance Thresholds

| Metric | Green | Amber | Red |
|--------|-------|-------|-----|
| Requests/sec | <400 | 400-500 | >500 |
| Response Time | <150ms | 150-200ms | >200ms |
| Error Rate | <1% | 1-2% | >2% |
| Memory | <70% | 70-85% | >85% |
| CPU | <60% | 60-80% | >80% |

---

## Keyboard Shortcuts

- `G` → Go to GCP Services tab
- `H` → Go to System Health tab
- `I` → Go to Incidents tab
- `Esc` → Close any open dialogs

*(Note: Shortcuts coming in future update)*

---

## Troubleshooting

**Operations Center not loading?**
- Check browser console (F12)
- Verify backend is running
- Try refreshing page

**Metrics not updating?**
- Check WebSocket connection
- Verify `/api/health` endpoint
- Check browser network tab

**Can't create incident?**
- Verify you're authenticated
- Check incident data is valid
- Check backend logs

**Service shows unavailable?**
- Verify service is running
- Check network connectivity
- Review GCP Console

---

## Tips & Tricks

1. **Monitor Regularly**: Check every 15-30 minutes during events
2. **Set Alerts**: Note when metrics approach thresholds
3. **Document Issues**: Always create incidents for significant events
4. **Review Trends**: Look for patterns in metrics over time
5. **Prepare Scaling**: Scale up before hitting critical thresholds

---

## Next Steps

1. ✅ Navigate to `/ops`
2. ✅ Review System Health metrics
3. ✅ Check GCP Services status
4. ✅ Create a test incident
5. ✅ Bookmark the page for quick access

---

## Need Help?

- 📖 Full guide: `OPERATIONS_CENTER_GUIDE.md`
- 🔧 Technical details: `IMPROVEMENTS_SUMMARY.md`
- 💬 Questions? Check the troubleshooting section above

**Happy monitoring! 🚀**
