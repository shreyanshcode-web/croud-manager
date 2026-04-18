import React, { useState, useEffect } from 'react';
import { FiMap, FiClock, FiActivity, FiAlertCircle } from 'react-icons/fi';
import GlassSurface from './GlassSurface';

export default function TrafficHUD() {
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const res = await fetch('/api/traffic');
        const data = await res.json();
        setTraffic(data);
      } catch (err) {
        console.error('Failed to fetch traffic HUD data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 60000); // UI updates every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !traffic) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
        Initialising Google Traffic Sentinel...
      </div>
    );
  }

  const routes = traffic?.routes || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#EDEDED', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiMap /> INGRESS STRESS HUD
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Live Google Maps Signals
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: traffic?.avgStress > 70 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
            {traffic?.avgStress || 0}%
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>GLOBAL STRESS</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {routes.map((route) => (
          <div key={route.id} style={{ 
            padding: '12px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#EDEDED' }}>{route.name}</div>
              <div style={{ 
                fontSize: '11px', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                background: route.status === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.3)',
                color: route.status === 'CRITICAL' ? 'var(--accent-red)' : 'var(--text-muted)',
                fontWeight: 700
              }}>
                {route.status}
              </div>
            </div>

            <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ 
                height: '100%', 
                width: `${route.stressScore}%`, 
                background: route.stressScore > 75 ? 'var(--accent-red)' : route.stressScore > 40 ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                transition: 'width 1s ease-in-out'
              }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <FiClock size={12} /> Delay: <span style={{ fontFamily: 'JetBrains Mono', color: route.delayMinutes > 10 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>+{route.delayMinutes}m</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <FiActivity size={12} /> Congestion: <span style={{ fontFamily: 'JetBrains Mono' }}>{route.congestionRatio}x</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {traffic?.avgStress > 60 && (
        <div style={{ 
          marginTop: 'auto',
          padding: '12px', 
          background: 'rgba(239,68,68,0.1)', 
          border: '1px solid rgba(239,68,68,0.2)', 
          borderRadius: '12px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <FiAlertCircle color="var(--accent-red)" size={20} />
          <div style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.4 }}>
            Ingress stress is high. Gemini suggests activating <strong>Emergency Overspill Routing</strong> for South gates.
          </div>
        </div>
      )}
    </div>
  );
}
