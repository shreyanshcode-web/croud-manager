import React, { useMemo } from 'react';
import { FiUsers, FiClock, FiMaximize2, FiArrowRight } from 'react-icons/fi';

export default function GateMonitor({ data }) {
  const { gates } = data;

  // Analysis based on the latest prompt
  const analysis = useMemo(() => {
    const sorted = [...gates].sort((a, b) => b.utilization - a.utilization);
    const top2 = sorted.slice(0, 2);
    
    // Find alternates for each of the top 2
    const recommendations = top2.map(gate => {
      // Find a gate that is open and has low utilization
      const alt = gates.find(g => 
        g.id !== gate.id && 
        g.status === 'open' && 
        g.utilization < 60
      ) || gates.find(g => g.id !== gate.id && g.status !== 'restricted'); // Fallback

      return {
        overloaded: gate,
        alt: alt,
        push: alt ? `Avoid ${gate.name}. Use ${alt.name} for 5 min entry. Just a 2 min walk right!` : 'Gate busy. Please have tickets ready.',
        staffing: alt ? `Move 2 staff from ${alt.name} to ${gate.name} to assist scanning.` : `Deploy 2 roaming concierges to ${gate.name}.`
      };
    });

    return recommendations;
  }, [gates]);

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
        <div className="glass-card" style={{ borderColor: 'var(--accent-blue)', background: 'linear-gradient(to right, rgba(15, 22, 41, 0.9), rgba(59, 130, 246, 0.05))'}}>
          <div className="glass-card-header">
            <div className="glass-card-title"><FiMaximize2 /> AI Congestion Analysis</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {analysis.map((rec, i) => (
              <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '3px solid var(--accent-red)' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Target: {rec.overloaded.name} ({rec.overloaded.utilization}%)
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px' }}>
                  <span style={{color: 'var(--text-muted)'}}>Alternate:</span>
                  <span style={{color: 'var(--accent-emerald)', fontWeight: 'bold'}}>{rec.alt?.name} ({rec.alt?.utilization}%) <FiArrowRight style={{verticalAlign:'middle'}}/> ~200m walk</span>
                  
                  <span style={{color: 'var(--text-muted)'}}>Auto-SMS:</span>
                  <span style={{fontStyle: 'italic', color: 'var(--text-primary)'}}>"{rec.push}"</span>
                  
                  <span style={{color: 'var(--text-muted)'}}>Ops Action:</span>
                  <span style={{color: 'var(--accent-amber)'}}>{rec.staffing}</span>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <button className="header-btn" style={{ padding: '4px 10px', fontSize: '11px' }}>Execute Flow Plan</button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
