import BUNDLED from "../data/natural-year-dispatch.json" with {type:"json"};
import CATALOG from "../data/natural-year-connections.json" with {type:"json"};

const RAW = "https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/natural-year-dispatch.json";
const ALLOWED = new Map(CATALOG.experiences.map(e => [e.id, e.url]));
const REGIONS = new Set(CATALOG.regions.map(r => r.id));
function localDay(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now).filter(x => x.type !== "literal").map(x => [x.type,x.value]));
  return p.year + "-" + p.month + "-" + p.day;
}
const dated = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(v + "T12:00:00Z")) && new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;

export function validateNaturalYearDispatch(payload, now = new Date()) {
  if (!payload || payload.schema !== "natural-year-dispatch-v1" || !dated(payload.asOfDate)) return null;
  const offset = (Date.parse(localDay(now) + "T12:00:00Z") - Date.parse(payload.asOfDate + "T12:00:00Z")) / 86400000;
  if (!Number.isFinite(offset) || offset < 0 || offset > 3) return null;
  if (!Array.isArray(payload.active) || !Array.isArray(payload.upcoming)
      || !Array.isArray(payload.historicalRegions) || payload.historicalRegions.length !== REGIONS.size
      || !Array.isArray(payload.reports) || payload.reports.length > 6
      || !["recent-statewide-reports", "no-recent-eligible-reports", "archive-only"].includes(payload.reportsState)) return null;
  for (const row of [...payload.active,...payload.upcoming]) {
    if (!row || ALLOWED.get(row.id) !== row.url || !Number.isInteger(row.daysUntilStart)
        || row.daysUntilStart < 0 || row.daysUntilStart > 365
        || !["usual-calendar-window", "upcoming-calendar-window"].includes(row.state)) return null;
  }
  for (const item of payload.reports) {
    if (!item || !dated(item.date) || item.date > payload.asOfDate
        || item.evidence !== "statewide-reported-phenophase"
        || item.source !== "USA-NPN Nature's Notebook"
        || item.sourceUrl !== "https://www.usanpn.org/data"
        || typeof item.name !== "string" || typeof item.phase !== "string"
        || item.name.length > 85 || item.phase.length > 100) return null;
  }
  if (payload.reportsState !== "recent-statewide-reports" && payload.reports.length) return null;
  const ids = payload.historicalRegions.map(x => x.id);
  if (new Set(ids).size !== REGIONS.size || ids.some(id => !REGIONS.has(id))) return null;
  return payload;
}

export async function readNaturalYearDispatch() {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    let response;
    try {
      response = await fetch(RAW + "?v=" + Math.floor(Date.now() / 600000), {
        signal: ctrl.signal, headers: {"User-Agent": "michigan-phenology/natural-year-dispatch"}
      });
    } finally { clearTimeout(timeout); }
    if (response.ok) {
      const fresh = validateNaturalYearDispatch(await response.json());
      if (fresh) return fresh;
    }
  } catch { /* Last verified bundled evidence is used only if still fresh. */ }
  return validateNaturalYearDispatch(BUNDLED);
}
