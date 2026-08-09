import { fetchRegional, fetchRivers, fetchGddActual, fetchBirds, fetchForecast } from "../../lib/sources";
import { dayOfYear, gddSeries, seasonOf, cToF, moonPhase, EVENTS } from "../../lib/phenology";
import { appendSnapshot, historyConfigured, appendAlmanac } from "../../lib/history";
import { writeAlmanac } from "../../lib/almanac";
import { gatherSignals, writeSignals, signalsConfigured } from "../../lib/signals";

const SITE = "https://phenology.chrisizworski.com";
const INDEXNOW_KEY = "b1be9ee40d264668af173e98e30188bf";

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const log = [];
  const failures = [];
  const ts = () => new Date().toISOString();

  // Build today's snapshot from the live sources and bank it. This fetch also warms the cache.
  try {
    const now = new Date();
    const doy = dayOfYear(now);
    const [regional, rivers, gdd, birds, forecast] = await Promise.all([
      fetchRegional(), fetchRivers(), fetchGddActual(), fetchBirds(), fetchForecast(),
    ]);
    const au = rivers.find((r) => r.id === "ausable") || {};
    const ri = rivers.find((r) => r.id === "rifle") || {};
    const normal = gddSeries();
    const snap = {
      date: now.toLocaleDateString("en-CA", { timeZone: "America/Detroit" }),
      doy,
      season: seasonOf(doy).name,
      gdd: gdd?.total ?? null,
      gddNormal: normal[Math.min(364, doy - 1)].gdd,
      ausableFlow: au.flow ?? null,
      ausableTempF: au.temp != null ? Math.round(cToF(au.temp)) : null,
      rifleFlow: ri.flow ?? null,
      rifleTempF: ri.temp != null ? Math.round(cToF(ri.temp)) : null,
      levelM: regional.level ?? null,
      airF: regional.air.tempF ?? null,
      soilF: forecast?.soilF ?? null,
      daylightH: forecast?.daylightH != null ? Math.round(forecast.daylightH * 100) / 100 : null,
      windSpeedMph: forecast?.windSpeedMph ?? null,
      windDirDeg: forecast?.windDirDeg ?? null,
      moonPhase: moonPhase(now.getTime() / 86400000 + 2440587.5),
      birdCount: birds.length,
      topBird: birds[0]?.comName || null,
    };
    if (!historyConfigured()) {
      failures.push("storage not configured: GH_TOKEN missing");
      log.push(`[${ts()}] snapshot ${snap.date} ready but storage not configured; set GH_TOKEN`);
    } else {
      const r = await appendSnapshot(snap);
      if (!r.ok) failures.push(`snapshot write: ${r.reason}`);
      log.push(`[${ts()}] snapshot ${snap.date}: ${r.ok ? `banked, ${r.count} days on record` : `write failed: ${r.reason}`}`);

      // The written entry for the day, banked beside the numbers. A failure here is logged but
      // is NOT fatal: the readings are the record, the note is the reading of it.
      const inWindow = EVENTS.filter((e) => doy >= e.s && doy <= e.e);
      const soonEvents = EVENTS.filter((e) => e.s > doy && e.s <= doy + 21);
      const note = await writeAlmanac(snap, inWindow, soonEvents);
      if (note.ok) {
        const a = await appendAlmanac({ date: snap.date, doy: snap.doy, text: note.text, words: note.words });
        log.push(`[${ts()}] almanac ${snap.date}: ${a.ok ? `written, ${a.count} entries on record` : `write failed: ${a.reason}`}`);
      } else {
        log.push(`[${ts()}] almanac ${snap.date}: not written (${note.reason})`);
      }
    }
  } catch (e) {
    failures.push(`snapshot: ${e.message}`);
    log.push(`[${ts()}] snapshot failed: ${e.message}`);
  }

  // Refresh the daily-cadence signal bundle so the page can read it cheaply instead of
  // hitting six slow external APIs on every cache miss.
  try {
    if (!signalsConfigured()) {
      failures.push("storage not configured: GH_TOKEN missing");
      log.push(`[${ts()}] signals ready but storage not configured; set GH_TOKEN`);
    } else {
      const bundle = await gatherSignals();
      const r = await writeSignals(bundle);
      if (!r.ok) failures.push(`signals write: ${r.reason}`);
      const counts = `obs ${bundle.observations.length}, inat ${bundle.inat.length}, ice ${bundle.bayDaily.iceConc}`;
      log.push(`[${ts()}] signals: ${r.ok ? `banked (${counts})` : `write failed: ${r.reason}`}`);
    }
  } catch (e) {
    failures.push(`signals: ${e.message}`);
    log.push(`[${ts()}] signals failed: ${e.message}`);
  }

  // Ping IndexNow and the sitemap so search engines recrawl the daily-updated page.
  try {
    await fetch(`https://api.indexnow.org/indexnow?url=${SITE}/&key=${INDEXNOW_KEY}`);
    await fetch(`https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`);
    log.push(`[${ts()}] IndexNow and sitemap pinged`);
  } catch (e) {
    log.push(`[${ts()}] ping failed: ${e.message}`);
  }

  // A refresh that banked nothing is a failed refresh. Returning 200 here is what hid a dead
  // GH_TOKEN for 45 days: every write 401'd while the workflow's `curl --fail` saw success.
  // IndexNow ping failures are deliberately NOT fatal; they do not affect the recorded data.
  const ok = failures.length === 0;
  res.status(ok ? 200 : 500).json({ ok, configured: historyConfigured(), failures, log });
}
