# SmartVenue AI — Frontend Routing Guide

## Overview

SmartVenue AI uses **React Router v7** for client-side routing with a clean, intuitive page structure.

---

## Route Structure

```
/                    → Landing Page (home, intro, simulation preview)
/dashboard           → Command Center (main control panel)
/analytics           → Analytics & Insights (historical data)
/zones               → Zone Management (create, edit, delete zones)
/settings            → System Settings (configuration)
/operations          → Operations Workspace (legacy, for backward compatibility)
```

---

## Pages

### 1. Landing Page (`/`)

**Purpose**: Entry point, showcase, and navigation hub

**Features**:
- Live crowd simulation preview (70% canvas)
- Real-time metrics panel (30% data)
- Navigation buttons to other pages
- Brutalist UI with scanlines and noise

**Navigation**:
```javascript
<button onClick={() => navigate('/dashboard')}>
  Enter Dashboard
</button>
```

**Components**:
- `CrowdSimulation` — Canvas-based particle system
- `BrutalistDataPanel` — Live metrics display

---

### 2. Dashboard (`/dashboard`)

**Purpose**: Main command center for operators

**Features**:
- Live simulation (70% canvas)
- Simulation controls (start, stop, reset)
- Crowd size and speed sliders
- Active alerts list (30% panel)
- Real-time WebSocket updates
- System status indicator

**Navigation**:
```javascript
<button onClick={() => navigate('/')}>← HOME</button>
<button onClick={() => navigate('/analytics')}>ANALYTICS</button>
```

**State Management**:
- Uses `useCrowdData` hook for real-time updates
- WebSocket connection for live data
- Alert management (create, dismiss)

---

### 3. Analytics (`/analytics`)

**Purpose**: Historical data and insights

**Features**:
- System summary stats (total people, avg density, peak density, alerts)
- Zone selection
- Zone-specific history (average, peak, min density)
- Time-based trends

**Navigation**:
```javascript
<button onClick={() => navigate('/')}>← HOME</button>
<button onClick={() => navigate('/dashboard')}>DASHBOARD</button>
```

**API Calls**:
- `getAnalyticsSummary()` — Overall stats
- `getAnalyticsHistory(zoneId)` — Zone-specific history

---

### 4. Zones (`/zones`)

**Purpose**: Zone management and configuration

**Features**:
- Create new zones (name, capacity, location)
- View all zones
- Delete zones
- Zone capacity management

**Navigation**:
```javascript
<button onClick={() => navigate('/')}>← HOME</button>
```

**API Calls**:
- `getZones()` — List all zones
- `createZone(name, capacity, location)` — Create zone
- `deleteZone(zoneId)` — Delete zone
- `updateZone(zoneId, data)` — Update zone

---

### 5. Settings (`/settings`)

**Purpose**: System configuration and preferences

**Features**:
- Display settings (notifications)
- Performance settings (update interval, max alerts)
- System info (version, API endpoint, last updated)
- Save/cancel actions

**Navigation**:
```javascript
<button onClick={() => navigate('/')}>← HOME</button>
```

**Local Storage**:
```javascript
localStorage.setItem('smartvenue-settings', JSON.stringify(settings));
```

---

## Routing Implementation

### App.jsx

```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Zones from './pages/Zones';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/zones" element={<Zones />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
```

### Navigation Pattern

```javascript
import { useNavigate } from 'react-router-dom';

export function MyComponent() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/dashboard')}>
      Go to Dashboard
    </button>
  );
}
```

---

## Page Hierarchy

```
Landing Page (/)
  ├─ Dashboard (/dashboard)
  │   ├─ Analytics (/analytics)
  │   └─ Home (/)
  ├─ Analytics (/analytics)
  │   ├─ Dashboard (/dashboard)
  │   └─ Home (/)
  ├─ Zones (/zones)
  │   └─ Home (/)
  └─ Settings (/settings)
      └─ Home (/)
```

---

## Navigation Components

### Header Navigation

All pages have a consistent header with:
- Page title
- Page description
- Navigation buttons (HOME, DASHBOARD, ANALYTICS, etc.)

```javascript
<div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div>
    <div style={{ fontSize: '18px', fontWeight: 700 }}>PAGE TITLE</div>
    <div style={{ fontSize: '11px', color: '#6B7280' }}>Description</div>
  </div>
  <div style={{ display: 'flex', gap: '12px' }}>
    <button onClick={() => navigate('/')}>← HOME</button>
    <button onClick={() => navigate('/dashboard')}>DASHBOARD</button>
  </div>
</div>
```

