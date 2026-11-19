import { BLOOM_DESTINATIONS } from './destinations.mjs';

// Source-linked observation history only. No bloom predictions or inferred peak dates.
const IDS = new Set(BLOOM_DESTINATIONS.map((entry) => entry.id));
const STAGES = new Set(['EMERGING', 'BUILDING', 'NEAR_PEAK', 'PEAK', 'FADING', 'DONE']);
const MAX_PER_DESTINATION = 6;

function validObservation(record, clock) {
  if (!record || !IDS.has(record.destinationId) || !STAGES.has(record.stage)) return null;
  const date = new Date(record.observedAt);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(record.observedAt || '')) || !Number.isFinite(date.getTime())) return null;
  if (date.getTime() > clock.getTime() + 86400000 || date.getTime() < Date.UTC(2000, 0, 1)) return null;
  const sourceUrl = String(record.source?.url || '');
  if (!/^https:\/\/[^\s]+$/i.test(sourceUrl)) return null;
  const sourceName = String(record.source?.name || '').trim().slice(0, 130);
  if (!sourceName) return null;
  return {
    observedAt: date.toISOString(),
    stage: record.stage,
    sourceName,
    sourceUrl,
    scope: record.zone ? 'named-area report' : 'destination or regional source',
    zone: record.zone ? String(record.zone).slice(0, 100) : null,
    evidenceType: record.source?.mode === 'dated_article' ? 'dated operator or institutional article' : 'dated source-linked record',
  };
}

export function buildBloomHistoryDesk(records = [], { now = new Date(), archiveSource = 'committed archive' } = {}) {
  const clock = new Date(now);
  if (!Number.isFinite(clock.getTime())) throw new Error('Invalid history reference time');
  const raw = Array.isArray(records) ? records : [];
  const grouped = Object.fromEntries(BLOOM_DESTINATIONS.map((entry) => [entry.id, []]));
  const seen = new Set();
  for (const entry of raw) {
    const normalized = validObservation(entry, clock);
    if (!normalized) continue;
    const key = [entry.destinationId, normalized.observedAt, normalized.stage, normalized.sourceUrl, normalized.zone].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    grouped[entry.destinationId].push(normalized);
  }
  let destinationsWithRecords = 0;
  let totalRecords = 0;
  const byDestination = Object.fromEntries(BLOOM_DESTINATIONS.map(({ id }) => {
    const all = grouped[id].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    if (all.length) destinationsWithRecords++;
    totalRecords += all.length;
    return [id, { count: all.length, years: [...new Set(all.map((r) => r.observedAt.slice(0, 4)))].sort().reverse(), records: all.slice(0, MAX_PER_DESTINATION) }];
  }));
  return {
    schemaVersion: 1, archiveSource, totalRecords, destinationsWithRecords,
    destinationsTracked: BLOOM_DESTINATIONS.length, byDestination,
    method: 'Past source-linked stage records. A dated article may describe regional harvest or flowering, not a confirmed peak or on-site visit. A missing record means the archive has no report, not that flowers were absent. Historical data cannot establish current bloom conditions.',
  };
}
