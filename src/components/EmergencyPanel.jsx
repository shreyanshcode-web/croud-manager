import React from 'react';
import { FiCheckCircle, FiAlertOctagon, FiTool } from 'react-icons/fi';

export default function EmergencyPanel({ data }) {
  const { emergencyExits } = data;

  return (
    <div className="fade-in">
      <div className="section-header">
         <div>
           <h1 className="page-title" style={{ color: 'var(--accent-red)' }}>Emergency & Evacuation</h1>
           <p className="page-subtitle">Exit compliance and crowd safety systems</p>
         </div>
      </div>

      <div className="dashboard-grid-3">
        {/* Evacuation Control */}
        <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(15, 22, 41, 0.9))' }}>
          <div className="glass-card-header">
             <div className="glass-card-title"><FiAlertOctagon color="var(--accent-red)" /> Evacuation Protocol</div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            System ready. Initiating evacuation will open all gates, activate emergency PA routing, and trigger LED exit pathing.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="header-btn" style={{ justifyContent: 'center', background: 'var(--accent-amber)', color: '#000', border: 'none', fontWeight: 'bold' }}>
              Phase 1: Partial Evacuation
            </button>
            <button className="header-btn" style={{ justifyContent: 'center', background: 'var(--accent-red)', color: '#fff', border: 'none', fontWeight: 'bold' }}>
              INITIATE FULL EVACUATION
            </button>
          </div>
        </div>

        {/* Exits Grid */}
        <div className="glass-card span-2">
           <div className="glass-card-header">
             <div className="glass-card-title">Physical Exit Status</div>
             <div className="glass-card-subtitle">{emergencyExits.filter(e => e.status === 'clear').length} / {emergencyExits.length} Clear</div>
           </div>
           
           <div className="emergency-grid">
             {emergencyExits.map(exit => (
               <div key={exit.id} className={`exit-card ${exit.status}`}>
                 <div className="exit-card-header">
                   <div className="exit-card-name">{exit.name}</div>
                   {exit.status === 'clear' ? <FiCheckCircle color="var(--accent-emerald)" /> : 
                    exit.status === 'maintenance' ? <FiTool color="var(--accent-purple)" /> : 
                    <FiAlertOctagon color="var(--accent-red)" />}
                 </div>
                 
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                   <span className={`status-badge ${exit.status}`}>{exit.status}</span>
                   <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{exit.lastChecked}</span>
                 </div>
                 
                 <div className="exit-card-details">
                    Route: {exit.evacuationRoute} • Cap: {exit.capacity}
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
