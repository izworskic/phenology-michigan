const ZIPPO_BASE = 'https://api.zippopotam.us';

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : 'MI';
}

function parseQuery(raw) {
  const value = String(raw || '').trim().slice(0, 80);
  if (!value) return null;
  if (/^\d{5}$/.test(value)) return { type: 'zip', zip: value };
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  const city = parts[0];
  const state = normalizeState(parts[1]);
  return { type: 'city', city, state };
}

function pointFromPlace(place) {
  const lat = Number(place?.latitude);
  const lon = Number(place?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function averagePoints(places = []) {
  const points = places.map(pointFromPlace).filter(Boolean);
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }

  const query = parseQuery(req.query?.q);
  if (!query) return res.status(400).json({ error: 'Enter a city or 5-digit ZIP.' });

  const url = query.type === 'zip'
    ? `${ZIPPO_BASE}/us/${encodeURIComponent(query.zip)}`
    : `${ZIPPO_BASE}/us/${encodeURIComponent(query.state)}/${encodeURIComponent(query.city)}`;

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Michigan Bloom Tracker / chrisizworski.com' } });
    if (!response.ok) return res.status(404).json({ error: 'Starting place not found.' });
    const body = await response.json();
    const places = Array.isArray(body?.places) ? body.places : [];
    const point = averagePoints(places);
    if (!point) return res.status(404).json({ error: 'Starting place not found.' });

    const first = places[0] || {};
    const placeName = first['place name'] || query.city || query.zip;
    const state = first['state abbreviation'] || query.state || '';
    const label = [placeName, state].filter(Boolean).join(', ');

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ ...point, label, source: 'Zippopotam.us / GeoNames postal-place centroid' });
  } catch {
    return res.status(502).json({ error: 'Starting place lookup is temporarily unavailable.' });
  }
}
