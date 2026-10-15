import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const engine=await readFile(new URL('../lib/hummingbird-calibration.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(engine).toString('base64'));
const snapshot=JSON.parse(await readFile(new URL('../data/hummingbird-history.json',import.meta.url),'utf8'));
const ids=['detroit','kalamazoo','grand-rapids','lansing','saginaw-bay','traverse-city','gaylord','marquette','houghton'];
assert.ok(snapshot.years.length>=10,'Archive must retain 2017–2026 and any newer complete seasons');
assert.deepEqual(snapshot.years.slice(0,10).map(y=>y.year),[2017,2018,2019,2020,2021,2022,2023,2024,2025,2026]);
assert.equal(snapshot.observationCount,snapshot.years.reduce((n,y)=>n+y.observations.length,0));
assert.ok(snapshot.observationCount>=428,'Do not regress the ten-year baseline without reviewing provenance');
for(const y of snapshot.years){
 assert.ok(y.observations.length<=y.totalResults,'Cannot retain more records than source provides');
 assert.equal(y.observations.length+y.notAssigned,y.totalResults,'All downloaded records need a disposition');
 const seen=new Set();
 for(const obs of y.observations){
  const [date,region,observer,id]=obs;
  assert.ok(date.startsWith(String(y.year)+'-')&&date.slice(5)>='04-01'&&date.slice(5)<='06-15');
  assert.ok(ids.includes(region));
  assert.ok(Number.isFinite(Number(id))&&!seen.has(id));seen.add(id);
  assert.ok(observer==null||Number.isFinite(Number(observer)));
 }
}
const result=m.calibrateHistory(snapshot,ids);
assert.deepEqual(Object.keys(result),ids);
assert.equal(result.detroit.coverage,'moderate');
assert.equal(result['saginaw-bay'].coverage,'moderate');
assert.ok(['insufficient','limited','moderate'].includes(result['traverse-city'].coverage));
if(result['traverse-city'].coverage!=='moderate')assert.equal(result['traverse-city'].firstReportMedian,null,'Sparse regions must not publish estimates');
assert.equal(result.detroit.archiveYears,snapshot.years.length);
for(const id of ids){
 const row=result[id];
 assert.equal(row.annual.length,snapshot.years.length);
 assert.equal(row.reportCount,row.annual.reduce((n,y)=>n+y.reports,0));
 assert.equal(row.supportedYears,row.annual.filter(y=>y.firstReported).length);
 if(row.coverage!=='moderate'){
  assert.equal(row.firstReportEarly,null);assert.equal(row.firstReportMedian,null);assert.equal(row.firstReportLate,null);
 }else{
  assert.ok(row.firstReportEarly<=row.firstReportMedian);
  assert.ok(row.firstReportMedian<=row.firstReportLate);
  assert.ok(row.supportedYears>=6&&row.reportCount>=40);
 }
}
const synthetic={years:[{year:2024,observations:[['2024-04-10','x',1,101],['2024-04-12','x',1,102]]},{year:2025,observations:[['2025-05-10','x',2,201],['2025-05-12','x',3,202]]}]};
assert.equal(m.calibrateHistory(synthetic,['x']).x.supportedYears,1,'Two records from the same observer cannot support first-report benchmark');
const futureDate=m.ordinalToMonthDay(120);
assert.equal(futureDate,'04-30');
console.log('Historical hummingbird calibration passed: '+snapshot.years.length+' seasons, '+snapshot.observationCount+' observations, observer support, sparse coverage, and valid reporting ranges');
