import React, { useEffect, useRef, useState } from 'react';

// Venue centre — Kanteerava Stadium, Bengaluru
const VENUE_LAT = 12.9716;
const VENUE_LNG = 77.5946;

// Approximate GPS offsets for each facility around the stadium perimeter
// These spread the markers realistically around the venue footprint
const GATE_COORDS = {
  'North Gate A':  [12.9733, 77.5946],
  'South Gate B':  [12.9699, 77.5946],
  'East Gate C':   [12.9716, 77.5968],
  'West Gate D':   [12.9716, 77.5924],
  'VIP Entrance':  [12.9726, 77.5956],
  'Press Gate':    [12.9706, 77.5936],
};

const PARKING_COORDS = {
  'North Lot A':   [12.9748, 77.5942],
  'South Lot B':   [12.9686, 77.5948],
  'East Lot C':    [12.9718, 77.5984],
  'West Lot D':    [12.9712, 77.5908],
};

const RESTROOM_COORDS = [
  [12.9720, 77.5942],
  [12.9712, 77.5950],
  [12.9724, 77.5958],
  [12.9708, 77.5940],
];

const FOOD_COORDS = [
  [12.9718, 77.5940],
  [12.9714, 77.5952],
  [12.9720, 77.5948],
  [12.9710, 77.5944],
  [12.9716, 77.5938],
  [12.9722, 77.5956],
  [12.9712, 77.5958],
  [12.9718, 77.5934],
];

// Colour coding
function waitToColor(waitMinutes) {
  if (waitMinutes >= 10) return '#EF4444'; // red
  if (waitMinutes >= 5)  return '#F59E0B'; // amber
  return '#22C55E';                         // green
}

function fillToColor(pct) {
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F59E0B';
  return '#22C55E';
}

