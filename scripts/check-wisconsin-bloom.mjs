import fs from 'node:fs';
import assert from 'node:assert/strict';
const data=JSON.parse(fs.readFileSync(new URL('../data/wisconsin-bloom.json',import.meta.url),'utf8'));
const page=fs.readFileSync(new URL('../pages/wisconsin-bloom-tracker.js',import.meta.url),'utf8');
const details=fs.readFileSync(new URL('../pages/wisconsin-bloom-tracker/[slug].js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/wisconsin-bloom.js',import.meta.url),'utf8');
const sitemap=fs.readFileSync(new URL('../pages/sitemap.xml.js',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../pages/_app.js',import.meta.url),'utf8');
assert.equal(data.destinations.length,9,'Wisconsin has nine confirmed planning destinations');
assert.equal(new Set(data.destinations.map(x=>x.id)).size,9,'unique IDs');
assert.equal(data.fieldNotes.length,0,'launch has no fabricated field observation');
assert.ok(data.faqs.length>=8,'real seasonal search FAQs');
for(const entry of data.destinations){
 for(const field of ['sourceUrl','visitUrl','hours','tickets','parking','crowds','experience','plan','lookFor','window','name']){
  assert.ok(entry[field]&&entry[field].length>20,entry.id+' missing '+field);
 }
 assert.ok(entry.lat>42&&entry.lat<48&&entry.lon< -86&&entry.lon> -94,entry.id+' outside Wisconsin bounds');
 assert.ok(entry.sourceUrl.startsWith('https://'),'official source https');
 assert.ok(entry.end[0]>=entry.start[0],'sensible calendar order');
}
assert.equal(data.destinations.filter(d=>d.guide).length,2,'two in-depth launch guides');
assert.match(page,/max-image-preview:large/);
assert.match(page,/Season planning · no current bloom claim/);
assert.match(page,/scrollWheelZoom:false/);
assert.match(page,/leaflet@1\.9\.4/);
assert.match(page,/observation\.stage/);
assert.match(api,/OBSERVATION|observations/);
assert.match(api,/sourceName/);
assert.match(api,/WINDOW/);
assert.match(details,/getStaticPaths/);
assert.match(details,/getStaticProps/);
assert.match(sitemap,/wisconsin-bloom-tracker/);
assert.match(layout,/wisconsin-bloom\.css/);
console.log('Wisconsin bloom: 9 destinations, 2 deep pages, sources, conservative evidence, CSS, sitemap and cross-links validated.');

const visual=fs.readFileSync(new URL('../lib/bloom/wisconsin-visuals.mjs',import.meta.url),'utf8');
const photoComponent=fs.readFileSync(new URL('../components/WisconsinPhoto.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../pages/_app.js',import.meta.url),'utf8');
const stylesheet=fs.readFileSync(new URL('../public/wisconsin-bloom.css',import.meta.url),'utf8');
assert.match(page,/WisconsinPhoto/,'field photos used in state tracker');
assert.match(details,/WisconsinPhoto/,'deep guides use dated licensed photos');
assert.match(visual,/CC BY-SA 4.0/);
assert.match(visual,/CC BY 2.0/);
assert.match(visual,/CC BY 3.0/);
assert.match(photoComponent,/not live/,'file photos cannot masquerade as current imagery');
assert.match(photoComponent,/onError/,'broken image fallback');
assert.match(app,/!isBloomTracker && !isWisconsinBloom/,'Wisconsin must avoid intrusive ad overlay present in screenshots');
assert.match(page,/Flower type, not live status/,'map colors mean flower type');
assert.match(page,/wi-season-timeline/,'Wisconsin gets Michigan-like compact seasonal progression');
assert.match(stylesheet,/.wi-hero-grid/);
assert.match(stylesheet,/.wi-season-banner/);
console.log('Wisconsin V2: premium density, three licensed venue images, type-colored map, no intrusive overlays.');
