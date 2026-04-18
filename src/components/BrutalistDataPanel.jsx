/**
 * BrutalistDataPanel — Monospaced metrics, hard edges, no cards
 * Divider lines, mechanical feel, command-system aesthetic
 */
import React, { useState, useEffect } from 'react';

const CounterAnimation = ({ value, duration = 600 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.floor(value * progress));
      if (progress < 1) requestAnimationFrame(animate);
      else setDisplayValue(value);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue;
};

export default function BrutalistDataPanel() {
  const [metrics, setMetrics] = useState({
    density: 78,
    riskLevel: 'HIGH',
    flowRate: 62,
    activeAlerts: 3,
    gateA: 'OPEN',
    gateB: 'RESTRICTED',
    sectionC: 'OVERCROWDED',
  });

  // Simulate metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        density: Math.max(20, Math.min(95, prev.density + (Math.random() - 0.5) * 8)),
        flowRate: Math.max(10, Math.min(100, prev.flowRate + (Math.random() - 0.5) * 6)),
        activeAlerts: Math.max(0, Math.min(8, prev.activeAlerts + Math.floor((Math.random() - 0.6) * 2))),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#FF3B3B';
      case 'HIGH': return '#FFB800';
      case 'MEDIUM': return '#00E0FF';
      case 'LOW': return '#10B981';
      default: return '#EDEDED';
    }
  };

  const getStatusColor = (status) => {
    if (status === 'OPEN') return '#10B981';
    if (status === 'RESTRICTED') return '#FFB800';
    if (status === 'OVERCROWDED') return '#FF3B3B';
    return '#EDEDED';
  };

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        background: '#0A0A0A',
        color: '#EDEDED',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* SYSTEM STATUS HEADER */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: '12px',
          }}
        >
          SYSTEM STATUS
        </div>
        <div
          style={{
            borderTop: '2px solid #1A1A1A',
            borderBottom: '2px solid #1A1A1A',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6B7280' }}>Density:</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#00E0FF' }}>
                <CounterAnimation value={Math.round(metrics.density)} />%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6B7280' }}>Risk Level:</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: getRiskColor(metrics.riskLevel) }}>
                {metrics.riskLevel}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6B7280' }}>Flow Rate:</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#00E0FF' }}>
                <CounterAnimation value={Math.round(metrics.flowRate)} />%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTS */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: '12px',
          }}
        >
          ACTIVE ALERTS
        </div>
        <div
          style={{
            borderLeft: '2px solid #FF3B3B',
            paddingLeft: '12px',
            color: '#FF3B3B',
            fontSize: '13px',
            lineHeight: '1.8',
          }}
        >
          <div>[ ALERT ] Zone B Overcrowded</div>
          <div>[ WARN ] Gate A Approaching Limit</div>
          <div>[ INFO ] Flow Optimization Active</div>
        </div>
      </div>

      {/* GATE STATUS */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: '12px',
          }}
        >
          GATE STATUS
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1A1A1A' }}>
            <span style={{ color: '#6B7280' }}>Gate A:</span>
            <span style={{ color: getStatusColor(metrics.gateA), fontWeight: 700 }}>{metrics.gateA}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1A1A1A' }}>
            <span style={{ color: '#6B7280' }}>Gate B:</span>
            <span style={{ color: getStatusColor(metrics.gateB), fontWeight: 700 }}>{metrics.gateB}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6B7280' }}>Section C:</span>
            <span style={{ color: getStatusColor(metrics.sectionC), fontWeight: 700 }}>{metrics.sectionC}</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid #1A1A1A',
          fontSize: '10px',
          color: '#6B7280',
          textAlign: 'center',
        }}
      >
        CROWD CONTROL SYSTEM v1.0
      </div>
    </div>
  );
}
