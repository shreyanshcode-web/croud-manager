import React from 'react';
import { FiUsers, FiClock, FiActivity, FiDollarSign, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';
import GlassSurface from './GlassSurface';
import LiquidEther from './LiquidEther';

export default function VenueOverview({ data, aiFeed, intelligence }) {
  const { stats, sections } = data;
  const topDrivers = intelligence?.drivers.slice(0, 3) || [];
  const hotspotCards = [
    intelligence?.gatePredictions[0] && {
      type: 'Gate',
      name: intelligence.gatePredictions[0].name,
      score: intelligence.gatePredictions[0].score,
      detail: `${intelligence.gatePredictions[0].predictedWaitMinutes} min projected wait`,
      action: intelligence.gatePredictions[0].action,
    },
    intelligence?.gatePredictions[1] && {
      type: 'Gate',
      name: intelligence.gatePredictions[1].name,
      score: intelligence.gatePredictions[1].score,
      detail: `${intelligence.gatePredictions[1].predictedWaitMinutes} min projected wait`,
      action: intelligence.gatePredictions[1].action,
    },
    intelligence?.sectionPredictions[0] && {
      type: 'Section',
      name: intelligence.sectionPredictions[0].name,
      score: intelligence.sectionPredictions[0].score,
      detail: `${intelligence.sectionPredictions[0].predictedDensity}% projected density`,
      action: intelligence.sectionPredictions[0].action,
    },
  ].filter(Boolean);

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

      <div
        className="glass-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          minHeight: '250px',
          marginBottom: '20px',
          position: 'relative',
        }}
      >
        <LiquidEther
          colors={['#3b82f6', '#06b6d4', '#8b5cf6']}
          mouseForce={18}
          cursorSize={110}
          isViscous
          viscous={26}
          iterationsViscous={24}
          iterationsPoisson={24}
          resolution={0.45}
          isBounce={false}
          autoDemo
          autoSpeed={0.45}
          autoIntensity={2}
          takeoverDuration={0.3}
          autoResumeDelay={2200}
          autoRampDuration={0.5}
          style={{ position: 'absolute', inset: 0 }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '20px',
            minHeight: '250px',
            background: 'linear-gradient(90deg, rgba(5, 8, 16, 0.74), rgba(5, 8, 16, 0.34))',
          }}
        >
          <div style={{ alignSelf: 'end' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--accent-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '8px',
                fontWeight: 700,
              }}
            >
              Live Risk Field
            </div>
            <h2 style={{ fontSize: '30px', lineHeight: 1.1, marginBottom: '10px' }}>
              Fluid visualization of venue pressure and movement energy
            </h2>
            <p style={{ maxWidth: '560px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              The simulation reacts to pointer motion and idle automation to create a kinetic “crowd energy” layer for demos, while the forecast cards below keep the decision-making grounded in measurable signals.
            </p>
          </div>

          <div
            style={{
              alignSelf: 'center',
              justifySelf: 'end',
              width: '100%',
              maxWidth: '280px',
              background: 'rgba(15, 22, 41, 0.64)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '18px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Forecast Snapshot
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pressure score</span>
                <span className="mono">{intelligence?.venueScore.score ?? '--'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Predicted wait</span>
                <span className="mono">{intelligence?.venueScore.predictedGateWait ?? '--'} min</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Confidence</span>
                <span className="mono">{intelligence?.venueScore.confidence ?? '--'}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-2">
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Google Maps Situation Layer</div>
            <div className="glass-card-subtitle">Ingress and venue routing context</div>
          </div>
          <iframe
            title="Operations map"
            src="https://www.google.com/maps?q=Kanteerava%20Stadium%20Bengaluru&output=embed"
            style={{ width: '100%', height: '280px', border: 0, borderRadius: '14px' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Cloud Data Strategy</div>
            <div className="glass-card-subtitle">Best fit for easier GCP access</div>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div className="queue-card">
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Primary DB: Firestore</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Use Firestore for live incidents, gate actions, parking updates, and operator acknowledgements because it is fast to integrate with Cloud Run and easy to read from the dashboard.
              </div>
            </div>
            <div className="queue-card">
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Analytics DB: BigQuery</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Store historical telemetry in BigQuery for reporting, feature engineering, and model retraining with BigQuery ML.
              </div>
            </div>
          </div>
        </div>
      </div>

      {intelligence && (
        <div className="dashboard-grid-3">
          <GlassSurface
            borderRadius={18}
            blur={14}
            displace={0.8}
            saturation={1.25}
            backgroundOpacity={0.12}
            style={{ minHeight: '100%' }}
          >
            <div className="glass-card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: '100%' }}>
              <div className="glass-card-header">
                <div className="glass-card-title"><FiTrendingUp /> 15-Minute Forecast</div>
                <span className={`status-badge ${intelligence.venueScore.band}`}>
                  {intelligence.venueScore.band}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Crowd Pressure Score
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {intelligence.venueScore.score}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {intelligence.venueScore.summary}
                  </div>
                </div>

                <div className="queue-card" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Predicted attendance</span>
                    <span className="mono">{intelligence.venueScore.predictedAttendance.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Predicted gate wait</span>
                    <span className="mono">{intelligence.venueScore.predictedGateWait} min</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Model confidence</span>
                    <span className="mono">{intelligence.venueScore.confidence}%</span>
                  </div>
                </div>

                <div className="alert-banner warning" style={{ marginBottom: 0 }}>
                  <div className="alert-banner-text">
                    Incident probability: <strong>{intelligence.venueScore.incidentProbability}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </GlassSurface>

          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title"><FiActivity /> Explainable Drivers</div>
              <div className="glass-card-subtitle">Weighted model signals</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topDrivers.map((driver) => (
                <div key={driver.key} className="queue-card" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{driver.label}</div>
                    <div className="mono" style={{ color: 'var(--accent-blue)' }}>{driver.impactShare}%</div>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: '8px' }}>
                    <div
                      className={`progress-bar-fill ${driver.score >= 75 ? 'red' : driver.score >= 55 ? 'amber' : 'blue'}`}
                      style={{ width: `${driver.score}%` }}
                    ></div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{driver.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title"><FiAlertTriangle /> Predicted Hotspots</div>
              <div className="glass-card-subtitle">Next 15 minutes</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {hotspotCards.map((hotspot) => (
                <div key={`${hotspot.type}-${hotspot.name}`} className="queue-card" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {hotspot.type}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{hotspot.name}</div>
                    </div>
                    <div className="mono" style={{ color: hotspot.score >= 75 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                      {hotspot.score}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {hotspot.detail}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                    {hotspot.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
