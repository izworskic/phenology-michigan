import assert from 'node:assert/strict';
import {
  extractNorthwestMichiganFruitUpdateLinks,
  locateLatestNorthwestMichiganFruitUpdate,
  parseNorthwestMichiganFruitUpdateDate,
} from '../lib/bloom/msu-locator.mjs';
import { getBloomSources } from '../lib/bloom/source-registry.mjs';
import { fetchAutomaticObservation, normalizeVerifiedOverride } from '../lib/bloom/observation-ingestion.mjs';
import { upsertBloomOverride, deleteBloomOverride } from '../lib/bloom/override-store.mjs';

const parsedDate = parseNorthwestMichiganFruitUpdateDate('https://msu-prod.dotcmscloud.com/news/northwest-michigan-fruit-update-may-19-2026');
assert.equal(parsedDate.toISOString(), '2026-05-19T16:00:00.000Z');
assert.equal(parseNorthwestMichiganFruitUpdateDate('https://example.com/not-an-update'), null);

const links = extractNorthwestMichiganFruitUpdateLinks(`
  <a href="/news/northwest-michigan-fruit-update-may-12-2026">May 12</a>
  <a href="https://msu-prod.dotcmscloud.com/news/northwest-michigan-fruit-update-may-19-2026">May 19</a>
  <a href="/news/northwest-michigan-fruit-update-may-19-2026">duplicate</a>
`);
assert.equal(links.length, 2);
assert.match(links[0].url, /may-19-2026/);

const listingFetch = async (url) => {
  const href = String(url);
  if (href.includes('/fruit/news?')) {
    const page = new URL(href).searchParams.get('page');
    if (page === '1') return { ok: true, status: 200, async text() { return '<a href="/news/northwest-michigan-fruit-update-may-12-2026">May 12</a>'; } };
    if (page === '2') return { ok: true, status: 200, async text() { return '<a href="/news/northwest-michigan-fruit-update-may-19-2026">May 19</a>'; } };
  }
  throw new Error(`unexpected locator fetch ${href}`);
};
const located = await locateLatestNorthwestMichiganFruitUpdate({
  now: new Date('2026-05-20T12:00:00-04:00'),
  fetchImpl: listingFetch,
  maxPages: 3,
});
assert.equal(located.ok, true);
assert.match(located.article.url, /may-19-2026/);

const msuSource = getBloomSources('traverse-city-cherries')[0];
const fullFetch = async (url) => {
  const href = String(url);
  if (href.includes('/fruit/news?')) {
    return { ok: true, status: 200, async text() { return '<a href="/news/northwest-michigan-fruit-update-may-19-2026">May 19</a>'; } };
  }
  if (href.includes('/news/northwest-michigan-fruit-update-may-19-2026')) {
    return { ok: true, status: 200, async text() { return '<p>Montmorency were just past full bloom yesterday and today are at full petal fall after rain and wind.</p>'; } };
  }
  throw new Error(`unexpected article fetch ${href}`);
};
const auto = await fetchAutomaticObservation(
  'traverse-city-cherries',
  msuSource,
  fullFetch,
  new Date('2026-05-20T12:00:00-04:00'),
);
assert.equal(auto.diagnostic, 'ok');
assert.equal(auto.observation.stage, 'FADING');
assert.match(auto.observation.source.url, /may-19-2026/);

const verified = normalizeVerifiedOverride({
  id: 'holland-tulips:all',
  destinationId: 'holland-tulips',
  stage: 'PEAK',
  observedAt: '2026-05-05T12:00:00-04:00',
  validThrough: '2026-05-07T12:00:00-04:00',
  displayPotential: 'normal',
  source: {
    id: 'verified:holland-city-tulip-tracker',
    name: 'City of Holland Tulip Tracker — verified observation',
    url: 'https://www.cityofholland.com/1022/Tulip-Tracker',
    authority: 100,
  },
  evidenceText: 'Centennial Park camera shows most beds fully open.',
}, new Date('2026-05-05T13:00:00-04:00'));
assert.equal(verified.id, 'holland-tulips:all');

let document = { schemaVersion: 1, observations: [] };
let shaNumber = 1;
const storeFetch = async (_url, options = {}) => {
  if (!options.method || options.method === 'GET') {
    return {
      ok: true,
      status: 200,
      async json() {
        return { sha: `sha-${shaNumber}`, content: Buffer.from(JSON.stringify(document)).toString('base64') };
      },
    };
  }
  const body = JSON.parse(options.body);
  document = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
  shaNumber += 1;
  return { ok: true, status: 200, async text() { return ''; } };
};
const saved = await upsertBloomOverride(verified, { token: 'test-token', fetchImpl: storeFetch });
assert.equal(saved.ok, true);
assert.equal(document.observations.length, 1);
assert.equal(document.observations[0].stage, 'PEAK');
const replaced = await upsertBloomOverride({ ...verified, stage: 'FADING' }, { token: 'test-token', fetchImpl: storeFetch });
assert.equal(replaced.ok, true);
assert.equal(document.observations.length, 1, 'same destination/zone override should replace, not append');
assert.equal(document.observations[0].stage, 'FADING');
const deleted = await deleteBloomOverride('holland-tulips:all', { token: 'test-token', fetchImpl: storeFetch });
assert.equal(deleted.ok, true);
assert.equal(document.observations.length, 0);

console.log('Bloom MSU locator + verified-operator invariants: PASS');
