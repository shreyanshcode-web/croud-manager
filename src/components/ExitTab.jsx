import React, { useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

const VENUE_LAT = 12.9716;
const VENUE_LNG = 77.5946;

function etaColor(eta) {
  if (eta <= 3)  return 'green';
  if (eta <= 8)  return 'amber';
  return 'red';
}

function exitStatusColor(status) {
  if (status === 'clear')       return 'green';
  if (status === 'maintenance') return 'amber';
  return 'red';
}

function getBeatTheRushAdvice(stats) {
  const avgWait = stats.avgGateWait;
  if (avgWait > 12) return {
    icon: '🔴', title: 'High Exit Congestion', color: 'red',
    msg: `Gates are very busy (avg ${avgWait}min). Wait 15-20 minutes after the final whistle for the rush to clear.`,
  };
  if (avgWait > 6) return {
    icon: '🟠', title: 'Moderate Exit Traffic', color: 'amber',
    msg: `Expect a ${avgWait}min wait. Heading out 5-10 min early is your best bet.`,
  };
  return {
    icon: '🟢', title: 'Clear Exit Conditions', color: 'green',
    msg: `Great time to leave! Most gates have under a ${avgWait}min wait.`,
  };
}

const TYPE_ICONS = { Metro: '🚇', Bus: '🚌', Shuttle: '🚐' };

export default function ExitTab({ data }) {
  const { trackEvent } = useAnalytics();
  const { transport, emergencyExits, gates, stats } = data;

  const sortedTransport = useMemo(() =>
    [...transport].sort((a, b) => a.eta - b.eta), [transport]);

  const bestGates = useMemo(() =>
    [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes).slice(0, 3), [gates]);

  const advice = getBeatTheRushAdvice(stats);

  const transportByType = useMemo(() => {
    const groups = {};
    sortedTransport.forEach(t => {
      if (!groups[t.type]) groups[t.type] = [];
      groups[t.type].push(t);
    });
    return groups;
  }, [sortedTransport]);

  // Google Maps — walking route from venue exit to transit hub
  const transitMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${VENUE_LAT},${VENUE_LNG}&destination=Cubbon+Park+Metro+Station+Bengaluru&travelmode=walking`;

  return (
    <div className="fade-in page">
      <div style={{ paddingTop: 4 }}>
        <h2 className="page-title">Plan Your Exit</h2>
        <p className="page-subtitle">Best routes, transport & smart timing</p>
      </div>

      {/* Beat the Rush */}
      <div className={`alert-card ${advice.color}`} role="note">
        <span className="alert-card-icon">{advice.icon}</span>
        <div className="alert-card-body">
          <div className="alert-card-title">{advice.title}</div>
          <div className="alert-card-msg">{advice.msg}</div>
        </div>
      </div>

      {/* Google Maps — Route to nearest transit */}
      <a
        href={transitMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-full"
        style={{ textDecoration: 'none', display: 'flex' }}
        aria-label="Open Google Maps route from venue to metro station"
        onClick={() => trackEvent('exit_maps_route_opened')}
      >
        🗺️ Navigate to Nearest Metro (Google Maps)
      </a>

      {/* Best Exit Gates */}
      <div>
        <p className="section-label">🚪 Quickest Exit Gates</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bestGates.map((gate, idx) => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gate.name + ' Kanteerava Stadium Bengaluru')}`;
            return (
              <div key={gate.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="list-item-icon">{idx === 0 ? '⭐' : '🚪'}</div>
                <div className="list-item-content">
                  <div className="list-item-title">
                    {gate.name}
                    {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>FASTEST</span>}
                  </div>
                  <div className="list-item-sub">{gate.peopleInQueue} people · {gate.zone}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span className={`list-item-badge badge-${gate.waitMinutes < 5 ? 'green' : gate.waitMinutes < 10 ? 'amber' : 'red'}`}>
                    {gate.waitMinutes.toFixed(1)}m
                  </span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-ghost"
                    style={{ textDecoration: 'none', padding: '4px 8px' }}
                    aria-label={`Navigate to ${gate.name}`}
                    onClick={() => trackEvent('exit_gate_maps_clicked', { gate: gate.name })}
                  >
                    🗺️
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transport */}
      <div>
        <p className="section-label">🚌 Upcoming Transport</p>
        {Object.entries(transportByType).map(([type, vehicles]) => (
          <div key={type} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              {TYPE_ICONS[type] || '🚌'} {type}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.slice(0, 2).map(v => (
                <div key={v.id} className="list-item">
                  <div className="list-item-icon">{TYPE_ICONS[type] || '🚌'}</div>
                  <div className="list-item-content">
                    <div className="list-item-title">{v.line}</div>
                    <div className="list-item-sub">{v.passengers}/{v.maxPassengers} passengers · {v.capacity}% full</div>
                    <div className="progress" style={{ marginTop: 6 }}>
                      <div className={`progress-fill ${v.capacity > 80 ? 'red' : v.capacity > 50 ? 'amber' : 'green'}`}
                        style={{ width: `${v.capacity}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`list-item-badge badge-${etaColor(v.eta)}`}>{v.eta}m</span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase' }}>{v.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Exits */}
      <div>
        <p className="section-label">🏃 Emergency Exits</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emergencyExits.slice(0, 5).map(exit => (
            <div key={exit.id} className="list-item">
              <div className="list-item-icon">🚪</div>
              <div className="list-item-content">
                <div className="list-item-title">{exit.name} <span className="fs-12 text-muted">· {exit.zone} Zone</span></div>
                <div className="list-item-sub">Route: {exit.evacuationRoute} · Checked {exit.lastChecked}</div>
              </div>
              <span className={`list-item-badge badge-${exitStatusColor(exit.status)}`}>{exit.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
        Navigation via <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Maps Platform
      </div>
    </div>
  );
}
