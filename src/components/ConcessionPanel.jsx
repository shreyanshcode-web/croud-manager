import React, { useMemo } from 'react';
import { FiCoffee, FiMessageSquare, FiTrendingUp } from 'react-icons/fi';

export default function ConcessionPanel({ data }) {
  const { concessions, restrooms } = data;

  // Analysis based on the prompt
  const analysis = useMemo(() => {
    // 1. Rank stands by wait time
    const sortedStands = [...concessions].sort((a, b) => b.avgWaitMinutes - a.avgWaitMinutes);
    const overloaded = sortedStands.filter(s => s.avgWaitMinutes > 8);
    const available = sortedStands.filter(s => s.avgWaitMinutes < 3);

    // Generate nudges for overloaded areas
    const messages = overloaded.slice(0, 3).map(stand => {
      // Find a nearby available stand (ideally same section, or just any low-wait one)
      const alt = available.find(a => a.section === stand.section) || available[0];
      
      const text = alt 
        ? `Skip the line at ${stand.name}! ${alt.name} nearby has zero wait for ${alt.popularItem}.`
        : `Lines are long in ${stand.section}! Use our mobile ordering tab to skip the wait.`;

      return {
        target: stand.section,
        stand: stand.name,
        text
      };
    });

    return {
      ranked: sortedStands,
      messages,
      action: "Enable 'Order to Seat' delivery exclusively for sections with > 12 min concession delays to alleviate concourse crowding."
    };
  }, [concessions]);

  return (
    <div className="fade-in">
      <div className="section-header">
         <div>
           <h1 className="page-title">Concessions & Amenities</h1>
           <p className="page-subtitle">Queue monitoring and revenue flow</p>
         </div>
      </div>

      <div className="dashboard-grid-3">
        {/* AI Action Box */}
        <div className="glass-card span-3" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div className="glass-card-header" style={{ marginBottom: '8px' }}>
            <div className="glass-card-title"><FiMessageSquare /> AI Nudge Engine (Active)</div>
          </div>
          
          <div className="dashboard-grid-3" style={{ marginBottom: '16px' }}>
            {analysis.messages.map((msg, i) => (
              <div key={i} style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Push to: {msg.target}</div>
                <div style={{ fontSize: '13px', fontStyle: 'italic', fontWeight: 500 }}>"{msg.text}"</div>
              </div>
            ))}
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiTrendingUp color="var(--accent-emerald)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Operational Action Recommended</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{analysis.action}</span>
            </div>
            <button className="header-btn" style={{ marginLeft: 'auto' }}>Deploy Action</button>
          </div>
        </div>

        {/* Top 6 Longest Waits */}
        <div className="glass-card span-2">
           <div className="glass-card-header">
             <div className="glass-card-title">Live F&B Wait Times</div>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
             {analysis.ranked.slice(0, 6).map(stand => (
               <div key={stand.id} className="queue-card">
                 <div className="queue-card-header">
                   <div className="queue-card-name">{stand.name}</div>
                   <span className={`status-badge ${stand.status}`}>{stand.status}</span>
                 </div>
                 
                 <div className="queue-card-stats">
                   <div className="queue-card-stat">
                     <span className="queue-card-stat-label">Wait</span>
                     <span className="queue-card-stat-value" style={{ color: stand.avgWaitMinutes > 10 ? 'var(--accent-red)' : stand.avgWaitMinutes > 5 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                       {stand.avgWaitMinutes.toFixed(1)}m
                     </span>
                   </div>
                   <div className="queue-card-stat">
                     <span className="queue-card-stat-label">Queue</span>
                     <span className="queue-card-stat-value">{stand.queueLength}</span>
                   </div>
                   <div className="queue-card-stat">
                     <span className="queue-card-stat-label">Zone</span>
                     <span className="queue-card-stat-value" style={{ fontSize: '12px' }}>{stand.section.replace('Section ', '')}</span>
                   </div>
                 </div>
                 
                 <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                   Staff: {stand.staffCount} | Hot Item: <span style={{ color: 'var(--accent-cyan)' }}>{stand.popularItem}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Restrooms */}
        <div className="glass-card">
          <div className="glass-card-header">
             <div className="glass-card-title">Restroom Status</div>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {restrooms.map(wc => (
               <div key={wc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '6px' }}>
                 <div>
                   <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{wc.location}</div>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wc.availableStalls} / {wc.totalStalls} stalls open</div>
                 </div>
                 
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: wc.occupancyPercent > 85 ? 'var(--accent-red)' : wc.occupancyPercent > 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                      {wc.occupancyPercent}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      wait: {wc.waitMinutes.toFixed(0)}m
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
