import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS,shiftDate} from '../lib/salamanders.mjs';
import {createForecastIssue,checkedArchive} from '../lib/salamander-forecast-archive.mjs';
import {ARCHIVE_OPERATIONAL_START,michiganHour,archiveHealth,watchdogStatus} from '../lib/salamander-archive-health.mjs';

assert.equal(ARCHIVE_OPERATIONAL_START,'2027-03-01');
assert.equal(michiganHour(new Date('2027-03-01T23:05:00Z')),18,'EST end of day');
assert.equal(michiganHour(new Date('2027-04-10T22:05:00Z')),18,'EDT end of day');
const mk=(d,climateAge=1)=>createForecastIssue({status:'spring_watch',generatedAt:d+'T19:05:00.000Z',
 regions:REGIONS.map(x=>({id:x.id,season:'spring',nwsUpdatedAt:d+'T18:00:00Z',
  thaw:{state:'unknown',observationAgeDays:climateAge},
  nights:Array.from({length:7},(_,i)=>({date:shiftDate(d,i),level:i%2?'watch':'dry',
   temp:45,rainChance:35,warmRainHours:2,thawLimited:false}))}))},new Date(d+'T19:10:00Z'));
const march1=mk('2027-03-01'),march3=mk('2027-03-03');
assert.equal(march1.upstream.status,'healthy');
assert.equal(march1.upstream.freshNwsRegions,9);
assert.equal(march1.upstream.recentClimateRegions,9);
assert.equal(march1.regions[0].nwsUpdatedAt,'2027-03-01T18:00:00.000Z');
assert.equal(march1.regions[0].climateAgeDays,1);
assert.equal(mk('2027-03-02',null).upstream.status,'thaw_data_limited');
assert.equal(checkedArchive([march1,march3],'2027-03-03').length,2);
const before=archiveHealth([],new Date('2026-10-17T22:00:00Z'));
assert.equal(before.state,'off_season');
assert.equal(before.expectedCompletedDays,0);
assert.equal(before.missedCompletedDays,0);
assert.equal(before.alertActive,false);
assert.equal(watchdogStatus([],new Date('2026-10-17T22:00:00Z')).alert,false);
const morning=archiveHealth([],new Date('2027-03-01T12:00:00Z'));
assert.equal(morning.state,'before_capture_window');
assert.equal(morning.expectedCompletedDays,0);
assert.equal(morning.missedCompletedDays,0);
const afternoon=archiveHealth([],new Date('2027-03-01T19:30:00Z'));
assert.equal(afternoon.state,'capture_window_open');
assert.equal(afternoon.missedCompletedDays,0);
assert.equal(afternoon.alertActive,false);
const missed=archiveHealth([],new Date('2027-03-01T23:05:00Z'));
assert.equal(missed.state,'missed_today');
assert.equal(missed.expectedCompletedDays,1);
assert.deepEqual(missed.recentMissingDates,['2027-03-01']);
assert.equal(watchdogStatus([],new Date('2027-03-01T23:05:00Z')).alert,true);
const captured=archiveHealth([march1],new Date('2027-03-01T23:30:00Z'));
assert.equal(captured.state,'captured_today');
assert.equal(captured.recordedCompletedDays,1);
assert.equal(captured.missedCompletedDays,0);
assert.equal(watchdogStatus([march1],new Date('2027-03-01T23:30:00Z')).alert,false);
const ongoing=archiveHealth([march1,march3],new Date('2027-03-03T20:00:00Z'));
assert.equal(ongoing.state,'captured_today');
assert.equal(ongoing.expectedCompletedDays,2);
assert.equal(ongoing.recordedCompletedDays,1);
assert.equal(ongoing.missedCompletedDays,1);
assert.deepEqual(ongoing.recentMissingDates,['2027-03-02']);
const oldGap=archiveHealth([march1,march3],new Date('2027-03-04T23:30:00Z'));
assert.equal(oldGap.state,'missed_today');
assert.deepEqual(oldGap.recentMissingDates,['2027-03-02','2027-03-04']);
assert.equal(oldGap.expectedCompletedDays,4);
assert.equal(oldGap.recordedCompletedDays,2);
assert.equal(oldGap.missedCompletedDays,2);
const offSeason=archiveHealth([march1,march3],new Date('2027-10-17T22:00:00Z'));
assert.equal(offSeason.state,'off_season');
assert.equal(watchdogStatus([march1,march3],new Date('2027-10-17T22:00:00Z')).alert,false);
assert.ok(offSeason.missedCompletedDays>0,'Seasonal history retains genuine missed forecast days');
assert.ok(offSeason.gapsOmittedFromList>0);
assert.equal(archiveHealth([{...march1,source:'https://not-nws.example'}],new Date('2027-03-01T23:30:00Z')).missedCompletedDays,1,'Corrupted forecast must count as missing, not healthy');
const limited=archiveHealth([mk('2027-03-02',8)],new Date('2027-03-02T23:20:00Z'));
assert.equal(limited.staleUpstreamIssues,1);
assert.equal(limited.recordedCompletedDays,1);
assert.equal(limited.missedCompletedDays,1);
assert.equal(limited.unverifiedUpstreamIssues,0);
assert.throws(()=>createForecastIssue({status:'spring_watch',generatedAt:'2027-03-01T19:05:00Z',
 regions:REGIONS.map(x=>({id:x.id,season:'spring',nwsUpdatedAt:'2027-02-27T18:00:00Z',thaw:{state:'unknown',observationAgeDays:1},
 nights:Array.from({length:7},(_,i)=>({date:shiftDate('2027-03-01',i),level:'dry',temp:45,rainChance:0,warmRainHours:0,thawLimited:false}))}))},new Date('2027-03-01T19:10:00Z')),/Too few/,'Stale NWS grid must block archive, even if HTTP response just arrived');
for(const [file,part] of [
 ['.github/workflows/salamander-forecast-archive.yml',"cron: '5 19,21 * 3-5 *'"],
 ['.github/workflows/salamander-archive-watchdog.yml',"cron: '20 23 * 3-5 *'"],
 ['scripts/archive-salamander-forecast.mjs','already_recorded'],
 ['scripts/salamander-archive-window.mjs','capture_required'],
 ['scripts/salamander-archive-watchdog.mjs','watchdogStatus'],
 ['pages/api/salamanders.js','nwsUpdatedAt:wx.value.updatedAt'],
 ['pages/api/salamander-observations.js','issueTimeline,health:operations'],
 ['components/SalamanderObservations.js','id="archive-health"']
])assert.ok(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').includes(part),'Required operational connection missing: '+file);
const wf=fs.readFileSync(new URL('../.github/workflows/salamander-archive-watchdog.yml',import.meta.url),'utf8');
assert.ok(wf.includes('issues: write')&&wf.includes('gh issue list')&&wf.includes('gh issue create')&&wf.includes('Already flagged missing'));
assert.ok(!wf.includes('archive-salamander-forecast.mjs'),'Watchdog cannot create hindsight forecast');
const sched=fs.readFileSync(new URL('../.github/workflows/salamander-forecast-archive.yml',import.meta.url),'utf8');
assert.ok(sched.includes("steps.due.outputs.capture_required == 'true'"),'Repeated archive must be cheap once already captured');
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8')),[],'No fabricated 2026/2027 snapshots');
console.log('Salamander archive health: DST, duplicate retry, permanent gaps, safe off-season, NOAA/NWS freshness, alerts, source validation and UI contracts passed.');
