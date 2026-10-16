import assert from 'node:assert/strict';
import fs from 'node:fs';
import ARCHIVE from '../data/trillium-flowering-history.json' with {type:'json'};
import {REGIONS} from '../lib/trillium.mjs';
import {YEAR_START,MIN_REPORTS_PER_YEAR,MIN_ACTIVE_WEEKS,MIN_CALIBRATION_YEARS,PARTITIONS,ALLOWED_REGION_IDS,
 annualReports,buildBenchmark,compareCurrentSeason,combineHistograms,histogramUrl,dateToDoy,doyLabel,targetBloomYear} from '../lib/trillium-history.mjs';
assert.equal(ARCHIVE.schemaVersion,1);
assert.equal(ARCHIVE.source,'iNaturalist observation histogram API');
assert.equal(ARCHIVE.annotation.term_id,12);
assert.equal(ARCHIVE.annotation.term_value_id,13);
assert.equal(ARCHIVE.quality_grade,'research');
assert.equal(ARCHIVE.interval,'week');
assert.equal(ARCHIVE.date_field,'observed');
assert.deepEqual([...ALLOWED_REGION_IDS].sort(),REGIONS.map(x=>x.id).sort(),'Archive regions must cover every tracked region');
assert.equal(Object.keys(ARCHIVE.regions).length,7);
assert.equal(Object.values(ARCHIVE.regions).reduce((n,x)=>n+x.weekly.reduce((s,row)=>s+row[1],0),0),1885,'Provenance-check baseline counts from 2019–2026 actual archive');
assert.equal(dateToDoy('2020-05-01'),dateToDoy('2025-05-01'),'Leap-year normalization must not shift May');
assert.equal(dateToDoy('2020-02-29'),null,'Leap day is not comparable across years');
assert.equal(doyLabel(dateToDoy('2024-05-12')),'May 12');
assert.equal(targetBloomYear(new Date('2026-10-15T20:00:00Z')),2027);
assert.equal(targetBloomYear(new Date('2027-04-15T20:00:00Z')),2027);
let eligibleTotal=0;
for(const region of REGIONS){
 const entry=ARCHIVE.regions[region.id];assert.ok(entry,region.id+' must have archive');
 assert.deepEqual(entry.partitions,PARTITIONS[region.id],region.id+' geographic partitions must match the refresh operator');
 const years=annualReports(entry.weekly,2019,2026);
 assert.equal(years.length,8);
 assert.ok(years.every(y=>y.qualified===((y.total>=MIN_REPORTS_PER_YEAR)&&(y.weeks>=MIN_ACTIVE_WEEKS))));
 const b=buildBenchmark(ARCHIVE,region.id,2027);
 eligibleTotal+=b.eligibleYears||0;
 assert.ok(['limited','available'].includes(b.state),'No fabricated all-region benchmark');
 assert.equal(b.allReports,years.reduce((n,y)=>n+y.total,0));
 if(b.state==='available'){
  assert.ok(b.eligibleYears>=MIN_CALIBRATION_YEARS);
  assert.ok(b.low<=b.center&&b.center<=b.high);
  assert.ok(b.centerLabel&&b.lowLabel&&b.highLabel);
 }else assert.equal(b.low,undefined,'Limited data must not invent a date');
 assert.ok(!JSON.stringify(entry).includes('geojson')&&!JSON.stringify(entry).includes('observer_id'),'Archive never contains raw observed locations/people');
}
assert.ok(eligibleTotal>=22,'Meaningful historical years should remain eligible after quality filters');
const weighted={regions:{southwest:{weekly:[
 ['2019-05-20',6],['2019-05-27',6],
 ['2020-04-20',500],['2020-04-27',500],
 ['2021-05-20',7],['2021-05-27',6],
 ['2022-05-20',7],['2022-05-27',6]
]}}};
const equal=buildBenchmark(weighted,'southwest',2023);
assert.equal(equal.state,'available');
assert.ok(equal.center>=dateToDoy('2027-05-20')-2,'One year with 1000 reports must not dominate three years with a dozen each');
assert.equal(buildBenchmark({regions:{southwest:{weekly:[['2021-05-12',1000]]}}},'southwest',2027).state,'limited','One well photographed week is not adequate historical coverage');
const normal=buildBenchmark(ARCHIVE,'southeast',2027);
const current=[['2027-04-12',6],['2027-04-19',7]];
const early=compareCurrentSeason(normal,current,new Date('2027-04-27T20:00:00Z'));
assert.equal(early.state,'developing','Never declare early season from partial early-week sample');
const mature=compareCurrentSeason(normal,current,new Date('2027-06-30T20:00:00Z'));
assert.ok(['earlier','typical','later'].includes(mature.state),'Mature high-coverage seasons can compare report timing');
assert.equal(compareCurrentSeason(normal,[],new Date('2027-06-30T20:00:00Z')).state,'sparse','Zero reports must not be treated as late flowers');
assert.equal(compareCurrentSeason(normal,current,new Date('2026-10-15T20:00:00Z')).state,'off','October never claims bloom timing');
const bad=combineHistograms([{results:{week:{'2027-04-12':2,'2027-04-19':3}}},{results:{week:{'2027-04-12':5,'2026-04-19':8}}}],2027);
assert.deepEqual(bad,[['2027-04-12',7],['2027-04-19',3]],'Rectangles sum weeks and exclude wrong-year values');
assert.throws(()=>combineHistograms([{results:{day:{}}}],2027));
const apiUrl=histogramUrl('southwest',2027);
assert.ok(apiUrl.includes('term_id=12')&&apiUrl.includes('term_value_id=13')&&apiUrl.includes('swlat='));
assert.throws(()=>histogramUrl('unknown',2027));
const api=fs.readFileSync(new URL('../pages/api/trillium-history.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../pages/api/trillium.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/michigan-trillium.js',import.meta.url),'utf8');
const comp=fs.readFileSync(new URL('../components/TrilliumHistory.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/trillium.css',import.meta.url),'utf8');
const operator=fs.readFileSync(new URL('../scripts/refresh-trillium-history.mjs',import.meta.url),'utf8');
assert.ok(api.includes('PARTITIONS[region]')&&api.includes('s-maxage=43200'),'Live source should be scoped and cached');
assert.ok(main.includes('targetBloomYear(now)')&&main.includes('buildBenchmark(ARCHIVE,region.id,targetYear)'));
assert.ok(page.includes('<TrilliumHistory regionId={selected}/>'));
assert.ok(comp.includes('benchmark.years')&&comp.includes('tri-history-range')&&comp.includes('MIN')===false);
assert.ok(css.includes('tri-history-year')&&css.includes('@media(max-width:740px)'));
assert.ok(operator.includes('combineHistograms(')&&operator.includes('histogramUrl('));
console.log('Trillium historical calibration: 1,885 actual flowering-report counts, 7 regions, sampling guards, unbiased equal-year benchmark, comparison maturity gates and responsive history UI passed.');
