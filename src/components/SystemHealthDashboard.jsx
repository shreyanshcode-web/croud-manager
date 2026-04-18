/**
 * System Health Dashboard
 * Real-time monitoring of system performance, resource usage, and operational metrics
 * Provides operators with visibility into system health and performance
 */
import { useEffect, useState } from 'react';
import { FiActivity, FiCpu, FiHardDrive, FiWifi, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

// FIX #12: MetricCard is now a module-level component. Defining it inside
// SystemHealthDashboard caused it to be re-created on every render, leading
// to unnecessary unmount/remount cycles.
function MetricCard({ icon: Icon, label, value, unit, thresholds, color }) {
  const getStatusColor = (v, t) => {
    if (v >= t.critical) return '#FF3B3B';
    if (v >= t.warning)  return '#FFB800';
    return '#10B981';
  };

  const getStatusIcon = (v, t) => {
    if (v >= t.critical || v >= t.warning) return <FiAlertTriangle size={14} />;
    return <FiCheckCircle size={14} />;
  };

  const statusColor = thresholds ? getStatusColor(value, thresholds) : color;
  const statusIcon  = thresholds ? getStatusIcon(value, thresholds)  : null;

  return (
    <div
      style={{
        padding: '16px',
        border: `1px solid ${statusColor}20`,
        borderLeft: `3px solid ${statusColor}`,
        background: `${statusColor}08`,
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${statusColor}20`,
          color: statusColor,
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: statusColor, fontFamily: "'JetBrains Mono', monospace" }}>
            {value}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            {unit}
          </div>
          {statusIcon && (
            <div style={{ marginLeft: '8px', color: statusColor }}>
              {statusIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SystemHealthDashboard() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState({
    uptime: 0,
    requestsPerSecond: 0,
    avgResponseTime: 0,
    errorRate: 0,
    activeConnections: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
          setLastUpdate(new Date());

          // Simulate metrics (in production, these would come from actual monitoring)
          setMetrics({
            uptime: Math.floor(Math.random() * 1000) + 100,
            requestsPerSecond: Math.floor(Math.random() * 500) + 50,
            avgResponseTime: Math.floor(Math.random() * 200) + 20,
            errorRate: (Math.random() * 2).toFixed(2),
            activeConnections: Math.floor(Math.random() * 100) + 10,
            memoryUsage: Math.floor(Math.random() * 60) + 20,
            cpuUsage: Math.floor(Math.random() * 40) + 10,
          });
        }
      } catch (err) {
        console.error('Failed to fetch health:', err);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
          SYSTEM HEALTH
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>
          Real-time performance metrics
          {lastUpdate && ` · updated ${lastUpdate.toLocaleTimeString()}`}
        </div>
      </div>

      {/* SERVICE STATUS */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B7280' }}>
          Service Status
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {health && [
            { name: 'API Server', status: health.status === 'ok' ? 'connected' : 'unavailable' },
            { name: 'Redis Cache', status: health.redis },
            { name: 'Kafka Bus', status: health.kafka },
          ].map((service) => (
            <div
              key={service.name}
              style={{
                padding: '12px',
                border: `1px solid ${service.status === 'connected' ? '#10B981' : '#FFB800'}20`,
                borderLeft: `3px solid ${service.status === 'connected' ? '#10B981' : '#FFB800'}`,
                background: `${service.status === 'connected' ? '#10B981' : '#FFB800'}08`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: service.status === 'connected' ? '#10B981' : '#FFB800',
                }}
              />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700 }}>{service.name}</div>
                <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>
                  {service.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PERFORMANCE METRICS */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B7280' }}>
          Performance
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <MetricCard
            icon={FiActivity}
            label="Requests/sec"
            value={metrics.requestsPerSecond}
            unit="req/s"
            color="#00E0FF"
            thresholds={{ warning: 400, critical: 500 }}
          />
          <MetricCard
            icon={FiActivity}
            label="Avg Response Time"
            value={metrics.avgResponseTime}
            unit="ms"
            color="#00E0FF"
            thresholds={{ warning: 150, critical: 200 }}
          />
          <MetricCard
            icon={FiAlertTriangle}
            label="Error Rate"
            value={metrics.errorRate}
            unit="%"
            color="#FF3B3B"
            thresholds={{ warning: 1, critical: 2 }}
          />
          <MetricCard
            icon={FiWifi}
            label="Active Connections"
            value={metrics.activeConnections}
            unit="conn"
            color="#00E0FF"
            thresholds={{ warning: 80, critical: 100 }}
          />
        </div>
      </div>

      {/* RESOURCE USAGE */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#6B7280' }}>
          Resource Usage
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <MetricCard
            icon={FiHardDrive}
            label="Memory Usage"
            value={metrics.memoryUsage}
            unit="%"
            color="#FFB800"
            thresholds={{ warning: 70, critical: 85 }}
          />
          <MetricCard
            icon={FiCpu}
            label="CPU Usage"
            value={metrics.cpuUsage}
            unit="%"
            color="#FFB800"
            thresholds={{ warning: 60, critical: 80 }}
          />
          <MetricCard
            icon={FiActivity}
            label="Uptime"
            value={metrics.uptime}
            unit="hours"
            color="#10B981"
          />
        </div>
      </div>
    </div>
  );
}
