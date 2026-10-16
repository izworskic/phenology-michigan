import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MONITORED_SOURCES,asSpringDate,woodcockWalk,normalizeEvent,extractStructuredEvents,
  fromStructuredEvent,fromTecEvent,findWoodcockDetailLinks,mergeEvents,matchKnownSite} from '../lib/woodcock-spring-events.mjs';
const rgs=MONITORED_SOURCES.find(s=>s.id==='rgs');
const dahlem=MONITORED_SOURCES.find(s=>s.id==='dahlem');
const at='2027-02-12T13:27:00Z';
assert.equal(MONITORED_SOURCES.length,5);
assert.equal(asSpringDate('2027-04-23T19:30:00-04:00',2027),'2027-04-23');
assert.equal(asSpringDate('2026-04-23',2027),null,'Must not recycle old events');
assert.equal(asSpringDate('2027-02-27',2027),null);
assert.equal(asSpringDate('2027-06-16',2027),null);
assert.equal(asSpringDate('2027-04-31',2027),null);
assert.equal(woodcockWalk('North Central Michigan Chapter Woodcock Walk'),true);
assert.equal(woodcockWalk('Michigan Grouse & Woodcock Hunt 2027'),false);
assert.equal(woodcockWalk('Woodcock Conservation Banquet 2027'),false);
assert.equal(woodcockWalk('Timberdoodle Sky Dance Evening'),true);
assert.equal(matchKnownSite('Gourdneck State Game Area, Portage'), 'gourdneck');
const good={
  title:'North Central Michigan Chapter Woodcock Walk',
  start_date:'2027-04-23 19:30:00',
  url:'https://ruffedgrousesociety.org/events/north-central-michigan-chapter-woodcock-walk-2027/',
  venue:{venue:'Lame Duck Foot Access Area GEMS',city:'Gladwin',stateprovince:'MI'}
};
const valid=fromTecEvent(good,rgs,2027,at);
assert.ok(valid&&valid.date==='2027-04-23'&&valid.siteId==='lame-duck');
assert.equal(valid.status,'organizer-listed');
assert.ok(valid.access.includes('after-hours'));
assert.equal(fromTecEvent({...good,start_date:'2026-04-23'},rgs,2027,at),null);
assert.equal(fromTecEvent({...good,venue:{venue:'Forest Preserve',city:'Pittsburgh',stateprovince:'PA'}},rgs,2027,at),null);
assert.equal(fromTecEvent({...good,title:'Michigan Grouse & Woodcock Hunt 2027'},rgs,2027,at),null);
assert.equal(fromTecEvent({...good,url:'https://evil.example.com/fake-event'},rgs,2027,at),null);
const officialSchema={
  '@context':'https://schema.org','@type':'Event',name:'American Woodcock Program & Night Walk',
  startDate:'2027-04-09T19:30:00-04:00',
  url:'https://www.dahlemcenter.org/event/woodcock-night-walk-2027/',
  location:{'@type':'Place',name:'Dahlem Environmental Education Center',
    address:{addressLocality:'Jackson',addressRegion:'MI'}}
};
const html='<html><script type="application/ld+json" class="tribe-events-schema">'+JSON.stringify(officialSchema)+'</script></html>';
assert.equal(extractStructuredEvents(html).length,1);
const structured=fromStructuredEvent(extractStructuredEvents(html)[0],dahlem,2027,at,officialSchema.url);
assert.equal(structured?.siteId,'dahlem');
assert.equal(structured?.date,'2027-04-09');
const list='<html><a href="https://ruffedgrousesociety.org/events/woodcock-walk-2027/">North Central Michigan Woodcock Walk 2027</a>'+
  '<a href="https://ruffedgrousesociety.org/events/woodcock-hunt/">Woodcock Hunting Trip 2027</a>'+
  '<a href="https://evil.example.com/fake/">Michigan Woodcock Walk</a></html>';
assert.deepEqual(findWoodcockDetailLinks(list,'https://ruffedgrousesociety.org/events/',rgs),['https://ruffedgrousesociety.org/events/woodcock-walk-2027/']);
const other=fromTecEvent({...good,title:'Northern Michigan Woodcock Sky Dance',venue:{venue:'New preserve',city:'Grayling',stateprovince:'Michigan'}},rgs,2027,at);
assert.equal(other.siteId,null,'Do not invent pin locations');
const feed=mergeEvents({year:2027,events:[valid]},[valid,other],2027,[{id:'rgs',name:rgs.name,status:'checked',eventCount:2}],at);
assert.equal(feed.events.length,2);
assert.equal(feed.sources[0].status,'checked');
assert.equal(mergeEvents(feed,[],2028,[], '2028-02-01T00:00:00Z').events.length,0,'Never reuse past-year announcements');
assert.equal(mergeEvents(feed,[],2027,[], '2027-04-24T00:00:00Z').events.length,0,'Expire past dated events');
const blank=JSON.parse(readFileSync(new URL('../data/woodcock-spring-events.json',import.meta.url),'utf8'));
assert.equal(blank.year,2027);assert.equal(blank.checkedAt,null);assert.deepEqual(blank.events,[]);
const workflow=readFileSync(new URL('../.github/workflows/woodcock-spring-events.yml',import.meta.url),'utf8');
const script=readFileSync(new URL('../scripts/refresh-woodcock-events.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../components/WoodcockViewingFinder.js',import.meta.url),'utf8');
assert.ok(workflow.includes("27 13 * 1-6 2"));
assert.ok(workflow.includes('permissions:')&&workflow.includes('contents: write'));
assert.ok(workflow.includes('npm test && npm run build'));
assert.ok(workflow.includes('git add data/woodcock-spring-events.json'));
assert.ok(script.includes('MAX_BYTES')&&script.includes('All official calendars unavailable'));
assert.ok(ui.includes("upcomingEvents from '../data/woodcock-spring-events.json'"));
assert.ok(ui.includes('Organizer-listed event')&&ui.includes('No dated spring {springYear}'));
assert.ok(ui.includes('No after-dark access'));
console.log('Woodcock spring auto-refresh gates passed: official event metadata, date/year, Michigan location, anti-hunt, no new unverified pins, scheduler and safe fallback.');
