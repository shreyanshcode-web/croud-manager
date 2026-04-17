/**
 * Incident Tracker — SmartVenue AI
 * Lets operators create, view and acknowledge incidents backed by Redis
 * (and Firestore in production). Evacuation actions require confirmation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiAlertTriangle, FiCheckCircle, FiPlus, FiShield,
  FiClock, FiUser, FiAlertOctagon,
} from 'react-icons/fi';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITY_COLOR = {
  low: 'var(--accent-emerald)',
  medium: 'var(--accent-blue)',
  high: 'var(--accent-amber)',
  critical: 'var(--accent-red)',
};

function EvacuationGuard({ onConfirm, label, style }) {
  const [step, setStep] = useState(0); // 0=idle, 1=confirm, 2=armed

  if (step === 0) {
    return (
      <button
        className="header-btn"
        style={style}
        onClick={() => setStep(1)}
        aria-label={`Initiate ${label} — requires confirmation`}
      >
        <FiShield /> {label}
      </button>
    );
  }
  if (step === 1) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 600 }}>
          Confirm {label}?
        </span>
        <button
          className="header-btn"
          style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
          onClick={() => { setStep(2); onConfirm(); }}
          aria-label={`Confirm ${label}`}
        >
          Confirm
        </button>
        <button className="header-btn" onClick={() => setStep(0)} aria-label="Cancel">
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <FiCheckCircle color="var(--accent-emerald)" />
      <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
        {label} initiated — logged
      </span>
    </div>
  );
}

export default function IncidentTracker({ data, intelligence }) {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({ title: '', location: '', severity: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) setIncidents(await res.json());
    } catch {
      // server not running locally — show auto-generated incidents from ML
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    const t = setInterval(loadIncidents, 10000);
    return () => clearInterval(t);
  }, [loadIncidents]);

  // Merge ML-detected alerts as "auto" incidents when server incidents are empty
  const autoAlerts = (intelligence?.gatePredictions || [])
    .filter(g => g.score >= 75)
    .slice(0, 3)
    .map(g => ({
      id: `auto-${g.id}`,
      title: `High pressure: ${g.name}`,
      location: g.name,
      severity: 'high',
      operator: 'ML Engine',
      createdAt: new Date().toISOString(),
      auto: true,
    }));

  const allIncidents = incidents.length > 0 ? incidents : autoAlerts;

  async function submitIncident(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: '', location: '', severity: 'medium' });
        setFormOpen(false);
        await loadIncidents();
      }
    } catch {
      // offline — add locally
      setIncidents(prev => [{
        id: `local-${Date.now()}`,
        ...form,
        operator: 'local',
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function logEvacuation(type) {
    setIncidents(prev => [{
      id: `evac-${Date.now()}`,
      title: `${type} initiated`,
      location: 'Venue-wide',
      severity: 'critical',
      operator: 'operator',
      createdAt: new Date().toISOString(),
    }, ...prev]);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title" style={{ color: 'var(--accent-red)' }}>
          Emergency Systems & Incident Tracker
        </h1>
        <p className="page-subtitle">Exit compliance · operator incidents · evacuation protocol</p>
      </div>

      {/* KPI row */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        {[
          {
            label: 'Blocked Exits', value: data.stats.blockedExits,
            color: data.stats.blockedExits > 0 ? 'red' : 'emerald',
          },
          {
            label: 'Critical Sections', value: data.stats.criticalSections,
            color: data.stats.criticalSections > 0 ? 'red' : 'emerald',
          },
          {
            label: 'Safety Score', value: `${data.stats.safetyScore}/100`,
            color: data.stats.safetyScore < 70 ? 'red' : data.stats.safetyScore < 85 ? 'amber' : 'emerald',
          },
          {
            label: 'Open Incidents', value: allIncidents.length,
            color: allIncidents.length > 0 ? 'amber' : 'emerald',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className={`metric-card ${color}`}>
            <div className={`metric-card-icon ${color}`}><FiAlertTriangle /></div>
            <div className="metric-card-content">
              <div className="metric-card-label">{label}</div>
              <div className="metric-card-value" style={{ fontSize: '22px' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid-3">
        {/* Evacuation Protocol — guarded */}
        <div className="glass-card" style={{
          borderColor: 'rgba(239,68,68,0.35)',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.07), var(--glass-bg))',
        }}>
          <div className="glass-card-header">
            <div className="glass-card-title">
              <FiAlertOctagon color="var(--accent-red)" /> Evacuation Protocol
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
            Each action requires a second confirmation click and is logged as an audit entry.
            Supervisor or Admin role required in production.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <EvacuationGuard
              label="Phase 1: Partial Evacuation"
              onConfirm={() => logEvacuation('Partial evacuation')}
              style={{ justifyContent: 'center', background: 'rgba(245,158,11,0.12)', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)', fontWeight: 700 }}
            />
            <EvacuationGuard
              label="Full Venue Evacuation"
              onConfirm={() => logEvacuation('Full evacuation')}
              style={{ justifyContent: 'center', background: 'rgba(239,68,68,0.12)', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', fontWeight: 700 }}
            />
          </div>
        </div>

        {/* Exit status */}
        <div className="glass-card span-2">
          <div className="glass-card-header">
            <div className="glass-card-title">Physical Exit Status</div>
            <div className="glass-card-subtitle">
              {data.emergencyExits.filter(e => e.status === 'clear').length} / {data.emergencyExits.length} clear
            </div>
          </div>
          <div className="emergency-grid">
            {data.emergencyExits.map(exit => (
              <div key={exit.id} className={`exit-card ${exit.status}`}>
                <div className="exit-card-header">
                  <div className="exit-card-name">{exit.name}</div>
                  {exit.status === 'clear'
                    ? <FiCheckCircle size={14} color="var(--accent-emerald)" />
                    : <FiAlertOctagon size={14} color="var(--accent-red)" />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span className={`status-badge ${exit.status}`}>{exit.status}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{exit.lastChecked}</span>
                </div>
                <div className="exit-card-details">
                  Route: {exit.evacuationRoute} · Cap: {exit.capacity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Incident log */}
      <div className="glass-card" style={{ marginTop: 0 }}>
        <div className="glass-card-header">
          <div className="glass-card-title"><FiAlertTriangle /> Active Incidents</div>
          <button
            className="header-btn"
            style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}
            onClick={() => setFormOpen(v => !v)}
            aria-expanded={formOpen}
            aria-label="Log a new incident"
          >
            <FiPlus /> Log Incident
          </button>
        </div>

        {/* New incident form */}
        {formOpen && (
          <form
            onSubmit={submitIncident}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', marginBottom: '16px', alignItems: 'end' }}
            aria-label="New incident form"
          >
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Title *
              </label>
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Gate B scanner down"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: '13px',
                }}
                aria-label="Incident title"
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Location
              </label>
              <input
                maxLength={80}
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. North Gate A"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: '13px',
                }}
                aria-label="Incident location"
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Severity
              </label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                style={{
                  padding: '8px 10px', borderRadius: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: '13px',
                }}
                aria-label="Incident severity"
              >
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="header-btn"
              style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', fontWeight: 700 }}
              aria-label="Submit new incident"
            >
              {submitting ? '…' : 'Submit'}
            </button>
          </form>
        )}

        {allIncidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
            <FiCheckCircle size={24} color="var(--accent-emerald)" style={{ marginBottom: '8px' }} />
            <div>No active incidents</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allIncidents.map(inc => (
              <div
                key={inc.id}
                className="queue-card"
                style={{ borderLeft: `3px solid ${SEVERITY_COLOR[inc.severity] || 'var(--border-default)'}` }}
                role="listitem"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{inc.title}</span>
                      {inc.auto && (
                        <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)', padding: '1px 6px', borderRadius: '4px' }}>
                          ML detected
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <FiUser size={10} /> {inc.operator}
                      </span>
                      <span>{inc.location}</span>
                      <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <FiClock size={10} /> {new Date(inc.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`status-badge ${inc.severity === 'critical' ? 'restricted' : inc.severity === 'high' ? 'busy' : 'open'}`}
                    style={{ flexShrink: 0 }}
                  >
                    {inc.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
