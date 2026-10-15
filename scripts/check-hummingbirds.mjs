import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const js=await readFile(new URL('../lib/hummingbirds.js',import.meta.url),'utf8');
const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.equal(m.REGIONS.length,9,'There should be exactly nine Michigan locations');
assert.equal(m.getDateKey(new Date('2026-10-15T22:40:00Z')),'2026-10-15');
const bay=m.REGIONS.find(r=>r.id==='saginaw-bay');
assert.ok(bay);
const autumn=m.seasonState(bay,new Date('2026-10-15T22:40:00Z'));
assert.equal(autumn.phase,'off_season');
assert.equal(autumn.window.start,'2027-04-27','Off season must show next spring, not the previous migration');
assert.equal(autumn.window.feeder,'2027-04-17');
assert.equal(m.readout(bay,new Date('2026-10-15T22:40:00Z')).tone,'off');
const spring=m.seasonState(bay,new Date('2027-04-28T18:00:00Z'));
assert.equal(spring.phase,'arrival_window');
const evidence=m.groupSightings([
 {id:12,quality_grade:'research',observed_on:'2027-04-28',geojson:{coordinates:[-83.89,43.60]}},
 {id:13,quality_grade:'casual',observed_on:'2027-04-28',geojson:{coordinates:[-83.89,43.60]}},
 {id:14,quality_grade:'research',observed_on:'2027-04-28',geojson:{coordinates:[-73.89,43.60]}}
],new Date('2027-04-29T18:00:00Z'));
assert.equal(evidence['saginaw-bay'].length,1,'Only locally assignable research-grade records count');
assert.equal(m.readout(bay,new Date('2027-04-29T18:00:00Z'),null,evidence['saginaw-bay']).tone,'seen');
const forecast=m.weatherSignal([
 {isDaytime:true,startTime:'2027-04-27T12:00:00-04:00',temperature:65,windDirection:'SSW',windSpeed:'8 mph'},
 {isDaytime:true,startTime:'2027-04-28T12:00:00-04:00',temperature:45,windDirection:'N',windSpeed:'10 mph'},
 {isDaytime:false,startTime:'2027-04-28T22:00:00-04:00',temperature:42,windDirection:'S',windSpeed:'3 mph'}
],new Date('2027-04-27T09:00:00Z'));
assert.equal(forecast.checked,2);
assert.equal(forecast.favorableDays,1);
assert.equal(m.weatherSignal([{isDaytime:true,startTime:'2027-04-27T12:00:00-04:00',temperature:68,windDirection:'S',windSpeed:'not available'}],new Date('2027-04-27T09:00:00Z')).favorableDays,0,'Missing wind must not imply favorable conditions');
assert.equal(m.readout(bay,new Date('2027-04-27T18:00:00Z'),forecast,[]).tone,'watch');
console.log('Hummingbird engine checks passed: dates, off-season, regional sightings, missing weather, spring signals');
