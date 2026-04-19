import React, { useMemo, useState } from 'react';
import { useUserLocation } from '../hooks/useUserLocation';

function waitColor(minutes) {
  if (minutes >= 10) return 'red';
  if (minutes >= 5)  return 'amber';
  return 'green';
}

function statusColor(status) {
  if (status === 'restricted' || status === 'full')   return 'red';
  if (status === 'busy' || status === 'busy')         return 'amber';
  return 'green';
}

function statusLabel(status) {
  if (status === 'restricted') return 'Busy';
  if (status === 'busy')       return 'Moderate';
  if (status === 'open')       return 'Open';
  if (status === 'full')       return 'Full';
  return status;
}

export default function NavigateTab({ data }) {
  const { lat, lng } = useUserLocation();
  const [activeFilter, setActiveFilter] = useState('gates');

  const sortedGates = useMemo(() =>
    [...data.gates].sort((a, b) => a.waitMinutes - b.waitMinutes),
    [data.gates]
  );

  const sortedRestrooms = useMemo(() =>
    [...data.restrooms].sort((a, b) => a.waitMinutes - b.waitMinutes),
    [data.restrooms]
  );

  const FILTERS = [
    { id: 'gates',     label: '🚪 Gates' },
    { id: 'restrooms', label: '🚻 Restrooms' },
    { id: 'parking',   label: '🚗 Parking' },
    { id: 'map',       label: '🗺️ Map' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h2 className="page-title">Navigate</h2>
        <p className="page-subtitle">Live wait times, updated every few seconds</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-row" style={{ padding: '12px 16px' }} role="tablist" aria-label="Navigation categories">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-chip${activeFilter === f.id ? ' active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
            role="tab"
            aria-selected={activeFilter === f.id}
            id={`tab-${f.id}`}
            aria-controls={`panel-${f.id}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {/* Gates Panel */}
        {activeFilter === 'gates' && (
          <div role="tabpanel" id="panel-gates" aria-labelledby="tab-gates">
            <p className="section-label">All Entry Gates — sorted by wait time</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedGates.map((gate, idx) => (
                <div key={gate.id} className="list-item" role="article" aria-label={`${gate.name}, ${gate.waitMinutes.toFixed(1)} minute wait`}>
                  <div className="list-item-icon">
                    {idx === 0 ? '⭐' : '🚪'}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">
                      {gate.name}
                      {idx === 0 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>BEST</span>}
                    </div>
                    <div className="list-item-sub">
                      {gate.peopleInQueue} people queuing · {gate.utilization}% capacity
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress">
                        <div
                          className={`progress-fill ${waitColor(gate.waitMinutes)}`}
                          style={{ width: `${gate.utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className={`list-item-badge badge-${waitColor(gate.waitMinutes)}`}>
                    {gate.waitMinutes.toFixed(1)}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restrooms Panel */}
        {activeFilter === 'restrooms' && (
          <div role="tabpanel" id="panel-restrooms" aria-labelledby="tab-restrooms">
            <p className="section-label">Restrooms — sorted by availability</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedRestrooms.map((r, idx) => (
                <div key={r.id} className="list-item" role="article" aria-label={`Restroom at ${r.location}, ${r.occupancyPercent}% full`}>
                  <div className="list-item-icon">🚻</div>
                  <div className="list-item-content">
                    <div className="list-item-title">{r.location}</div>
                    <div className="list-item-sub">
                      {r.availableStalls} stalls free · Cleaned {r.lastCleaned}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress">
                        <div
                          className={`progress-fill ${statusColor(r.status)}`}
                          style={{ width: `${r.occupancyPercent}%` }}
                        />
                      </div>
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

        {/* Parking Panel */}
        {activeFilter === 'parking' && (
          <div role="tabpanel" id="panel-parking" aria-labelledby="tab-parking">
            <p className="section-label">Parking Zones</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.parking.map(zone => (
                <div key={zone.id} className="list-item" role="article" aria-label={`${zone.name}, ${zone.fillPercent}% full`}>
                  <div
                    className="list-item-icon"
                    style={{ background: `${zone.color}20`, border: `1px solid ${zone.color}40` }}
                  >
                    🅿️
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{zone.name}</div>
                    <div className="list-item-sub">
                      {zone.filledSpots.toLocaleString()} / {zone.totalSpots.toLocaleString()} spaces
                      {zone.status !== 'full' && ` · Est. full in ${zone.estimatedTimeToFull}`}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div className="progress">
                        <div
                          className={`progress-fill ${zone.status === 'full' ? 'red' : zone.fillPercent > 80 ? 'amber' : 'green'}`}
                          style={{ width: `${zone.fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className={`list-item-badge badge-${zone.status === 'full' ? 'red' : zone.fillPercent > 80 ? 'amber' : 'green'}`}>
                    {zone.fillPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map Panel */}
        {activeFilter === 'map' && (
          <div role="tabpanel" id="panel-map" aria-labelledby="tab-map">
            <p className="section-label">Venue & Surrounding Area</p>
            <div className="map-wrap">
              <iframe
                title="Venue location map"
                src={
                  lat && lng
                    ? `https://www.google.com/maps?saddr=${lat},${lng}&daddr=Kanteerava+Stadium+Bengaluru&output=embed`
                    : `https://www.google.com/maps?q=Kanteerava+Stadium+Bengaluru&output=embed`
                }
                style={{ height: 320 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="alert-card indigo" style={{ marginTop: 0 }}>
              <span className="alert-card-icon">📍</span>
              <div className="alert-card-body">
                <div className="alert-card-title">Your Location</div>
                <div className="alert-card-msg">
                  {lat && lng
                    ? `Detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
                    : 'Enable location permissions for personalized directions.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
