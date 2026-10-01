import assert from 'node:assert/strict';
import {
  mergeObservationHistory,
  mergeForecastHistory,
  mutateBloomJson,
} from '../lib/bloom/history-store.mjs';
import { runBloomLiveCycle } from '../lib/bloom/live-pipeline.mjs';

const baseObservation = {
  destinationId: 'um-peony-garden',
  stage: 'BUILDING',
  observedAt: '2026-05-26T12:00:00.000Z',
  source: { id: 'um-peony-official', name: 'U-M', url: 'https://example.com/um' },
};
const observations = mergeObservationHistory(
  [baseObservation],
  [baseObservation, { ...baseObservation, stage: 'NEAR_PEAK', observedAt: '2026-05-28T12:00:00.000Z' }],
);
assert.equal(observations.length, 2, 'same observation must not duplicate across refreshes');
assert.equal(observations[1].stage, 'NEAR_PEAK');

const forecast = {
  generatedAt: '2026-05-28T16:00:00.000Z',
  destinationId: 'um-peony-garden',
  observation: { observedAt: '2026-05-28T12:00:00.000Z' },
  forecast: [],
};
assert.equal(mergeForecastHistory([forecast], [forecast]).length, 1, 'same issuance must be idempotent');

let getCount = 0;
let putCount = 0;
const conflictFetch = async (_url, options = {}) => {
  if (!options.method || options.method === 'GET') {
    getCount += 1;
    const current = getCount === 1 ? [{ id: 1 }] : [{ id: 1 }, { id: 2 }];
    return {
      ok: true,
      status: 200,
      async json() { return { sha: `sha-${getCount}`, content: Buffer.from(JSON.stringify(current)).toString('base64') }; },
    };
  }
  putCount += 1;
  if (putCount === 1) return { ok: false, status: 409, async text() { return 'sha conflict'; } };
  return { ok: true, status: 200, async text() { return ''; } };
};
const retryResult = await mutateBloomJson('data/test.json', (existing) => ({ value: [...existing, { id: 3 }] }), {
  token: 'test-token',
  fetchImpl: conflictFetch,
  fallback: [],
  maxAttempts: 3,
});
assert.equal(retryResult.ok, true);
assert.equal(retryResult.attempts, 2, 'SHA conflict must re-read and retry');
assert.equal(retryResult.value.length, 3, 'retry must preserve concurrent writer data');

function weatherPayload() {
  const time = [];
  const temperature_2m = [];
  const precipitation = [];
  const wind_gusts_10m = [];
  const start = new Date('2026-05-30T00:00:00-04:00');
  for (let i = 0; i < 192; i += 1) {
    const d = new Date(start.getTime() + i * 3600000);
    time.push(d.toISOString().slice(0, 13) + ':00');
    temperature_2m.push(18 + Math.sin(i / 6) * 5);
    precipitation.push(i === 60 ? 3 : 0);
    wind_gusts_10m.push(i === 60 ? 32 : 18);
  }
  return { hourly: { time, temperature_2m, precipitation, wind_gusts_10m } };
}

const sourceFetch = async (url) => {
  const href = String(url);
  if (href.includes('mbgna.umich.edu')) {
    return { ok: true, status: 200, async text() { return '<h2>May 30, 2026</h2><p>We are at peak bloom!</p>'; } };
  }
  if (href.includes('meijergardens.org')) {
    return { ok: true, status: 200, async text() { return '<h2>May 30, 2026</h2><p>Most Yoshino cherries are past peak and dropping their flowers.</p>'; } };
  }
  if (href.includes('api.open-meteo.com')) {
    return { ok: true, status: 200, async json() { return weatherPayload(); } };
  }
  throw new Error(`unexpected fetch ${href}`);
};

const bootstrapOverrides = {
  observations: [
    {
      destinationId: 'holland-tulips',
      stage: 'PEAK',
      observedAt: '2026-05-30T08:00:00-04:00',
      validThrough: '2026-06-02T23:59:00-04:00',
      source: { name: 'City of Holland verified camera review', url: 'https://www.cityofholland.com/1022/Tulip-Tracker', authority: 100 },
    },
    {
      destinationId: 'mackinac-lilacs',
      stage: 'BUILDING',
      observedAt: '2026-05-30T08:00:00-04:00',
      validThrough: '2026-06-02T23:59:00-04:00',
      source: { name: 'Mackinac Island Tourism verified update', url: 'https://www.mackinacisland.org/', authority: 100 },
    },
  ],
};

const cycle = await runBloomLiveCycle({
  now: new Date('2026-05-30T12:00:00-04:00'),
  fetchImpl: sourceFetch,
  bootstrapOverrides,
  persist: false,
});
assert.equal(cycle.ok, true);
assert.equal(cycle.latest.counts.total, 9);
assert.equal(cycle.latest.counts.observed, 4, 'U-M, Meijer, Holland, and Mackinac should be observed');
assert.equal(cycle.latest.counts.unknown, 5, 'Traverse plus the four summer additions must remain unknown without fresh verified evidence');
assert.equal(cycle.latest.provenance.overridesSource, 'deployment_bootstrap');
const um = cycle.latest.destinations.find((d) => d.id === 'um-peony-garden');
assert.equal(um.decision.decision, 'GO');
assert.equal(um.decision.currentStage, 'PEAK');
const traverse = cycle.latest.destinations.find((d) => d.id === 'traverse-city-cherries');
assert.equal(traverse.decision.decision, 'UNKNOWN');
for (const id of ['milan-lavender', 'frankenmuth-sunflowers', 'gull-meadow-sunflowers', 'blakes-sunflowers']) {
  const entry = cycle.latest.destinations.find((d) => d.id === id);
  assert.equal(entry.decision.decision, 'UNKNOWN', `${id} must stay unknown without verified current evidence`);
}

console.log('Bloom persistent-history pipeline invariants: PASS');
