import React from 'react';

export default function ParkingPanel({ data }) {
  const { parking } = data;

  return (
    <div className="fade-in">
      <div className="section-header">
         <div>
           <h1 className="page-title">Parking Matrix</h1>
           <p className="page-subtitle">Vehicle flow and zone utilization</p>
         </div>
      </div>

      <div className="dashboard-grid-3">
        {parking.map(zone => (
          <div key={zone.id} className="parking-card" style={{ borderTop: `3px solid ${zone.color}` }}>
            <div className="parking-card-header">
              <div className="parking-card-name" style={{ color: zone.color }}>{zone.name}</div>
              <span className={`status-badge ${zone.status}`}>{zone.status}</span>
            </div>
            
            <div style={{ position: 'relative', height: '12px', background: 'var(--bg-base)', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${zone.fillPercent}%`, background: zone.color, transition: 'width 0.5s ease', opacity: 0.8 }} />
              <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                {zone.fillPercent}%
              </div>
            </div>

            <div className="parking-card-stats">
              <div className="parking-card-stat">
                <div className="parking-card-stat-value">{zone.filledSpots}/{zone.totalSpots}</div>
                <div className="parking-card-stat-label">Spots</div>
              </div>
              <div className="parking-card-stat">
                <div className="parking-card-stat-value" style={{ color: 'var(--accent-cyan)' }}>+{zone.entryRate} -{zone.exitRate}</div>
                <div className="parking-card-stat-label">Flow / min</div>
              </div>
              <div className="parking-card-stat">
                <div className="parking-card-stat-value" style={{ color: zone.status === 'full' ? 'var(--accent-red)' : 'var(--text-primary)' }}>{zone.estimatedTimeToFull}</div>
                <div className="parking-card-stat-label">Full ETA</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
