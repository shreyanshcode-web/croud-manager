import React, { useState, useEffect } from 'react';

const CATEGORY_ICONS = {
  parking:  '🅿️',
  food:     '🍽️',
  transit:  '🚌',
  hospital: '🏥',
  pharmacy: '💊',
};

const CATEGORY_LABELS = {
  parking:  'Parking',
  food:     'Food Nearby',
  transit:  'Transport',
  hospital: 'Medical',
  pharmacy: 'Pharmacy',
};

export default function NearbyPlaces({ defaultCategory = 'parking' }) {
  const [category, setCategory] = useState(defaultCategory);
  const [places, setPlaces]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/nearby?category=${category}&radius=1200`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setPlaces(data.places || []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load nearby places.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [category]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Category Selector */}
      <div className="filter-row" role="group" aria-label="Nearby place category">
        {Object.keys(CATEGORY_ICONS).map(cat => (
          <button
            key={cat}
            className={`filter-chip${category === cat ? ' active' : ''}`}
            onClick={() => setCategory(cat)}
            aria-pressed={category === cat}
          >
            {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {error && (
        <div className="alert-card amber">
          <span className="alert-card-icon">⚠️</span>
          <div className="alert-card-body">
            <div className="alert-card-title">Places Unavailable</div>
            <div className="alert-card-msg">
              Showing simulated venue data. Enable Google Maps API for live results.
            </div>
          </div>
        </div>
      )}

      {!loading && !error && places.length === 0 && (
        <div className="alert-card indigo">
          <span className="alert-card-icon">🔍</span>
          <div className="alert-card-body">
            <div className="alert-card-title">No places found nearby</div>
            <div className="alert-card-msg">Try a different category or expand the search radius.</div>
          </div>
        </div>
      )}

      {!loading && places.map(place => (
        <div
          key={place.id}
          className="list-item"
          style={{ alignItems: 'flex-start', gap: 12 }}
          role="article"
          aria-label={place.name}
        >
          <div className="list-item-icon">{CATEGORY_ICONS[category]}</div>
          <div className="list-item-content">
            <div className="flex-between" style={{ marginBottom: 2 }}>
              <span className="list-item-title">{place.name}</span>
              {place.rating && (
                <span className="fs-12 text-amber">⭐ {place.rating}</span>
              )}
            </div>
            <div className="list-item-sub">📍 {place.address}</div>
            {place.open !== null && (
              <span className={`fs-12 fw-700 ${place.open ? 'text-green' : 'text-red'}`}>
                {place.open ? '● Open' : '● Closed'}
              </span>
            )}
          </div>

          {/* Directions via Google Maps */}
          <a
            href={place.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost"
            aria-label={`Get directions to ${place.name}`}
            style={{ flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
          >
            🗺️
          </a>
        </div>
      ))}

      {/* Powered by Google */}
      {!loading && places.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', marginTop: -4 }}>
          Powered by <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Places
        </div>
      )}
    </div>
  );
}
