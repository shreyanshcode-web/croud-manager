import React, { useMemo } from 'react';

function getCapacityColor(pct) {
  if (pct >= 95) return 'red';
  if (pct >= 80) return 'amber';
  return 'green';
}

function getGateStatusColor(status) {
  if (status === 'restricted') return { cls: 'red', label: 'Busy' };
  if (status === 'busy')       return { cls: 'amber', label: 'Moderate' };
  return { cls: 'green', label: 'Open' };
}

export default function HomeTab({ data, intelligence, onTabChange }) {
  const { venue, stats, gates, sections } = data;
  const capPct = stats.attendancePercent;
  const capColor = getCapacityColor(capPct);

  // Best gate for entry (lowest wait)
  const bestGate = useMemo(() =>
    [...gates].sort((a, b) => a.waitMinutes - b.waitMinutes)[0],
    [gates]
  );

  // Critical section alerts
  const criticalSections = useMemo(() =>
    sections.filter(s => s.status === 'critical' || s.status === 'high').slice(0, 2),
    [sections]
  );

  // AI tip from intelligence
  const topDriver = intelligence?.drivers?.[0];

  return (
    <div className="page fade-in" role="main">
      {/* Event Hero */}
      <div className="event-hero">
        <div className="event-badge" aria-label="Event is live">Live Now</div>
        <h1 className="event-name">{venue.event}</h1>
        <p className="event-meta">📍 {venue.name} &nbsp;·&nbsp; 🕐 {venue.eventTime}</p>

        <div className="capacity-bar-wrap">
          <div className="capacity-bar-label">
            <span>Venue Capacity</span>
            <strong aria-label={`${capPct}% full`}>{capPct}% full · {stats.totalAttendance.toLocaleString()} fans</strong>
          </div>
          <div className="capacity-bar" role="progressbar" aria-valuenow={capPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`capacity-bar-fill`}
              style={{
                width: `${capPct}%`,
                background: capColor === 'red'   ? 'linear-gradient(90deg,#EF4444,#F87171)' :
                            capColor === 'amber' ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' :
                                                   'linear-gradient(90deg,#6366F1,#818CF8)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stat Row */}
      <div className="stat-row">
        <div className="stat-chip">
          <span className="stat-chip-icon">⏱️</span>
          <span className="stat-chip-value">{stats.avgGateWait}m</span>
          <span className="stat-chip-label">Gate Wait</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">🍽️</span>
          <span className="stat-chip-value">{stats.avgConcessionWait}m</span>
          <span className="stat-chip-label">Food Queue</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-icon">🚗</span>
          <span className="stat-chip-value">{stats.parkingUtilization}%</span>
          <span className="stat-chip-label">Parking</span>
        </div>
      </div>

      {/* AI Tip */}
      {topDriver && (
        <div className="alert-card indigo" role="note" aria-label="AI recommendation">
          <span className="alert-card-icon">✨</span>
          <div className="alert-card-body">
            <div className="alert-card-title">AI Recommendation</div>
            <div className="alert-card-msg">
              {topDriver.detail} — {topDriver.label} is the main factor affecting your experience right now.
            </div>
          </div>
        </div>
      )}

      {/* Best Gate Right Now */}
      <div>
        <p className="section-label">Best Entry Gate Right Now</p>
        <button
          className="list-item"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onTabChange('navigate')}
          aria-label={`${bestGate.name} — shortest wait, ${bestGate.waitMinutes.toFixed(1)} minutes`}
        >
          <div className="list-item-icon">🚪</div>
          <div className="list-item-content">
            <div className="list-item-title">{bestGate.name}</div>
            <div className="list-item-sub">Estimated wait: {bestGate.waitMinutes.toFixed(1)} min · Queue: {bestGate.peopleInQueue} people</div>
          </div>
          <span className={`list-item-badge badge-${getGateStatusColor(bestGate.status).cls}`}>
            {getGateStatusColor(bestGate.status).label}
          </span>
        </button>
      </div>

      {/* Area Alerts */}
      {criticalSections.length > 0 && (
        <div>
          <p className="section-label">Crowded Areas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criticalSections.map(sec => (
              <div
                key={sec.id}
                className={`alert-card ${sec.status === 'critical' ? 'red' : 'amber'}`}
                role="alert"
              >
                <span className="alert-card-icon">{sec.status === 'critical' ? '🔴' : '🟠'}</span>
                <div className="alert-card-body">
                  <div className="alert-card-title">{sec.name}</div>
                  <div className="alert-card-msg">{sec.density}% capacity — consider moving to a less crowded area</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="section-label">Quick Actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '🤖', label: 'Ask AI', tab: 'ai' },
            { icon: '🍔', label: 'Find Food', tab: 'food' },
            { icon: '🗺️', label: 'Navigate', tab: 'navigate' },
            { icon: '🚗', label: 'Plan Exit', tab: 'exit' },
          ].map(action => (
            <button
              key={action.tab}
              className="btn btn-ghost"
              onClick={() => onTabChange(action.tab)}
              aria-label={action.label}
            >
              <span role="img" aria-hidden="true">{action.icon}</span> {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
