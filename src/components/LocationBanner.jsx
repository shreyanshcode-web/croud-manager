import React, { useEffect, useRef } from 'react';
import { FiNavigation, FiWifiOff, FiLoader } from 'react-icons/fi';
import { useUserLocation } from '../hooks/useUserLocation';

// Push location pings to the server at most every 200 ms
// (the hook fires at 40 ms but network round trips don't need to match that cadence)
const SERVER_PUSH_INTERVAL_MS = 200;

function pushToServer(lat, lng, accuracy) {
  // Fire-and-forget — never blocks the UI
  fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, accuracy, userId: 'demo-operator' }),
  }).catch(() => {});
}

export default function LocationBanner() {
  const { lat, lng, accuracy, speed, heading, loading, error, retry } = useUserLocation();

  // Throttle server pushes to SERVER_PUSH_INTERVAL_MS
  const lastPushRef = useRef(0);
  useEffect(() => {
    if (lat == null || lng == null) return;
    const now = Date.now();
    if (now - lastPushRef.current < SERVER_PUSH_INTERVAL_MS) return;
    lastPushRef.current = now;
    pushToServer(lat, lng, accuracy);
  }, [lat, lng, accuracy]);

  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-default)',
    fontSize: '12px',
  };

  if (loading) {
    return (
      <div style={{ ...base, background: 'var(--bg-elevated)' }} aria-live="polite">
        <FiLoader
          style={{ color: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}
          aria-hidden="true"
        />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
          Acquiring GPS fix…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...base,
          background: 'rgba(127,29,29,0.35)',
          borderColor: 'rgba(239,68,68,0.3)',
          justifyContent: 'space-between',
        }}
        role="alert"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiWifiOff style={{ color: 'var(--accent-red)' }} aria-hidden="true" />
          <span style={{ color: '#fca5a5', fontWeight: 500 }}>{error}</span>
        </div>
        <button onClick={retry} className="header-btn" style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ ...base, background: 'var(--bg-elevated)', gap: '14px' }}
      aria-live="polite"
      aria-label={`Location: ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
    >
      {/* Pulsing dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: 'var(--accent-emerald)',
          boxShadow: '0 0 0 4px rgba(16,185,129,0.2)',
          animation: 'pulse 2s infinite',
        }} aria-hidden="true" />
      </div>

      <FiNavigation
        size={13}
        style={{
          color: 'var(--accent-cyan)',
          transform: heading != null ? `rotate(${heading}deg)` : 'none',
          transition: 'transform 0.3s ease',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Coords */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.02em' }}>
        {lat?.toFixed(5)}, {lng?.toFixed(5)}
      </span>

      {/* Accuracy */}
      {accuracy != null && (
        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          ±{accuracy}m
        </span>
      )}

      {/* Speed */}
      {speed != null && speed > 0.5 && (
        <span style={{ color: 'var(--accent-amber)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
          {(speed * 3.6).toFixed(1)} km/h
        </span>
      )}

      <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: '10px', whiteSpace: 'nowrap' }}>
        40ms · Kalman
      </span>
    </div>
  );
}
