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
assert.ok(enhancer.includes('Strongest color now:'), 'active map must surface a current geographic insight rather than only markers');
assert.ok(enhancer.includes('Bright glows mean current opportunity, not geographic flower coverage.'), 'glow must not imply mapped bloom coverage');
assert.ok(enhancer.includes("PEAK: { color: '#ff2f8b'"), 'peak bloom must use a vivid floral map color');
assert.ok(enhancer.includes("BUILDING: { color: '#ff8a34'"), 'building bloom must be visually distinct from peak');
assert.ok(enhancer.includes('is-tripworthy'), 'trip-worthy destinations must receive the active map treatment');

assert.ok(css.includes('.page-shell>.map-section{order:4}'), 'map must be visually promoted ahead of featured/ranked destination content');
assert.ok(css.includes('@keyframes bloomPulse'), 'trip-worthy bloom must visibly pulse');
assert.ok(css.includes('.bloom-map-enhanced .map-frame'), 'enhanced map must have a dedicated responsive presentation surface');

assert.ok(!season.includes("shortLabel: 'APR'"), 'user-facing timing must not use APR shorthand');
assert.ok(!season.includes("shortLabel: 'LATE APR–MAY'"), 'user-facing timing must not use compressed month shorthand');
assert.ok(!season.includes("shortLabel: 'LATE MAY–JUN'"), 'user-facing timing must not use JUN shorthand');
assert.ok(season.includes("shortLabel: 'Early April'"), 'earliest seasonal timing must be written in plain language');
assert.ok(season.includes("shortLabel: 'Late April into May'"), 'cross-month timing must be written in plain language');
assert.ok(season.includes("title: 'How Michigan’s bloom season unfolds'"), 'off-season map must have an interpretive title');
assert.ok(season.includes("title: 'Where is the strongest bloom right now?'"), 'active map must frame the geographic decision directly');

console.log('Bloom CARTO insight map checks passed.');
