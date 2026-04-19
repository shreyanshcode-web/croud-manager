import React, { useState, useEffect, useCallback } from 'react';

const TYPE_CONFIG = {
  crowded:  { icon: '🔴', label: 'Crowded', color: 'red' },
  blocked:  { icon: '🚧', label: 'Blocked', color: 'amber' },
  incident: { icon: '⚠️', label: 'Incident', color: 'red' },
  clean:    { icon: '✅', label: 'All Clear', color: 'green' },
  tip:      { icon: '💡', label: 'Tip', color: 'indigo' },
};

function timeAgo(tsSeconds) {
  const diff = Math.floor(Date.now() / 1000 - tsSeconds);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LiveReports() {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ location: '', type: 'tip', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [voted, setVoted]         = useState(new Set());

  const fetchReports = useCallback(() => {
    fetch('/api/fan-reports')
      .then(r => r.json())
      .then(data => setReports(data.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/fan-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
      setShowForm(false);
      setForm({ location: '', type: 'tip', message: '' });
      setTimeout(() => { setSubmitted(false); fetchReports(); }, 2000);
    } catch {
      // silent failure
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (id) => {
    if (voted.has(id)) return;
    setVoted(prev => new Set([...prev, id]));
    setReports(prev => prev.map(r => r.id === id ? { ...r, votes: (r.votes || 0) + 1 } : r));
    try {
      await fetch(`/api/fan-reports/${id}/upvote`, { method: 'POST' });
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header Row */}
      <div className="flex-between">
        <p className="section-label" style={{ margin: 0 }}>👥 Live Fan Reports</p>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setShowForm(v => !v)}
          aria-label="Add a crowd report"
        >
          {showForm ? '✕ Cancel' : '+ Report'}
        </button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          aria-label="Submit a crowd report"
        >
          <select
            className="chat-input"
            style={{ borderRadius: 8, padding: '8px 12px', minHeight: 'unset' }}
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            aria-label="Report type"
          >
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          <input
            className="chat-input"
            style={{ borderRadius: 8, padding: '8px 12px', minHeight: 'unset' }}
            placeholder="Location (e.g. North Gate Area)"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            maxLength={80}
            aria-label="Location of crowd issue"
          />

          <textarea
            className="chat-input"
            rows={2}
            placeholder="What's happening? e.g. Very crowded near Gate B…"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            maxLength={200}
            aria-label="Report message"
          />

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || !form.message.trim()}
          >
            {submitting ? 'Sending…' : '📢 Submit Report'}
          </button>
        </form>
      )}

      {submitted && (
        <div className="alert-card green">
          <span className="alert-card-icon">✅</span>
          <div className="alert-card-body">
            <div className="alert-card-title">Report submitted!</div>
            <div className="alert-card-msg">Thanks for helping fellow fans.</div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No reports yet. Be the first to help your fellow fans! 🏟️
        </div>
      )}

      {!loading && reports.map(report => {
        const cfg = TYPE_CONFIG[report.type] || TYPE_CONFIG.tip;
        const ts  = report.createdAt?._seconds || report.createdAt?.seconds || Math.floor(Date.now() / 1000);
        return (
          <div
            key={report.id}
            className={`alert-card ${cfg.color}`}
            role="article"
            aria-label={`Fan report: ${report.message}`}
          >
            <span className="alert-card-icon">{cfg.icon}</span>
            <div className="alert-card-body" style={{ flex: 1 }}>
              <div className="flex-between" style={{ marginBottom: 2 }}>
                <span className="alert-card-title">{cfg.label} · {report.location || 'Venue'}</span>
                <span style={{ fontSize: 10, color: 'inherit', opacity: 0.7 }}>{timeAgo(ts)}</span>
              </div>
              <div className="alert-card-msg">{report.message}</div>
            </div>
            <button
              className="btn btn-sm btn-ghost"
              style={{
                flexShrink: 0,
                opacity: voted.has(report.id) ? 0.4 : 1,
                gap: 4,
                padding: '4px 10px',
                fontSize: 11,
              }}
              onClick={() => handleUpvote(report.id)}
              disabled={voted.has(report.id)}
              aria-label={`Upvote this report. ${report.votes || 0} votes`}
            >
              👍 {report.votes || 0}
            </button>
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
        Stored in <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Firestore
      </div>
    </div>
  );
}
