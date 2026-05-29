import { fetchConditions, fetchBirds } from "../../lib/sources";

const SITE = "https://phenology.chrisizworski.com";
const INDEXNOW_KEY = "b1be9ee40d264668af173e98e30188bf";

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const log = [];
  const ts = () => new Date().toISOString();

  // Warm the live sources so the next visitor gets a hot cache.
  try {
    const [c, b] = await Promise.all([fetchConditions(), fetchBirds()]);
    log.push(`[${ts()}] warmed: flow=${c.usgs.flow} air=${c.air.tempF} level=${c.level} sightings=${b.length}`);
  } catch (e) {
    log.push(`[${ts()}] warm failed: ${e.message}`);
  }

  // Ping IndexNow and the sitemap so search engines recrawl the daily-updated page.
  try {
    await fetch(`https://api.indexnow.org/indexnow?url=${SITE}/&key=${INDEXNOW_KEY}`);
    await fetch(`https://www.bing.com/ping?sitemap=${SITE}/sitemap.xml`);
    log.push(`[${ts()}] IndexNow and sitemap pinged`);
  } catch (e) {
    log.push(`[${ts()}] ping failed: ${e.message}`);
  }

  res.status(200).json({ ok: true, log });
}
