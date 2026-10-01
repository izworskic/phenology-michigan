import assert from 'node:assert/strict';
import { classifyBloomText, fetchAutomaticObservation } from '../lib/bloom/observation-ingestion.mjs';
import { locateLatestMsuNorthwestFruitUpdate, parseMsuFruitNewsIndex } from '../lib/bloom/msu-locator.mjs';
import { mergeBloomOverrides, withoutBloomOverride } from '../lib/bloom/operator-store.mjs';
import { getBloomSources } from '../lib/bloom/source-registry.mjs';

const indexFixture = `
<html><body>
  <a href="/news/southwest-michigan-fruit-update-may-20-2026">Southwest Michigan fruit update – May 20, 2026</a>
  <a href="/news/northwest-michigan-fruit-update-may-19-2026"><span>Northwest Michigan fruit update – May 19, 2026</span></a>
  <a href="/news/northwest-michigan-fruit-update-may-12-2026">Northwest Michigan fruit update - May 12, 2026</a>
</body></html>`;
const parsed = parseMsuFruitNewsIndex(indexFixture);
assert.equal(parsed.length, 2);
assert.match(parsed[0].url, /northwest-michigan-fruit-update-may-19-2026$/);
assert.match(parsed[0].publishedAt, /^2026-05-19/);

const noMatchPage = '<html><body><a href="/news/apple-update">Apple update</a></body></html>';
const locatorFetch = async (url) => {
  const page = new URL(url).searchParams.get('page');
  return { ok: true, status: 200, text: async () => page === '1' ? noMatchPage : indexFixture };
};
const located = await locateLatestMsuNorthwestFruitUpdate({
  fetchImpl: locatorFetch,
  now: new Date('2026-05-20T12:00:00-04:00'),
  maxPages: 4,
});
assert.equal(located.ok, true);
assert.equal(located.pagesScanned, 2);
assert.match(located.article.url, /may-19-2026$/);

const msuSource = getBloomSources('traverse-city-cherries')[0];
const articleHtml = `
<html><body><h1>Northwest Michigan fruit update – May 19, 2026</h1>
<h3>Crop report</h3><p>Last week we were at early white bud in Montmorency. On May 18 we were just past full bloom and starting first petal fall. With today's rain and wind, Montmorency are at full petal fall today.</p></body></html>`;
const fullFetch = async (url) => {
  const value = String(url);
  if (value.includes('/fruit/news?')) {
    const page = new URL(value).searchParams.get('page');
    return { ok: true, status: 200, text: async () => page === '1' ? noMatchPage : indexFixture };
  }
  if (value.includes('northwest-michigan-fruit-update-may-19-2026')) {
    return { ok: true, status: 200, text: async () => articleHtml };
  }
  throw new Error(`unexpected URL ${value}`);
};
const auto = await fetchAutomaticObservation(
  'traverse-city-cherries',
  msuSource,
  fullFetch,
  new Date('2026-05-20T12:00:00-04:00'),
);
assert.equal(auto.diagnostic, 'ok');
assert.equal(auto.observation.stage, 'FADING');
assert.match(auto.observation.source.url, /may-19-2026$/);
assert.equal(auto.locator.pagesScanned, 2);

assert.equal(
  classifyBloomText('msu_tart_cherry', 'Montmorency tart cherries are at 11 millimeters (mm). Balaton fruit is at 10 mm.'),
  'DONE',
  'fruit sizing is positive evidence that the bloom display is over',
);
assert.equal(
  classifyBloomText('msu_tart_cherry', 'Montmorency tart cherries are at green tip.'),
  'EMERGING',
);

const now = new Date('2026-05-06T12:00:00-04:00');
const existing = {
  schemaVersion: 1,
  observations: [
    {
      destinationId: 'holland-tulips', zone: 'Centennial Park', stage: 'BUILDING',
      observedAt: '2026-05-05T08:00:00-04:00', validThrough: '2026-05-07T23:59:00-04:00',
    },
    {
      destinationId: 'holland-tulips', zone: 'Window on the Waterfront', stage: 'PEAK',
      observedAt: '2026-05-05T09:00:00-04:00', validThrough: '2026-05-07T23:59:00-04:00',
    },
    {
      destinationId: 'mackinac-lilacs', zone: null, stage: 'BUILDING',
      observedAt: '2026-04-01T09:00:00-04:00', validThrough: '2026-04-03T23:59:00-04:00',
    },
  ],
};
const replacement = {
  destinationId: 'holland-tulips', zone: 'Centennial Park', stage: 'PEAK',
  observedAt: '2026-05-06T10:00:00-04:00', validThrough: '2026-05-08T23:59:00-04:00',
};
const merged = mergeBloomOverrides(existing, replacement, now);
assert.equal(merged.observations.length, 2, 'expired records are pruned and matching destination/zone is replaced');
assert.equal(merged.observations.find((x) => x.zone === 'Centennial Park').stage, 'PEAK');
assert.equal(merged.observations.find((x) => x.zone === 'Window on the Waterfront').stage, 'PEAK');

const removed = withoutBloomOverride(merged, { destinationId: 'holland-tulips', zone: 'Centennial Park' }, now);
assert.equal(removed.value.observations.length, 1);
assert.equal(removed.value.observations[0].zone, 'Window on the Waterfront');

console.log('Bloom source locator + operator invariants: PASS');
