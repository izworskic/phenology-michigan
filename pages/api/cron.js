import { fetchRegional, fetchRivers, fetchGddActual, fetchBirds, fetchForecast } from "../../lib/sources";
import { dayOfYear, gddSeries, seasonOf, cToF } from "../../lib/phenology";
import { appendSnapshot, historyConfigured } from "../../lib/history";

const SITE = "https://phenology.chrisizworski.com";
const INDEXNOW_KEY = "b1be9ee40d264668af173e98e30188bf";

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const log = [];
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
      birdCount: birds.length,
      topBird: birds[0]?.comName || null,
    };
    if (!historyConfigured()) {
      log.push(`[${ts()}] snapshot ${snap.date} ready but storage not configured; set UPSTASH_REDIS_REST_TOKEN`);
    } else {
      const r = await appendSnapshot(snap);
      log.push(`[${ts()}] snapshot ${snap.date}: ${r.ok ? `banked, ${r.count} days on record` : `write failed: ${r.reason}`}`);
    }
  } catch (e) {
    log.push(`[${ts()}] snapshot failed: ${e.message}`);
  }

  // Ping IndexNow and the sitemap so search engines recrawl the daily-updated page.
  try {
    await fetch(`https://api.indexnow.org/indexnow?url=${SITE}/&key=${INDEXNOW_KEY}`);
    await fetch(`https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`);
    log.push(`[${ts()}] IndexNow and sitemap pinged`);
  } catch (e) {
    log.push(`[${ts()}] ping failed: ${e.message}`);
  }

  res.status(200).json({ ok: true, configured: historyConfigured(), log });
}
