#!/usr/bin/env node
// Backfill snapshot rows for a date range.
//
// Written because GH_TOKEN expired on 2026-06-25 and every daily write 401'd for 45 days while
// /api/cron still answered 200, so the record has a hole. This exists so the next hole can be
// closed with one command instead of being reconstructed by hand.
//
// SAMPLING MUST MATCH THE LIVE SERIES OR THE RECORD IS WORSE THAN THE HOLE
// The daily job runs at 13:00 UTC, which is 9am Eastern, and records the CURRENT air, soil and
// wind at that moment. A first pass here used daily aggregates instead: daily-mean soil ran 14 F
// warmer than the recorded series and daily-max wind ran high. Splicing those in would have put a
// step change at the seam that looks exactly like a real phenological signal. So air, soil and
// wind are read from the HOURLY archive at 13:00 UTC, the same hour the live job samples.
//
// WHAT IS HONEST TO BACKFILL AND WHAT IS NOT
// Backfilled from real archives: air temperature, soil temperature, daylight, wind, growing
// degree days, and the AuSable and Rifle discharge. Computed exactly: day of year, season, moon
// phase, and the GDD normal, none of which depend on anything being observed at the time.
// NOT backfilled: birdCount, topBird and ausableTempF/rifleTempF, which come from eBird sightings
// and instantaneous gauge readings that no archive reproduces, and levelM, which comes from a
// GLERL endpoint that serves only the latest value. Those stay null.
// Every backfilled row is marked `backfilled: true` and carries the list of fields that are real,
// so a reader can never mistake a reconstruction for a day someone actually recorded.
//
// Usage: node scripts/backfill.mjs 2026-06-26 2026-08-08 [--write]
// Without --write it prints what it would do and changes nothing.

import { dayOfYear, gddSeries, seasonOf, moonPhase } from "../lib/phenology.js";

const BAY_LAT = 43.5945, BAY_LON = -83.8889;   // the bay, as used for local conditions
const GDD_LAT = 44.66, GDD_LON = -84.71;       // Grayling, as used for the GDD accumulation
const REPO = "izworskic/phenology-michigan";
const FILE = "data/snapshots.json";

const [, , startArg, endArg, ...flags] = process.argv;
const WRITE = flags.includes("--write");
if (!startArg || !endArg) {
  console.error("usage: node scripts/backfill.mjs <start YYYY-MM-DD> <end YYYY-MM-DD> [--write]");
  process.exit(2);
}

const j = async (url) => {
  const r = await fetch(url, { headers: { "User-Agent": "michigan-phenology backfill (chrisizworski.com)" } });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 70)}`);
  return r.json();
};

function eachDay(a, b) {
  const out = [];
  for (let d = new Date(a + "T12:00:00Z"); d <= new Date(b + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// USGS daily values. Instantaneous water temperature is not reproducible from this, only discharge.
async function dailyDischarge(site, start, end) {
  try {
    const d = await j(`https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${site}&startDT=${start}&endDT=${end}&parameterCd=00060&statCd=00003`);
    const vals = d.value?.timeSeries?.[0]?.values?.[0]?.value || [];
    return Object.fromEntries(vals.map((v) => [v.dateTime.slice(0, 10), Math.round(parseFloat(v.value))]).filter(([, n]) => Number.isFinite(n)));
  } catch (e) {
    console.error(`  discharge ${site} unavailable: ${e.message}`);
    return {};
  }
}

const days = eachDay(startArg, endArg);
console.log(`backfilling ${days.length} days, ${startArg} to ${endArg}${WRITE ? "" : "  (dry run)"}`);

const local = await j(`https://archive-api.open-meteo.com/v1/archive?latitude=${BAY_LAT}&longitude=${BAY_LON}&start_date=${startArg}&end_date=${endArg}&daily=daylight_duration&hourly=temperature_2m,soil_temperature_0_to_7cm,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=UTC`);

