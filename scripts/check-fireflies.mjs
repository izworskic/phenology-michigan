import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../lib/fireflies.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const reference=new Date('2026-10-15T22:00:00Z');
assert.equal(m.REGIONS.length,9);
for(const region of m.REGIONS){
  const october=m.seasonalWindow(region,reference);
  assert.equal(october.inSeason,false,'October must not be presented as an active display');
  assert.equal(m.viewingLabel(region,null,reference).tone,'off');
}
assert.equal(m.seasonalWindow(m.REGIONS[0],new Date('2026-06-20T21:00:00Z')).inSeason,true);
assert.deepEqual(m.parseAcisData([['2026-06-01','M','M','M']]).gddC,null);
const history=Array.from({length:31},(_,i)=>['2026-05-'+String(i+1).padStart(2,'0'),'77','59','0.06']);
const parsed=m.parseAcisData(history);
assert.ok(parsed.gddC>0);
assert.equal(parsed.validDays,31);
assert.equal(parsed.wetDays,10);
assert.equal(m.development(null).pct,null,'missing temperature cannot be treated as zero GDD');
assert.ok(m.development(800).text.includes('reference'));
const nice=m.summarizeNight([{temperature:72,windSpeed:'4 mph',probabilityOfPrecipitation:{value:10},relativeHumidity:{value:66}}]);
assert.equal(nice.label,'Favorable');
assert.equal(nice.score,100);
const incomplete=m.summarizeNight([{temperature:72,windSpeed:'4 mph',probabilityOfPrecipitation:{value:null}}]);
assert.equal(incomplete.score,null,'missing rain forecast must never imply dry conditions');
const bad=m.summarizeNight([{temperature:52,windSpeed:'18 mph',probabilityOfPrecipitation:{value:90}}]);
assert.equal(bad.label,'Unfavorable');
const periods=[
  {startTime:'2026-06-20T20:00:00-04:00',temperature:72,windSpeed:'4 mph',probabilityOfPrecipitation:{value:10}},
  {startTime:'2026-06-20T21:00:00-04:00',temperature:70,windSpeed:'5 mph',probabilityOfPrecipitation:{value:8}},
  {startTime:'2026-06-21T21:00:00-04:00',temperature:65,windSpeed:'9 mph',probabilityOfPrecipitation:{value:20}},
];
const nights=m.summarizeForecast(periods,new Date('2026-06-20T18:00:00Z'));
assert.equal(nights.length,2);
assert.equal(nights[0].date,'2026-06-20');
console.log('Firefly model: regional season, missing data, GDD, and viewing-weather tests passed');
