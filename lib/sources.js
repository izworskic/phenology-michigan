// Server-side data adapters. Each returns parsed values or null on failure,
// so getServerSideProps never throws. Run on Vercel Node runtime (global fetch).

const USGS_SITE = "04136000";          // Au Sable River near Grayling, MI
const NOAA_STATION = "9075035";        // Essexville, Saginaw Bay, Lake Huron
const NWS_POINT = "43.5945,-83.8889";  // Bay City, MI
const EBIRD_REGION = "US-MI-017";      // Bay County, MI

async function getJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "User-Agent": "michigan-phenology (chrisizworski.com)", ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchConditions() {
  const out = { usgs: { flow: null, temp: null }, air: { tempF: null, forecast: null }, level: null };

  try {
    const j = await getJSON(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${USGS_SITE}&parameterCd=00060,00010&siteStatus=all`);
    const ts = j.value?.timeSeries || [];
    ts.forEach((t) => {
      const code = t.variable?.variableCode?.[0]?.value;
      const arr = t.values?.[0]?.value || [];
      const v = parseFloat(arr.length ? arr[arr.length - 1].value : NaN);
      if (code === "00060" && !isNaN(v)) out.usgs.flow = Math.round(v);
      if (code === "00010" && !isNaN(v)) out.usgs.temp = Math.round(v * 10) / 10;
    });
  } catch (e) { /* leave null */ }

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
      out.push({
        comName: o.comName,
        howMany: o.howMany || null,
        locName: o.locName || "",
        obsDt: o.obsDt || "",
      });
    });
    return out.slice(0, 8);
  } catch (e) {
    return [];
  }
}
