// Server-side data adapters. Each returns parsed values or null on failure,
// so getServerSideProps never throws. Runs on the Vercel Node runtime.

import { RIVERS, gddSeries } from "./phenology";

const NOAA_STATION = "9075035";        // Essexville, Saginaw Bay, Lake Huron
const NWS_POINT = "43.5945,-83.8889";  // Bay City, MI
const EBIRD_REGION = "US-MI-017";      // Bay County, MI
const GDD_LAT = 44.66, GDD_LON = -84.71; // Grayling, AuSable headwaters

async function getJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "User-Agent": "michigan-phenology (chrisizworski.com)", ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Regional conditions that do not depend on a chosen river: air and lake level.
export async function fetchRegional() {
  const out = { air: { tempF: null, forecast: null }, level: null };
  try {
    const pt = await getJSON(`https://api.weather.gov/points/${NWS_POINT}`);
    // shortForecast for context text
    try {
      const fc = await getJSON(pt.properties.forecast);
      out.air.forecast = fc.properties?.periods?.[0]?.shortForecast || null;
    } catch (e) { /* leave null */ }
    // actual current temperature from the nearest observation station
    const st = await getJSON(pt.properties.observationStations);
    const stationUrl = (st.observationStations || [])[0];
    if (stationUrl) {
      const obs = await getJSON(`${stationUrl}/observations/latest`);
      const c = obs.properties?.temperature?.value;
      if (c != null) out.air.tempF = Math.round(c * 9 / 5 + 32);
    }
  } catch (e) { /* leave null */ }
  try {
    const j = await getJSON(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${NOAA_STATION}&product=water_level&datum=IGLD&units=metric&time_zone=lst_ldt&format=json`);
    const v = parseFloat(j.data?.[0]?.v);
    if (!isNaN(v)) out.level = Math.round(v * 100) / 100;
  } catch (e) { /* leave null */ }
  return out;
}

async function fetchOneRiver(site) {
  try {
    const j = await getJSON(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${site}&parameterCd=00060,00010&siteStatus=all`);
    const ts = j.value?.timeSeries || [];
    let flow = null, temp = null;
    ts.forEach((t) => {
      const code = t.variable?.variableCode?.[0]?.value;
      const arr = t.values?.[0]?.value || [];
      const v = parseFloat(arr.length ? arr[arr.length - 1].value : NaN);
      if (code === "00060" && !isNaN(v)) flow = Math.round(v);
      if (code === "00010" && !isNaN(v)) temp = Math.round(v * 10) / 10;
    });
    return { flow, temp };
  } catch (e) {
    return { flow: null, temp: null };
  }
}

// Live flow and water temp for every configured river.
export async function fetchRivers() {
  const results = await Promise.all(RIVERS.map((r) => fetchOneRiver(r.site)));
  return RIVERS.map((r, i) => ({ id: r.id, name: r.name, note: r.note, hatchOffset: r.hatchOffset, ...results[i] }));
}

// Real accumulated growing degree days for the season from observed daily temps.
export async function fetchGddActual() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const j = await getJSON(`https://archive-api.open-meteo.com/v1/archive?latitude=${GDD_LAT}&longitude=${GDD_LON}&start_date=${new Date().getFullYear()}-01-01&end_date=${today}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FDetroit`);
    const d = j.daily || {};
    const times = d.time || [], mx = d.temperature_2m_max || [], mn = d.temperature_2m_min || [];
    const series = [];
    let acc = 0;
    for (let i = 0; i < times.length; i++) {
      if (mx[i] == null || mn[i] == null) continue;
      acc += Math.max(0, (mx[i] + mn[i]) / 2 - 50);
      series.push({ doy: i + 1, gdd: Math.round(acc) });
    }
    if (!series.length) return null;
    return { series, total: series[series.length - 1].gdd };
  } catch (e) {
    return null;
  }
}

