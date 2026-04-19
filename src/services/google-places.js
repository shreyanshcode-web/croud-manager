/**
 * Google Places API Service (Backend)
 * Finds nearby parking lots, food, transit, and first-aid
 * around the venue using the Places Nearby Search API.
 *
 * Google Service: Google Maps Platform — Places API
 */
import { getSecret } from '../gcp-secrets.js';

const VENUE_LAT = 12.9716;   // Kanteerava Stadium, Bengaluru
const VENUE_LNG = 77.5946;

const TYPE_MAP = {
  parking:   'parking',
  food:      'restaurant',
  transit:   'transit_station',
  hospital:  'hospital',
  pharmacy:  'pharmacy',
};

/**
 * Search for places near the venue of a given category.
 * @param {string} category - 'parking' | 'food' | 'transit' | 'hospital'
 * @param {number} radiusMetres - default 1000m
 */
export async function getNearbyPlaces(category = 'parking', radiusMetres = 1000) {
  const apiKey = await getSecret('GOOGLE_MAPS_API_KEY');
  const type   = TYPE_MAP[category] || 'parking';

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${VENUE_LAT},${VENUE_LNG}`);
  url.searchParams.set('radius',   String(radiusMetres));
  url.searchParams.set('type',     type);
  url.searchParams.set('key',      apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);

  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API returned status: ${data.status}`);
  }

  // Shape results for the frontend
  return (data.results || []).slice(0, 6).map(place => ({
    id:       place.place_id,
    name:     place.name,
    address:  place.vicinity,
    rating:   place.rating   || null,
    open:     place.opening_hours?.open_now ?? null,
    icon:     place.icon,
    lat:      place.geometry.location.lat,
    lng:      place.geometry.location.lng,
    mapsUrl:  `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat},${place.geometry.location.lng}&travelmode=walking`,
  }));
}
