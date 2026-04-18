import React from 'react';
import { FiMaximize2, FiArrowRight } from 'react-icons/fi';
import GlassSurface from './GlassSurface';

export default function GateMonitor({ data, intelligence }) {
  const gates = data?.gates || [];
  const analysis = intelligence?.gatePredictions?.slice(0, 3) || [];

  return (
    <div className="fade-in">
      <div className="section-header">
         <div>
           <h1 className="page-title">Entry & Ingress Control</h1>
           <p className="page-subtitle">Real-time gate throughput and security scan delays</p>
         </div>
      </div>

      {/* AI Task Analysis Section */}
      <div className="dashboard-grid-2">
        <GlassSurface
          borderRadius={18}
          blur={14}
          displace={0.8}
          saturation={1.22}
          backgroundOpacity={0.1}
          style={{ minHeight: '100%' }}
        >
          <div className="glass-card" style={{ borderColor: 'var(--accent-blue)', background: 'transparent', boxShadow: 'none', width: '100%' }}>
            <div className="glass-card-header">
              <div className="glass-card-title"><FiMaximize2 /> AI Congestion Analysis</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysis.map((rec) => (
                <div key={rec.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `3px solid ${rec.score >= 75 ? 'var(--accent-red)' : 'var(--accent-amber)'}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Target: {rec.name} ({rec.score}/100 pressure)
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px' }}>
                    <span style={{color: 'var(--text-muted)'}}>Confidence:</span>
                    <span style={{color: 'var(--accent-cyan)', fontWeight: 'bold'}}>{rec.confidence}%</span>

                    <span style={{color: 'var(--text-muted)'}}>Alternate:</span>
                    <span style={{color: 'var(--accent-emerald)', fontWeight: 'bold'}}>{rec.recommendedGate} <FiArrowRight style={{verticalAlign:'middle'}}/> lower-load corridor</span>
                    
                    <span style={{color: 'var(--text-muted)'}}>Forecast:</span>
                    <span style={{fontStyle: 'italic', color: 'var(--text-primary)'}}>{rec.predictedWaitMinutes} min projected wait</span>
                    
                    <span style={{color: 'var(--text-muted)'}}>Ops Action:</span>
                    <span style={{color: 'var(--accent-amber)'}}>{rec.action}</span>

                    <span style={{color: 'var(--text-muted)'}}>Why:</span>
                    <span style={{color: 'var(--text-secondary)'}}>{rec.reason}</span>
                  </div>
                  
                  <div style={{ marginTop: '10px' }}>
                    <button className="header-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>Execute Flow Plan</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassSurface>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Gate Overview</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Status</th>
                <th>Wait</th>
                <th>Queue</th>
                <th>Throughput</th>
              </tr>
            </thead>
            <tbody>
              {gates.map(g => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{g.name}</td>
                  <td><span className={`status-badge ${g.status}`}>{g.status}</span></td>
                  <td className="mono" style={{ color: g.waitMinutes > 10 ? 'var(--accent-red)' : 'inherit' }}>{g.waitMinutes.toFixed(1)}m</td>
                  <td className="mono">{g.peopleInQueue} p</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-bar" style={{ width: '60px', height: '4px' }}>
                        <div className={`progress-bar-fill ${g.status === 'restricted' ? 'red' : g.status === 'busy' ? 'amber' : 'emerald'}`} style={{ width: `${g.utilization}%` }}></div>
                      </div>
                      <span className="mono" style={{ fontSize: '11px' }}>{g.utilization}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
