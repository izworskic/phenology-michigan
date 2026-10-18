import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessOvernight,nightSlots,partsAt,shiftDate,dateForNightHour} from '../lib/frostOvernight.mjs';
import {evaluateGrid,lookup} from '../lib/frostMorning.mjs';
import {rankedDawnRows} from '../lib/frostOutlook.mjs';
const date='2026-10-21',tz='America/Detroit';
assert.equal(shiftDate('2026-10-21',-1),'2026-10-20');
assert.equal(dateForNightHour('2026-10-20',18),'2026-10-21');
assert.equal(dateForNightHour('2026-10-21',9),'2026-10-21');
assert.equal(dateForNightHour('2026-10-21',14),null);
const slots=nightSlots(date,tz);
assert.equal(slots.length,16,'Normal 6pm–9am night has 16 hourly forecast slots');
assert.equal(slots[0].hour,18);
assert.equal(slots.at(-1).hour,9);
assert.equal(slots[0].phase,'evening');
assert.equal(slots.at(-1).phase,'morning');
const points=(fn=()=>({}))=>slots.map(h=>{
  const early=h.phase==='evening';
  const tempF=early?39:Math.max(28,36-h.hour);
  return {...h,tempF,dewF:tempF-2,windMph:2,skyPct:15,score:85,spreadF:2,...fn(h)};
});
const strong=assessOvernight(points(),date,tz);
assert.equal(strong.status,'ready');
assert.equal(strong.coveragePct,100);
assert.equal(strong.regime,'radiational-support');
assert.ok(strong.deltaF>=2,'Cooling trend must be evaluated from actual hourly forecast temperatures');
const windCloud=assessOvernight(points(h=>({windMph:14,skyPct:87})),date,tz);
assert.equal(windCloud.regime,'cold-without-radiational-signal','Sharp cold-air temperature decline should not masquerade as radiational cooling');
const clearing=assessOvernight(points(h=>h.phase==='evening'||h.hour<=2?{skyPct:86,windMph:12}:{skyPct:12,windMph:2}),date,tz);
assert.equal(clearing.regime,'late-improvement','Late clearing should be distinct from all-night calm');
const dry=assessOvernight(points(h=>({dewF:(h.phase==='evening'?39:Math.max(28,36-h.hour))-12})),date,tz);
assert.equal(dry.regime,'dry','Cold but moisture-poor air must be labeled');
const sparse=assessOvernight(points().slice(0,7),date,tz);
assert.equal(sparse.status,'incomplete');
assert.equal(sparse.deltaF,null,'Incomplete forecast must not claim a cooling amount');
assert.ok(sparse.series.some(s=>s.score===null),'Missing future hours are not synthesized');
const fall=nightSlots('2026-11-01','America/Detroit');
assert.equal(fall.length,17,'Fall DST overnight includes repeated 1am hour');
assert.equal(new Set(fall.map(h=>h.time)).size,17,'Repeated local hour still has distinct UTC instant');
assert.equal(fall.filter(h=>h.hour===1).length,2);
assert.equal(nightSlots('2027-03-14','America/Detroit').length,15,'Spring DST overnight skips 2am hour');
const ironwood=nightSlots('2026-10-21','America/Chicago');
assert.equal(ironwood.length,16);
assert.equal(partsAt(ironwood[0].time,'America/Chicago').hour,18);
assert.equal(partsAt(ironwood.at(-1).time,'America/Chicago').hour,9);
// Integration with the real grid transformation. Sunset-to-dawn hours are sourced from
// future grid slots; elapsed hours are missing, never fabricated as observations.
const now=new Date('2026-10-17T04:00:00Z');
const field=(value,uom)=>({uom,values:[{validTime:'2026-10-17T00:00:00+00:00/PT96H',value}]});
const grid={temperature:field(-1.7,'wmoUnit:degC'),dewpoint:field(-2.8,'wmoUnit:degC'),
  windSpeed:field(3,'wmoUnit:km_h-1'),skyCover:field(10,'wmoUnit:percent')};
const report=evaluateGrid(grid,now,lookup('bay-city'));
assert.equal(report.mornings.length,3);
assert.ok(report.mornings.every(m=>m.night),'Every dawn includes overnight context');
assert.equal(report.mornings[1].night.expectedHours,16);
assert.equal(report.mornings[1].night.coveragePct,100,'Tomorrow has all previous evening and overnight forecast hours');
assert.ok(report.mornings[0].night.coveragePct<100,'Past overnight forecast hours are not treated as historical observations');
const regional=rankedDawnRows([{id:'bay-city',name:'Bay City',mornings:[{date,score:78,night:strong}]}],date);
assert.equal(regional[0].overnightHeadline,strong.headline,'Ranking must display the date-specific overnight regime');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('pages/frosty-mornings.js');
const decision=read('components/FrostDawnDecision.js'),component=read('components/FrostNightJourney.js');
const css=read('public/frost-night.css');
for(const x of ['FrostNightJourney','overnight-journey','frost-night.css','night={selectedMorning?.night}'])
  assert.ok(page.includes(x),'Must connect selected date to night chart: '+x);
for(const x of ['morning.night','fm-decision-overnight','overnight-journey'])
  assert.ok(decision.includes(x),'Top-of-page decision requires night signal');
for(const x of ['ResponsiveContainer','ComposedChart','onMouseMove','timeZoneName','selection','Entire night','Midnight to dawn'])
  assert.ok(component.includes(x),'Interactive hourly forecast detail required: '+x);
assert.ok(css.includes('@media(max-width:650px)'),'Responsive chart required');
console.log('Overnight cooling, cold-front distinction, late clearing, dry air, missing data, DST and coordinated visual contracts passed');
