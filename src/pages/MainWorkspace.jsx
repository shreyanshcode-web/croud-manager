import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import HomeTab from '../components/HomeTab';
import AssistantChat from '../components/AssistantChat';
import NavigateTab from '../components/NavigateTab';
import FoodTab from '../components/FoodTab';
import ExitTab from '../components/ExitTab';
import { generateVenueSnapshot, updateVenueData } from '../data/venueSimulator';
import { buildCrowdIntelligenceSnapshot } from '../ml/crowdIntelligence';
import { useNavigate } from 'react-router-dom';

export default function MainWorkspace() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState('home');
  const [data, setData]                 = useState(null);
  const [intelligence, setIntelligence] = useState(null);

  // Seed initial data then update every 3 seconds
  useEffect(() => {
    const initial = generateVenueSnapshot();
    setData(initial);
    setIntelligence(buildCrowdIntelligenceSnapshot(initial));

    const interval = setInterval(() => {
      setData(prev => {
        if (!prev) return prev;
        const next = updateVenueData(prev);
        setIntelligence(buildCrowdIntelligenceSnapshot(next, prev));
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Loading screen
  if (!data) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
        role="status"
        aria-label="Loading event data"
      >
        <div style={{ fontSize: 48 }}>🏟️</div>
        <p style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: 16 }}>
          Loading Event Data…
        </p>
        <div
          className="skeleton"
          style={{ width: 200, height: 6, borderRadius: 100 }}
          aria-hidden="true"
        />
      </div>
    );
  }

  const alertCount = data.stats.activeAlerts;

  return (
    <div className="app-shell" role="application" aria-label="Event Companion">
      {/* Tab Content — renders whichever tab is active */}
      <div
        className="tab-content"
        role="region"
        aria-label={`${activeTab} tab`}
      >
        {activeTab === 'home'     && <HomeTab      data={data} intelligence={intelligence} onTabChange={setActiveTab} />}
        {activeTab === 'ai'       && <AssistantChat data={data} intelligence={intelligence} />}
        {activeTab === 'navigate' && <NavigateTab  data={data} />}
        {activeTab === 'food'     && <FoodTab       data={data} />}
        {activeTab === 'exit'     && <ExitTab       data={data} />}
      </div>

      {/* Fixed Bottom Nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} alertCount={alertCount} />
    </div>
  );
}
