import React, { useState, useEffect } from 'react';
import { 
  FiMap, FiLogOut, FiSettings, FiBell, FiShield, 
  FiUsers, FiCoffee, FiTrendingUp, FiActivity
} from 'react-icons/fi';
import { generateVenueSnapshot, updateVenueData } from './data/venueSimulator';
import { generateRecommendationHistory } from './data/aiRecommendations';

// Components
import VenueOverview from './components/VenueOverview';
import GateMonitor from './components/GateMonitor';
import ConcessionPanel from './components/ConcessionPanel';
import ParkingPanel from './components/ParkingPanel';
import EmergencyPanel from './components/EmergencyPanel';
import TransportHub from './components/TransportHub';
import LocationBanner from './components/LocationBanner';

function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [aiFeed, setAiFeed] = useState([]);
  const [time, setTime] = useState(new Date());

  // Initialization & Simulation Loop
  useEffect(() => {
    // Initial data
    const initialData = generateVenueSnapshot();
    setData(initialData);
    setAiFeed(generateRecommendationHistory(initialData));

    // Simulation loop
    const simInterval = setInterval(() => {
      setData(prev => {
        if (!prev) return prev;
        const newData = updateVenueData(prev);
        // Only update AI feed every few seconds so it's readable
        if (Math.random() > 0.6) {
          setAiFeed(generateRecommendationHistory(newData));
        }
        return newData;
      });
    }, 3000);

    // Clock
    const clockInterval = setInterval(() => setTime(new Date()), 1000);

    return () => {
      clearInterval(simInterval);
      clearInterval(clockInterval);
    };
  }, []);

  if (!data) return <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading SmartVenue AI...</div>;

  const renderView = () => {
    switch (activeView) {
      case 'overview': return <VenueOverview data={data} aiFeed={aiFeed} />;
      case 'gates': return <GateMonitor data={data} />;
      case 'concessions': return <ConcessionPanel data={data} />;
      case 'parking': return <ParkingPanel data={data} />;
      case 'emergency': return <EmergencyPanel data={data} />;
      case 'transport': return <TransportHub data={data} />;
      default: return <VenueOverview data={data} aiFeed={aiFeed} />;
    }
  };

  return (
    <div id="root">
      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <div className="header-logo-icon">
              <FiActivity color="white" />
            </div>
            <div className="header-logo-text">SmartVenue AI</div>
            <span className="header-logo-badge">PRO</span>
          </div>
          <div className="header-divider"></div>
          <div className="header-event">
            <div className="header-event-name">{data.venue.name} — {data.venue.event}</div>
            <div className="header-event-detail">{data.stats.totalAttendance.toLocaleString()} Fans • {data.venue.eventTime} Start</div>
          </div>
        </div>

        <div className="header-right">
          <div className="header-status">
            <div className={`header-status-dot ${data.stats.safetyScore < 80 ? 'red' : 'green'}`}></div>
            <span className="header-status-text">
              {data.stats.safetyScore < 80 ? 'CRITICAL ALERTS' : 'SYSTEM OPTIMAL'}
            </span>
          </div>
          <div className="header-clock">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button className="header-btn" onClick={() => setActiveView('emergency')}>
            <FiShield /> Safety Hub
          </button>
          <button className="header-btn emergency">
            <FiBell /> Evacuate
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-section-label">Operations Desk</div>
          
          <div className={`sidebar-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}>
            <div className="sidebar-item-icon"><FiTrendingUp /></div>
            <span>Overview Dashboard</span>
          </div>
          
          <div className={`sidebar-item ${activeView === 'gates' ? 'active' : ''}`} onClick={() => setActiveView('gates')}>
            <div className="sidebar-item-icon"><FiUsers /></div>
            <span>Gates & Entry</span>
            {data.stats.avgGateWait > 10 && <span className="sidebar-item-badge amber">!</span>}
          </div>
          
          <div className={`sidebar-item ${activeView === 'concessions' ? 'active' : ''}`} onClick={() => setActiveView('concessions')}>
            <div className="sidebar-item-icon"><FiCoffee /></div>
            <span>Concessions & WC</span>
            {data.stats.congestedConcessions > 3 && <span className="sidebar-item-badge amber">{data.stats.congestedConcessions}</span>}
          </div>
          
          <div className={`sidebar-item ${activeView === 'parking' ? 'active' : ''}`} onClick={() => setActiveView('parking')}>
            <div className="sidebar-item-icon"><FiMap /></div>
            <span>Parking Zones</span>
          </div>

          <div className="sidebar-section-label">Safety & Security</div>
          
          <div className={`sidebar-item ${activeView === 'emergency' ? 'active' : ''}`} onClick={() => setActiveView('emergency')}>
            <div className="sidebar-item-icon"><FiShield /></div>
            <span>Emergency Systems</span>
            {data.stats.blockedExits > 0 && <span className="sidebar-item-badge red">{data.stats.blockedExits}</span>}
          </div>

          <div className="sidebar-section-label">External Flow</div>
          
          <div className={`sidebar-item ${activeView === 'transport' ? 'active' : ''}`} onClick={() => setActiveView('transport')}>
            <div className="sidebar-item-icon"><FiLogOut className="rotate-icon" style={{transform: "rotate(90deg)"}} /></div>
            <span>Transport Hub</span>
          </div>

          <div style={{ flex: 1 }}></div>
          <div className="sidebar-item">
            <div className="sidebar-item-icon"><FiSettings /></div>
            <span>Settings</span>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content">
          <div style={{ marginBottom: '16px' }}>
            <LocationBanner />
          </div>
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
