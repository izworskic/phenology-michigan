import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Node can import this standalone ES module through a data URL even though the
// Next.js package is not marked "type": "module".
const source=await readFile(new URL('../lib/frogs.js',import.meta.url),'utf8');
const frog=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {REGIONS,SPECIES,localParts,dateKey,parseRecent,speciesWindow,speciesForRegion,
  seasonalStatus,groupEvenings,scoreNight,forecastRegion}=frog;

assert.equal(REGIONS.length,9,'Coverage of nine Michigan forecast regions');
assert.equal(SPECIES.length,13,'Full DNR 13-species call-guide coverage');
assert.equal(SPECIES.find(s=>s.id==='cricket').restricted,true);
assert.equal(SPECIES.find(s=>s.id==='fowlers').restricted,true);
assert.equal(SPECIES.find(s=>s.id==='pickerel').note.includes('special concern'),true);
assert.equal(speciesForRegion(REGIONS[4]).some(s=>s.id==='mink'),false);
assert.equal(speciesForRegion(REGIONS[7]).some(s=>s.id==='mink'),true);
assert.equal(speciesForRegion(REGIONS[4]).some(s=>s.id==='cricket'),false,'No threatened-species site prediction');
assert.equal(dateKey('2026-03-10T01:00:00Z'),'2026-03-09','Michigan timezone boundary');
assert.equal(localParts('2026-07-16T02:30:00Z').hour,22);

for(const r of REGIONS){
  const october=seasonalStatus(r,new Date('2026-10-16T12:00:00Z'));
  assert.equal(october.offSeason,true,'October is not a live chorus');
  assert.equal(october.active,false);
  assert.equal(forecastRegion(r,[],null,new Date('2026-10-16T12:00:00Z')).days.length,0);
}
const south=REGIONS[0],bay=REGIONS[4];
assert.equal(speciesWindow(SPECIES[0],south,'2026-03-22').active,true,'Wood frog is an early caller');
assert.equal(speciesWindow(SPECIES[0],south,'2026-07-01').active,false);
assert.equal(speciesWindow(SPECIES[8],bay,'2026-07-01').active,true,'Green frogs call in summer');
assert.equal(speciesWindow(SPECIES[0],bay,'2026-02-20').active,false);
assert.equal(parseRecent([['2026-03-18','M','M','M']]).rain7,null,'Missing must not become zero');
const history=Array.from({length:7},(_,i)=>['2026-03-'+String(10+i).padStart(2,'0'),'52','35',i%2?'0.2':'0.0']);
const recent=parseRecent(history);
assert.equal(recent.rain7,.6);
assert.equal(recent.wetDays7,3);
assert.equal(recent.highs3,52);

const forecast=[
 {startTime:'2026-03-22T19:00:00-04:00',temperature:50,windSpeed:'4 mph',probabilityOfPrecipitation:{value:40},shortForecast:'Cloudy'},
 {startTime:'2026-03-22T20:00:00-04:00',temperature:50,windSpeed:'5 mph',probabilityOfPrecipitation:{value:35},shortForecast:'Cloudy'},
 {startTime:'2026-03-22T21:00:00-04:00',temperature:48,windSpeed:'4 mph',probabilityOfPrecipitation:{value:20},shortForecast:'Cloudy'},
 {startTime:'2026-03-23T19:00:00-04:00',temperature:51,windSpeed:'18 mph',probabilityOfPrecipitation:{value:90},shortForecast:'Thunderstorms likely'},
 {startTime:'2026-03-23T20:00:00-04:00',temperature:51,windSpeed:'18 mph',probabilityOfPrecipitation:{value:90},shortForecast:'Thunderstorms likely'}
];
const evenings=groupEvenings(forecast,new Date('2026-03-22T12:00:00Z'));
assert.equal(evenings.length,2);
assert.equal(evenings[0].date,'2026-03-22');
assert.equal(evenings[0].temp,49);
assert.equal(evenings[1].thunder,true);
const wood=SPECIES[0];
const good=scoreNight(evenings[0],wood,south,recent);
assert.ok(good.score>=75);
assert.equal(scoreNight(evenings[1],wood,south,recent).score,0,'Thunder blocks favorable call');
const incomplete=scoreNight({...evenings[0],pop:null},wood,south,recent);
assert.equal(incomplete.score,null,'No index when precipitation unknown');
assert.equal(scoreNight(evenings[0],wood,south,{wetDays7:null}).score>=75,true);
assert.equal(scoreNight(evenings[0],wood,south,recent).score!=null,true);
assert.equal(scoreNight({...evenings[0],date:'2026-10-16'},wood,south,recent),null);
const row=forecastRegion(south,evenings,recent,new Date('2026-03-22T12:00:00Z'));
assert.equal(row.days.length,2);
assert.equal(row.days[1].bestScore,0);
assert.equal(row.season.active,true);

console.log('Frog chorus: 13 species, protected ranges, 9 regions, season/off-season, weather scoring and safety verified.');
