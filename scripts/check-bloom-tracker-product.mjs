import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import { BLOOM_EXPERIENCES } from '../lib/bloom/experience-layer.mjs';
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

for (const destination of BLOOM_DESTINATIONS) {
  const experience = BLOOM_EXPERIENCES[destination.id];
  assert.ok(experience, `${destination.id} must retain destination experience context`);
  assert.ok(experience.headline && experience.whatYouWillSee && experience.bestExperience && experience.lookFor, `${destination.id} must explain the actual visitor experience`);
  assert.ok(experience.experienceSource?.url?.startsWith('https://'), `${destination.id} must cite a local visitor source`);
  assert.ok(experience.photos.length >= 1 && experience.photos.length <= 2, `${destination.id} must use a restrained one-or-two-photo set`);
  for (const photo of experience.photos) {
    assert.ok(['exact-bloom', 'flower-reference', 'location-setting'].includes(photo.kind), `${destination.id} photo must declare its fit`);
    assert.ok(photo.imageUrl.startsWith('https://commons.wikimedia.org/wiki/Special:Redirect/file/'), `${destination.id} photo must use the vetted Commons path`);
    assert.ok(photo.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'), `${destination.id} photo must retain its source page`);
    assert.ok(photo.creator && photo.license && photo.alt && photo.caption, `${destination.id} photos must retain attribution and accessible context`);
    assert.match(photo.license, /^(CC0|Public Domain|CC BY(?:-SA)?)/, `${destination.id} photo license must allow reuse`);
    assert.ok(!/\b(?:NC|ND)\b/.test(photo.license), `${destination.id} photo must not use NC or ND licensing`);
  }
}

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

assert.ok(page.includes('function OpportunityCard'), 'experience must be integrated into each ranked destination');
assert.ok(page.includes('ExperienceThumbnail'), 'ranked destinations must carry visual context');
assert.ok(page.includes('See the place + evidence'), 'richer experience and evidence must be optional expansion, not another page layer');
assert.ok(page.includes('File photo — not live'), 'expanded photos must clearly state that they are not current evidence');
assert.ok(page.includes('Photos help you picture the place. They are not used as current bloom evidence.'), 'photo truth rule must remain explicit');
assert.ok(page.includes('featured-photo'), 'the top recommendation should gain visual context without creating a separate hero section');
assert.ok(!page.includes('ExperienceSection'), 'do not reintroduce a separate duplicated experience section');
assert.ok(!page.includes('experience-grid'), 'do not reintroduce the swipeable card wall');
assert.ok(!page.includes('DestinationDetails'), 'do not repeat all destinations in a third destination-checker layer');
assert.ok(!page.includes('details-section'), 'destination evidence must live with the ranked destination itself');

const decisionIndex = page.indexOf('What is worth the drive this weekend?');
const rankingIndex = page.indexOf('Where should I go?');
const opportunityCardsIndex = page.indexOf('<OpportunityCard');
const mapIndex = page.indexOf('<MichiganBloomMap destinations={destinations} generatedAt={generatedAt} />');
assert.ok(decisionIndex >= 0 && rankingIndex > decisionIndex, 'rankings must follow the first-screen decision');
assert.ok(opportunityCardsIndex > rankingIndex, 'integrated visual experience must live inside the ranked list');
assert.ok(mapIndex > opportunityCardsIndex, 'map must follow the ranked decisions directly without an intervening duplicate product');

const mapGeometry = JSON.parse(await fs.readFile(new URL('../public/maps/great-lakes-context.geojson', import.meta.url), 'utf8'));
const stateNames = new Set((mapGeometry.features || []).map((feature) => feature?.properties?.name));
for (const state of ['Michigan', 'Wisconsin', 'Indiana', 'Ohio']) {
  assert.ok(stateNames.has(state), `map geography must include ${state}`);
}

const mapCss = await fs.readFile(new URL('../public/bloom-tracker-redesign.css', import.meta.url), 'utf8');
assert.ok(mapCss.includes("url('/maps/great-lakes-water.svg')"), 'state jurisdiction polygons must be visually clipped back to the Great Lakes shoreline');
assert.ok(mapCss.includes('Great Lakes shoreline: Natural Earth, public domain.'), 'map must visibly identify the shoreline geometry source');
const shorelineSvg = await fs.readFile(new URL('../public/maps/great-lakes-water.svg', import.meta.url), 'utf8');
assert.ok(shorelineSvg.includes('<svg') && shorelineSvg.includes('<path'), 'shoreline overlay must be a committed self-contained SVG');
assert.ok(shorelineSvg.includes('Natural Earth 1:50m lakes, public domain'), 'shoreline asset must document its source');
assert.ok(shorelineSvg.length > 3000, 'shoreline overlay must contain meaningful Great Lakes geometry');

console.log('Bloom tracker product checks passed.');