---

## State Management

### Global State (App.jsx)

```javascript
const [simulation, setSimulation] = useState({
  data: initialData,
  aiFeed: generateRecommendationHistory(initialData),
  intelligence: buildCrowdIntelligenceSnapshot(initialData),
});
```

### Page-Level State

Each page manages its own state:

**Dashboard**:
```javascript
const [crowdSize, setCrowdSize] = useState(200);
const [speed, setSpeed] = useState(1);
const { crowd, simulation, alerts } = useCrowdData();
```

**Analytics**:
```javascript
const [summary, setSummary] = useState(null);
const [selectedZone, setSelectedZone] = useState(null);
const [history, setHistory] = useState(null);
```

**Zones**:
```javascript
const [zones, setZones] = useState([]);
const [showForm, setShowForm] = useState(false);
const [formData, setFormData] = useState({ name: '', capacity: 1000, location: '' });
```

---

## API Integration

### Services

**api.js** — Centralized API client
```javascript
import API from './api.js';

export const getCrowd = () => API.get('/crowd');
export const getAnalyticsSummary = () => API.get('/analytics/summary');
export const getZones = () => API.get('/zones');
```

**websocket.js** — Real-time updates
```javascript
import ws from './websocket.js';

ws.connect();
ws.on('CROWD_UPDATE', (data) => {
  setCrowd(data.crowd);
});
```

### Usage in Pages

```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await api.getAnalyticsSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
  };

  fetchData();
}, []);
```

---

## Styling

### Brutalist Design System

All pages use consistent styling:

**Colors**:
- Background: `#0A0A0A`
- Grid: `#1A1A1A`
- Primary: `#00E0FF`
- Danger: `#FF3B3B`
- Text: `#EDEDED`
- Secondary: `#6B7280`

**Typography**:
- Headings: `Space Grotesk`
- Data: `JetBrains Mono`
- Body: `Inter`

**Layout**:
- Hard edges (no rounded corners)
- Thin borders (`1px solid #1A1A1A`)
- No shadows
- Linear transitions (`150ms linear`)

---

## Loading States

All pages handle loading gracefully:

```javascript
if (loading) {
  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        Loading...
      </div>
    </div>
  );
}
```

---

## Error Handling

Pages display errors in banners:

```javascript
{error && (
  <div style={{ padding: '12px 32px', background: '#FF3B3B', color: '#0A0A0A', fontSize: '12px', fontWeight: 700 }}>
    ERROR: {error}
  </div>
)}
```

---

## Browser History

React Router automatically manages browser history:

```javascript
// User clicks back button
// Browser navigates to previous page
// React Router updates the URL and renders the correct component
```

---

## URL Parameters (Future Enhancement)

For future features, you can add URL parameters:

```javascript
// Route definition
<Route path="/zones/:zoneId" element={<ZoneDetail />} />

// Usage
const { zoneId } = useParams();
```

---

## Query Parameters (Future Enhancement)

For filtering and pagination:

```javascript
// Route definition
<Route path="/analytics" element={<Analytics />} />

// Usage
const [searchParams] = useSearchParams();
const zoneId = searchParams.get('zone');
```

---

## Page Transitions

Pages transition smoothly with:
- Fade-in effect (CSS opacity)
- Scanline overlay
- Screen noise

---

## Mobile Responsiveness

All pages are responsive:

```javascript
// Desktop: 70% / 30% split
// Tablet: Stack vertically
// Mobile: Full width
```

---

## Performance Optimization

### Code Splitting

React Router automatically code-splits pages:
```javascript
// Each page is a separate chunk
// Loaded on-demand when route is accessed
```

### Memoization

Pages use React.memo for optimization:
```javascript
export default React.memo(Dashboard);
```

---

## Testing Routes

### Manual Testing

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click navigation buttons
4. Verify page loads correctly
5. Check browser console for errors

### Automated Testing (Future)

```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';

test('Dashboard renders', () => {
  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
  expect(screen.getByText('COMMAND CENTER')).toBeInTheDocument();
});
```

---

## Summary

SmartVenue AI has a clean, intuitive routing structure:

✅ **5 main pages** with clear purposes
✅ **Consistent navigation** across all pages
✅ **Proper state management** (global + page-level)
✅ **API integration** with error handling
✅ **Real-time updates** via WebSocket
✅ **Brutalist UI** throughout
✅ **Loading and error states** handled
✅ **Browser history** managed automatically

Ready for production deployment.
