import React from 'react';

function metricColor(value, thresholds) {
  if (!thresholds) return 'var(--text-primary)';
  if (value >= thresholds[1]) return 'var(--red)';
  if (value >= thresholds[0]) return 'var(--amber)';
  return 'var(--green)';
}

export default function LiveStatsPanel({ data, intelligence }) {
  if (!data) return null;

  const { stats, gates, concessions, transport, venue } = data;

  const sortedGates = [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes);
  const bestGate    = sortedGates[0];
  const busyGate    = sortedGates[sortedGates.length - 1];

  const sortedFood  = [...concessions].sort((a, b) => a.avgWaitMinutes - b.avgWaitMinutes);
  const bestFood    = sortedFood[0];

  const nextTransport = [...transport].sort((a, b) => a.eta - b.eta).slice(0, 3);

  const venueScore  = intelligence?.venueScore?.score ?? null;
  const topDriver   = intelligence?.drivers?.[0];

  return (
    <aside className="stats-panel" aria-label="Live venue statistics">
      {/* Live pulse indicator */}
      <div className="live-pulse">
        <span className="live-pulse-dot" aria-hidden="true" />
        Live · Updates every 3s
      </div>

      <div className="stats-panel-title">Venue Telemetry</div>

      {/* ── Venue Score ── */}
      {venueScore !== null && (
        <div className="stats-panel-section">
          <div className="stats-panel-section-title">AI Score</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
          }}>
            <div style={{
              width: 52, height: 52,
              borderRadius: '50%',
              border: `3px solid ${venueScore >= 70 ? 'var(--green)' : venueScore >= 40 ? 'var(--amber)' : 'var(--red)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 16, fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace',
                color: venueScore >= 70 ? 'var(--green)' : venueScore >= 40 ? 'var(--amber)' : 'var(--red)',
              }}>
                {venueScore}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {venueScore >= 70 ? 'Good Conditions' : venueScore >= 40 ? 'Moderate Crowding' : 'High Congestion'}
              </div>
              {topDriver && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  ⚡ {topDriver.label}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Crowd Metrics ── */}
      <div className="stats-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="stats-panel-section-title">Crowd Metrics</div>
        <div className="live-metric">
          <span className="live-metric-label">Attendance</span>
          <span className="live-metric-val" style={{ color: metricColor(stats.attendancePercent, [70, 90]) }}>
            {stats.attendancePercent}%
          </span>
        </div>
        <div className="live-metric">
          <span className="live-metric-label">Total Fans</span>
          <span className="live-metric-val">{stats.totalAttendance.toLocaleString()}</span>
        </div>
        <div className="live-metric">
          <span className="live-metric-label">Gate Wait</span>
          <span className="live-metric-val" style={{ color: metricColor(stats.avgGateWait, [5, 10]) }}>
            {stats.avgGateWait}m avg
          </span>
        </div>
        <div className="live-metric">
          <span className="live-metric-label">Food Queue</span>
          <span className="live-metric-val" style={{ color: metricColor(stats.avgConcessionWait, [5, 10]) }}>
            {stats.avgConcessionWait}m avg
          </span>
        </div>
        <div className="live-metric">
          <span className="live-metric-label">Parking</span>
          <span className="live-metric-val" style={{ color: metricColor(stats.parkingUtilization, [75, 90]) }}>
            {stats.parkingUtilization}%
          </span>
        </div>
        <div className="live-metric">
          <span className="live-metric-label">Active Alerts</span>
          <span className="live-metric-val" style={{ color: stats.activeAlerts > 0 ? 'var(--red)' : 'var(--green)' }}>
            {stats.activeAlerts}
          </span>
        </div>
      </div>

      {/* ── Best Gate ── */}
      <div className="stats-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="stats-panel-section-title">🚪 Gates</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedGates.slice(0, 4).map((gate, idx) => (
            <div key={gate.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px',
              background: idx === 0 ? 'var(--green-glow)' : 'var(--bg-elevated)',
              border: `1px solid ${idx === 0 ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
              borderRadius: 8, fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {idx === 0 ? '⭐ ' : ''}{gate.name}
              </span>
              <span style={{
                fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: gate.waitMinutes < 5 ? 'var(--green)' : gate.waitMinutes < 10 ? 'var(--amber)' : 'var(--red)',
              }}>
                {gate.waitMinutes.toFixed(1)}m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Next Transport ── */}
      <div className="stats-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="stats-panel-section-title">🚌 Next Transport</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nextTransport.map(t => (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, padding: '4px 0',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {t.type === 'Metro' ? '🚇' : t.type === 'Bus' ? '🚌' : '🚐'} {t.line}
              </span>
              <span style={{
                fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                color: t.eta <= 3 ? 'var(--green)' : t.eta <= 8 ? 'var(--amber)' : 'var(--red)',
              }}>
                {t.eta}m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Best Food Pick ── */}
      {bestFood && (
        <div className="stats-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div className="stats-panel-section-title">🍔 Shortest Food Queue</div>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {bestFood.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {bestFood.avgWaitMinutes.toFixed(1)}m wait · {bestFood.section}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent-light)', marginTop: 3 }}>
              Try: {bestFood.popularItem}
            </div>
          </div>
        </div>
      )}

      {/* ── Event Info ── */}
      <div className="stats-panel-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="stats-panel-section-title">📅 Event</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{venue.event}</div>
          <div>📍 {venue.name}</div>
          <div>🕐 {venue.eventTime}</div>
        </div>
      </div>

      {/* Google Services badge */}
      <div style={{ padding: '12px 20px 0', marginTop: 'auto', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 2 }}>
        <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Services Active:<br />
        Gemini AI · Maps · Firestore<br />
        Translation · TTS · Analytics
      </div>
    </aside>
  );
}
