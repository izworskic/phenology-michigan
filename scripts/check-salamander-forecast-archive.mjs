import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS,shiftDate} from '../lib/salamanders.mjs';
import {ARCHIVE_VERSION,SNAPSHOT_SOURCE,FORECAST_METHOD,createForecastIssue,appendForecastIssue,checkedArchive,forecastArchiveCoverage} from '../lib/salamander-forecast-archive.mjs';

const captured=new Date('2027-04-10T19:10:00Z'); // 3:10 p.m. Eastern Daylight Time
const today='2027-04-10';
const mkRow=(r)=>({id:r.id,season:'spring',thaw:{state:'unknown'},nights:Array.from({length:7},(_,i)=>({
 date:shiftDate(today,i),level:i===0&&r.id==='southeast'?'strong':i%2?'watch':'dry',
 temp:48,rainChance:i%2?70:25,warmRainHours:2,thawLimited:false
}))});
const feed={status:'spring_watch',generatedAt:'2027-04-10T19:05:00.000Z',regions:REGIONS.map(mkRow)};
const issue=createForecastIssue(feed,captured);
assert.equal(issue.schema,ARCHIVE_VERSION);
assert.equal(issue.source,SNAPSHOT_SOURCE);
assert.equal(issue.method,FORECAST_METHOD);
assert.equal(issue.issueDay,today);
assert.equal(issue.regions.length,9);
assert.equal(issue.regions[0].nights.length,7);
assert.equal(issue.regions[0].nights[0].level,'strong');
assert.equal(issue.regions[0].nights[6].date,'2027-04-16');
assert.equal(issue.coverage.partial,false);
assert.ok(!JSON.stringify(issue).includes('lat'));
assert.ok(!JSON.stringify(issue).includes('lon'));
assert.deepEqual(checkedArchive([issue],today),[issue]);
const one=appendForecastIssue([],issue);
assert.equal(one.state,'added');
assert.equal(one.archive.length,1);
assert.equal(appendForecastIssue(one.archive,issue).state,'already_recorded');
assert.equal(appendForecastIssue(one.archive,issue).archive.length,1);
assert.throws(()=>createForecastIssue(feed,new Date('2027-04-10T22:02:00Z')),/before migration night/);
assert.throws(()=>createForecastIssue(feed,new Date('2027-04-10T14:02:00Z')),/noon/);
assert.throws(()=>createForecastIssue(feed,new Date('2027-10-10T19:10:00Z')),/spring/);
assert.throws(()=>createForecastIssue({...feed,generatedAt:'2027-04-10T17:00:00Z'},captured),/stale/);
assert.throws(()=>createForecastIssue({...feed,generatedAt:'2027-04-10T19:11:00Z'},captured),/future/);
assert.throws(()=>createForecastIssue({...feed,generatedAt:'2027-04-09T19:00:00Z'},captured),/local day/);
assert.throws(()=>createForecastIssue({...feed,status:'off_season'},captured),/unavailable/);
assert.throws(()=>createForecastIssue({...feed,regions:feed.regions.slice(0,5)},captured),/Too few/);
assert.throws(()=>createForecastIssue({...feed,regions:feed.regions.map(r=>({...r,nights:r.nights.map(n=>({...n,level:'unknown'}))}))},captured),/Too few scored/);
assert.throws(()=>createForecastIssue({...feed,regions:feed.regions.map(r=>({...r,nights:r.nights.slice(0,6)}))},captured),/Too few/);
const partial=createForecastIssue({...feed,regions:feed.regions.slice(0,7)},captured);
assert.equal(partial.coverage.partial,true);
const olderFeed={...feed,generatedAt:'2027-04-09T19:05:00Z',regions:feed.regions.map(r=>({...r,nights:r.nights.map((n,i)=>({...n,date:shiftDate('2027-04-09',i)}))}))};
const earlier=createForecastIssue(olderFeed,new Date('2027-04-09T19:10:00Z'));
assert.throws(()=>appendForecastIssue([issue],earlier),/Backdating/);
assert.throws(()=>appendForecastIssue([{...issue,source:'https://evil.example'}],earlier),/invalid/);
assert.equal(checkedArchive([{...issue,archivedAt:'2027-04-11T19:10:00Z'}],today).length,0);
assert.equal(checkedArchive([{...issue,issueDay:'2027-02-10'}],today).length,0);
assert.equal(checkedArchive([{...issue,regions:[{...issue.regions[0],station:'BAD'}]}],today).length,0);
assert.equal(checkedArchive([{...issue,apiGeneratedAt:'2027-04-10T20:10:00.000Z'}],today).length,0);
const future=forecastArchiveCoverage([issue],[],'2027-04-11');
assert.equal(future.issueDays,1);
assert.equal(future.forecastRegionNights,63);
assert.equal(future.pairedSurveyNights,0);
assert.equal(future.accuracyStatus,'not_evaluated');
assert.equal(future.probabilityCalibrated,false);
const monitored={
 type:'standardized_monitoring_night',regionId:'southeast',night:today,
 outcome:'movement_seen',method:'stationary_repeat',minutes:60,observers:2,
 completed:true,repeatedProtocol:true,organization:'Michigan Nature Association',
 sourceUrl:'https://michigannature.wordpress.com/2027/04/reviewed-report/',
 reviewedOn:'2027-04-11',reviewStatus:'owner_source_reviewed',privacy:'broad_region_only'};
const pair=forecastArchiveCoverage([issue],[monitored,{...monitored,regionId:'mid',outcome:'none_encountered',sourceUrl:'https://michigannature.wordpress.com/2027/04/second-report/'}],'2027-04-11');
assert.equal(pair.pairedSurveyNights,2);
assert.equal(pair.pairedMovementSurveys,1);
assert.equal(pair.pairedNoEncounterSurveys,1);
assert.equal(pair.accuracyStatus,'not_evaluated');
const unpaired=forecastArchiveCoverage([issue],[{...monitored,night:'2027-04-09',reviewedOn:'2027-04-11'}],'2027-04-11');
assert.equal(unpaired.pairedSurveyNights,0,'No backfilled or 7-day future snapshot used for same-day pairing');
const empty=forecastArchiveCoverage([],[],'2026-10-17');
assert.equal(empty.archiveState,'not_started');
assert.equal(empty.issueDays,0);
assert.equal(empty.pairedNoEncounterSurveys,0);
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8')),[],'Never seed fabricated historical issues');
const wf=fs.readFileSync(new URL('../.github/workflows/salamander-forecast-archive.yml',import.meta.url),'utf8');
const capture=fs.readFileSync(new URL('../scripts/archive-salamander-forecast.mjs',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/salamander-observations.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../components/SalamanderObservations.js',import.meta.url),'utf8');
assert.ok(wf.includes("cron: '5 19 * 3-5 *'")&&wf.includes('workflow_dispatch')&&wf.includes('npm test'));
assert.ok(wf.includes('git push origin HEAD:main')&&wf.includes('git pull --rebase origin main'));
assert.ok(capture.includes('SNAPSHOT_SOURCE')&&capture.includes('already_recorded'));
assert.ok(api.includes('checkedArchive')&&api.includes('forecastArchive:{...forecastCoverage,issueTimeline}'));
assert.ok(ui.includes('What did the tracker predict at the time?')&&ui.includes('No archived spring forecast issues yet.'));
console.log('Salamander archive: true pre-night timestamps, no backfill/overwrite, 9x7 structure, partial outage, privacy, source freshness, effort matching and UI tests passed.');
