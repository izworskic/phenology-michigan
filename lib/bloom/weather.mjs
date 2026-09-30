const API = 'https://api.open-meteo.com/v1/forecast';
const HORIZONS = [3, 5, 7];

function groupByLocalDate(rows) {
  const byDay = new Map();
  for (const row of rows) {
    const day = row.time.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(row);
  }
  return byDay;
}

function computeFeatures(rows) {
  if (!rows.length) throw new Error('weather window contains no usable hours');
  const byDay = groupByLocalDate(rows);
  let gdd5 = 0;
  let gdd10 = 0;
  for (const dayRows of byDay.values()) {
    const mean = dayRows.reduce((sum, r) => sum + r.tempC, 0) / dayRows.length;
    gdd5 += Math.max(0, mean - 5);
    gdd10 += Math.max(0, mean - 10);
  }
  const temps = rows.map((r) => r.tempC);
  return {
    gdd5: Math.round(gdd5 * 10) / 10,
    gdd10: Math.round(gdd10 * 10) / 10,
    minTempC: Math.round(Math.min(...temps) * 10) / 10,
    maxTempC: Math.round(Math.max(...temps) * 10) / 10,
    meanTempC: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
    freezeHours: rows.filter((r) => r.tempC <= 0).length,
    frostHours: rows.filter((r) => r.tempC <= 2).length,
    warmHours15: rows.filter((r) => r.tempC >= 15).length,
    hotHours27: rows.filter((r) => r.tempC >= 27).length,
    precipMm: Math.round(rows.reduce((sum, r) => sum + r.precipMm, 0) * 10) / 10,
    maxGustKmh: Math.round(Math.max(...rows.map((r) => r.gustKmh)) * 10) / 10,
    hours: rows.length,
  };
}

export async function fetchBloomWeather(destination, fetchImpl = fetch) {
  const { lat, lon } = destination.coordinates;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,precipitation,wind_gusts_10m',
    timezone: 'America/Detroit',
    forecast_days: '8',
  });
  const response = await fetchImpl(`${API}?${params.toString()}`, {
    headers: { 'User-Agent': 'michigan-bloom-tracker/1.0 (chrisizworski.com)' },
  });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const json = await response.json();
  const h = json.hourly || {};
  const times = h.time || [];
  if (!times.length) throw new Error('Open-Meteo returned no hourly forecast');
  for (const key of ['temperature_2m', 'precipitation', 'wind_gusts_10m']) {
    if (!Array.isArray(h[key]) || h[key].length !== times.length) throw new Error(`Open-Meteo missing complete ${key} series`);
  }

  const rows = times.map((time, i) => ({
    time,
    tempC: Number(h.temperature_2m?.[i]),
    precipMm: Number(h.precipitation?.[i] || 0),
    gustKmh: Number(h.wind_gusts_10m?.[i] || 0),
  })).filter((row) => Number.isFinite(row.tempC));

  const startMs = new Date(rows[0].time).getTime();
  const windows = HORIZONS.map((horizonDays) => {
    const endMs = startMs + horizonDays * 86400000;
    const windowRows = rows.filter((row) => {
      const t = new Date(row.time).getTime();
      return t >= startMs && t < endMs;
    });
    if (windowRows.length < horizonDays * 18) {
      throw new Error(`Open-Meteo returned only ${windowRows.length} usable hours for ${horizonDays}-day bloom window`);
    }
    return { horizonDays, ...computeFeatures(windowRows) };
  });

  return {
    destinationId: destination.id,
    source: 'Open-Meteo forecast',
    fetchedAt: new Date().toISOString(),
    windows,
  };
}
