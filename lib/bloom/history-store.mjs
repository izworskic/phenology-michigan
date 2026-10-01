const DEFAULT_REPO = 'izworskic/phenology-michigan';
const DEFAULT_BRANCH = 'main';
const API_ROOT = 'https://api.github.com/repos';

export const BLOOM_STORE_PATHS = Object.freeze({
  observations: 'data/bloom-observation-history.json',
  forecasts: 'data/bloom-forecast-history.json',
  latest: 'data/bloom-latest.json',
  overrides: 'data/bloom-observation-overrides.json',
});

export function bloomStorageConfigured(token = process.env.GH_TOKEN) {
  return Boolean(token);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'michigan-bloom-tracker',
  };
}

function apiUrl(repo, path) {
  return `${API_ROOT}/${repo}/contents/${path}`;
}

function decodeJson(content, fallback) {
  try {
    return JSON.parse(Buffer.from(content || '', 'base64').toString('utf8'));
  } catch {
    return fallback;
  }
}

export async function readBloomJson(path, {
  token = process.env.GH_TOKEN,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH,
  fetchImpl = fetch,
  fallback = null,
} = {}) {
  if (!token) return { ok: false, configured: false, value: fallback, sha: null, reason: 'GH_TOKEN not set' };
  const response = await fetchImpl(`${apiUrl(repo, path)}?ref=${encodeURIComponent(branch)}`, { headers: headers(token) });
  if (response.status === 404) return { ok: true, configured: true, value: fallback, sha: null, missing: true };
  if (!response.ok) return { ok: false, configured: true, value: fallback, sha: null, reason: `gh get ${response.status}` };
  const payload = await response.json();
  return { ok: true, configured: true, value: decodeJson(payload.content, fallback), sha: payload.sha || null, missing: false };
}

async function putBloomJson(path, value, {
  token,
  repo,
  branch,
  fetchImpl,
  sha,
  message,
}) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(value)).toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  return fetchImpl(apiUrl(repo, path), {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(body),
  });
}

export async function mutateBloomJson(path, mutator, {
  token = process.env.GH_TOKEN,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH,
  fetchImpl = fetch,
  fallback = null,
  commitMessage = `bloom data update [skip deploy]`,
  maxAttempts = 4,
} = {}) {
  if (!token) return { ok: false, configured: false, reason: 'GH_TOKEN not set' };

  let lastReason = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const current = await readBloomJson(path, { token, repo, branch, fetchImpl, fallback });
    if (!current.ok) return current;
    const next = await mutator(current.value);
    if (next?.skipWrite) return { ok: true, configured: true, changed: false, value: current.value, attempts: attempt };
    const value = next?.value === undefined ? next : next.value;
    const response = await putBloomJson(path, value, {
      token, repo, branch, fetchImpl, sha: current.sha, message: commitMessage,
    });
    if (response.ok) return { ok: true, configured: true, changed: true, value, attempts: attempt };
    const text = await response.text();
    lastReason = `gh put ${response.status} ${text.slice(0, 160)}`;
    if (![409, 422].includes(response.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 60 * attempt));
  }
  return { ok: false, configured: true, reason: lastReason || 'write failed after retries' };
}

function observationKey(observation) {
  return [
    observation?.destinationId || '',
    observation?.zone || '',
    observation?.observedAt || '',
    observation?.stage || '',
    observation?.source?.id || observation?.source?.name || '',
  ].join('|');
}

export function mergeObservationHistory(existing = [], incoming = [], maxRecords = 4000) {
  const map = new Map();
  for (const observation of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!observation?.destinationId || !observation?.observedAt || !observation?.stage) continue;
    map.set(observationKey(observation), observation);
  }
  return [...map.values()]
    .sort((a, b) => new Date(a.observedAt) - new Date(b.observedAt))
    .slice(-maxRecords);
}

function forecastKey(entry) {
  return [entry?.generatedAt || '', entry?.destinationId || '', entry?.observation?.observedAt || ''].join('|');
}

export function mergeForecastHistory(existing = [], incoming = [], maxRecords = 6000) {
  const map = new Map();
  for (const entry of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (!entry?.generatedAt || !entry?.destinationId) continue;
    map.set(forecastKey(entry), entry);
  }
  return [...map.values()]
    .sort((a, b) => new Date(a.generatedAt) - new Date(b.generatedAt))
    .slice(-maxRecords);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function appendBloomObservations(observations, options = {}) {
  return mutateBloomJson(BLOOM_STORE_PATHS.observations, (existing) => {
    const current = Array.isArray(existing) ? existing : [];
    const value = mergeObservationHistory(current, observations);
    return sameJson(current, value) ? { skipWrite: true } : { value };
  }, { ...options, fallback: [], commitMessage: `bloom observations [skip deploy]` });
}

export async function appendBloomForecasts(entries, options = {}) {
  if (!entries?.length) return { ok: true, configured: bloomStorageConfigured(options.token), changed: false, value: [] };
  return mutateBloomJson(BLOOM_STORE_PATHS.forecasts, (existing) => {
    const current = Array.isArray(existing) ? existing : [];
    const value = mergeForecastHistory(current, entries);
    return sameJson(current, value) ? { skipWrite: true } : { value };
  }, { ...options, fallback: [], commitMessage: `bloom forecasts [skip deploy]` });
}

export async function writeBloomLatest(snapshot, options = {}) {
  return mutateBloomJson(BLOOM_STORE_PATHS.latest, (existing) => {
    const previous = existing && typeof existing === 'object' ? existing : null;
    return sameJson(previous, snapshot) ? { skipWrite: true } : { value: snapshot };
  }, { ...options, fallback: null, commitMessage: `bloom latest ${snapshot?.generatedAt || ''} [skip deploy]` });
}

export async function readBloomObservationHistory(options = {}) {
  const result = await readBloomJson(BLOOM_STORE_PATHS.observations, { ...options, fallback: [] });
  return { ...result, value: Array.isArray(result.value) ? result.value : [] };
}

export async function readBloomForecastHistory(options = {}) {
  const result = await readBloomJson(BLOOM_STORE_PATHS.forecasts, { ...options, fallback: [] });
  return { ...result, value: Array.isArray(result.value) ? result.value : [] };
}

export async function readBloomLatest(options = {}) {
  return readBloomJson(BLOOM_STORE_PATHS.latest, { ...options, fallback: null });
}

export async function readBloomOverrides(options = {}) {
  return readBloomJson(BLOOM_STORE_PATHS.overrides, { ...options, fallback: { observations: [] } });
}