// Median daily discharge for the AuSable on today's calendar day, for flow context.
// per-year accumulated GDD to today's calendar day, for the last ~15 years, to rank this year
export async function fetchGddHistory() {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const startYear = now.getFullYear() - 15;
    const curDoy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const j = await getJSON(`https://archive-api.open-meteo.com/v1/archive?latitude=${44.66}&longitude=${-84.71}&start_date=${startYear}-01-01&end_date=${today}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FDetroit`);
    const d = j.daily || {};
    const t = d.time || [], mx = d.temperature_2m_max || [], mn = d.temperature_2m_min || [];
    const acc = {};
    for (let i = 0; i < t.length; i++) {
      if (mx[i] == null || mn[i] == null) continue;
      const dt = new Date(t[i] + "T00:00:00");
      const doy = Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 86400000);
      if (doy > curDoy) continue;
      acc[dt.getFullYear()] = (acc[dt.getFullYear()] || 0) + Math.max(0, (mx[i] + mn[i]) / 2 - 50);
    }
    const thisYear = now.getFullYear();
    const cur = acc[thisYear] != null ? Math.round(acc[thisYear]) : null;
    const hist = Object.entries(acc).filter(([y]) => +y !== thisYear).map(([y, g]) => ({ year: +y, gdd: Math.round(g) }));
    if (cur == null || !hist.length) return null;
    const all = [...hist, { year: thisYear, gdd: cur }].sort((a, b) => b.gdd - a.gdd);
    const rank = all.findIndex((x) => x.year === thisYear) + 1;
    const mean = Math.round(hist.reduce((s, x) => s + x.gdd, 0) / hist.length);
    const max = hist.reduce((m, x) => (x.gdd > m.gdd ? x : m), hist[0]);
    const min = hist.reduce((m, x) => (x.gdd < m.gdd ? x : m), hist[0]);
    return { cur, rank, count: all.length, mean, max, min, curDoy };
  } catch (e) {
    return null;
  }
}

export async function fetchAusableStats() {
  try {
    const res = await fetch(`https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites=04136000&statReportType=daily&statTypeCd=median&parameterCd=00060`, { headers: { "User-Agent": "michigan-phenology (chrisizworski.com)" } });
    if (!res.ok) throw new Error("stat");
    const text = await res.text();
    const now = new Date();
    const mo = now.getMonth() + 1, day = now.getDate();
    let median = null;
    text.split("\n").forEach((line) => {
      if (line.startsWith("USGS")) {
        const c = line.split("\t");
        // columns: agency site parameter ts_id loc month_nu day_nu ... median value near end
        const m = parseInt(c[5], 10), d = parseInt(c[6], 10);
        if (m === mo && d === day) {
          const v = parseFloat(c[c.length - 1]);
          if (!isNaN(v)) median = Math.round(v);
        }
      }
    });
    return { medianFlow: median };
  } catch (e) {
    return { medianFlow: null };
  }
}

// daylight, soil temperature, and frost outlook for Bay City
export async function fetchForecast() {
  const LAT = 43.5945, LON = -83.8889;
  try {
    const j = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=sunrise,sunset,daylight_duration,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant&current=soil_temperature_6cm,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&timezone=America%2FDetroit&past_days=1&forecast_days=8`);
    const cur = j.current || {}, da = j.daily || {};
    const dl = da.daylight_duration || [], sr = da.sunrise || [], ss = da.sunset || [], mn = da.temperature_2m_min || [], t = da.time || [], windSpd = da.wind_speed_10m_max || [], windDir = da.wind_direction_10m_dominant || [];
    const hhmm = (iso) => (iso ? iso.split("T")[1] : null);
    const lows = mn.slice(1, 8).map((x) => (x == null ? null : Math.round(x)));
    const frost = [];
    for (let i = 1; i < Math.min(8, mn.length); i++) { if (mn[i] != null && mn[i] <= 36) frost.push({ date: t[i], low: Math.round(mn[i]) }); }
    const valid = lows.filter((x) => x != null);
    return {
      soilF: cur.soil_temperature_6cm != null ? Math.round(cur.soil_temperature_6cm) : null,
      daylightH: dl.length >= 2 ? dl[1] / 3600 : null,
      daylightDeltaMin: dl.length >= 2 ? Math.round(((dl[1] - dl[0]) / 60) * 10) / 10 : null,
      sunrise: hhmm(sr[1]), sunset: hhmm(ss[1]),
      lows, frost, coldest: valid.length ? Math.min(...valid) : null,
      windSpeedMph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
      windDirDeg: cur.wind_direction_10m != null ? Math.round(cur.wind_direction_10m) : null,
    };
  } catch (e) {
    return { soilF: null, daylightH: null, daylightDeltaMin: null, sunrise: null, sunset: null, lows: [], frost: [], coldest: null, windSpeedMph: null, windDirDeg: null };
  }
}

export async function fetchBirds() {
  const token = process.env.EBIRD_API_TOKEN;
  if (!token) return [];
  try {
    const j = await getJSON(
      `https://api.ebird.org/v2/data/obs/${EBIRD_REGION}/recent/notable?detail=simple&maxResults=12&back=10`,
      { headers: { "X-eBirdApiToken": token } }
    );
    const seen = new Set();
    const out = [];
    (Array.isArray(j) ? j : []).forEach((o) => {
      if (seen.has(o.comName)) return;
      seen.add(o.comName);
      out.push({ comName: o.comName, howMany: o.howMany || null, locName: o.locName || "", obsDt: o.obsDt || "" });
    });
    return out.slice(0, 8);
  } catch (e) {
    return [];
  }
}

