import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import { summarizeVisitMonths, isAutumnMumsPlanningView } from '../lib/bloom/visit-months.mjs';

const all = summarizeVisitMonths(BLOOM_DESTINATIONS);
assert.equal(all.length, 8, 'March through October must remain available');
assert.deepEqual(all.map(month => month.label), ['March','April','May','June','July','August','September','October']);
assert.ok(all.some(month => month.value === '5' && month.count > 0), 'May must expose real seasonal destinations');
assert.ok(all.every(month => Number.isInteger(month.count) && month.count >= 0 && month.count <= BLOOM_DESTINATIONS.length),
  'the rail counts registered destinations, not estimated bloom prevalence');

const meijer = BLOOM_DESTINATIONS.filter(entry => entry.id === 'meijer-gardens-cherries');
assert.equal(summarizeVisitMonths(meijer).find(month => month.value === '10').count, 1,
  'all-flowers October includes the separate operator-advertised chrysanthemum event');
assert.equal(summarizeVisitMonths(meijer, { flowerFilter:'orchard' }).find(month => month.value === '10').count, 0,
  'the October chrysanthemum event is not a cherry stage');
assert.equal(summarizeVisitMonths(meijer, { flowerFilter:'mum' }).find(month => month.value === '10').count, 1,
  'October mums filter retains its one appropriate destination');
assert.equal(summarizeVisitMonths(meijer, { flowerFilter:'mum' }).find(month => month.value === '5').count, 0,
  'spring cherry event is never reused for mum counts');
assert.equal(isAutumnMumsPlanningView('meijer-gardens-cherries','10','all'), true);

const half = BLOOM_DESTINATIONS.filter(entry => entry.id !== 'meijer-gardens-cherries');
const filtered = summarizeVisitMonths(half);
const original = summarizeVisitMonths(BLOOM_DESTINATIONS);
assert.deepEqual(summarizeVisitMonths(BLOOM_DESTINATIONS), original, 'October -> May -> October reads stable registry values');
assert.equal(filtered.find(month => month.value==='10').count,
  original.find(month => month.value==='10').count - 1, 'October count changes with the selected destinations');

const page = readFileSync(new URL('../pages/bloom-tracker.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/bloom-visit-guide.css', import.meta.url), 'utf8');
assert.match(page, /summarizeVisitMonths\(candidateWaveDestinations, \{ flowerFilter \}\)/);
assert.match(page, /onClick=\{\(\)=>setPlanningMonth\(planningMonth===value\?'all':value\)\}/,
  'clicking the active month resets the selector and visible destinations');
assert.match(page, /aria-pressed=\{planningMonth===value\}/, 'keyboard users need a visible selected state');
assert.match(page, /role="status" aria-live="polite"/, 'month choice must announce an interpretable result');
assert.match(page, /visibleDestinations = destinations\.filter/, 'map and cards share the chosen month state');
assert.ok(page.includes('id={`destination-${entry.id}`}'), 'month selection must have stable destination card anchors');
assert.ok(page.includes('href={`#destination-${entry.id}`}'), 'selected month must lead to named, matching destinations');
assert.ok(page.includes('monthExamples = visibleDestinations.slice(0, 3)'), 'named suggestions must derive from the filtered place list');
assert.match(page, /id="bloom-planning-month" value=\{planningMonth\}/, 'native month picker must stay synchronized');
assert.match(css, /\.bloom-wave-track\{[^}]*overflow-x:auto/, 'phone scroll must be contained within timeline');
assert.match(css, /\.bloom-wave-track button:focus-visible/, 'controls need obvious keyboard focus');
assert.match(css, /\.bloom-wave-read>a:focus-visible/, 'journey CTA needs obvious keyboard focus');

console.log('Bloom Experience Investment: month window counts, October separation and selected state PASS');
