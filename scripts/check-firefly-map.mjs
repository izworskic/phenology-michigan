import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const [map,page,css,bloom,app]=await Promise.all([
  load('components/FireflyCartoMap.js'),
  load('pages/firefly-tracker.js'),
  load('public/firefly-tracker.css'),
  load('public/bloom-map-v2.js'),
  load('pages/_app.js')
]);
const extract=s=>s.match(/const CARTO_(?:BASEMAP_)?KEY\s*=\s*['"]([^'"]+)['"]/);
const bloomKey=extract(bloom);
const fireflyKey=extract(map);
assert.ok(bloomKey&&fireflyKey,'Both maps must specify a CARTO key');
assert.equal(fireflyKey[1],bloomKey[1],'Reuse the proven Bloom Tracker CARTO basemap key');
assert.ok(map.includes('https://basemaps.cartocdn.com/rastertiles/'),'Use real CARTO tiles');
assert.ok(map.includes('leaflet@1.9.4/dist/leaflet.js'),'Load Leaflet JS');
assert.ok(page.includes('leaflet@1.9.4/dist/leaflet.css'),'Load matching Leaflet CSS');
assert.ok(map.includes("setStyle('dark_all')"),'Night style switch must work');
assert.ok(map.includes("setStyle('voyager')"),'Street style switch must work');
assert.ok(map.includes("useState('dark_all')"),'Night basemap is the default for the firefly page');
assert.ok(map.includes("tiles.on('load',settled)"),'Wait for all tiles before reporting map failure');
assert.ok(map.includes('fitBounds(MICHIGAN_BOUNDS'),'Provide statewide reset');
assert.ok(map.includes("marker.on('click'"),'Markers must select an active region');
assert.ok(map.includes("selected===region.id"),'Selected marker must be highlighted');
assert.ok(map.includes('new ResizeObserver'),'Map must invalidate size on layout changes');
assert.ok(map.includes('CARTO map tiles are not loading.'),'Tile failures must have visible fallback');
assert.ok(map.includes('Not an emergence')===false);
assert.ok(page.includes('FireflyCartoMap')&&!page.includes('function RegionMap('),'Retire old static SVG map');
assert.ok(!page.includes('getStaticProps'),'Do not load redundant map geometry into props');
assert.ok(page.includes('Not an emergence or firefly density heatmap'),'Do not misrepresent weather points as actual sightings');
assert.ok(css.includes('.firefly-carto-map{height:390px}'),'Mobile map height must be defined');
assert.ok(css.includes('.firefly-pin-container'),'Custom map markers must be styled');
assert.ok(app.includes('network-ads-v1.js'),'Do not remove the existing ad loader');
console.log('CARTO firefly map: tile key, loading, navigation, map states and mobile CSS checked');
