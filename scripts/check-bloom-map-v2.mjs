import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const app = await fs.readFile(new URL('../pages/_app.js', import.meta.url), 'utf8');
const enhancer = await fs.readFile(new URL('../public/bloom-map-v2.js', import.meta.url), 'utf8');
const css = await fs.readFile(new URL('../public/bloom-map-v2.css', import.meta.url), 'utf8');
const season = await fs.readFile(new URL('../lib/bloom/seasonal-context.mjs', import.meta.url), 'utf8');
const originApi = await fs.readFile(new URL('../pages/api/bloom-origin.js', import.meta.url), 'utf8');

assert.ok(app.includes('leaflet@1.9.4'), 'Bloom Tracker must load Leaflet for the CARTO raster basemap');
assert.ok(app.includes('/bloom-map-v2.js'), 'Bloom Tracker must load the interpretive map enhancer');
assert.ok(app.includes('/bloom-map-v2.css'), 'Bloom Tracker must load the interpretive map styles');

assert.ok(enhancer.includes('basemaps.cartocdn.com/rastertiles/voyager'), 'map must use CARTO Voyager basemap tiles');
assert.ok(enhancer.includes('?key=${CARTO_KEY}'), 'CARTO basemap requests must carry the API key');
assert.ok(enhancer.includes('OpenStreetMap'), 'CARTO map must retain OpenStreetMap attribution');
assert.ok(enhancer.includes('CARTO'), 'CARTO map must retain CARTO attribution');
assert.ok(enhancer.includes('Michigan’s tracked flower season unfolds in stages, not one statewide peak.'), 'off-season map must frame the tracked network rather than claim all Michigan flowers');
assert.ok(enhancer.includes('is the strongest display we’re tracking right now.'), 'active map must explicitly limit its strongest-now claim to tracked displays');
assert.ok(!enhancer.includes('Michigan is brightest around'), 'active map must not make an unsupported statewide-brightness claim');
assert.ok(!enhancer.includes("badge: 'Bloom energy'"), 'user-facing map language must use bloom intensity rather than pseudo-scientific bloom energy');
assert.ok(enhancer.includes("badge: 'Bloom intensity'"), 'current map must use human bloom-intensity language');
assert.ok(enhancer.includes('relative strength around tracked displays and observed zones'), 'map must explicitly reject literal flower-coverage interpretation');

assert.ok(enhancer.includes("PEAK: { color: '#ff2f8b'"), 'peak bloom must use a vivid floral map color');
assert.ok(enhancer.includes('energyRadius: 70000, energy: 1'), 'peak must have the widest and strongest intensity surface');
assert.ok(enhancer.includes('energyRadius: 44000, energy: 0.56'), 'building bloom must use a smaller intermediate intensity surface');
assert.ok(enhancer.includes('energyRadius: 24000, energy: 0.22'), 'fading bloom must visibly contract and weaken');
assert.ok(enhancer.includes('DONE: {') && enhancer.includes('energyRadius: 0, energy: 0'), 'done bloom must return the basemap toward normal rather than retain a false glow');
assert.ok(enhancer.includes("if (record.state === 'UNKNOWN' || record.displayStage === 'UNKNOWN') return STAGE_STYLE.UNKNOWN"), 'stale/UNKNOWN evidence must suppress old observed-stage intensity');
assert.ok(enhancer.includes('confidenceFactor'), 'map intensity must account for decision/forecast confidence');
assert.ok(enhancer.includes('freshnessFactor'), 'map intensity must decay as observations age');
assert.ok(enhancer.includes('rangePenalty'), 'forecast-range uncertainty must visibly dim projected intensity');
assert.ok(enhancer.includes('energy: base.energy * factor'), 'evidence quality must scale rendered intensity, not only explanatory copy');
assert.ok(enhancer.includes('if (!hasBloomIntensity(record)) return;'), 'Traverse zone detail must not bypass a stale destination truth gate');
assert.ok(enhancer.includes('if (record.projected)'), 'future Traverse views must not reuse current zone observations as if they were zone forecasts');
assert.ok(enhancer.includes('const ENERGY_RINGS'), 'intensity must use layered rings rather than one hard-edged destination circle');
assert.ok(enhancer.includes('addBloomIntensitySurface'), 'live map must render the bloom-intensity surface');
assert.ok(enhancer.includes('addEnergyPoint'), 'intensity renderer must support independently scaled observation points');
assert.ok(enhancer.includes('addTraverseEnergyWave'), 'Traverse City must use zone-level bloom intensity when observations support it');
assert.ok(enhancer.includes("map.createPane('bloomEnergyPane')"), 'bloom intensity must live in a dedicated Leaflet pane');
assert.ok(enhancer.includes("mixBlendMode = 'multiply'"), 'bloom intensity must visually tint the CARTO basemap instead of replacing it');
assert.ok(enhancer.includes("window.setInterval(loadLatest, 5 * 60 * 1000)"), 'map must refresh live evidence while a visitor keeps the page open');
assert.ok(enhancer.includes('HAS_FIXTURE'), 'preview fixtures must remain deterministic and not be overwritten by production live data');

