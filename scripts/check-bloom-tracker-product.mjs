import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import { BLOOM_EXPERIENCES } from '../lib/bloom/experience-layer.mjs';
import { BLOOM_PLANNING_WINDOWS, BLOOM_SEASON_STATES, buildBloomSeasonContext } from '../lib/bloom/seasonal-context.mjs';
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
  const planning = BLOOM_PLANNING_WINDOWS[destination.id];
  assert.ok(experience, `${destination.id} must retain destination experience context`);
  assert.ok(experience.headline && experience.whatYouWillSee && experience.bestExperience && experience.lookFor, `${destination.id} must explain the actual visitor experience`);
  assert.ok(experience.experienceSource?.url?.startsWith('https://'), `${destination.id} must cite a local visitor source`);
  assert.ok(planning?.windowLabel && planning?.sourceUrl?.startsWith('https://'), `${destination.id} must have a sourced broad seasonal planning window`);
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

const october = buildBloomSeasonContext(strong.destinations, new Date('2026-10-01T12:00:00-04:00'));
assert.equal(october.phase, BLOOM_SEASON_STATES.OFF_SEASON, 'a banked May snapshot must never masquerade as current bloom in October');
assert.equal(october.map.mode, 'SEASONAL_SEQUENCE', 'off season must convert the map into a seasonal interpretation surface');
assert.match(october.copy.title, /flowers are quiet/i, 'off-season copy must plainly say the bloom season is quiet');
assert.deepEqual(
  october.items.map((item) => item.destinationId),
  ['meijer-gardens-cherries', 'holland-tulips', 'traverse-city-cherries', 'um-peony-garden', 'mackinac-lilacs'],
  'off-season presentation must follow the typical spring sequence rather than stale live ranking'
);

const may = buildBloomSeasonContext(strong.destinations, new Date(strong.generatedAt));
assert.equal(may.phase, BLOOM_SEASON_STATES.ACTIVE, 'fresh May GO evidence must put the statewide product in active bloom mode');
assert.equal(may.map.mode, 'LIVE_BLOOM', 'active bloom must restore the live interpretive map');

const page = await fs.readFile(new URL('../pages/bloom-tracker.js', import.meta.url), 'utf8');
assert.ok(!page.includes('geomapsuite.com'), 'tracker must not depend on the broken hot-linked Michigan silhouette');
assert.ok(!page.includes('selected-strip'), 'tracker must not reintroduce the redundant map-selection strip');
assert.ok(!page.includes('tile.openstreetmap.org'), 'tracker map must not depend on external raster tiles');
assert.ok(!page.includes('MAPLIBRE_JS'), 'tracker map must not depend on an external mapping runtime');
assert.ok(page.includes('/maps/great-lakes-context.geojson'), 'map must use committed geographic geometry');
assert.ok(page.includes('geometryPaths'), 'map must render real geographic polygons');
assert.ok(page.includes('MapSelectedPanel'), 'one marker tap must surface useful in-map detail');
assert.ok(page.includes('waveEntry.zoneStatus.map'), 'map must support geographic bloom progression with geolocated zone points when evidence exists');
assert.ok(page.includes('What is worth the drive, and when?'), 'first screen must work in both live and off-season modes');
assert.ok(page.includes('<SeasonBanner seasonContext={seasonContext} />'), 'the page must carry an explicit year-round season statement');
assert.ok(page.includes('How spring moves across Michigan') || page.includes('seasonContext?.map?.title'), 'map title must be driven by seasonal interpretation');
assert.ok(page.includes('map-season-label'), 'off-season map must put time labels directly on the geography');
assert.ok(page.includes('Read the year across the map:'), 'off-season map must explain how to interpret the April-to-September flower season');

assert.ok(page.includes('function OpportunityCard'), 'experience must be integrated into each ranked destination');
assert.ok(page.includes('ExperienceThumbnail'), 'ranked destinations must carry visual context');
assert.ok(page.includes('See the place + evidence'), 'richer active-season experience and evidence must be optional expansion');
assert.ok(page.includes('Picture the place'), 'off-season expansion must focus on sense of place rather than stale evidence');
assert.ok(page.includes('File photo — not live'), 'expanded photos must clearly state that they are not current evidence');
assert.ok(page.includes('Photos help you picture the place. They are not used as current bloom evidence.'), 'photo truth rule must remain explicit');
assert.ok(page.includes('editorialItemFor'), 'JEV/Haiku editorial must feed the destination surface when available');
assert.ok(!page.includes('ExperienceSection'), 'do not reintroduce a separate duplicated experience section');
assert.ok(!page.includes('experience-grid'), 'do not reintroduce the swipeable card wall');
assert.ok(!page.includes('DestinationDetails'), 'do not repeat all destinations in a third destination-checker layer');
assert.ok(!page.includes('details-section'), 'destination evidence must live with the ranked destination itself');

// Search, social and entity guardrails. These are intentionally explicit so a UI rewrite cannot
// silently remove the signals that make the recurring spring URL easy to understand and share.
assert.ok(page.includes('<title>Michigan Bloom Tracker — What’s Blooming & When to Go</title>'), 'Bloom Tracker must keep a query-aligned evergreen search title');
assert.ok(page.includes('Track Michigan flower season from April into September:'), 'Bloom Tracker must keep a descriptive search snippet, not a keyword list');
assert.ok(page.includes('<link rel="canonical" href={PAGE_URL} />'), 'Bloom Tracker must retain its self canonical');

