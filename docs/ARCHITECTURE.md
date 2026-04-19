# SV-Companion — Architecture & Data Flow

## System Overview

SV-Companion is a **user-facing, mobile-first event companion PWA** built for live event attendees. It uses a **Reactive-to-Proactive Loop**: real-time venue telemetry feeds an intelligence engine that powers a Gemini AI companion and a set of smart utility tabs.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SV-COMPANION                             │
│                    User-Facing Event PWA                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    3s tick     ┌────────────────────────────┐
│  Venue Telemetry │ ─────────────> │  Intelligence Engine       │
│  (venueSimulator)│                │  (crowdIntelligence.js)    │
│                  │                │  - Gate pressure scoring   │
│  Gates, Food,    │                │  - Section density rank    │
│  Restrooms,      │                │  - Risk driver analysis    │
│  Parking, Exit   │                │  - Predictive wait times   │
│  Transport       │                └──────────────┬─────────────┘
└──────────────────┘                               │
                                                   │ venue snapshot + intelligence
                    ┌──────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────────────────┐
        │              MAIN WORKSPACE (React)             │
        │  Data orchestration + 5-tab bottom navigation  │
        └──────────────────────────────────────────────────┘
                    │
       ┌────────────┼────────────┐───────────────┐
       ▼            ▼            ▼               ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
  │ Home Tab │ │ AI Chat  │ │ Navigate │ │  Food / Exit │
  │          │ │ (Gemini) │ │   Tab    │ │    Tabs      │
  │ Event    │ │          │ │          │ │              │
  │ overview │ │ Contextual│ │ Gates,  │ │ Concessions  │
  │ AI tip   │ │ Q&A with │ │ Restroom │ │ sorted by    │
  │ Best gate│ │ live data │ │ Parking  │ │ wait time    │
  │ Alerts   │ │ injected  │ │ Map      │ │ Transport    │
  └──────────┘ └────┬─────┘ └──────────┘ └──────────────┘
                    │
                    │ POST /api/advice
                    ▼
        ┌──────────────────────────────────────────────────┐
        │            EXPRESS SERVER (Node.js)              │
        │                                                  │
        │  POST /api/advice     → Gemini 1.5 Flash         │
        │  GET  /api/traffic    → Transit telemetry        │
        │  POST /api/snapshot   → Redis cache              │
        │  POST /api/incident   → Incident store           │
        │  GET  /api/health     → System status            │
        │                                                  │
        │  Security:                                       │
        │  - Google ID token verification                  │
        │  - Input sanitisation (validator.js)             │
        │  - Rate limiting per user (Redis sliding window) │
        │  - CORS restricted to allowed origins            │
        └──────────┬───────────────────────────────────────┘
                   │
       ┌───────────┼────────────────────┐
       ▼           ▼                    ▼
  ┌──────────┐ ┌──────────────┐  ┌──────────────────────┐
  │  Redis   │ │  Gemini API  │  │  Google Maps API     │
  │  Cache   │ │  (AI advice) │  │  (traffic intel +    │
  │          │ │              │  │   venue embed)       │
  │ Fast     │ │ systemContext│  │                      │
  │ state    │ │ + userQuery  │  │  Directions API for  │
  │ TTL 3s   │ │ injected     │  │  transit telemetry   │
  └──────────┘ └──────────────┘  └──────────────────────┘
```

---

## Key Data Flows

### 1. Live Venue Telemetry Loop (3 seconds)
```
venueSimulator.generateVenueSnapshot()
    │  gates, concessions, restrooms, parking, transport, sections
    ▼
crowdIntelligence.buildCrowdIntelligenceSnapshot(data)
    │  venueScore, drivers[], predicted gate wait, safety index
    ▼
MainWorkspace React state
    │  Tab components read from props — no prop drilling hell
    ▼
HomeTab  →  shows top AI tip (intelligence.drivers[0])
NavigateTab  →  sorts gates by waitMinutes
FoodTab  →  sorts concessions by avgWaitMinutes
ExitTab  →  ranks exit gates, shows transport ETAs
```

### 2. AI Companion Chat Flow
```
User types: "Which gate has the shortest queue?"
    │
    ▼
AssistantChat.jsx
    │  buildContext(data, intelligence)  ← injects live snapshot
    │  buildSystemPrompt(venueContext)   ← sets AI persona + rules
    ▼
POST /api/advice
    │  { systemContext, userQuery, trafficLevel }
    │  Server sanitises all inputs (max 2000 chars, validator.js)
    ▼
getCrowdAdvice() — Gemini 1.5 Flash
    │  Temperature: 0.7  MaxTokens: 150
    │  Safety filters: BLOCK_MEDIUM+
    ▼
Response: "Head to North Gate B — it only has a 2.3 min wait! 🚪"
```

### 3. Google Identity Auth Flow
```
User taps "Continue with Google"
    │
    ▼
useGoogleIdentity hook
    │  google.accounts.id.initialize({ client_id })
    │  google.accounts.id.prompt()
    ▼
Google OAuth server
    │  Returns credential (JWT)
    ▼
App stores user object (name, email, picture)
    │
    ▼