// Convenience wrapper for the /api/conditions route (regional plus the AuSable).
export async function fetchConditions() {
  const [regional, rivers] = await Promise.all([fetchRegional(), fetchRivers()]);
  const ausable = rivers.find((r) => r.id === "ausable") || { flow: null, temp: null };
  return { usgs: { flow: ausable.flow, temp: ausable.temp }, air: regional.air, level: regional.level };
}

// USA National Phenology Network Spring Index, queried at the Saginaw Bay point.
// Real observed-model spring timing and how it compares to the 1991-2020 normal. No API key.
// Source: geoserver.usanpn.org, USGS-funded USA-NPN. Values are days (anomaly) or day-of-year.
export async function fetchSpringIndex() {
  const LAT = 43.5945, LON = -83.8889, d = 0.02;
  const bbox = `${LON - d},${LAT - d},${LON + d},${LAT + d}`;
  const base = "https://geoserver.usanpn.org/geoserver/wms";
  const q = (layer) => `${base}?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=${layer}&query_layers=${layer}&srs=EPSG:4326&bbox=${bbox}&width=5&height=5&x=2&y=2&info_format=application/json`;
  const one = async (layer, prop) => {
    try {
      const j = await getJSON(q(layer));
      const v = j && j.features && j.features[0] && j.features[0].properties ? j.features[0].properties[prop] : null;
      return v == null || v === -9999 ? null : Math.round(v * 10) / 10;
    } catch (e) { return null; }
  };
  const [leafDoy, leafAnom, bloomAnom, agddAnom] = await Promise.all([
    one("si-x:average_leaf_ncep", "LEAF_OUT_DAY"),
    one("si-x:leaf_anomaly", "LEAF_OUT_DAY_DIFF"),
    one("si-x:bloom_anomaly", "BLOOM_DAY_DIFF"),
    one("gdd:agdd_anomaly", "AGDD_ANOMALY"),
  ]);
  return { leafDoy, leafAnom, bloomAnom, agddAnom };
}

// USA-NPN Nature's Notebook observations across Michigan, last 8 days. All-season biological signal:
// real phenophases people log year round (flowering, leaf color, leaf drop, fruit, insect and animal activity).
// No API key. Filters to confirmed (status=1) sightings, ranks seasonal-transition phenophases above resident noise.
export async function fetchObservations() {
  const end = new Date();
  const start = new Date(end.getTime() - 8 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const url = `https://services.usanpn.org/npn_portal/observations/getObservations.json?request_src=chrisizworski.com&start_date=${fmt(start)}&end_date=${fmt(end)}&state%5B0%5D=MI`;
  try {
    const all = await getJSON(url);
    if (!Array.isArray(all)) return [];
    const pos = all.filter((r) => String(r.phenophase_status) === "1");
    const hi = /flower|bloom|leaf|leaves|fruit|pollen|color|emerg|needle|bud|seed|larva|caterpillar|pupa|adult|breaking|ripe|migrat/i;
    const lo = /feeding station|live individuals/i;
    const score = (r) => { const ph = r.phenophase_description || ""; return hi.test(ph) ? 2 : lo.test(ph) ? 0 : 1; };
    pos.sort((a, b) => (b.observation_date || "").localeCompare(a.observation_date || ""));
    const seen = new Map();
    for (const r of pos) {
      const key = (r.common_name || "") + "|" + (r.phenophase_description || "");
      if (!seen.has(key)) seen.set(key, r);
    }
    return [...seen.values()]
      .sort((a, b) => score(b) - score(a) || (b.observation_date || "").localeCompare(a.observation_date || ""))
      .slice(0, 8)
      .map((r) => ({ name: r.common_name, phase: r.phenophase_description, date: r.observation_date, kingdom: r.kingdom }));
  } catch (e) { return []; }
}
