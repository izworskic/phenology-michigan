import assert from 'node:assert/strict';
import { getBloomSources } from '../lib/bloom/source-registry.mjs';
import {
  classifyBloomText,
  fetchAutomaticObservation,
  normalizeVerifiedOverride,
  parseDatedTrackerObservation,
  parseDatedArticleObservation,
  selectBestObservation,
} from '../lib/bloom/observation-ingestion.mjs';

const peonySource = getBloomSources('um-peony-garden')[0];
const hollandSource = getBloomSources('holland-tulips')[0];
const msuSource = getBloomSources('traverse-city-cherries')[0];

const peonyHtml = `
  <h2>Peony Season 2026</h2>
  <h2>June 16, 2026</h2><p>What was recently a sea of color has shifted into green foliage as the plants begin storing energy for next spring's display.</p>
  <h2>June 10, 2026</h2><p>The front of the garden is now largely past bloom, but visitors can still find some flowers in the back half.</p>
  <h2>May 30, 2026</h2><p>We are at peak bloom!</p>
`;
const peonyParsed = parseDatedTrackerObservation({
  destinationId: 'um-peony-garden',
  source: peonySource,
  html: peonyHtml,
  now: new Date('2026-09-30T12:00:00-04:00'),
});
assert.equal(peonyParsed.diagnostic, 'ok');
assert.equal(peonyParsed.observation.stage, 'DONE');
assert.match(peonyParsed.observation.observedAt, /^2026-06-16/);

assert.equal(classifyBloomText('um_peony', 'We are at about 20% bloom, with conditions expected to progress rapidly.'), 'BUILDING');
assert.equal(classifyBloomText('um_peony', 'At least half the garden is now in bloom and we are rapidly nearing peak bloom.'), 'NEAR_PEAK');
assert.equal(classifyBloomText('msu_tart_cherry', 'Montmorency are at early white bud.'), 'EMERGING');
assert.equal(classifyBloomText('msu_tart_cherry', 'Montmorency was just past full bloom and today we are at full petal fall.'), 'FADING');

const articleParsed = parseDatedArticleObservation({
  destinationId: 'traverse-city-cherries',
  source: { ...msuSource, url: 'https://example.com/msu-weekly' },
  observedAt: '2026-05-19T12:00:00-04:00',
  text: 'Montmorency was just past full bloom and today we are at full petal fall.',
});
assert.equal(articleParsed.observation.stage, 'FADING');

const hollandAuto = await fetchAutomaticObservation('holland-tulips', hollandSource, async () => {
  throw new Error('camera/manual source should never be fetched as an autonomous state parser');
});
assert.equal(hollandAuto.observation, null);
assert.equal(hollandAuto.diagnostic, 'source_requires_locator_or_verified_override');

const activeOverride = normalizeVerifiedOverride({
  destinationId: 'holland-tulips',
  stage: 'PEAK',
  observedAt: '2026-05-05T10:00:00-04:00',
  validThrough: '2026-05-07T23:59:00-04:00',
  source: { name: 'City of Holland verified camera review', url: 'https://www.cityofholland.com/1022/Tulip-Tracker', authority: 100 },
  evidenceText: 'Verified camera review shows widespread city display at peak quality.',
}, new Date('2026-05-06T12:00:00-04:00'));
assert.equal(activeOverride.stage, 'PEAK');

const expiredOverride = normalizeVerifiedOverride({
  destinationId: 'holland-tulips',
  stage: 'PEAK',
  observedAt: '2026-05-05T10:00:00-04:00',
  validThrough: '2026-05-07T23:59:00-04:00',
  source: { name: 'City of Holland verified camera review', url: 'https://www.cityofholland.com/1022/Tulip-Tracker' },
}, new Date('2026-09-30T12:00:00-04:00'));
assert.equal(expiredOverride, null, 'expired human verification must never masquerade as current');

const picked = selectBestObservation('holland-tulips', [
  { ...activeOverride, source: { ...activeOverride.source, authority: 80 }, observedAt: '2026-05-06T08:00:00-04:00' },
  activeOverride,
], new Date('2026-05-06T12:00:00-04:00'));
assert.equal(picked.source.authority, 100, 'authority should outrank a slightly fresher lower-authority candidate');

console.log('Bloom observation-ingestion invariants: PASS');
