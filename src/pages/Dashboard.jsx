/**
 * Dashboard Page
 * Main command center with live simulation and metrics
 * Uses real-time WebSocket updates
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrowdData } from '../hooks/useCrowdData.js';
import CrowdSimulation from '../components/CrowdSimulation.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { crowd, simulation, alerts, loading, error, startSimulation, stopSimulation, resetSimulation, dismissAlert, wsConnected } = useCrowdData();
  const [crowdSize, setCrowdSize] = useState(200);
  const [speed, setSpeed] = useState(1);

  const handleStart = async () => {
    try {
      await startSimulation(crowdSize, speed);
    } catch (err) {
      console.error('Failed to start simulation:', err);
    }
  };

  const handleStop = async () => {
    try {
      await stopSimulation();
    } catch (err) {
      console.error('Failed to stop simulation:', err);
    }
  };

  const handleReset = async () => {
    try {
      await resetSimulation();
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>
          Initializing system...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            COMMAND CENTER
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {wsConnected ? '● LIVE' : '○ OFFLINE'} | Simulation: {simulation?.state || 'IDLE'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #1A1A1A',
              color: '#EDEDED',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 150ms linear',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#00E0FF';
              e.target.style.color = '#00E0FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1A1A1A';
              e.target.style.color = '#EDEDED';
            }}
          >
            ← HOME
          </button>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #1A1A1A',
              color: '#EDEDED',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 150ms linear',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#00E0FF';
              e.target.style.color = '#00E0FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1A1A1A';
              e.target.style.color = '#EDEDED';
            }}
          >
            ANALYTICS
          </button>
          <button
            onClick={() => navigate('/ops')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #1A1A1A',
              color: '#EDEDED',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 150ms linear',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#00E0FF';
              e.target.style.color = '#00E0FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#1A1A1A';
              e.target.style.color = '#EDEDED';
            }}
          >
            OPS
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', flex: 1, overflow: 'hidden', borderBottom: '2px solid #1A1A1A' }}>
        {/* LEFT: SIMULATION */}
        <div style={{ position: 'relative', borderRight: '2px solid #1A1A1A', overflow: 'hidden' }}>
          <CrowdSimulation />
        </div>

        {/* RIGHT: CONTROLS + ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {/* CONTROLS */}
          <div style={{ padding: '24px', borderBottom: '2px solid #1A1A1A' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '16px' }}>
              SIMULATION CONTROL
            </div>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Crowd Size: {crowdSize}
                </label>
                <input
                  type="range"
                  min="10"
                  max="5000"
                  value={crowdSize}
                  onChange={(e) => setCrowdSize(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  Speed: {speed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                onClick={handleStart}
                disabled={simulation?.state === 'SIMULATING'}
                style={{
                  padding: '8px 12px',
                  background: simulation?.state === 'SIMULATING' ? '#1A1A1A' : '#00E0FF',
                  color: simulation?.state === 'SIMULATING' ? '#6B7280' : '#0A0A0A',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: simulation?.state === 'SIMULATING' ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms linear',
                }}
              >
                START
              </button>
              <button
                onClick={handleStop}
                disabled={simulation?.state !== 'SIMULATING'}
                style={{
                  padding: '8px 12px',
                  background: simulation?.state !== 'SIMULATING' ? '#1A1A1A' : '#FFB800',
                  color: simulation?.state !== 'SIMULATING' ? '#6B7280' : '#0A0A0A',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: simulation?.state !== 'SIMULATING' ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms linear',
                }}
              >
                STOP
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 12px',
                  background: '#FF3B3B',
                  color: '#0A0A0A',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 150ms linear',
                }}
              >
                RESET
              </button>
            </div>
          </div>

          {/* FIX #5: Render crowd data returned from hook — was fetched but never displayed */}
          {crowd && (
            <div style={{ padding: '16px 24px', borderBottom: '2px solid #1A1A1A' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '10px' }}>
                LIVE CROWD DATA
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {crowd.totalPeople !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#6B7280' }}>Total People</span>
                    <span style={{ color: '#00E0FF', fontWeight: 700 }}>{crowd.totalPeople}</span>
                  </div>
                )}
                {crowd.density !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#6B7280' }}>Density</span>
                    <span style={{ color: '#00E0FF', fontWeight: 700 }}>{crowd.density}%</span>
                  </div>
                )}
                {crowd.activeZones !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#6B7280' }}>Active Zones</span>
                    <span style={{ color: '#00E0FF', fontWeight: 700 }}>{crowd.activeZones}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALERTS */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '12px' }}>
              ACTIVE ALERTS ({alerts.length})
            </div>

            {alerts.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                No active alerts
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px',
                      border: `1px solid ${alert.severity === 'CRITICAL' ? '#FF3B3B' : alert.severity === 'HIGH' ? '#FFB800' : '#00E0FF'}`,
                      borderLeft: `3px solid ${alert.severity === 'CRITICAL' ? '#FF3B3B' : alert.severity === 'HIGH' ? '#FFB800' : '#00E0FF'}`,
                      background: 'rgba(0,0,0,0.3)',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '2px' }}>{alert.type}</div>
                      <div style={{ color: '#6B7280', fontSize: '10px' }}>{alert.message}</div>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 8px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={{ padding: '12px 32px', background: '#FF3B3B', color: '#0A0A0A', fontSize: '12px', fontWeight: 700 }}>
          ERROR: {error}
        </div>
      )}
    </div>
  );
}
