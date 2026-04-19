import React, { useState, useEffect } from 'react';
import BottomNav from '../components/BottomNav';
import SideNav from '../components/SideNav';
import LiveStatsPanel from '../components/LiveStatsPanel';
import HomeTab from '../components/HomeTab';
import AssistantChat from '../components/AssistantChat';
import NavigateTab from '../components/NavigateTab';
import FoodTab from '../components/FoodTab';
import ExitTab from '../components/ExitTab';
import { generateVenueSnapshot, updateVenueData } from '../data/venueSimulator';
import { buildCrowdIntelligenceSnapshot } from '../ml/crowdIntelligence';
import { useAnalytics } from '../hooks/useAnalytics';

const TAB_SCREEN_NAMES = {
  home:     'Home',
  ai:       'AI Chat',
  navigate: 'Navigate',
  food:     'Food & Drinks',
  exit:     'Exit Planner',
};

// Detect desktop viewport (≥768px) — reactive to resize
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function MainWorkspace() {
  const { trackScreen } = useAnalytics();
  const isDesktop = useIsDesktop();

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

  // Track screen view on every tab switch — Google Analytics 4
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    trackScreen(TAB_SCREEN_NAMES[tab] || tab);
  };

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
        <div className="skeleton" style={{ width: 200, height: 6, borderRadius: 100 }} aria-hidden="true" />
      </div>
    );
  }

  const alertCount = data.stats.activeAlerts;

  // ── Tab Content (shared between mobile + desktop)
  const tabContent = (
    <div className="tab-content" role="region" aria-label={`${TAB_SCREEN_NAMES[activeTab]} tab content`}>
      {activeTab === 'home'     && <HomeTab      data={data} intelligence={intelligence} onTabChange={handleTabChange} />}
      {activeTab === 'ai'       && <AssistantChat data={data} intelligence={intelligence} />}
      {activeTab === 'navigate' && <NavigateTab  data={data} />}
      {activeTab === 'food'     && <FoodTab       data={data} />}
      {activeTab === 'exit'     && <ExitTab       data={data} />}
    </div>
  );

  return (
    <div className="app-shell" role="application" aria-label="SV-Companion — Event Assistant">
      {/* ── Desktop: SideNav + Content + StatsPanel ── */}
      {isDesktop && (
        <SideNav active={activeTab} onChange={handleTabChange} alertCount={alertCount} />
      )}

      {tabContent}

      {/* ── Desktop: Live Stats Right Panel ── */}
      {isDesktop && (
        <LiveStatsPanel data={data} intelligence={intelligence} />
      )}

      {/* ── Mobile: Bottom Nav ── */}
      {!isDesktop && (
        <BottomNav active={activeTab} onChange={handleTabChange} alertCount={alertCount} />
      )}
    </div>
  );
}
