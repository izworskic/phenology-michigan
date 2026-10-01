import assert from 'node:assert/strict';
import { getBloomDestination } from '../lib/bloom/destinations.mjs';
import { buildBloomDecision } from '../lib/bloom/engine.mjs';
import { DISPLAY_POTENTIAL } from '../lib/bloom/contracts.mjs';
import {
  BLOOM_MODEL_CALIBRATION,
  bloomForecastIsCalibrated,
  computeBloomRecentVelocity,
  forecastBloomWindows,
  predictBloomWindowFromFeatures,
} from '../lib/bloom/model.mjs';

const ORDER = ['DORMANT', 'EMERGING', 'BUILDING', 'NEAR_PEAK', 'PEAK', 'FADING', 'DONE'];
const idx = (s) => ORDER.indexOf(s);

assert.equal(BLOOM_MODEL_CALIBRATION.version, 'corrected-velocity-ridge-v1');
assert.equal(BLOOM_MODEL_CALIBRATION.coefficients.length, 11);
assert.equal(bloomForecastIsCalibrated('holland-tulips'), true);
for (const id of ['milan-lavender', 'frankenmuth-sunflowers', 'gull-meadow-sunflowers', 'blakes-sunflowers']) {
  assert.equal(bloomForecastIsCalibrated(id), false, `${id} must not inherit the spring forecast calibration without validation`);
}

const velocity = computeBloomRecentVelocity(
  [{ stage: 'EMERGING', observedAt: '2026-05-18T12:00:00-04:00' }],
  { stage: 'BUILDING', observedAt: '2026-05-21T12:00:00-04:00' }
);
assert.ok(Math.abs(velocity - 1 / 3) < 1e-9, 'recent velocity must use the first real transition, not the legacy indexing bug');

const fixtures = [
  ['meijer-gardens-cherries','NEAR_PEAK',7,0.083333333,{gdd5:66.74375,gdd10:27.210417,freezeHours:0,precipMm:5.32,maxGustKmh:73.1,hotHours27:0},'FADING'],
  ['um-peony-garden','BUILDING',5,0.333333333,{gdd5:61.775,gdd10:31.775,freezeHours:0,precipMm:37.68,maxGustKmh:51.1,hotHours27:0},'BUILDING'],
  ['um-peony-garden','BUILDING',7,0.333333333,{gdd5:88.4375,gdd10:48.4375,freezeHours:0,precipMm:38.79,maxGustKmh:51.1,hotHours27:0},'NEAR_PEAK'],
  ['um-peony-garden','PEAK',5,0.125,{gdd5:105.635417,gdd10:75.635417,freezeHours:0,precipMm:24.16,maxGustKmh:60.1,hotHours27:16},'DONE'],
  ['traverse-city-cherries','BUILDING',7,0,{gdd5:68.36875,gdd10:33.039583,freezeHours:0,precipMm:16.46,maxGustKmh:62.6,hotHours27:0},'FADING'],
  ['holland-tulips','PEAK',3,0,{gdd5:45.941667,gdd10:25.941667,freezeHours:0,precipMm:3.7,maxGustKmh:43.2,hotHours27:0},'FADING'],
  ['holland-tulips','PEAK',5,0,{gdd5:67.4125,gdd10:37.4125,freezeHours:0,precipMm:3.7,maxGustKmh:43.2,hotHours27:0},'FADING'],
  ['mackinac-lilacs','BUILDING',3,0.111111111,{gdd5:25.95,gdd10:5.95,freezeHours:0,precipMm:8,maxGustKmh:33.1,hotHours27:0},'NEAR_PEAK'],
  ['mackinac-lilacs','BUILDING',7,0.111111111,{gdd5:50.15,gdd10:12.283333,freezeHours:0,precipMm:21.88,maxGustKmh:54.8,hotHours27:0},'NEAR_PEAK'],
  ['mackinac-lilacs','PEAK',3,0.0625,{gdd5:31.452083,gdd10:11.452083,freezeHours:0,precipMm:2.7,maxGustKmh:46.1,hotHours27:0},'PEAK'],
];

