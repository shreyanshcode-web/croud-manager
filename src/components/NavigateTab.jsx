import React, { useMemo, useState, useEffect } from 'react';
import NearbyPlaces from './NearbyPlaces';
import { useUserLocation } from '../hooks/useUserLocation';
import { useAnalytics } from '../hooks/useAnalytics';

const VENUE_LAT = 12.9716;
const VENUE_LNG = 77.5946;

function waitColor(minutes) {
  if (minutes >= 10) return 'red';
  if (minutes >= 5)  return 'amber';
  return 'green';
}

function statusColor(status) {
  if (status === 'restricted' || status === 'full') return 'red';
  if (status === 'busy')                            return 'amber';
  return 'green';
}

/**
 * Build a Google Maps Directions URL.
 * Google Service: Google Maps Directions
 */
function mapsDirections(destLat, destLng, label, userLat, userLng) {
  const dest = `${destLat},${destLng}`;
  const origin = userLat ? `${userLat},${userLng}` : '';
  return origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

// Static map iframe coordinates for each gate (approximate positions around stadium)
const GATE_COORDS = {
  'North Gate A': [12.9730, 77.5940],
  'South Gate B': [12.9700, 77.5950],
  'East Gate C':  [12.9720, 77.5965],
  'West Gate D':  [12.9710, 77.5930],
  'VIP Entrance': [12.9725, 77.5945],
};

const FILTERS = [
  { id: 'gates',     label: '🚪 Gates' },
  { id: 'restrooms', label: '🚻 Restrooms' },
  { id: 'parking',   label: '🚗 Parking' },
  { id: 'nearby',    label: '📍 Nearby' },
  { id: 'map',       label: '🗺️ Map' },
];

export default function NavigateTab({ data }) {
  const { lat, lng } = useUserLocation();
  const { trackEvent, trackScreen } = useAnalytics();
  const [activeFilter, setActiveFilter] = useState('gates');

  useEffect(() => { trackScreen('Navigate'); }, []);

  const handleTabChange = (id) => {
    setActiveFilter(id);
    trackEvent('navigate_tab_changed', { tab: id });
  };

  const sortedGates = useMemo(() =>
    [...data.gates].sort((a, b) => a.waitMinutes - b.waitMinutes), [data.gates]);

  const sortedRestrooms = useMemo(() =>
    [...data.restrooms].sort((a, b) => a.waitMinutes - b.waitMinutes), [data.restrooms]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h2 className="page-title">Navigate</h2>
        <p className="page-subtitle">Live wait times · Google Maps directions</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-row" style={{ padding: '12px 16px' }} role="tablist">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-chip${activeFilter === f.id ? ' active' : ''}`}
            onClick={() => handleTabChange(f.id)}
            role="tab"
            aria-selected={activeFilter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>

        {/* ── Gates ───────────────────────────────────────────── */}
        {activeFilter === 'gates' && (
          <div role="tabpanel">
            <p className="section-label">All Entry Gates — shortest wait first</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedGates.map((gate, idx) => {
                const coords = GATE_COORDS[gate.name] || [VENUE_LAT, VENUE_LNG];
                const mapsUrl = mapsDirections(coords[0], coords[1], gate.name, lat, lng);
                return (
                  <div key={gate.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="list-item-icon">{idx === 0 ? '⭐' : '🚪'}</div>
                    <div className="list-item-content">
                      <div className="flex-between" style={{ marginBottom: 2 }}>
                        <span className="fw-700 fs-14">
                          {gate.name}
                          {idx === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>BEST</span>}
                        </span>
                        <span className={`list-item-badge badge-${waitColor(gate.waitMinutes)}`}>
                          {gate.waitMinutes.toFixed(1)}m
                        </span>
                      </div>
                      <div className="list-item-sub">{gate.peopleInQueue} queuing · {gate.utilization}% capacity</div>
                      <div className="progress" style={{ marginTop: 6 }}>
                        <div className={`progress-fill ${waitColor(gate.waitMinutes)}`} style={{ width: `${gate.utilization}%` }} />
                      </div>
                    </div>

                    {/* Google Maps Directions button */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{ flexShrink: 0, textDecoration: 'none' }}
                      aria-label={`Navigate to ${gate.name} via Google Maps`}
                      onClick={() => trackEvent('gate_directions_clicked', { gate: gate.name })}
                    >
                      🗺️
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Restrooms ───────────────────────────────────────── */}
        {activeFilter === 'restrooms' && (
          <div role="tabpanel">
            <p className="section-label">Restrooms — most available first</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedRestrooms.map(r => (
                <div key={r.id} className="list-item">
                  <div className="list-item-icon">🚻</div>
                  <div className="list-item-content">
                    <div className="list-item-title">{r.location}</div>
                    <div className="list-item-sub">
                      {r.availableStalls} stalls free · Cleaned {r.lastCleaned}
                    </div>
                    <div className="progress" style={{ marginTop: 6 }}>
                      <div className={`progress-fill ${statusColor(r.status)}`} style={{ width: `${r.occupancyPercent}%` }} />
                    </div>
                  </div>
                  <span className={`list-item-badge badge-${statusColor(r.status)}`}>
                    {r.occupancyPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Parking ─────────────────────────────────────────── */}
        {activeFilter === 'parking' && (
          <div role="tabpanel">
            <p className="section-label">Parking Zones</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.parking.map(zone => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(zone.name + ' parking Bengaluru')}`;
                return (
                  <div key={zone.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="list-item-icon">🅿️</div>
                    <div className="list-item-content">
                      <div className="flex-between" style={{ marginBottom: 2 }}>
                        <span className="fw-700 fs-14">{zone.name}</span>
                        <span className={`list-item-badge badge-${zone.status === 'full' ? 'red' : zone.fillPercent > 80 ? 'amber' : 'green'}`}>
                          {zone.fillPercent}%
                        </span>
                      </div>
                      <div className="list-item-sub">
                        {zone.filledSpots.toLocaleString()} / {zone.totalSpots.toLocaleString()} spaces
                      </div>
                      <div className="progress" style={{ marginTop: 6 }}>
                        <div
                          className={`progress-fill ${zone.status === 'full' ? 'red' : zone.fillPercent > 80 ? 'amber' : 'green'}`}
                          style={{ width: `${zone.fillPercent}%` }}
                        />
                      </div>
                    </div>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      style={{ flexShrink: 0, textDecoration: 'none' }}
                      aria-label={`Find ${zone.name} in Google Maps`}
                      onClick={() => trackEvent('parking_maps_clicked', { zone: zone.name })}
                    >
                      🗺️
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Nearby Places (Google Places API) ───────────────── */}
        {activeFilter === 'nearby' && (
          <div role="tabpanel">
            <p className="section-label">📍 Nearby via Google Places</p>
            <NearbyPlaces defaultCategory="parking" />
          </div>
        )}

        {/* ── Map (Google Maps Embed) ──────────────────────────── */}
        {activeFilter === 'map' && (
          <div role="tabpanel">
            <p className="section-label">🗺️ Venue Map — Google Maps</p>
            <div className="map-wrap">
              <iframe
                title="Venue location map"
                src={
                  lat && lng
                    ? `https://www.google.com/maps?saddr=${lat},${lng}&daddr=${VENUE_LAT},${VENUE_LNG}&output=embed`
                    : `https://www.google.com/maps?q=Kanteerava+Stadium+Bengaluru&output=embed`
                }
                style={{ height: 320 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            {/* Direct Maps link */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${VENUE_LAT},${VENUE_LNG}&travelmode=walking`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-full"
              style={{ textDecoration: 'none', display: 'flex', marginTop: 4 }}
              aria-label="Get walking directions to venue in Google Maps"
              onClick={() => trackEvent('venue_directions_opened')}
            >
              🗺️ Get Walking Directions
            </a>

            <div className="alert-card indigo" style={{ marginTop: 0 }}>
              <span className="alert-card-icon">📍</span>
              <div className="alert-card-body">
                <div className="alert-card-title">Your Location</div>
                <div className="alert-card-msg">
                  {lat && lng
                    ? `GPS detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
                    : 'Enable location for personalized directions.'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
              Powered by <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Maps Platform
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
