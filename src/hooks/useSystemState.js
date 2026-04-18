/**
 * useSystemState — State machine for crowd control system
 * States: IDLE → SIMULATING → ALERT → CRITICAL
 * Drives UI behavior and real-time updates
 */
import { useState, useCallback, useEffect } from 'react';
import { simulationAPI } from '../services/api';
import wsService from '../services/websocket';

const STATES = {
  IDLE: 'IDLE',
  SIMULATING: 'SIMULATING',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
};

export function useSystemState() {
  const [state, setState] = useState(STATES.IDLE);
  const [crowdData, setCrowdData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Determine state based on crowd data
  const updateState = useCallback((data) => {
    if (!data) {
      setState(STATES.IDLE);
      return;
    }

    const avgDensity = data.density || 0;
    const riskLevel = data.riskLevel || 'LOW';

    if (riskLevel === 'CRITICAL' || avgDensity > 85) {
      setState(STATES.CRITICAL);
    } else if (riskLevel === 'HIGH' || avgDensity > 65) {
      setState(STATES.ALERT);
    } else if (avgDensity > 0) {
      setState(STATES.SIMULATING);
    } else {
      setState(STATES.IDLE);
    }
  }, []);

  // Start simulation
  const startSimulation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await simulationAPI.start();
      setState(STATES.SIMULATING);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop simulation
  const stopSimulation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await simulationAPI.stop();
      setState(STATES.IDLE);
      setCrowdData(null);
      setAlerts([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset simulation
  const resetSimulation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await simulationAPI.reset();
      setState(STATES.IDLE);
      setCrowdData(null);
      setAlerts([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubCrowd = wsService.subscribe('crowd.update', (data) => {
      setCrowdData(data);
      updateState(data);
    });

    const unsubAlert = wsService.subscribe('crowd.alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 20));
    });

    return () => {
      unsubCrowd();
      unsubAlert();
    };
  }, [updateState]);

  return {
    state,
    crowdData,
    alerts,
    isLoading,
    error,
    startSimulation,
    stopSimulation,
    resetSimulation,
    isSimulating: state !== STATES.IDLE,
    isAlert: state === STATES.ALERT,
    isCritical: state === STATES.CRITICAL,
  };
}

export default useSystemState;
