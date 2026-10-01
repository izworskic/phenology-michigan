import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getBloomTrackerFixture } from '../lib/bloom/tracker-fixtures.mjs';
import { decisionCounts, evidenceStrength, goBeforeWindow, humanDecisionLabel } from '../lib/bloom/tracker-product.mjs';

const strong = getBloomTrackerFixture('strong');
const weather = getBloomTrackerFixture('weather');
const wave = getBloomTrackerFixture('wave');
const weak = getBloomTrackerFixture('weak');

assert.ok(strong && weather && wave && weak, 'all four UX fixtures must exist');

const strongCounts = decisionCounts(strong.destinations);
assert.equal(strongCounts.GO, 2, 'strong weekend should expose two immediate trip options');
assert.equal(strongCounts.WAIT, 2, 'strong weekend should preserve wait states');
assert.equal(strongCounts.LIMITED, 1, 'strong weekend should expose the fading option as limited');
assert.equal(humanDecisionLabel('GO'), 'Worth the drive');
assert.equal(humanDecisionLabel('WAIT'), 'Wait a few days');

const hollandWeather = weather.destinations.find((d) => d.id === 'holland-tulips');
assert.equal(hollandWeather.decision.decision, 'GO_BEFORE');
assert.equal(goBeforeWindow(hollandWeather.decision, weather.generatedAt), 'Go Saturday — risk rises Sunday', 'weather deterioration must resolve into an actionable weekend window');

const traverseWave = wave.destinations.find((d) => d.id === 'traverse-city-cherries');
assert.deepEqual(
  traverseWave.zoneStatus.map((z) => z.stage),
  ['FADING', 'PEAK', 'NEAR_PEAK', 'BUILDING', 'EMERGING'],
  'Traverse City fixture must preserve a visible south-to-north bloom wave'
);

const weakCounts = decisionCounts(weak.destinations);
assert.equal(weakCounts.UNKNOWN, 3, 'weak-data fixture must keep three destinations uncertain');
weak.destinations.filter((d) => d.decision.decision === 'UNKNOWN').forEach((entry) => {
  assert.equal(evidenceStrength(entry.decision), 'weak', 'stale UNKNOWN evidence must look weak');
});

const page = await fs.readFile(new URL('../pages/bloom-tracker.js', import.meta.url), 'utf8');
assert.ok(!page.includes('geomapsuite.com'), 'tracker must not depend on the broken hot-linked Michigan silhouette');
assert.ok(!page.includes('selected-strip'), 'tracker must not reintroduce the redundant map-selection strip');
assert.ok(!page.includes('tile.openstreetmap.org'), 'tracker map must not depend on external raster tiles');
assert.ok(!page.includes('MAPLIBRE_JS'), 'tracker map must not depend on an external mapping runtime');
assert.ok(page.includes('/maps/great-lakes-context.geojson'), 'map must use committed geographic geometry');
assert.ok(page.includes('geometryPaths'), 'map must render real geographic polygons');
assert.ok(page.includes('MapSelectedPanel'), 'one marker tap must surface useful in-map detail');
assert.ok(page.includes('wavePath'), 'map must support geographic bloom progression when zone evidence exists');
assert.ok(page.includes('What is worth the drive this weekend?'), 'first screen must remain decision-first');

const mapGeometry = JSON.parse(await fs.readFile(new URL('../public/maps/great-lakes-context.geojson', import.meta.url), 'utf8'));
const stateNames = new Set((mapGeometry.features || []).map((feature) => feature?.properties?.name));
for (const state of ['Michigan', 'Wisconsin', 'Indiana', 'Ohio']) {
  assert.ok(stateNames.has(state), `map geography must include ${state}`);
}

const mapCss = await fs.readFile(new URL('../public/bloom-tracker-redesign.css', import.meta.url), 'utf8');
assert.ok(mapCss.includes("url('/maps/great-lakes-water.svg')"), 'state jurisdiction polygons must be visually clipped back to the Great Lakes shoreline');
const shorelineSvg = await fs.readFile(new URL('../public/maps/great-lakes-water.svg', import.meta.url), 'utf8');
assert.ok(shorelineSvg.includes('<svg') && shorelineSvg.includes('<path'), 'shoreline overlay must be a committed self-contained SVG');
assert.ok(shorelineSvg.length > 3000, 'shoreline overlay must contain meaningful Great Lakes geometry');

console.log('Bloom tracker product checks passed.');