const app = await fs.readFile(new URL('../pages/_app.js', import.meta.url), 'utf8');
assert.ok(app.includes('index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'), 'Bloom Tracker must allow large image previews and normal indexing');
assert.ok(app.includes('https://phenology.chrisizworski.com/bloom-tracker-social.png'), 'Bloom Tracker must expose a dedicated preferred-image URL');
assert.ok(app.includes('property="og:site_name" content="Michigan Phenology"'), 'Open Graph must identify the site');
assert.ok(app.includes('property="og:image:width" content="1200"') && app.includes('property="og:image:height" content="630"'), 'Open Graph image dimensions must remain 1200x630');
assert.ok(app.includes('name="twitter:title"') && app.includes('name="twitter:description"') && app.includes('name="twitter:image"') && app.includes('name="twitter:image:alt"'), 'X/Twitter large-card metadata must stay complete');
assert.ok(app.includes('"@type": "WebApplication"') && app.includes('"@type": "WebPage"') && app.includes('"@type": "ImageObject"'), 'structured data must connect the app, page and preferred image');
assert.ok(app.includes('"@type": "BreadcrumbList"'), 'Bloom Tracker must expose breadcrumb structured data');
assert.ok(app.includes('https://chrisizworski.com/#person') && app.includes('https://chrisizworski.com/chris-izworski/'), 'Bloom Tracker must connect to the canonical Chris Izworski Person and profile');
assert.ok(app.includes('href="/bloom-tracker">Michigan Bloom Tracker — what’s blooming and when to go</a>'), 'Phenology home must provide a crawlable internal link to Bloom Tracker');

const socialImage = await fs.stat(new URL('../public/bloom-tracker-social.png', import.meta.url));
assert.ok(socialImage.size > 10_000, 'preferred social image must be a real nontrivial image asset');
const sitemap = await fs.readFile(new URL('../pages/sitemap.xml.js', import.meta.url), 'utf8');
assert.ok(sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'), 'sitemap must declare the image namespace');
assert.ok(sitemap.includes('<image:loc>${SITE}/bloom-tracker-social.png</image:loc>'), 'Bloom Tracker sitemap entry must expose the preferred image');

const opportunityCardsIndex = page.indexOf('<OpportunityCard');
const mapIndex = page.indexOf('<MichiganBloomMap');
assert.ok(opportunityCardsIndex >= 0 && mapIndex > opportunityCardsIndex, 'map must follow the integrated destination surface directly');

const editorial = await fs.readFile(new URL('../lib/bloom/editorial.mjs', import.meta.url), 'utf8');
assert.ok(editorial.includes('claude-haiku-4-5-20251001'), 'Bloom editorial must use the established low-cost Haiku writer by default');
assert.ok(editorial.includes('bloomJevDecide'), 'JEV must assign and review editorial jobs');
assert.ok(editorial.includes('Typical planning windows are context only and do not prove current bloom.'), 'sealed editorial evidence must preserve the calendar-vs-observation truth rule');
assert.ok(editorial.includes('evidenceHash'), 'unchanged evidence must be fingerprinted for editorial reuse');

const pipeline = await fs.readFile(new URL('../lib/bloom/live-pipeline.mjs', import.meta.url), 'utf8');
assert.ok(pipeline.includes('previousLatestResult'), 'live cycle must read the prior persisted editorial so unchanged evidence can be reused');
assert.ok(pipeline.includes('buildBloomEditorial'), 'editorial enrichment must run after deterministic bloom decisions');

const mapGeometry = JSON.parse(await fs.readFile(new URL('../public/maps/great-lakes-context.geojson', import.meta.url), 'utf8'));
const stateNames = new Set((mapGeometry.features || []).map((feature) => feature?.properties?.name));
for (const state of ['Michigan', 'Wisconsin', 'Indiana', 'Ohio']) assert.ok(stateNames.has(state), `map geography must include ${state}`);

const mapCss = await fs.readFile(new URL('../public/bloom-tracker-redesign.css', import.meta.url), 'utf8');
assert.ok(mapCss.includes("url('/maps/great-lakes-water.svg')"), 'state jurisdiction polygons must be visually clipped back to the Great Lakes shoreline');
assert.ok(mapCss.includes('Great Lakes shoreline: Natural Earth, public domain.'), 'map must visibly identify the shoreline geometry source');
const shorelineSvg = await fs.readFile(new URL('../public/maps/great-lakes-water.svg', import.meta.url), 'utf8');
assert.ok(shorelineSvg.includes('<svg') && shorelineSvg.includes('<path'), 'shoreline overlay must be a committed self-contained SVG');
assert.ok(shorelineSvg.includes('Natural Earth 1:50m lakes, public domain'), 'shoreline asset must document its source');
assert.ok(shorelineSvg.length > 3000, 'shoreline overlay must contain meaningful Great Lakes geometry');

console.log('Bloom tracker product checks passed.');
