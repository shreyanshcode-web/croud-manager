/**
 * useCrowdData Hook
 * Manages crowd data state and WebSocket subscriptions
 *
 * Fix #4: wsConnected was a stale snapshot (ws.isConnected() called once at render).
 *         Now tracked reactively via ws 'connected' / 'disconnected' events.
 */
import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';
import ws from '../services/websocket.js';

export function useCrowdData() {
  const [crowd, setCrowd] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // FIX #4: track connection state reactively instead of reading a stale snapshot
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [crowdRes, simRes, alertsRes] = await Promise.all([
          api.getCrowd(),
          api.getSimulationStatus(),
          api.getAlerts(),
        ]);

        setCrowd(crowdRes.data);
        setSimulation(simRes.data);
        setAlerts(alertsRes.data.alerts || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch crowd data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Connect to WebSocket and listen for data + connection events
  useEffect(() => {
    ws.connect().catch(() => {});

    const handleCrowdUpdate = (data) => {
      setCrowd(data.crowd);
      setSimulation(data.simulation);
      setAlerts(data.alerts || []);
    };

    const handleAlert = (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    };

    // FIX #4: react to connection lifecycle events
    const handleConnected    = () => setWsConnected(true);
    const handleDisconnected = () => setWsConnected(false);

    ws.on('CROWD_UPDATE', handleCrowdUpdate);
    ws.on('ALERT', handleAlert);
    ws.on('connected', handleConnected);
    ws.on('disconnected', handleDisconnected);

    // Sync the initial state in case the socket was already open before mounting
    setWsConnected(ws.isConnected());

    return () => {
      ws.off('CROWD_UPDATE', handleCrowdUpdate);
      ws.off('ALERT', handleAlert);
      ws.off('connected', handleConnected);
      ws.off('disconnected', handleDisconnected);
    };
  }, []);

  const startSimulation = useCallback(async (crowdSize, speed) => {
    try {
      const res = await api.startSimulation(crowdSize, speed);
      setSimulation(res.data.status);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const stopSimulation = useCallback(async () => {
    try {
      const res = await api.stopSimulation();
      setSimulation(res.data.status);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const resetSimulation = useCallback(async () => {
    try {
      const res = await api.resetSimulation();
      setSimulation(res.data.status);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const dismissAlert = useCallback(async (alertId) => {
    try {
      await api.dismissAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    crowd,
    simulation,
    alerts,
    loading,
    error,
    startSimulation,
    stopSimulation,
    resetSimulation,
    dismissAlert,
    wsConnected,
  };
}
