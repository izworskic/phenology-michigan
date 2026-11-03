// Daily Python analysis is stored in GitHub, not a Vercel deploy artifact.
// Read at request time so [skip deploy] commits are immediately visible.
const ORIGIN = "https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/phenology-field-read.json";
const TZ = "America/Detroit";
function localDay(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return p.year + "-" + p.month + "-" + p.day;
}
export function normalizeFieldRead(payload, now = new Date()) {
  if (!payload || payload.schema !== "phenology-field-read-v1" || !/^\d{4}-\d\d-\d\d$/.test(payload.asOfDate || "")) return null;
  const today = Date.parse(localDay(now) + "T12:00:00Z");
  const asOf = Date.parse(payload.asOfDate + "T12:00:00Z");
  if (!Number.isFinite(asOf) || asOf > today || (today - asOf) / 86400000 > 400) return null;
  const old = (today - asOf) / 86400000 > 3;
  return { ...payload, status: old ? "archive-only" : payload.status,
    // Archived observations are historical and must never be presented as current.
    observations: old ? [] : (Array.isArray(payload.observations) ? payload.observations.slice(0, 4) : []),
    tracks: Array.isArray(payload.tracks) ? payload.tracks.slice(0, 3) : [],
    quality: Array.isArray(payload.quality) ? payload.quality.slice(0, 5) : [] };
}
export async function readFieldRead() {
  try {
    const response = await fetch(ORIGIN + "?t=" + Math.floor(Date.now() / 600000), { headers: { "User-Agent": "phenology-michigan/field-read" } });
    if (!response.ok) return null;
    return normalizeFieldRead(await response.json());
  } catch {
    return null; // Missing analysis never synthesizes a fake current reading.
  }
}
