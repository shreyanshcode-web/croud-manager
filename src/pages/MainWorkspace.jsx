import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OperationsWorkspace from '../components/OperationsWorkspace';
import { generateVenueSnapshot, updateVenueData } from '../data/venueSimulator';
import { buildCrowdIntelligenceSnapshot } from '../ml/crowdIntelligence';
import { useGoogleIdentity } from '../hooks/useGoogleIdentity';

export default function MainWorkspace() {
  const navigate = useNavigate();
  const { user } = useGoogleIdentity();
  
  // Real-time Dashboard state
  const [data, setData] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [time, setTime] = useState(new Date());

  // Wait for Google Auth - Redirect if strictly not logged in
  useEffect(() => {
    // If you wish to enforce strict login, check `user` here
    // But we will allow guest access for dev mode if user bypassed it
  }, [user, navigate]);

  // Initial Data Seed & Loop
  useEffect(() => {
    // 1. Initial snapshot
    const initialData = generateVenueSnapshot();
    const initialIntel = buildCrowdIntelligenceSnapshot(initialData);
    setData(initialData);
    setIntelligence(initialIntel);

    // 2. Loop to simulate live crowd updates!
    const interval = setInterval(() => {
      setData((prevData) => {
        if (!prevData) return prevData;
        const nextData = updateVenueData(prevData);
        const nextIntel = buildCrowdIntelligenceSnapshot(nextData, prevData);
        setIntelligence(nextIntel);
        return nextData;
      });
      setTime(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!data || !intelligence) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#00E0FF', fontFamily: "'JetBrains Mono', monospace" }}>INITIALIZING SMARTVENUE AI...</div>
      </div>
    );
  }

  return (
    <OperationsWorkspace
      data={data}
      intelligence={intelligence}
      aiFeed={intelligence.drivers} 
      activeView={activeView}
      setActiveView={setActiveView}
      time={time}
      goToLanding={() => navigate('/')}
    />
  );
}