// Build a walking directions URL — starts from user GPS if available
function directionsUrl(destLat, destLng, userLat, userLng) {
  const origin = userLat ? `&origin=${userLat},${userLng}` : '';
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${destLat},${destLng}&travelmode=walking`;
}

// Build an inline SVG marker as a Data URL
function svgMarker(emoji, bgColor, scale = 1) {
  const size = Math.round(32 * scale);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size + 8}" height="${size + 14}" viewBox="0 0 ${size + 8} ${size + 14}">
      <defs>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/>
        </filter>
      </defs>
      <circle cx="${(size + 8) / 2}" cy="${size / 2 + 2}" r="${size / 2}" fill="${bgColor}" filter="url(#shadow)" opacity="0.95"/>
      <text x="${(size + 8) / 2}" y="${size / 2 + 7}" text-anchor="middle" font-size="${size * 0.5}px">${emoji}</text>
      <polygon points="${(size + 8) / 2 - 5},${size + 2} ${(size + 8) / 2 + 5},${size + 2} ${(size + 8) / 2},${size + 12}" fill="${bgColor}" opacity="0.95"/>
    </svg>`.trim();
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const LAYERS = [
  { id: 'gates',     label: '🚪 Gates',     color: '#6366F1' },
  { id: 'food',      label: '🍔 Food',       color: '#F59E0B' },
  { id: 'restrooms', label: '🚻 Restrooms',   color: '#06B6D4' },
  { id: 'parking',   label: '🅿️ Parking',    color: '#8B5CF6' },
];

export default function VenueMap({ data, userLat, userLng }) {
  const mapRef     = useRef(null);
  const mapObjRef  = useRef(null);
  const markersRef = useRef([]);

  const [activeLayers, setActiveLayers] = useState(new Set(['gates', 'food', 'restrooms', 'parking']));
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [mapReady, setMapReady]         = useState(false);
  const [loadError, setLoadError]       = useState(false);
  const userMarkerRef = useRef(null);   // blue "you are here" marker
  const accuracyCircleRef = useRef(null);

  // ── Load Maps JS API ────────────────────────────────────────────────────────
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setLoadError(true);
      return;
    }

    if (window.google?.maps) {
      setMapReady(true);
      return;
    }

    const existing = document.getElementById('gmap-script');
    if (existing) {
      existing.addEventListener('load', () => setMapReady(true));
      return;
    }

    const script = document.createElement('script');
    script.id  = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);
  }, []);

  // ── Initialise map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObjRef.current) return;

    // Center on user if available, otherwise on venue
    const center = userLat
      ? { lat: userLat, lng: userLng }
      : { lat: VENUE_LAT, lng: VENUE_LNG };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        { elementType: 'geometry',          stylers: [{ color: '#1a1e2d' }] },
        { elementType: 'labels.text.fill',  stylers: [{ color: '#9aa0b8' }] },
        { elementType: 'labels.text.stroke',stylers: [{ color: '#0c0e14' }] },
        { featureType: 'poi',               stylers: [{ visibility: 'off' }] },
        { featureType: 'road',              elementType: 'geometry',      stylers: [{ color: '#2a2f45' }] },
        { featureType: 'road.arterial',     elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'water',             elementType: 'geometry',      stylers: [{ color: '#05080f' }] },
        { featureType: 'transit.station',   stylers: [{ visibility: 'on' }, { color: '#6366F1' }] },
      ],
    });

    // Venue pin (centre)
    new window.google.maps.Marker({
      position: { lat: VENUE_LAT, lng: VENUE_LNG },
      map,
      title: data?.venue?.name || 'Apex Arena',
      icon: {
        url: svgMarker('🏟️', '#6366F1', 1.4),
        anchor: new window.google.maps.Point(23, 46),
      },
      zIndex: 999,
    });

    mapObjRef.current = map;
  }, [mapReady, data]);

  // ── User location marker (blue dot) ────────────────────────────────────────
  useEffect(() => {
    if (!mapObjRef.current || !userLat) return;
    const map = mapObjRef.current;

    // Remove old user marker
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);

    // Blue pulsing "You Are Here" marker
    const userSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#4285F4" opacity="0.25"/>
      <circle cx="12" cy="12" r="6" fill="#4285F4"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>`;

    const userMarker = new window.google.maps.Marker({
      position: { lat: userLat, lng: userLng },
      map,
      title: 'You are here',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userSvg),
        anchor: new window.google.maps.Point(12, 12),
        scaledSize: new window.google.maps.Size(24, 24),
      },
      zIndex: 1000,
    });

    // Accuracy radius circle (100m estimate)
    const circle = new window.google.maps.Circle({
      strokeColor: '#4285F4',
      strokeOpacity: 0.4,
      strokeWeight: 1,
      fillColor: '#4285F4',
      fillOpacity: 0.08,
      map,
      center: { lat: userLat, lng: userLng },
      radius: 100,
    });

    userMarkerRef.current    = userMarker;
    accuracyCircleRef.current = circle;

    // Pan map to show both user and venue
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: userLat, lng: userLng });
    bounds.extend({ lat: VENUE_LAT, lng: VENUE_LNG });
    map.fitBounds(bounds, { padding: 60 });
  }, [mapObjRef.current, userLat, userLng]);

  useEffect(() => {
    if (!mapObjRef.current || !data) return;
    const map = mapObjRef.current;

    // Remove all existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const infoClick = (content) => setSelectedInfo(content);

    // ── Gates ──────────────────────────────────────────────────────────────
    if (activeLayers.has('gates')) {
      data.gates.forEach(gate => {
        const coords = GATE_COORDS[gate.name];
        if (!coords) return;
        const color  = waitToColor(gate.waitMinutes);
        const marker = new window.google.maps.Marker({
          position: { lat: coords[0], lng: coords[1] },
          map,
          title: gate.name,
          icon: {
            url: svgMarker('🚪', color),
            anchor: new window.google.maps.Point(20, 46),
          },
          zIndex: gate.waitMinutes < 5 ? 200 : 100,
        });
        marker.addListener('click', () => infoClick({
          type: 'gate', icon: '🚪', name: gate.name,
          lines: [
            { label: 'Wait',     value: `${gate.waitMinutes.toFixed(1)} min`, color },
            { label: 'Queuing',  value: gate.peopleInQueue },
            { label: 'Capacity', value: `${gate.utilization}%` },
            { label: 'Status',   value: gate.status },
          ],
          mapsUrl: directionsUrl(coords[0], coords[1], userLat, userLng),
        }));
        markersRef.current.push(marker);
      });
    }

    // ── Food stands ────────────────────────────────────────────────────────
    if (activeLayers.has('food')) {
      data.concessions.forEach((stand, idx) => {
        const coords = FOOD_COORDS[idx % FOOD_COORDS.length];
        const color  = waitToColor(stand.avgWaitMinutes);
        const marker = new window.google.maps.Marker({
          position: { lat: coords[0], lng: coords[1] },
          map,
          title: stand.name,
          icon: {
            url: svgMarker('🍔', color),
            anchor: new window.google.maps.Point(20, 46),
          },
        });
        marker.addListener('click', () => infoClick({
          type: 'food', icon: '🍔', name: stand.name,
          lines: [
            { label: 'Wait',      value: `${stand.avgWaitMinutes.toFixed(1)} min`, color },
            { label: 'Queuing',   value: stand.queueLength },
            { label: 'Section',   value: stand.section },
            { label: 'Try',       value: stand.popularItem },
          ],
          mapsUrl: directionsUrl(coords[0], coords[1], userLat, userLng),
        }));
        markersRef.current.push(marker);
      });
    }

    // ── Restrooms ──────────────────────────────────────────────────────────
    if (activeLayers.has('restrooms')) {
      data.restrooms.forEach((room, idx) => {
        const coords = RESTROOM_COORDS[idx % RESTROOM_COORDS.length];
        const color  = room.status === 'full' ? '#EF4444' : room.occupancyPercent > 70 ? '#F59E0B' : '#06B6D4';
        const marker = new window.google.maps.Marker({
          position: { lat: coords[0], lng: coords[1] },
          map,
          title: room.location,
          icon: {
            url: svgMarker('🚻', color),
            anchor: new window.google.maps.Point(20, 46),
          },
        });
        marker.addListener('click', () => infoClick({
          type: 'restroom', icon: '🚻', name: room.location,
          lines: [
            { label: 'Occupancy',  value: `${room.occupancyPercent}%`,  color },
            { label: 'Free stalls',value: room.availableStalls },
            { label: 'Wait',       value: `${room.waitMinutes} min` },
            { label: 'Cleaned',    value: room.lastCleaned },
          ],
          mapsUrl: directionsUrl(coords[0], coords[1], userLat, userLng),
        }));
        markersRef.current.push(marker);
      });
    }

    // ── Parking ────────────────────────────────────────────────────────────
    if (activeLayers.has('parking')) {
      data.parking.forEach(zone => {
        const coords = PARKING_COORDS[zone.name];
        if (!coords) return;
        const color  = fillToColor(zone.fillPercent);
        const marker = new window.google.maps.Marker({
          position: { lat: coords[0], lng: coords[1] },
          map,
          title: zone.name,
          icon: {
            url: svgMarker('🅿️', color),
            anchor: new window.google.maps.Point(20, 46),
          },
        });
        marker.addListener('click', () => infoClick({
          type: 'parking', icon: '🅿️', name: zone.name,
          lines: [
            { label: 'Fill',   value: `${zone.fillPercent}%`,            color },
            { label: 'Free',   value: zone.totalSpots - zone.filledSpots },
            { label: 'Total',  value: zone.totalSpots },
            { label: 'Status', value: zone.status },
          ],
          mapsUrl: directionsUrl(coords[0], coords[1], userLat, userLng),
        }));
        markersRef.current.push(marker);
      });
    }
  }, [mapObjRef.current, data, activeLayers, userLat, userLng]);

  // ── Toggle layer ────────────────────────────────────────────────────────────
  const toggleLayer = (id) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Layer toggle buttons */}
      <div className="filter-row" role="group" aria-label="Map layers">
        {LAYERS.map(layer => (
          <button
            key={layer.id}
            className={`filter-chip${activeLayers.has(layer.id) ? ' active' : ''}`}
            onClick={() => toggleLayer(layer.id)}
            aria-pressed={activeLayers.has(layer.id)}
            style={activeLayers.has(layer.id) ? { borderColor: layer.color + '80', background: layer.color + '22', color: layer.color } : {}}
          >
            {layer.label}
          </button>
        ))}
        <button
          className="filter-chip"
          onClick={() => setActiveLayers(new Set(LAYERS.map(l => l.id)))}
          style={{ marginLeft: 'auto' }}
        >
          Show All
        </button>
      </div>

      {/* Map container */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: '#1a1e2d' }}>
        {loadError ? (
          <div style={{
            height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, color: 'var(--text-muted)', padding: 24,
          }}>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Maps Unavailable</p>
            <p style={{ fontSize: 13, textAlign: 'center' }}>
              Add <code style={{ color: 'var(--accent-light)' }}>VITE_GOOGLE_MAPS_API_KEY</code> to your environment to enabled the interactive venue map.
            </p>
            <a
              href={`https://www.google.com/maps?q=Kanteerava+Stadium+Bengaluru`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: 'none' }}
            >
              Open in Google Maps ↗
            </a>
          </div>
        ) : !mapReady ? (
          <div style={{ height: 420 }} className="skeleton" />
        ) : (
          <div ref={mapRef} style={{ width: '100%', height: 420 }} aria-label="Interactive venue map" />
        )}

        {/* Selected marker info card */}
        {selectedInfo && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            background: 'rgba(19,22,31,0.96)',
            border: '1px solid var(--border-strong)',
            borderRadius: 14, padding: '14px 16px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                {selectedInfo.icon} {selectedInfo.name}
              </span>
              <button
                onClick={() => setSelectedInfo(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
                aria-label="Close info"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {selectedInfo.lines.map(line => (
                <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{line.label}</span>
                  <span style={{ fontWeight: 700, color: line.color || 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {line.value}
                  </span>
                </div>
              ))}
            </div>

            {selectedInfo.mapsUrl && (
              <a
                href={selectedInfo.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm btn-full"
                style={{ textDecoration: 'none', display: 'flex', marginTop: 4 }}
              >
                🗺️ Get Walking Directions
              </a>
            )}
          </div>
        )}
      </div>

      {/* Colour legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '0 4px' }}>
        {[
          { color: '#22C55E', label: 'Short wait / Available' },
          { color: '#F59E0B', label: 'Moderate wait / Busy' },
          { color: '#EF4444', label: 'Long wait / Full' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
        Interactive map via <span style={{ color: '#4285F4', fontWeight: 700 }}>Google</span> Maps JavaScript API
      </div>
    </div>
  );
}
