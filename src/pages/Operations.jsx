/**
 * Operations Page
 * Comprehensive operations center with system health, GCP services, and incident management
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SystemHealthDashboard from '../components/SystemHealthDashboard.jsx';
import GcpServicesPanel from '../components/GcpServicesPanel.jsx';

// Simple incidents panel for Operations page
function SimpleIncidentsPanel() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({ title: '', location: '', severity: 'medium' });
  const [formOpen, setFormOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIncidents([{
      id: `inc-${Date.now()}`,
      ...form,
      createdAt: new Date().toISOString(),
    }, ...incidents]);
    setForm({ title: '', location: '', severity: 'medium' });
    setFormOpen(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
          INCIDENT MANAGEMENT
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>
          Create and track operational incidents
        </div>
      </div>

      {formOpen && (
        <div style={{ padding: '16px', border: '1px solid #1A1A1A', marginBottom: '16px', background: 'rgba(0,224,255,0.05)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Incident title"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1A1A',
                  border: '1px solid #1A1A1A',
                  color: '#EDEDED',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Location"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1A1A',
                  border: '1px solid #1A1A1A',
                  color: '#EDEDED',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1A1A',
                  border: '1px solid #1A1A1A',
                  color: '#EDEDED',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  background: '#00E0FF',
                  color: '#0A0A0A',
                  border: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CREATE
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#1A1A1A',
                  color: '#EDEDED',
                  border: '1px solid #1A1A1A',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      )}

      {!formOpen && (
        <button
          onClick={() => setFormOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#00E0FF',
            color: '#0A0A0A',
            border: 'none',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          + CREATE INCIDENT
        </button>
      )}

      {incidents.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic', textAlign: 'center', padding: '32px' }}>
          No incidents
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              style={{
                padding: '12px',
                border: `1px solid ${inc.severity === 'critical' ? '#FF3B3B' : inc.severity === 'high' ? '#FFB800' : '#00E0FF'}`,
                borderLeft: `3px solid ${inc.severity === 'critical' ? '#FF3B3B' : inc.severity === 'high' ? '#FFB800' : '#00E0FF'}`,
                background: 'rgba(0,0,0,0.3)',
                fontSize: '11px',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{inc.title}</div>
              <div style={{ color: '#6B7280', fontSize: '10px' }}>
                {inc.location} · {inc.severity} · {new Date(inc.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Operations() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('health');

  const tabs = [
    { id: 'health', label: 'SYSTEM HEALTH', icon: '⚙️' },
    { id: 'gcp', label: 'GCP SERVICES', icon: '☁️' },
    { id: 'incidents', label: 'INCIDENTS', icon: '🚨' },
  ];

  return (
    <div style={{ background: '#0A0A0A', color: '#EDEDED', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ padding: '20px 32px', borderBottom: '2px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
            OPERATIONS CENTER
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            System monitoring and incident management
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid #1A1A1A',
            color: '#EDEDED',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 150ms linear',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#00E0FF';
            e.target.style.color = '#00E0FF';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#1A1A1A';
            e.target.style.color = '#EDEDED';
          }}
        >
          ← HOME
        </button>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ borderBottom: '2px solid #1A1A1A', display: 'flex', background: '#0A0A0A' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '16px 24px',
              background: activeTab === tab.id ? 'rgba(0,224,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #00E0FF' : '2px solid transparent',
              color: activeTab === tab.id ? '#00E0FF' : '#6B7280',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 150ms linear',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#00E0FF';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.color = '#6B7280';
              }
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'health' && <SystemHealthDashboard />}
        {activeTab === 'gcp' && <GcpServicesPanel />}
        {activeTab === 'incidents' && <SimpleIncidentsPanel />}
      </div>
    </div>
  );
}
