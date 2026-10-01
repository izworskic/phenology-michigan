import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const app = await fs.readFile(new URL('../pages/_app.js', import.meta.url), 'utf8');
const enhancer = await fs.readFile(new URL('../public/bloom-map-v2.js', import.meta.url), 'utf8');
const css = await fs.readFile(new URL('../public/bloom-map-v2.css', import.meta.url), 'utf8');
const season = await fs.readFile(new URL('../lib/bloom/seasonal-context.mjs', import.meta.url), 'utf8');

assert.ok(app.includes('leaflet@1.9.4'), 'Bloom Tracker must load Leaflet for the CARTO raster basemap');
assert.ok(app.includes('/bloom-map-v2.js'), 'Bloom Tracker must load the interpretive map enhancer');
assert.ok(app.includes('/bloom-map-v2.css'), 'Bloom Tracker must load the interpretive map styles');

assert.ok(enhancer.includes('basemaps.cartocdn.com/rastertiles/voyager'), 'map must use CARTO Voyager basemap tiles');
assert.ok(enhancer.includes('?key=${CARTO_KEY}'), 'CARTO basemap requests must carry the API key');
assert.ok(enhancer.includes('OpenStreetMap'), 'CARTO map must retain OpenStreetMap attribution');
assert.ok(enhancer.includes('CARTO'), 'CARTO map must retain CARTO attribution');
assert.ok(enhancer.includes('Michigan’s flower season is a relay, not one statewide peak.'), 'off-season map must explain the multi-wave seasonal insight');
assert.ok(enhancer.includes('Michigan is brightest around'), 'active map must surface current bloom intensity as a geographic insight');
assert.ok(enhancer.includes('relative intensity around tracked displays and observed zones'), 'map must explicitly reject literal flower-coverage interpretation');

assert.ok(enhancer.includes("PEAK: { color: '#ff2f8b'"), 'peak bloom must use a vivid floral map color');
assert.ok(enhancer.includes('energyRadius: 70000, energy: 1'), 'peak must have the widest and strongest energy surface');
assert.ok(enhancer.includes('energyRadius: 44000, energy: 0.56'), 'building bloom must use a smaller intermediate energy surface');
assert.ok(enhancer.includes('energyRadius: 24000, energy: 0.22'), 'fading bloom must visibly contract and weaken');
assert.ok(enhancer.includes('DONE: {') && enhancer.includes('energyRadius: 0, energy: 0'), 'done bloom must return the basemap toward normal rather than retain a false glow');
assert.ok(enhancer.includes("if (record.state === 'UNKNOWN') return STAGE_STYLE.UNKNOWN"), 'stale/UNKNOWN decisions must suppress old observed-stage energy');
assert.ok(enhancer.includes("return ['GO', 'GO_BEFORE'].includes(record.state)"), 'only deterministic trip-worthy decisions may pulse as trip-worthy');
assert.ok(enhancer.includes('if (!hasBloomEnergy(record)) return;'), 'Traverse zone detail must not bypass a stale destination truth gate');
assert.ok(enhancer.includes('const ENERGY_RINGS'), 'energy must use layered rings rather than one hard-edged destination circle');
assert.ok(enhancer.includes('addBloomEnergySurface'), 'live map must render the bloom-energy surface');
assert.ok(enhancer.includes('addEnergyPoint'), 'energy renderer must support independently scaled observation points');
assert.ok(enhancer.includes('addTraverseEnergyWave'), 'Traverse City must use zone-level bloom energy when observations support it');
assert.ok(enhancer.includes("map.createPane('bloomEnergyPane')"), 'bloom energy must live in a dedicated Leaflet pane');
assert.ok(enhancer.includes("mixBlendMode = 'multiply'"), 'bloom energy must visually tint the CARTO basemap instead of replacing it');
assert.ok(enhancer.includes("window.setInterval(loadLatest, 5 * 60 * 1000)"), 'map must refresh live evidence while a visitor keeps the page open');
assert.ok(enhancer.includes('HAS_FIXTURE'), 'preview fixtures must remain deterministic and not be overwritten by production live data');

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

console.log('Bloom CARTO energy map checks passed.');