MainWorkspace — personalized experience
```

---

## Frontend Component Map

```
src/
├── pages/
│   ├── LandingPage.jsx         # Welcome + Google Sign-In
│   └── MainWorkspace.jsx       # Tab shell + live data loop
│
├── components/
│   ├── BottomNav.jsx           # 5-tab mobile navigation bar
│   ├── HomeTab.jsx             # Event hero, stats, AI tip, alerts
│   ├── AssistantChat.jsx       # Gemini-powered contextual chat
│   ├── NavigateTab.jsx         # Gates / Restrooms / Parking / Map
│   ├── FoodTab.jsx             # Concessions sorted by wait + filters
│   └── ExitTab.jsx             # Exit gates, transport, beat-the-rush
│
├── data/
│   └── venueSimulator.js       # Generates realistic venue telemetry
│
├── ml/
│   ├── crowdIntelligence.js    # Pressure scoring, risk driver ranking
│   └── crowdIntelligence.test.js  # Unit tests for scoring engine
│
├── hooks/
│   ├── useGoogleIdentity.js    # GIS OAuth hook
│   └── useUserLocation.js      # Geolocation with Kalman smoothing
│
└── gemini-service.js           # Gemini 1.5 Flash API wrapper
```

---

## Backend API Reference

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/advice` | Optional | Gemini AI companion (user or legacy mode) |
| `GET`  | `/api/traffic` | None | Live transit telemetry (Redis cached) |
| `POST` | `/api/snapshot` | None | Ingest venue snapshot → Redis |
| `GET`  | `/api/snapshot` | None | Latest venue snapshot |
| `POST` | `/api/location` | None | GPS ping (rate limited 100/min) |
| `POST` | `/api/incident` | Required | Create operational incident |
| `GET`  | `/api/incidents` | None | List active incidents |
| `GET`  | `/api/health` | None | Service health + Redis/Kafka status |
| `GET`  | `/api/v1/crowd` | None | Crowd zone data |
| `GET`  | `/api/v1/analytics/*` | None | Historical analytics |
| `GET`  | `/api/v1/traffic/*` | None | Traffic route details |
| `GET/POST` | `/api/v1/telemetry/*` | None | Telemetry sync control |

---

## Security Implementation

```
Layer 1 — Google ID Token Verification
  Server calls oauth2client.verifyIdToken() on protected routes
  Extracts user.sub, user.email for audit logging

Layer 2 — Input Sanitisation
  validator.stripLow() + validator.escape() on all string inputs
  Max length enforced: userQuery 200 chars, systemContext 2000 chars

Layer 3 — Rate Limiting
  Redis sliding window counter per user IP
  AI advice: 20 requests/minute
  Location pings: 100 requests/minute

Layer 4 — CORS
  Allowed origins from ALLOWED_ORIGINS env var only
  No wildcard '*' in production

Layer 5 — No Hardcoded Secrets
  GEMINI_API_KEY, GOOGLE_MAPS_API_KEY via Secret Manager
  VITE_GOOGLE_CLIENT_ID via Cloud Run environment
```

---

## Google Services Integration

| Service | Integration Point | Value Delivered |
|:---|:---|:---|
| **Gemini 1.5 Flash** | `src/gemini-service.js` + `/api/advice` | Powers AI companion with live context |
| **Google Maps Embed** | `NavigateTab.jsx` | Shows venue + directions from user location |
| **Google Identity Services** | `useGoogleIdentity.js` + `LandingPage.jsx` | Secure OAuth 2.0 sign-in |
| **Google Cloud Run** | `deploy.sh` + `Dockerfile` | Serverless backend hosting |
| **Cloud Logging** | `src/cloud-logger.js` | Structured JSON audit logs |
| **Secret Manager** | `src/gcp-secrets.js` | Secure API key retrieval at runtime |

---

## Performance Targets

| Component | Target | How Achieved |
|:---|:---|:---|
| Telemetry loop | 3s refresh | `setInterval` + incremental `updateVenueData()` |
| Gemini response | < 2s | `gemini-1.5-flash` model, max 150 tokens |
| Redis reads | < 5ms | In-memory cache with TTL |
| Tab switch | Instant | All tabs mounted in memory, no re-fetch |
| Bundle size | < 1MB | Vite tree-shaking, no large dependencies |

---

## Deployment

```bash
# Local dev
npm install
npm run dev        # Vite frontend + proxy to Express

# Production
chmod +x deploy.sh
./deploy.sh        # Builds, pushes to Cloud Run
```

### Required Environment Variables

| Variable | Where | Purpose |
|:---|:---|:---|
| `VITE_GOOGLE_CLIENT_ID` | Vite (build time) | GIS OAuth |
| `GEMINI_API_KEY` | Cloud Run / Secret Manager | Gemini API |
| `GOOGLE_MAPS_API_KEY` | Cloud Run / Secret Manager | Maps embed + Directions |
| `GOOGLE_CLIENT_SECRET` | Cloud Run | OAuth server-side verification |
| `ALLOWED_ORIGINS` | Cloud Run | CORS whitelist |
| `REDIS_URL` | Cloud Run | Cache / rate limiting |
| `KAFKA_BROKERS` | Cloud Run | (Optional) event streaming |
