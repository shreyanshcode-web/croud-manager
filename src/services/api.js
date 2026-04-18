/**
 * API Service Layer
 * Centralized axios instance with base URL and interceptors
 */
import axios from 'axios';

const API = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// Add auth token if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('googleIdToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== CROWD DATA =====
export const getCrowd = () => API.get('/crowd');
export const getCrowdByZone = (zoneId) => API.get(`/crowd/${zoneId}`);
export const updateCrowd = (data) => API.post('/crowd/update', data);

// ===== SIMULATION =====
export const getSimulationStatus = () => API.get('/simulation/status');
export const startSimulation = (crowdSize = 200, speed = 1) =>
  API.post('/simulation/start', { crowdSize, speed });
export const stopSimulation = () => API.post('/simulation/stop');
export const resetSimulation = () => API.post('/simulation/reset');

// ===== ALERTS =====
export const getAlerts = () => API.get('/alerts');
export const createAlert = (type, zone, severity, message) =>
  API.post('/alerts', { type, zone, severity, message });
export const dismissAlert = (alertId) => API.delete(`/alerts/${alertId}`);

// ===== ZONES =====
export const getZones = () => API.get('/zones');
export const createZone = (name, capacity, location) =>
  API.post('/zones', { name, capacity, location });
export const updateZone = (zoneId, data) => API.put(`/zones/${zoneId}`, data);
export const deleteZone = (zoneId) => API.delete(`/zones/${zoneId}`);

// ===== ANALYTICS =====
export const getAnalyticsSummary = () => API.get('/analytics/summary');
export const getAnalyticsHistory = (zoneId) =>
  API.get('/analytics/history', { params: { zoneId } });

export default API;
