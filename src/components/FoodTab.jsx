import React, { useMemo, useState, useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

const FOOD_EMOJI = {
  'Main Grill House': '🍖', 'Pizza Corner': '🍕', 'Taco Stand': '🌮',
  'Burger Barn': '🍔', 'Noodle Bar': '🍜', 'Ice Cream Parlor': '🍦',
  'Craft Beer Hub': '🍺', 'Soda Fountain': '🥤', 'Hot Dog Express': '🌭',
  'Pretzel Palace': '🥨', 'Coffee Station': '☕', 'Smoothie Bar': '🥤',
};

const FOOD_TYPE_MAP = {
  'Main Grill House': 'Grill', 'Pizza Corner': 'Pizza', 'Taco Stand': 'Mexican',
  'Burger Barn': 'Burgers', 'Noodle Bar': 'Asian', 'Ice Cream Parlor': 'Desserts',
  'Craft Beer Hub': 'Drinks', 'Soda Fountain': 'Drinks', 'Hot Dog Express': 'Snacks',
  'Pretzel Palace': 'Snacks', 'Coffee Station': 'Drinks', 'Smoothie Bar': 'Drinks',
};

const FILTERS = ['All', 'Grill', 'Pizza', 'Burgers', 'Snacks', 'Drinks', 'Desserts', 'Asian', 'Mexican'];

function waitColor(m) {
  if (m >= 10) return 'red';
  if (m >= 5)  return 'amber';
  return 'green';
}

// Build Google Maps search link for a food stand
function standMapsUrl(stand) {
  const q = encodeURIComponent(`${stand.name} Kanteerava Stadium Bengaluru`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export default function FoodTab({ data }) {
  const { trackEvent, trackScreen } = useAnalytics();
  const [filter, setFilter] = useState('All');

  useEffect(() => { trackScreen('Food & Drinks'); }, []);

  const sorted = useMemo(() => {
    const list = [...data.concessions].sort((a, b) => a.avgWaitMinutes - b.avgWaitMinutes);
    return filter === 'All' ? list : list.filter(c => FOOD_TYPE_MAP[c.name] === filter);
  }, [data.concessions, filter]);

  const bestPick = sorted[0];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h2 className="page-title">Food & Drinks</h2>
        <p className="page-subtitle">Sorted by shortest wait · tap 🗺️ for directions</p>
      </div>

      {/* Filter Row */}
      <div className="filter-row" style={{ padding: '12px 16px' }} role="group" aria-label="Food filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-chip${filter === f ? ' active' : ''}`}
            onClick={() => { setFilter(f); trackEvent('food_filter_changed', { filter: f }); }}
            aria-pressed={filter === f}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {/* AI Best Pick Banner */}
        {bestPick && (
          <div className="alert-card green" role="note">
            <span className="alert-card-icon">✨</span>
            <div className="alert-card-body">
              <div className="alert-card-title">Shortest Queue Right Now</div>
              <div className="alert-card-msg">
                <strong>{bestPick.name}</strong> — only {bestPick.avgWaitMinutes.toFixed(1)} min wait.
                Try the <strong>{bestPick.popularItem}</strong>!
              </div>
            </div>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="alert-card amber">
            <span className="alert-card-icon">🔍</span>
            <div className="alert-card-body">
              <div className="alert-card-title">No results</div>
              <div className="alert-card-msg">Try "All" to see every stand.</div>
            </div>
          </div>
        )}

        {/* Concession List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((stand, idx) => (
            <div
              key={stand.id}
              className="card"
              role="article"
              aria-label={`${stand.name}, ${stand.avgWaitMinutes.toFixed(1)} minute wait`}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Icon */}
                <div
                  className="list-item-icon"
                  style={{
                    background: waitColor(stand.avgWaitMinutes) === 'green' ? 'var(--green-glow)'
                      : waitColor(stand.avgWaitMinutes) === 'amber' ? 'var(--amber-glow)' : 'var(--red-glow)',
                    fontSize: 20,
                  }}
                >
                  {FOOD_EMOJI[stand.name] || '🍽️'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between" style={{ marginBottom: 3 }}>
                    <span className="fw-700 fs-14">
                      {stand.name}
                      {idx === 0 && filter === 'All' && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>BEST</span>
                      )}
                    </span>
                    <span className={`list-item-badge badge-${waitColor(stand.avgWaitMinutes)}`}>
                      {stand.avgWaitMinutes.toFixed(1)}m
                    </span>
                  </div>

                  <p className="fs-12 text-secondary" style={{ marginBottom: 4 }}>
                    📍 {stand.section} · 👨‍🍳 {stand.staffCount} staff · 🗂️ {stand.queueLength} queuing
                  </p>
                  <p className="fs-12 text-muted">
                    Top pick: <span style={{ color: 'var(--text-primary)' }}>{stand.popularItem}</span>
                  </p>

                  {/* Queue progress bar */}
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div
                      className={`progress-fill ${waitColor(stand.avgWaitMinutes)}`}
                      style={{ width: `${Math.min((stand.queueLength / 45) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Google Maps directions button */}
                <a
                  href={standMapsUrl(stand)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-ghost"
                  style={{ flexShrink: 0, textDecoration: 'none', alignSelf: 'flex-start' }}
                  aria-label={`Find ${stand.name} on Google Maps`}
                  onClick={() => trackEvent('food_maps_clicked', { stand: stand.name })}
                >
                  🗺️
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', paddingTop: 4 }}>
          Directions via <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Maps
        </div>
      </div>
    </div>
  );
}
