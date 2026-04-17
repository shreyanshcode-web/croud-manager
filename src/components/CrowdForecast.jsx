import React from 'react';
import {
  FiTrendingUp,
  FiAlertTriangle,
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiZap,
} from 'react-icons/fi';
import GlassSurface from './GlassSurface';
import { bandFromScore } from '../ml/crowdIntelligence';

function RiskGauge({ score }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color =
    score >= 75 ? 'var(--accent-red)' :
    score >= 55 ? 'var(--accent-amber)' :
    score >= 35 ? 'var(--accent-blue)' :
    'var(--accent-emerald)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width="130" height="130" viewBox="0 0 130 130" aria-label={`Crowd pressure score: ${score} out of 100`}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--bg-surface)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
        <text x="65" y="60" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {score}
        </text>
        <text x="65" y="78" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="500" textTransform="uppercase">
          PRESSURE
        </text>
      </svg>
    </div>
  );
}

function DriverBar({ driver }) {
  const color =
    driver.score >= 75 ? 'red' :
    driver.score >= 55 ? 'amber' :
    'blue';

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{driver.label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>
          {driver.impactShare}% weight
        </span>
      </div>
      <div className="progress-bar">
        <div className={`progress-bar-fill ${color}`} style={{ width: `${driver.score}%` }} />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{driver.detail}</div>
    </div>
  );
}

export default function CrowdForecast({ data, intelligence }) {
  if (!intelligence) return null;

  const { venueScore, drivers, gatePredictions, sectionPredictions } = intelligence;
  const topGates = gatePredictions.slice(0, 4);
  const topSections = sectionPredictions.slice(0, 4);

  const bandColor = {
    critical: 'var(--accent-red)',
    high: 'var(--accent-amber)',
    elevated: 'var(--accent-blue)',
    low: 'var(--accent-emerald)',
  }[venueScore.band] || 'var(--accent-blue)';

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">15-Minute Crowd Forecast</h1>
        <p className="page-subtitle">
          Interpretable ML model — scores updated every 3 s from the live simulation
        </p>
      </div>

      {/* Top row: gauge + summary + incident probability */}
      <div className="dashboard-grid-3" style={{ alignItems: 'start' }}>
        <GlassSurface borderRadius={18} blur={14} displace={0.8} saturation={1.3} backgroundOpacity={0.12}>
          <div
            className="glass-card"
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: '100%', textAlign: 'center' }}
          >
            <div className="glass-card-header" style={{ justifyContent: 'center' }}>
              <div className="glass-card-title"><FiActivity /> Venue Pressure Score</div>
            </div>
            <RiskGauge score={venueScore.score} />
            <div style={{ marginTop: '12px' }}>
              <span
                className={`status-badge ${venueScore.band}`}
                style={{ fontSize: '13px', padding: '5px 16px' }}
              >
                {venueScore.band.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px' }}>
              {venueScore.summary}
            </p>
          </div>
        </GlassSurface>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title"><FiTrendingUp /> Predicted Metrics</div>
            <div className="glass-card-subtitle">Next 15 min</div>
          </div>
          <div style={{ display: 'grid', gap: '14px' }}>
            {[
              { label: 'Predicted attendance', value: venueScore.predictedAttendance.toLocaleString(), unit: '' },
              { label: 'Predicted gate wait', value: venueScore.predictedGateWait, unit: ' min' },
              { label: 'Model confidence', value: venueScore.confidence, unit: '%' },
            ].map(({ label, value, unit }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                  {value}{unit}
                </span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Venue capacity</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                {data.venue.capacity.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            borderColor: venueScore.incidentProbability >= 60 ? 'rgba(239,68,68,0.35)' : 'var(--glass-border)',
            background: venueScore.incidentProbability >= 60
              ? 'linear-gradient(135deg, rgba(239,68,68,0.08), var(--glass-bg))'
              : 'var(--glass-bg)',
          }}
        >
          <div className="glass-card-header">
            <div className="glass-card-title">
              <FiAlertTriangle color={venueScore.incidentProbability >= 60 ? 'var(--accent-red)' : 'var(--accent-amber)'} />
              Incident Probability
            </div>
          </div>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: bandColor,
              lineHeight: 1,
              marginBottom: '10px',
            }}
          >
            {venueScore.incidentProbability}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Derived from blocked exits, critical sections, and the compound pressure score.
          </div>
          {venueScore.incidentProbability >= 60 ? (
            <div className="alert-banner safety" style={{ marginBottom: 0 }}>
              <div className="alert-banner-text">
                High probability — escalate safety checks now.
              </div>
            </div>
          ) : (
            <div className="alert-banner info" style={{ marginBottom: 0 }}>
              <div className="alert-banner-text">Within normal operating range.</div>
            </div>
          )}
        </div>
      </div>

      {/* Driver breakdown */}
      <div className="dashboard-grid-2">
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title"><FiZap /> Explainable Model Drivers</div>
            <div className="glass-card-subtitle">6 weighted signals</div>
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            {drivers.map((d) => <DriverBar key={d.key} driver={d} />)}
          </div>
        </div>

        {/* Gate + section predictions side by side */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title"><FiClock /> Gate Pressure Forecast</div>
              <div className="glass-card-subtitle">Sorted by risk score</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gate</th>
                  <th>Score</th>
                  <th>Wait</th>
                  <th>Band</th>
                </tr>
              </thead>
              <tbody>
                {topGates.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600, fontSize: '12px' }}>{g.name}</td>
                    <td className="mono">{g.score}</td>
                    <td className="mono" style={{ color: g.predictedWaitMinutes > 10 ? 'var(--accent-red)' : 'inherit' }}>
                      {g.predictedWaitMinutes}m
                    </td>
                    <td><span className={`status-badge ${g.band}`}>{g.band}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title"><FiCheckCircle /> Section Density Forecast</div>
              <div className="glass-card-subtitle">Highest risk first</div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Score</th>
                  <th>Proj. Density</th>
                  <th>Band</th>
                </tr>
              </thead>
              <tbody>
                {topSections.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, fontSize: '12px' }}>{s.name}</td>
                    <td className="mono">{s.score}</td>
                    <td className="mono" style={{ color: s.predictedDensity > 90 ? 'var(--accent-red)' : 'inherit' }}>
                      {s.predictedDensity}%
                    </td>
                    <td><span className={`status-badge ${s.band}`}>{s.band}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recommended actions from top gate predictions */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title"><FiActivity /> Recommended Actions (Top Hotspots)</div>
          <div className="glass-card-subtitle">Derived from ML output</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {gatePredictions.slice(0, 6).map((g) => (
            <div
              key={g.id}
              className="queue-card"
              style={{
                borderLeft: `3px solid ${g.score >= 75 ? 'var(--accent-red)' : g.score >= 55 ? 'var(--accent-amber)' : 'var(--accent-blue)'}`,
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{g.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Score {g.score} · {g.predictedWaitMinutes} min projected · {g.confidence}% confidence
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{g.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
