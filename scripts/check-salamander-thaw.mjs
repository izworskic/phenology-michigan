import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS,analyzeRegion,shiftDate} from '../lib/salamanders.mjs';
import {acisUrl,climateNumber,parseAcisDaily,summarizeThaw,applyThawToNight,ageDays} from '../lib/salamander-thaw.mjs';

const today='2027-04-10';
assert.equal(REGIONS.length,9);
assert.ok(REGIONS.every(r=>/^K[A-Z0-9]{3}$/.test(r.sid)));
assert.equal(ageDays('2027-04-09',today),1);
assert.equal(ageDays('2027-04-05',today),5);
const url=new URL(acisUrl('KMBS',today));
assert.equal(url.hostname,'data.rcc-acis.org');
assert.equal(url.searchParams.get('sdate'),'2027-04-02');
assert.equal(url.searchParams.get('edate'),'2027-04-09');
assert.equal(url.searchParams.get('elems'),'maxt,mint,snwd');
assert.throws(()=>acisUrl('fake/../../env',today));
assert.equal(climateNumber('M'),null);
assert.equal(climateNumber(''),null);
assert.equal(climateNumber('T'),null);
assert.equal(climateNumber('0'),0);
assert.equal(climateNumber('45.7'),45.7);
assert.equal(climateNumber(undefined),null);

const records=(overrides={})=>Array.from({length:8},(_,i)=>{
 const date=shiftDate(today,i-8),x=overrides[date]||{};
 return [date,x.high??'52',x.low??'34',x.snow??'0'];
});
const parsed=parseAcisDaily({meta:{name:'Test Climate Airport'},data:records()},today);
assert.equal(parsed.rows.length,8);
assert.equal(parsed.stationName,'Test Climate Airport');
const thaw=summarizeThaw(parsed,today,'KMBS');
assert.equal(thaw.state,'warming');
assert.equal(thaw.impact,'none');
assert.equal(thaw.warmDays,5);
assert.equal(thaw.latestSnow.inches,0);
assert.equal(thaw.latestSnow.date,'2027-04-09');
assert.equal(thaw.groundThawObserved,false);
const base={level:'strong',label:'Strong weather signal',details:'Rain and warmth.',temp:45};
assert.equal(applyThawToNight(base,thaw,today,today).level,'strong');
const snow2=parseAcisDaily({data:records({'2027-04-09':{snow:'2.0'}})},today);
const snowEvidence=summarizeThaw(snow2,today,'KMBS');
assert.equal(snowEvidence.state,'snowpack');
assert.equal(snowEvidence.impact,'caution');
for(const days of [0,1,2]){
 const capped=applyThawToNight(base,snowEvidence,shiftDate(today,days),today);
 assert.equal(capped.level,'guarded');
 assert.equal(capped.thawLimited,true);
 assert.equal(capped.weatherLevel,'strong');
}
const later=applyThawToNight(base,snowEvidence,shiftDate(today,3),today);
assert.equal(later.level,'strong');
assert.equal(later.thawLimited,false);
assert.equal(later.thawRecheck,true);
const trace=summarizeThaw(parseAcisDaily({data:records({'2027-04-09':{snow:'T'}})},today),today),'KMBS');
assert.equal(trace.state,'patchy');
assert.equal(trace.latestSnow.trace,true);
assert.equal(trace.latestSnow.inches,null);
assert.equal(applyThawToNight(base,trace,today,today).level,'watch');
const frozen=summarizeThaw(parseAcisDaily({data:records({'2027-04-08':{high:'27'},'2027-04-09':{high:'31'}})},today),today),'KGRR');
assert.equal(frozen.state,'freeze');
assert.equal(applyThawToNight(base,frozen,today,today).level,'guarded');
const staleSnow=summarizeThaw(parseAcisDaily({data:records({'2027-04-06':{snow:'3'},'2027-04-07':{snow:'M'},'2027-04-08':{snow:'M'},'2027-04-09':{snow:'M'}})},today),today),'KMBS');
assert.notEqual(staleSnow.state,'snowpack');
assert.equal(staleSnow.latestSnow.fresh,false);
assert.equal(applyThawToNight(base,staleSnow,today,today).level,'strong');
const unavailable=summarizeThaw(parseAcisDaily({error:'station not found',data:[]},today),today,'KMBS');
assert.equal(unavailable.state,'unknown');
assert.equal(unavailable.latestSnow,null);
assert.equal(applyThawToNight(base,unavailable,today,today).level,'strong');
const nullSnow=parseAcisDaily({data:[['2027-04-09','50','35','M']]},today);
assert.equal(nullSnow.rows[0].snowInches,null);
assert.equal(summarizeThaw(nullSnow,today,'KMBS').latestSnow,null);
// Preserve NWS regional forecast when ACIS data are missing; retain the weather-only signal.
const periods=[];
for(let d=0;d<7;d++)for(let hour=0;hour<24;hour++){
 const date=shiftDate(today,d),rain=d===0&&hour>=18;
 periods.push({startTime:date+'T'+String(hour).padStart(2,'0')+':00:00-04:00',temperature:rain?45:37,temperatureUnit:'F',probabilityOfPrecipitation:{value:rain?80:5},shortForecast:rain?'Rain Showers':'Partly Cloudy'});
}
assert.equal(analyzeRegion(REGIONS[4],periods,new Date('2027-04-10T12:00:00Z'),snowEvidence).nights[0].level,'guarded');
assert.equal(analyzeRegion(REGIONS[4],periods,new Date('2027-04-10T12:00:00Z'),unavailable).nights[0].level,'strong');
const page=fs.readFileSync(new URL('../pages/salamander-migration.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/salamanders.js',import.meta.url),'utf8');
assert.ok(page.includes('ThawEvidence')&&page.includes('Latest high')&&page.includes('Reported snow depth'));
assert.ok(api.includes('Promise.allSettled')&&api.includes('stationHistory')&&api.includes('isSeason(now)'));
assert.ok(!api.includes('open-meteo'));
console.log('Salamander thaw acceptance: snow/trace/freezing/warming/stale/missing, three-night cap, NWS continuity, source and UI checks passed.');