// The daily job fires at 13:00 UTC. Index the hourly archive on that hour so the backfilled
// readings are sampled the same way the recorded ones were.
const HOUR = "13:00";
const atHour = {};
{
  const t = local.hourly.time;
  for (let i = 0; i < t.length; i += 1) {
    if (!t[i].endsWith(HOUR)) continue;
    atHour[t[i].slice(0, 10)] = {
      airF: local.hourly.temperature_2m?.[i] ?? null,
      soilF: local.hourly.soil_temperature_0_to_7cm?.[i] ?? null,
      windSpeedMph: local.hourly.wind_speed_10m?.[i] ?? null,
      windDirDeg: local.hourly.wind_direction_10m?.[i] ?? null,
    };
  }
}
const yearStart = `${startArg.slice(0, 4)}-01-01`;
const gddSrc = await j(`https://archive-api.open-meteo.com/v1/archive?latitude=${GDD_LAT}&longitude=${GDD_LON}&start_date=${yearStart}&end_date=${endArg}&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FDetroit`);

// Growing degree days, base 50 F, accumulated from Jan 1, matching lib/sources.js fetchGddActual.
const gddByDate = {};
{
  let acc = 0;
  const t = gddSrc.daily.time, mx = gddSrc.daily.temperature_2m_max, mn = gddSrc.daily.temperature_2m_min;
  for (let i = 0; i < t.length; i += 1) {
    if (mx[i] != null && mn[i] != null) acc += Math.max(0, (mx[i] + mn[i]) / 2 - 50);
    gddByDate[t[i]] = Math.round(acc);
  }
}

const [au, ri] = await Promise.all([dailyDischarge("04136000", startArg, endArg), dailyDischarge("04142000", startArg, endArg)]);
const normal = gddSeries();
const idx = Object.fromEntries(local.daily.time.map((d, i) => [d, i]));

const rows = days.map((date) => {
  const i = idx[date];
  const doy = dayOfYear(new Date(date + "T12:00:00Z"));
  const real = [];
  const val = (key, v) => { if (v !== null && v !== undefined) real.push(key); return v ?? null; };
  const dl = i == null ? null : local.daily.daylight_duration?.[i];
  const h = atHour[date] || {};
  return {
    date,
    doy,
    season: seasonOf(doy).name,
    gdd: val("gdd", gddByDate[date]),
    gddNormal: normal[Math.min(364, doy - 1)].gdd,
    ausableFlow: val("ausableFlow", au[date]),
    ausableTempF: null,
    rifleFlow: val("rifleFlow", ri[date]),
    rifleTempF: null,
    levelM: null,
    airF: val("airF", h.airF != null ? Math.round(h.airF) : null),
    soilF: val("soilF", h.soilF != null ? Math.round(h.soilF) : null),
    daylightH: val("daylightH", dl != null ? Math.round((dl / 3600) * 100) / 100 : null),
    windSpeedMph: val("windSpeedMph", h.windSpeedMph != null ? Math.round(h.windSpeedMph) : null),
    windDirDeg: val("windDirDeg", h.windDirDeg != null ? Math.round(h.windDirDeg) : null),
    moonPhase: moonPhase(new Date(date + "T12:00:00Z").getTime() / 86400000 + 2440587.5),
    birdCount: null,
    topBird: null,
    backfilled: true,
    backfilledFields: real,
    backfilledAt: new Date().toISOString().slice(0, 10),
  };
});

const complete = rows.filter((r) => r.airF != null && r.gdd != null).length;
console.log(`  ${complete} of ${rows.length} rows have both air temperature and GDD`);
console.log(`  sample: ${JSON.stringify(rows[0])}`);
if (!WRITE) { console.log("dry run, nothing written. re-run with --write"); process.exit(0); }

const GH = process.env.GH_TOKEN;
if (!GH) { console.error("GH_TOKEN not set"); process.exit(1); }
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
const H = { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "phenology-backfill" };
const cur = await fetch(`${API}?ref=main`, { headers: H }).then((r) => r.json());
const existing = JSON.parse(Buffer.from(cur.content || "", "base64").toString("utf8"));
const have = new Set(existing.map((r) => r.date));
// Never overwrite a day that was actually recorded.
const added = rows.filter((r) => !have.has(r.date));
const merged = [...existing, ...added].sort((a, b) => (a.date < b.date ? -1 : 1));
const put = await fetch(API, {
  method: "PUT",
  headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({
    message: `backfill ${startArg} to ${endArg}, ${added.length} reconstructed days [skip deploy]`,
    content: Buffer.from(JSON.stringify(merged)).toString("base64"),
    sha: cur.sha,
    branch: "main",
  }),
});
console.log(put.ok ? `wrote ${added.length} rows, ${merged.length} days on record` : `write failed ${put.status} ${await put.text()}`);
