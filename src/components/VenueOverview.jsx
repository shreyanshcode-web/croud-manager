import React from 'react';
import { FiUsers, FiClock, FiActivity, FiDollarSign, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export default function VenueOverview({ data, aiFeed }) {
  const { stats, sections } = data;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Venue Command Status</h1>
        <p className="page-subtitle">Real-time aggregate data for {data.venue.name}</p>
      </div>

      {stats.activeAlerts > 0 && (
        <div className="alert-banner safety">
          <div className="alert-banner-icon"><FiAlertTriangle /></div>
          <div className="alert-banner-text">
            <strong>CRITICAL:</strong> {stats.blockedExits} blocked exits and {stats.criticalSections} critical seating sections detected. Immediate action required.
          </div>
          <button className="alert-banner-dismiss">Review</button>
        </div>
      )}

      {/* KPI Row */}
      <div className="dashboard-grid">
        <div className="metric-card blue">
          <div className="metric-card-icon blue"><FiUsers /></div>
          <div className="metric-card-content">
            <div className="metric-card-label">Total Attendance</div>
            <div className="metric-card-value">
              {stats.totalAttendance.toLocaleString()}
            </div>
            <div className={`metric-card-trend ${stats.attendancePercent > 90 ? 'up' : 'neutral'}`}>
              {stats.attendancePercent}% of Capacity
            </div>
          </div>
        </div>

        <div className="metric-card emerald">
          <div className="metric-card-icon emerald"><FiClock /></div>
          <div className="metric-card-content">
            <div className="metric-card-label">Avg Gate Wait</div>
            <div className="metric-card-value">{stats.avgGateWait} min</div>
            <div className="metric-card-trend neutral">Across {data.gates.length} Gates</div>
          </div>
        </div>

        <div className="metric-card amber">
          <div className="metric-card-icon amber"><FiActivity /></div>
          <div className="metric-card-content">
            <div className="metric-card-label">Venue Flow Health</div>
            <div className="metric-card-value">{stats.safetyScore}/100</div>
            <div className={`metric-card-trend ${stats.safetyScore < 80 ? 'down' : 'up'}`}>
              {stats.safetyScore < 80 ? 'Needs Attention' : 'Optimal'}
            </div>
          </div>
        </div>

        <div className="metric-card purple">
          <div className="metric-card-icon purple"><FiDollarSign /></div>
          <div className="metric-card-content">
            <div className="metric-card-label">F&B Real-Time Rev</div>
            <div className="metric-card-value">${stats.totalRevenue.toLocaleString()}</div>
            <div className="metric-card-trend up">Trending Up +12%</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-3">
        {/* Heatmap */}
        <div className="glass-card span-2">
          <div className="glass-card-header">
            <div className="glass-card-title">Live Density Heatmap</div>
            <div className="glass-card-subtitle">Aggregated by zone, updated every 3s</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
             {sections.map(sec => (
               <div key={sec.id} style={{
                 padding: '12px',
                 borderRadius: '8px',
                 border: '1px solid var(--border-subtle)',
                 background: sec.status === 'critical' ? 'rgba(239, 68, 68, 0.15)' : 
                             sec.status === 'high' ? 'rgba(245, 158, 11, 0.15)' :
                             sec.status === 'moderate' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                 borderColor: sec.status === 'critical' ? 'rgba(239, 68, 68, 0.4)' : 'transparent'
               }}>
                 <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.name}</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'JetBrains Mono', color: sec.status === 'critical' ? 'var(--accent-red)' : 'white' }}>{sec.density}%</span>
                   <span className={`status-badge ${sec.status}`}>{sec.status}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* AI Feed */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Nova AI Insights</div>
            <div className="glass-card-subtitle">Prioritized actions</div>
          </div>
          
          <div className="ai-feed">
            {aiFeed.map(rec => (
              <div key={rec.id} className="ai-rec-card">
                <div className={`ai-rec-priority ${rec.priority}`}></div>
                <div className="ai-rec-content">
                  <div className="ai-rec-title">{rec.title}</div>
                  <div className="ai-rec-message">{rec.message}</div>
                  {rec.action && (
                    <div className="ai-rec-action">
                      <button>{rec.action}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
