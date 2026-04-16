import React, { startTransition, useEffect, useState } from 'react';
import { generateVenueSnapshot, updateVenueData } from './data/venueSimulator';
import { generateRecommendationHistory } from './data/aiRecommendations';
import { buildCrowdIntelligenceSnapshot } from './ml/crowdIntelligence';
import LandingPage from './components/LandingPage';
import OperationsWorkspace from './components/OperationsWorkspace';

const getCurrentPage = () => (window.location.hash === '#ops' ? 'operations' : 'landing');

function App() {
  const [page, setPage] = useState(() => getCurrentPage());
  const [simulation, setSimulation] = useState(() => {
    const initialData = generateVenueSnapshot();

    return {
      data: initialData,
      aiFeed: generateRecommendationHistory(initialData),
      intelligence: buildCrowdIntelligenceSnapshot(initialData),
    };
  });
  const [activeView, setActiveView] = useState('overview');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const syncPage = () => setPage(getCurrentPage());
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  useEffect(() => {
    const simInterval = setInterval(() => {
      startTransition(() => {
        setSimulation((previous) => {
          if (!previous.data) return previous;

          const nextData = updateVenueData(previous.data);

          return {
            data: nextData,
            aiFeed: Math.random() > 0.6
              ? generateRecommendationHistory(nextData)
              : previous.aiFeed,
            intelligence: buildCrowdIntelligenceSnapshot(nextData, previous.data),
          };
        });
      });
    }, 3000);

    const clockInterval = setInterval(() => setTime(new Date()), 1000);

    return () => {
      clearInterval(simInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const goToLanding = () => {
    window.location.hash = '';
    setPage('landing');
  };

  const goToOperations = () => {
    window.location.hash = 'ops';
    setPage('operations');
  };

  const { data, aiFeed, intelligence } = simulation;

  if (!data) {
    return <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading SmartVenue AI...</div>;
  }

  if (page === 'landing') {
    return <LandingPage goToOperations={goToOperations} />;
  }

  return (
    <OperationsWorkspace
      data={data}
      aiFeed={aiFeed}
      intelligence={intelligence}
      activeView={activeView}
      setActiveView={setActiveView}
      time={time}
      goToLanding={goToLanding}
    />
  );
}

export default App;
