import { DISPLAY_POTENTIAL, isValidStage } from '../lib/bloom/contracts.mjs';
import { getBloomDestination } from '../lib/bloom/destinations.mjs';
import { getBloomSources } from '../lib/bloom/source-registry.mjs';
import { normalizeVerifiedOverride } from '../lib/bloom/observation-ingestion.mjs';
import { deleteBloomOverride, upsertBloomOverride } from '../lib/bloom/override-store.mjs';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function configuredSource(destinationId) {
  return getBloomSources(destinationId)
    .filter((source) => source.url)
    .sort((a, b) => Number(b.authority || 0) - Number(a.authority || 0))[0] || null;
}

const action = String(process.env.BLOOM_ACTION || 'set').trim();
const destinationId = required('BLOOM_DESTINATION');
const zone = String(process.env.BLOOM_ZONE || '').trim() || null;
const id = `${destinationId}:${zone || 'all'}`;
const token = required('GITHUB_TOKEN');

if (!getBloomDestination(destinationId)) throw new Error(`Unknown destination: ${destinationId}`);

if (action === 'expire') {
  const result = await deleteBloomOverride(id, { token, fetchImpl: fetch });
  if (!result.ok) throw new Error(result.reason || 'Failed to expire override');
  console.log(`Expired verified bloom observation ${id}`);
  process.exit(0);
}

if (action !== 'set') throw new Error(`Unsupported BLOOM_ACTION: ${action}`);

const stage = required('BLOOM_STAGE');
if (!isValidStage(stage)) throw new Error(`Invalid stage: ${stage}`);
const displayPotential = String(process.env.BLOOM_DISPLAY_POTENTIAL || DISPLAY_POTENTIAL.NORMAL).trim();
if (!Object.values(DISPLAY_POTENTIAL).includes(displayPotential)) throw new Error(`Invalid display potential: ${displayPotential}`);

const source = configuredSource(destinationId);
if (!source) throw new Error(`No official source configured for ${destinationId}`);

const now = new Date();
const observedAtInput = String(process.env.BLOOM_OBSERVED_AT || '').trim();
const observedAt = observedAtInput ? new Date(observedAtInput) : now;
if (!Number.isFinite(observedAt.getTime())) throw new Error('BLOOM_OBSERVED_AT must be an ISO date/time when supplied');
if (observedAt.getTime() > now.getTime() + 3600000) throw new Error('Observation cannot be more than one hour in the future');

const validHours = Number(process.env.BLOOM_VALID_HOURS || 48);
if (!Number.isFinite(validHours) || validHours < 1 || validHours > 168) throw new Error('BLOOM_VALID_HOURS must be between 1 and 168');
const validThrough = new Date(observedAt.getTime() + validHours * 3600000);
const evidenceText = required('BLOOM_EVIDENCE');
if (evidenceText.length < 8) throw new Error('BLOOM_EVIDENCE must briefly describe what was observed');

const raw = {
  id,
  destinationId,
  zone,
  stage,
  observedAt: observedAt.toISOString(),
  validThrough: validThrough.toISOString(),
  displayPotential,
  source: {
    id: `verified:${source.id}`,
    name: `${source.name} — verified observation`,
    url: source.url,
    authority: source.authority,
  },
  evidenceText,
  notes: String(process.env.BLOOM_NOTES || '').trim() || null,
};

const normalized = normalizeVerifiedOverride(raw, now);
if (!normalized) throw new Error('Override failed freshness/provenance validation');
const result = await upsertBloomOverride(normalized, { token, fetchImpl: fetch });
if (!result.ok) throw new Error(result.reason || 'Failed to write override');
console.log(`Saved ${destinationId} as ${stage}; valid through ${validThrough.toISOString()}`);