for (const [destinationId, issueStage, horizonDays, recentVelocity, weather, actualStage] of fixtures) {
  const result = predictBloomWindowFromFeatures({ destinationId, issueStage, horizonDays, recentVelocity, weather });
  assert.ok(
    idx(result.stageLow) <= idx(actualStage) && idx(actualStage) <= idx(result.stageHigh),
    `${destinationId} ${horizonDays}d expected ${actualStage} inside ${result.stageLow}..${result.stageHigh}`
  );
}

const rapidCherry = predictBloomWindowFromFeatures({
  destinationId: 'traverse-city-cherries',
  issueStage: 'BUILDING',
  horizonDays: 7,
  recentVelocity: 0,
  weather: { gdd5:68.36875,gdd10:33.039583,freezeHours:0,precipMm:16.46,maxGustKmh:62.6,hotHours27:0 },
});
assert.equal(rapidCherry.pointStage, 'PEAK');
assert.equal(rapidCherry.stageHigh, 'FADING', 'late-window durability tail must preserve the validated rapid cherry transition');
assert.ok(rapidCherry.riskFlags.includes('may_pass_peak_within_window'));

const oldPeak = predictBloomWindowFromFeatures({
  destinationId: 'um-peony-garden',
  issueStage: 'PEAK',
  horizonDays: 5,
  recentVelocity: 0.125,
  weather: { gdd5:105.635417,gdd10:75.635417,freezeHours:0,precipMm:24.16,maxGustKmh:60.1,hotHours27:16 },
});
assert.equal(oldPeak.pointStage, 'FADING');
assert.equal(oldPeak.stageHigh, 'DONE', 'point estimate may be FADING while the calibrated uncertainty tail includes DONE');

const decision = buildBloomDecision({
  destination: getBloomDestination('traverse-city-cherries'),
  observation: {
    stage: 'BUILDING',
    observedAt: '2026-05-12T12:00:00-04:00',
    displayPotential: DISPLAY_POTENTIAL.NORMAL,
    source: { name: 'MSU Extension', url: 'https://example.com/msu' },
  },
  forecastWindows: [rapidCherry],
  now: new Date('2026-05-12T15:00:00-04:00'),
});
assert.equal(decision.forecast[0].stageHigh, 'FADING', 'decision engine must not clamp an explicitly calibrated durability tail back to PEAK');
assert.equal(decision.decision, 'WAIT');

const summerWeather = {
  windows: [
    { horizonDays: 3, gdd5: 50, gdd10: 25, freezeHours: 0, precipMm: 5, maxGustKmh: 30, hotHours27: 8 },
    { horizonDays: 5, gdd5: 80, gdd10: 45, freezeHours: 0, precipMm: 8, maxGustKmh: 35, hotHours27: 16 },
    { horizonDays: 7, gdd5: 110, gdd10: 70, freezeHours: 0, precipMm: 10, maxGustKmh: 40, hotHours27: 24 },
  ],
};
const summerObservation = { stage: 'BUILDING', observedAt: '2026-07-30T12:00:00-04:00' };
for (const id of ['milan-lavender', 'frankenmuth-sunflowers', 'gull-meadow-sunflowers', 'blakes-sunflowers']) {
  assert.deepEqual(
    forecastBloomWindows({ destination: getBloomDestination(id), observation: summerObservation, weatherSnapshot: summerWeather }),
    [],
    `${id} must remain current-observation-only until its forecast family is validated`
  );
  assert.throws(() => predictBloomWindowFromFeatures({
    destinationId: id,
    issueStage: 'BUILDING',
    horizonDays: 3,
    recentVelocity: 0,
    weather: summerWeather.windows[0],
  }), /outside calibrated bloom model destination families/);
}

assert.throws(() => predictBloomWindowFromFeatures({
  destinationId: 'um-peony-garden', issueStage: 'BUILDING', horizonDays: 5, recentVelocity: 0,
  weather: { gdd5: 20 },
}), /Missing calibrated weather feature/);

console.log('Bloom calibrated-model invariants: PASS');
