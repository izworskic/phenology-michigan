import { BLOOM_STORE_PATHS, mutateBloomJson } from './history-store.mjs';

function key(observation) {
  return `${observation?.destinationId || ''}|${observation?.zone || ''}`;
}

function pruneExpired(observations, now) {
  const nowMs = now.getTime();
  return (Array.isArray(observations) ? observations : []).filter((item) => {
    const expires = new Date(item?.validThrough).getTime();
    return Number.isFinite(expires) && expires >= nowMs;
  });
}

export async function upsertBloomOverride(observation, {
  now = new Date(),
  ...options
} = {}) {
  return mutateBloomJson(BLOOM_STORE_PATHS.overrides, (existing) => {
    const current = existing && typeof existing === 'object' ? existing : { observations: [] };
    const kept = pruneExpired(current.observations, now).filter((item) => key(item) !== key(observation));
    kept.push(observation);
    kept.sort((a, b) => new Date(a.observedAt) - new Date(b.observedAt));
    return { value: { schemaVersion: 1, observations: kept } };
  }, {
    ...options,
    fallback: { schemaVersion: 1, observations: [] },
    commitMessage: `bloom verified observation ${observation.destinationId} [skip deploy]`,
  });
}

export async function removeBloomOverride({ destinationId, zone = null }, {
  now = new Date(),
  ...options
} = {}) {
  return mutateBloomJson(BLOOM_STORE_PATHS.overrides, (existing) => {
    const current = existing && typeof existing === 'object' ? existing : { observations: [] };
    const before = pruneExpired(current.observations, now);
    const after = before.filter((item) => key(item) !== `${destinationId || ''}|${zone || ''}`);
    if (after.length === before.length) return { skipWrite: true };
    return { value: { schemaVersion: 1, observations: after } };
  }, {
    ...options,
    fallback: { schemaVersion: 1, observations: [] },
    commitMessage: `remove bloom verified observation ${destinationId} [skip deploy]`,
  });
}
