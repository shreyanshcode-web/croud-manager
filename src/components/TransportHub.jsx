import React, { useMemo } from 'react';
import { FiMapPin, FiTruck, FiNavigation } from 'react-icons/fi';

export default function TransportHub({ data }) {
  const { transport, venue, parking } = data;

  // Analysis based on the prompt
  // Target: Attendee in "Lower East A", arriving from outside. Traffic: High
  const routingAnalysis = useMemo(() => {
    const isTrafficHigh = true;
    
    // Find best transit (since traffic is high)
    const bestTransit = transport.find(t => t.type === 'Metro' || t.capacity < 80);
    // Find best parking if they drive
    const bestParking = parking.find(p => p.status === 'available');

    const recommendedOption = isTrafficHigh && bestTransit 
      ? `Take the ${bestTransit.line}. Arriving in ${bestTransit.eta} mins.` 
      : `${bestParking?.name || 'Overflow lot'} has spots.`;

    // Simulated event time parsing (assuming 7:30 PM from the mock)
    const arrivalBuffer = "6:45 PM"; // 45 min buffer

    return {
      plan: {
        method: recommendedOption,
        arrival: arrivalBuffer,
        route: "Take East Gate A (currently fastest). Walk straight to Concourse Level 1.",
        tip: "Skip the drink line! Pre-order your beer now in the app and pick it up at the Express Lane near section 104."
      }
    };
  }, [transport, parking]);

  // Group transport by type
  const groupedTransport = transport.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = [];
    acc[curr.type].push(curr);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="section-header">
         <div>
           <h1 className="page-title">External Mobility & Transit</h1>
           <p className="page-subtitle">Arrival/departure integration</p>
         </div>
      </div>

      <div className="dashboard-grid-2">
        {/* Pre-arrival routing (Addressing user prompt) */}
        <div className="glass-card" style={{ borderTop: '4px solid var(--accent-emerald)', display: 'flex', flexDirection: 'column' }}>
          <div className="glass-card-header">
            <div className="glass-card-title"><FiNavigation /> Smart Pre-Arrival Plan Generator</div>
          </div>
          
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
             <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
               Generated for an attendee sitting in <strong style={{color:'white'}}>Lower East A</strong> during High Traffic:
             </p>
             
             <div style={{ display: 'grid', gap: '12px' }}>
               <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: '8px', color: 'var(--accent-cyan)' }}><FiTruck /></div>
                 <div>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Travel Option</div>
                   <div style={{ fontSize: '14px', fontWeight: 600 }}>{routingAnalysis.plan.method}</div>
                 </div>
               </div>
               
               <div style={{ display: 'flex', gap: '12px' }}>
                 <div style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: '8px', color: 'var(--accent-amber)' }}><FiMapPin /></div>
                 <div>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Arrival & Route</div>
                   <div style={{ fontSize: '13px' }}>Aim for <strong>{routingAnalysis.plan.arrival}</strong>. {routingAnalysis.plan.route}</div>
                 </div>
               </div>
               
               <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed var(--accent-emerald)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontStyle: 'italic' }}>
                 💡 <strong>Pro-Tip:</strong> {routingAnalysis.plan.tip}
               </div>
             </div>
             
             <button className="header-btn" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>Send SMS Notification</button>
          </div>
        </div>

        {/* Live Transit Boards */}
        <div className="glass-card" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <div className="glass-card-header">
            <div className="glass-card-title">Live Transport Feeds</div>
          </div>
          
          {Object.entries(groupedTransport).map(([type, vehicles]) => (
            <div key={type} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                {type} Lines
              </div>
              
              {vehicles.sort((a,b) => a.eta - b.eta).map(vehicle => (
                <div key={vehicle.id} className="transport-row">
                  <div className={`transport-type-icon ${type}`}>{type === 'Metro' ? '🚇' : type === 'Bus' ? '🚌' : '🚐'}</div>
                  <div className="transport-info">
                    <div className="transport-line">{vehicle.line}</div>
                    <div className="transport-detail">
                      <div className="progress-bar" style={{ width: '100px', height: '4px', display: 'inline-block', marginRight: '8px' }}>
                        <div className={`progress-bar-fill ${vehicle.capacity > 85 ? 'red' : vehicle.capacity > 60 ? 'amber' : 'emerald'}`} style={{ width: `${vehicle.capacity}%` }}></div>
                      </div>
                      {vehicle.passengers} / {vehicle.maxPassengers} Pass
                    </div>
                  </div>
                  <div>
                     <div className={`transport-eta ${vehicle.status}`}>{vehicle.eta}m</div>
                     <div style={{ fontSize: '10px', textAlign: 'right', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{vehicle.status.replace('-', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
