import { BLOOM_STORE_PATHS, bloomStorageConfigured, mutateBloomJson, readBloomOverrides } from './history-store.mjs';

function overrideId(raw) {
  return raw?.id || `${raw?.destinationId || 'unknown'}:${raw?.zone || 'all'}`;
}

function normalizeDocument(value) {
  return {
    schemaVersion: 1,
    observations: Array.isArray(value?.observations) ? value.observations : [],
  };
}

export async function listBloomOverrides(options = {}) {
  const result = await readBloomOverrides(options);
  return { ...result, value: normalizeDocument(result.value) };
}

export async function upsertBloomOverride(observation, options = {}) {
  if (!bloomStorageConfigured(options.token)) return { ok: false, configured: false, reason: 'GH_TOKEN not set' };
  const id = overrideId(observation);
  const entry = { ...observation, id };
  return mutateBloomJson(BLOOM_STORE_PATHS.overrides, (existing) => {
    const doc = normalizeDocument(existing);
    const observations = doc.observations.filter((item) => overrideId(item) !== id);
    observations.push(entry);
    observations.sort((a, b) => String(a.destinationId).localeCompare(String(b.destinationId)) || String(a.zone || '').localeCompare(String(b.zone || '')));
    return { value: { schemaVersion: 1, observations } };
  }, {
    ...options,
    fallback: { schemaVersion: 1, observations: [] },
    commitMessage: `bloom verified observation ${id} [skip deploy]`,
  });
}

export async function deleteBloomOverride(id, options = {}) {
  if (!id) return { ok: false, configured: bloomStorageConfigured(options.token), reason: 'override id is required' };
  return mutateBloomJson(BLOOM_STORE_PATHS.overrides, (existing) => {
    const doc = normalizeDocument(existing);
    const observations = doc.observations.filter((item) => overrideId(item) !== id);
    if (observations.length === doc.observations.length) return { skipWrite: true };
    return { value: { schemaVersion: 1, observations } };
  }, {
    ...options,
    fallback: { schemaVersion: 1, observations: [] },
    commitMessage: `expire bloom verified observation ${id} [skip deploy]`,
  });
}
