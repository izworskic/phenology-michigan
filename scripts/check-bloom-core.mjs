import assert from 'node:assert/strict';
import { BLOOM_DESTINATIONS, DISPLAY_TYPES, getBloomDestination } from '../lib/bloom/destinations.mjs';
import { buildBloomDecision } from '../lib/bloom/engine.mjs';
import { fetchBloomWeather } from '../lib/bloom/weather.mjs';
import { CONFIDENCE, DECISIONS, DISPLAY_POTENTIAL, exactStageAllowed } from '../lib/bloom/contracts.mjs';

assert.equal(BLOOM_DESTINATIONS.length, 9);
assert.equal(new Set(BLOOM_DESTINATIONS.map((d) => d.id)).size, BLOOM_DESTINATIONS.length);
for (const id of ['milan-lavender', 'frankenmuth-sunflowers', 'gull-meadow-sunflowers', 'blakes-sunflowers']) {
  assert.ok(getBloomDestination(id), `${id} must be registered as a first-class bloom destination`);
  assert.equal(getBloomDestination(id).displayType, DISPLAY_TYPES.STAGGERED_MIXED, `${id} must use the mixed-display truth rules`);
}

const holland = getBloomDestination('holland-tulips');
const meijer = getBloomDestination('meijer-gardens-cherries');
assert.equal(holland.displayType, DISPLAY_TYPES.STAGGERED_MIXED);
assert.equal(exactStageAllowed(holland, 7), false);
assert.equal(exactStageAllowed(meijer, 5), true);

const now = new Date('2026-05-05T12:00:00-04:00');
const freshPeak = {
  stage: 'PEAK', observedAt: '2026-05-05T08:00:00-04:00', displayPotential: DISPLAY_POTENTIAL.NORMAL,
  source: { name: 'authoritative tracker', url: 'https://example.com', observedAt: '2026-05-05T08:00:00-04:00' },
};

const goBefore = buildBloomDecision({
  destination: holland,
  observation: freshPeak,
  now,
  forecastWindows: [{
    horizonDays: 3, stageLow: 'PEAK', stageHigh: 'DONE', confidence: CONFIDENCE.HIGH,
    durabilityRisk: 'high', riskFlags: ['wind', 'rain'],
  }],
});
assert.equal(goBefore.decision, DECISIONS.GO_BEFORE);
assert.equal(goBefore.forecast[0].stageHigh, 'FADING', 'PEAK must not skip directly to DONE');

const prePeak = buildBloomDecision({
  destination: meijer,
  observation: { ...freshPeak, stage: 'BUILDING' },
  now,
  forecastWindows: [{ horizonDays: 7, stageLow: 'NEAR_PEAK', stageHigh: 'FADING', confidence: CONFIDENCE.HIGH }],
});
assert.equal(prePeak.forecast[0].stageHigh, 'PEAK', 'development endpoint must stop at PEAK');
assert.equal(prePeak.decision, DECISIONS.WAIT);

const mixed = buildBloomDecision({
  destination: holland,
  observation: { ...freshPeak, stage: 'PEAK' },
  now,
  forecastWindows: [{ horizonDays: 7, stageLow: 'PEAK', stageHigh: 'PEAK', confidence: CONFIDENCE.HIGH }],
});
assert.equal(mixed.forecast[0].exactStage, null, '7-day mixed display must not claim an exact stage');
assert.equal(mixed.forecast[0].confidence, CONFIDENCE.MEDIUM, '7-day directional confidence must be capped');

const damaged = buildBloomDecision({
  destination: meijer,
  observation: { ...freshPeak, displayPotential: DISPLAY_POTENTIAL.SEVERELY_REDUCED },
  now,
});
assert.equal(damaged.decision, DECISIONS.LIMITED, 'severe display damage must override normal GO logic');

const stale = buildBloomDecision({
  destination: meijer,
  observation: { ...freshPeak, observedAt: '2026-04-28T08:00:00-04:00' },
  now,
});
assert.equal(stale.decision, DECISIONS.UNKNOWN, 'stale observations must not issue a confident trip decision');

const malformed = buildBloomDecision({
  destination: meijer,
  observation: freshPeak,
  now,
  forecastWindows: [{ horizonDays: 3, stageLow: 'PEAK', stageHigh: 'BANANA', confidence: CONFIDENCE.HIGH }],
});
assert.equal(malformed.forecast.length, 0, 'invalid model stages must not be coerced into a biological stage');
assert.equal(malformed.forecastErrors.length, 1);

const partialWeatherFetch = async () => ({
  ok: true,
  json: async () => ({ hourly: { time: ['2026-05-05T00:00'], temperature_2m: [15], precipitation: [0], wind_gusts_10m: [5] } }),
});
await assert.rejects(() => fetchBloomWeather(meijer, partialWeatherFetch), /usable hours/);

console.log('Bloom production-core invariants: PASS');
