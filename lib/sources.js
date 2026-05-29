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
    const fc = await getJSON(pt.properties.forecast);
    const p = fc.properties?.periods || [];
    if (p[0]) { out.air.tempF = p[0].temperature; out.air.forecast = p[0].shortForecast; }
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
