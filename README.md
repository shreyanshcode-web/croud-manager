# SV-Companion — Smart Event Companion

A user-facing, AI-powered web application that helps event attendees navigate venues, find the shortest queues, plan their exit, and get personalized real-time advice.

---

## 🎯 Chosen Vertical: Smart Event & Venue Companion

SV-Companion serves the **Event Attendee** — a regular fan at a sports match, concert, or festival who wants quick, practical answers to questions like:

- *"Which gate is least crowded right now?"*
- *"Best time to leave to beat the traffic?"*
- *"Where's the nearest food stand with the shortest queue?"*

---

## 🏗️ Approach & Logic

### Core Architecture

The app runs on a **Reactive-to-Proactive Loop**:

```
Live Venue Telemetry  →  Intelligence Engine  →  Gemini AI  →  User Recommendations
```

1. **Telemetry Layer** (`venueSimulator.js`): Generates live data for gates, concessions, restrooms, parking, transport, and seating sections. Updates every 3 seconds.

2. **Intelligence Engine** (`crowdIntelligence.js`): Scores the overall venue pressure, predicts gate wait times, identifies hotspots, and ranks risk drivers.

3. **Gemini AI Companion** (`AssistantChat.jsx` + `/api/advice`): Users can ask free-form questions. The app injects the current live venue data into Gemini's context, allowing it to give hyper-specific, real-time answers.

4. **User Interface**: A mobile-first PWA with 5 intuitive tabs — Home, AI Chat, Navigate, Food, and Exit.

### Smart Decision Making

- **Gates**: Sorted by wait time (shortest first). The "BEST" gate is highlighted automatically.
- **Food**: Sorted by queue length. Category filters (Pizza, Drinks, Snacks, etc.) let users find their preference quickly.
- **Exit Planner**: Calculates "beat the rush" advice from average gate wait + capacity. Transport ETAs are updated in real time.
- **AI Chat**: The assistant receives the live snapshot before every query — it knows current wait times, congestion levels, and transport arrivals.

---

## 🛠️ Google Services Integration

| Service | How It's Used |
|:---|:---|
| **Gemini 1.5 Flash** | Powers the AI companion chat. Answers user questions with live venue context injected into every prompt |
| **Google Maps Embed** | Shows venue location and directions from user's current position (geolocation) |
| **Google Identity Services (GIS)** | Handles user authentication via OAuth 2.0 for personalized access |
| **Google Cloud Run** | Hosts the containerized Node.js backend serving all APIs |
| **Secret Manager** | Securely stores API keys (Gemini, Maps) at runtime |

---

## 📱 How the Solution Works

### User Flow
1. Open the app → **Landing Page**: Sign in with Google or continue as guest
2. **Home Tab**: See live event status, AI tip, best entry gate, crowded areas
3. **AI Tab**: Ask any question — powered by Gemini with full live venue context
4. **Navigate Tab**: Browse gates (sorted by wait), restrooms (by availability), parking, or map
5. **Food Tab**: See all food stands sorted by shortest wait, filtered by category
6. **Exit Tab**: Get beat-the-rush timing, quickest exit gates, and transport ETAs

---

## ⚙️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Fill in: VITE_GOOGLE_CLIENT_ID, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY

# 3. Run dev server
npm run dev
```

### Environment Variables

| Variable | Purpose |
|:---|:---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID for GIS sign-in |
| `GEMINI_API_KEY` | Google Gemini API key for AI responses |
| `GOOGLE_MAPS_API_KEY` | Maps API key for the embed and directions |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── BottomNav.jsx       # Mobile bottom navigation
│   ├── HomeTab.jsx         # Event overview, alerts, quick actions
│   ├── AssistantChat.jsx   # Gemini-powered AI chat
│   ├── NavigateTab.jsx     # Gates, restrooms, parking, map
│   ├── FoodTab.jsx         # Sorted concession list + filters
│   └── ExitTab.jsx         # Exit planner + transport ETAs
├── pages/
│   ├── LandingPage.jsx     # Welcome / Google sign-in
│   └── MainWorkspace.jsx   # Tab shell + data orchestration
├── data/
│   └── venueSimulator.js   # Real-time venue data emitter
├── ml/
│   └── crowdIntelligence.js # Pressure scoring & prediction engine
├── hooks/
│   ├── useGoogleIdentity.js # Google OAuth hook
│   └── useUserLocation.js   # Geolocation hook
└── gemini-service.js        # Gemini API integration
```

---

## 🔒 Security

- **Input sanitisation**: All user input is stripped and validated before touching Gemini or any downstream system
- **Rate limiting**: API endpoints are rate-limited per user (20 req/min for AI)
- **Auth middleware**: Protected routes verify Google ID tokens server-side
- **No hardcoded secrets**: All credentials come from Cloud Run environment variables or Secret Manager
- **CORS**: Restricted to known origins only

---

## ♿ Accessibility

- All interactive elements have `aria-label` attributes
- Color palette meets WCAG 2.1 AA contrast ratios
- `prefers-reduced-motion` respected for all animations
- Keyboard navigable with visible focus indicators
- Semantic HTML5 elements throughout (`nav`, `main`, `button`, `article`, `role="log"`)

---

## 🧪 Testing

```bash
# Run the ML intelligence engine tests
npm test
```

The `crowdIntelligence.test.js` file validates the core scoring logic under various crowd scenarios.

---

## 📋 Assumptions

- **Connectivity**: The app assumes at least 4G connectivity during event use
- **Location**: Geolocation is optional — the map and navigation work without it
- **Venue**: Default venue is Kanteerava Stadium, Bengaluru — trivially configurable via `venueSimulator.js`
- **Data**: Telemetry is simulated at realistic variance but can be swapped for a live IoT data source
- **Auth**: Sign-in is optional — guests get full access to all features

---

## 🚀 Deployment

The app is deployed on **Google Cloud Run**:

```bash
chmod +x deploy.sh
./deploy.sh
```

Live URL: `https://crowd-manager-kqgdldfupq-uc.a.run.app`
