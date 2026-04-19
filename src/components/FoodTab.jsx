import React, { useMemo, useState } from 'react';

const FOOD_TYPE_MAP = {
  'Main Grill House': 'Grill',
  'Pizza Corner': 'Pizza',
  'Taco Stand': 'Mexican',
  'Burger Barn': 'Burgers',
  'Noodle Bar': 'Asian',
  'Ice Cream Parlor': 'Desserts',
  'Craft Beer Hub': 'Drinks',
  'Soda Fountain': 'Drinks',
  'Hot Dog Express': 'Snacks',
  'Pretzel Palace': 'Snacks',
  'Coffee Station': 'Drinks',
  'Smoothie Bar': 'Drinks',
};

const FILTERS = ['All', 'Grill', 'Pizza', 'Burgers', 'Snacks', 'Drinks', 'Desserts', 'Asian', 'Mexican'];

function waitColor(minutes) {
  if (minutes >= 10) return 'red';
  if (minutes >= 5)  return 'amber';
  return 'green';
}

export default function FoodTab({ data }) {
  const [filter, setFilter] = useState('All');

  const sorted = useMemo(() => {
    const list = [...data.concessions].sort((a, b) => a.avgWaitMinutes - b.avgWaitMinutes);
    if (filter === 'All') return list;
    return list.filter(c => FOOD_TYPE_MAP[c.name] === filter);
  }, [data.concessions, filter]);

  const bestPick = sorted[0];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h2 className="page-title">Food & Drinks</h2>
        <p className="page-subtitle">Sorted by shortest wait time</p>
      </div>

      {/* Filter Row */}
      <div className="filter-row" style={{ padding: '12px 16px' }} role="group" aria-label="Food type filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {/* AI Pick Banner */}
        {bestPick && (
          <div className="alert-card green" role="note" aria-label="Best food pick right now">
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
              <div className="alert-card-msg">No stands found for this category. Try "All".</div>
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
                <div
                  className="list-item-icon"
                  style={{
                    background: waitColor(stand.avgWaitMinutes) === 'green'
                      ? 'var(--green-glow)' : waitColor(stand.avgWaitMinutes) === 'amber'
                      ? 'var(--amber-glow)' : 'var(--red-glow)',
                  }}
                >
                  {FOOD_TYPE_MAP[stand.name] === 'Drinks' ? '🥤' :
                   FOOD_TYPE_MAP[stand.name] === 'Desserts' ? '🍦' :
                   FOOD_TYPE_MAP[stand.name] === 'Pizza' ? '🍕' :
                   FOOD_TYPE_MAP[stand.name] === 'Burgers' ? '🍔' :
                   FOOD_TYPE_MAP[stand.name] === 'Mexican' ? '🌮' :
                   FOOD_TYPE_MAP[stand.name] === 'Asian' ? '🍜' : '🍽️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <span className="fw-700 fs-14">
                      {stand.name}
                      {idx === 0 && filter === 'All' && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>BEST</span>
                      )}
                    </span>
                    <span className={`list-item-badge badge-${waitColor(stand.avgWaitMinutes)}`}>
                      {stand.avgWaitMinutes.toFixed(1)}m wait
                    </span>
                  </div>
                  <p className="fs-12 text-secondary" style={{ marginBottom: 6 }}>
                    📍 {stand.section} &nbsp;·&nbsp; 👨‍🍳 {stand.staffCount} staff &nbsp;·&nbsp; 🗂️ {stand.queueLength} in queue
                  </p>
                  <p className="fs-12" style={{ color: 'var(--text-muted)' }}>
                    Top pick: <span style={{ color: 'var(--text-primary)' }}>{stand.popularItem}</span>
                  </p>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div
                      className={`progress-fill ${waitColor(stand.avgWaitMinutes)}`}
                      style={{ width: `${Math.min((stand.queueLength / 45) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
