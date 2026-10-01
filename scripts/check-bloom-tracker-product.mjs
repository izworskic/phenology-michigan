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
  assert.ok(experience, `${destination.id} must have an experience-layer entry`);
  assert.ok(experience.headline && experience.whatYouWillSee && experience.bestExperience && experience.lookFor, `${destination.id} must explain the visitor experience`);
  assert.ok(experience.experienceSource?.url?.startsWith('https://'), `${destination.id} must cite a local experience source`);
  assert.ok(experience.photos.length >= 1 && experience.photos.length <= 2, `${destination.id} must use one or two restrained editorial photos`);
  for (const photo of experience.photos) {
    assert.ok(['exact-bloom', 'flower-reference', 'location-setting'].includes(photo.kind), `${destination.id} photo must declare its evidentiary fit`);
    assert.ok(photo.imageUrl.startsWith('https://commons.wikimedia.org/wiki/Special:Redirect/file/'), `${destination.id} photos must use the vetted Commons source path`);
    assert.ok(photo.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'), `${destination.id} photos must retain a source page`);
    assert.ok(photo.creator && photo.license && photo.alt && photo.caption, `${destination.id} photos must retain attribution and accessible context`);
    assert.match(photo.license, /^(CC0|Public Domain|CC BY(?:-SA)?)/, `${destination.id} photo license must allow reuse`);
    assert.ok(!/\b(?:NC|ND)\b/.test(photo.license), `${destination.id} photo must not use noncommercial or no-derivatives restrictions`);
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
assert.ok(page.includes('File photo — not live'), 'every editorial image surface must make the file-photo truth rule visible');
assert.ok(page.includes('reference/file photos, not current-condition evidence'), 'experience imagery must be explicitly separated from live bloom evidence');
assert.ok(page.includes('<ExperienceSection destinations={destinations} />'), 'experience layer must render on the public page');

const decisionIndex = page.indexOf('What is worth the drive this weekend?');
const rankingIndex = page.indexOf('Where should I go?');
const experienceIndex = page.indexOf('<ExperienceSection destinations={destinations} />');
const mapIndex = page.indexOf('<MichiganBloomMap destinations={destinations} generatedAt={generatedAt} />');
assert.ok(decisionIndex >= 0 && rankingIndex > decisionIndex, 'ranking must follow the first-screen decision');
assert.ok(experienceIndex > rankingIndex, 'experience must not displace the ranked decision layer');
assert.ok(mapIndex > experienceIndex, 'experience should bridge decision proof into geographic exploration');

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

const experienceCss = await fs.readFile(new URL('../public/bloom-tracker-experience.css', import.meta.url), 'utf8');
assert.ok(experienceCss.includes('.experience-grid'), 'experience layer must have a mobile comparison surface');
assert.ok(experienceCss.includes('scroll-snap-type:x mandatory'), 'mobile experience cards must be swipeable without creating a tall travel directory');
assert.ok(experienceCss.includes('.experience-file-label'), 'file-photo labeling must be styled and visible');

console.log('Bloom tracker product checks passed.');