assert.ok(enhancer.includes("NOW: 'now'"), 'map must support a Now time view');
assert.ok(enhancer.includes("WEEKEND: 'weekend'"), 'map must support a This weekend view');
assert.ok(enhancer.includes("NEXT: 'next'"), 'map must support a What’s next view');
assert.ok(enhancer.includes('weekendWindow'), 'weekend view must select from calibrated forecast windows');
assert.ok(enhancer.includes('nextWindow'), 'what-is-next view must use the farthest available calibrated forecast window');
assert.ok(enhancer.includes('representativeStage'), 'future views must convert forecast ranges into a restrained representative visualization stage');
assert.ok(enhancer.includes('Future views use the existing calibrated bloom forecast; they are not new AI predictions.'), 'time controls must explain that they reuse the calibrated engine');

assert.ok(enhancer.includes('Leaving from city or ZIP'), 'map must offer an optional starting-place control');
assert.ok(enhancer.includes("FROM_ME: 'from-me'"), 'map must support a personalized origin view');
assert.ok(enhancer.includes('useBrowserLocation'), 'origin view must support explicit browser-location permission');
assert.ok(enhancer.includes("fetch(`/api/bloom-origin?q=${encodeURIComponent(trimmed)}`"), 'typed origins must use the controlled origin API');
assert.ok(enhancer.includes('milesBetween'), 'origin view must compute transparent map distance');
assert.ok(enhancer.includes('Road distance will be longer'), 'origin view must not pretend straight-line distance is a drive-time estimate');
assert.ok(enhancer.includes('google.com/maps/dir/?api=1'), 'origin view must link to exact external directions rather than fabricate routing');

assert.ok(enhancer.includes('Official live tracker + cameras'), 'Holland popup must surface its authoritative live tracker/cameras');
assert.ok(enhancer.includes('Official Peony Garden bloom update'), 'Peony popup must surface its authoritative current update');
assert.ok(enhancer.includes('MSU Northwest Michigan fruit updates'), 'Traverse popup must surface authoritative MSU updates');
assert.ok(enhancer.includes('officialSource(record)'), 'selected-map experience must prefer the live observation source when available');
assert.ok(enhancer.includes('bloom-trust-line'), 'selected-map experience must expose confidence/freshness or forecast trust context');

assert.ok(originApi.includes('https://api.zippopotam.us'), 'origin API must use a dedicated postal-place lookup service rather than a generic geocoder');
assert.ok(originApi.includes("Cache-Control', 'public, s-maxage=86400"), 'origin lookups must be cached');
assert.ok(originApi.includes("if (/^\\d{5}$/.test(value))"), 'origin API must accept US ZIP codes');
assert.ok(originApi.includes("return { type: 'city', city, state }"), 'origin API must accept city/state queries');
assert.ok(originApi.includes("return /^[A-Z]{2}$/.test(state) ? state : 'MI';"), 'city lookup must default to Michigan for this Michigan product');

assert.ok(css.includes('.page-shell>.season-route{display:none!important}'), 'redundant seasonal strip must not sit between the season statement and the map');
assert.ok(css.includes('.page-shell>.map-section{order:3}'), 'map must sit directly after the season statement and ahead of ranked destination content');
assert.ok(css.includes('@keyframes bloomPulse'), 'trip-worthy bloom must visibly pulse');
assert.ok(css.includes('.bloom-map-enhanced .map-frame'), 'enhanced map must have a dedicated responsive presentation surface');
assert.ok(css.includes('.bloom-map-tooltip span{display:none}'), 'mobile map labels must avoid timing-line clutter');
assert.ok(css.includes('.bloom-map-enhanced .map-frame:after{content:none!important;display:none!important;background:none!important}'), 'enhanced CARTO map must disable the legacy fixed Great Lakes pseudo overlay');
assert.ok(css.includes('.bloom-map-enhanced .map-frame>:not(.bloom-carto-map):not(.bloom-map-v2-legend){display:none!important}'), 'enhanced CARTO map must suppress every legacy frame child layer');
assert.ok(css.includes('.bloom-carto-map img,.bloom-carto-map .leaflet-tile{max-width:none!important;max-height:none!important}'), 'Leaflet tiles must be isolated from global responsive-image sizing');
assert.ok(css.includes('.bloom-carto-map .leaflet-tile{width:256px!important;height:256px!important}'), 'CARTO raster tiles must retain native Leaflet dimensions during pan and zoom');

assert.ok(!season.includes("shortLabel: 'APR'"), 'user-facing timing must not use APR shorthand');
assert.ok(!season.includes("shortLabel: 'LATE APR–MAY'"), 'user-facing timing must not use compressed month shorthand');
assert.ok(!season.includes("shortLabel: 'LATE MAY–JUN'"), 'user-facing timing must not use JUN shorthand');
assert.ok(season.includes("shortLabel: 'Early April'"), 'earliest seasonal timing must be written in plain language');
assert.ok(season.includes("shortLabel: 'Late April into May'"), 'cross-month timing must be written in plain language');
assert.ok(season.includes('How Michigan’s bloom season unfolds'), 'off-season map must have an interpretive title');
assert.ok(season.includes('Where is the strongest bloom right now?'), 'active map must frame the geographic decision directly');

console.log('Bloom CARTO decision-map checks passed.');