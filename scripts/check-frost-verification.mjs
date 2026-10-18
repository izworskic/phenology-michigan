import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lookup,solarMorning} from '../lib/frostMorning.mjs';
import {HISTORY_DAYS,STATION_LIMIT_KM,validDate,key,kmBetween,forecastIssue,stationCandidates,observationSample,verifyIssue,pruneIssues,siteHistory,validateReviewedReport} from '../lib/frostVerification.mjs';
const bay=lookup('bay-city');
assert.equal(HISTORY_DAYS,400);
assert.equal(STATION_LIMIT_KM,65);
assert.ok(validDate('2026-10-18'));
assert.equal(validDate('2026-02-30'),false);
assert.equal(key('bay-city','2026-10-18'),'bay-city|2026-10-18');
assert.ok(kmBetween(43.6,-83.89,43.6,-83.89)<.1);
const sunrise=solarMorning('2026-10-18',bay).sunriseAt;
const at=mins=>new Date(Date.parse(sunrise)+mins*60000).toISOString();
const issued='2026-10-17T16:00:00.000Z';
const morning={date:'2026-10-18',score:88,photo:{sunriseAt:sunrise,status:'strong'},hourly:[
  {time:at(-50),score:85,tempF:28,dewF:26,windMph:3},
  {time:at(10),score:90,tempF:29,dewF:27,windMph:2}]};
const issue=forecastIssue(bay,morning,issued);
assert.equal(issue.predicted.score,88);
assert.equal(issue.verification.status,'pending');
assert.equal(forecastIssue(bay,morning,'2026-10-19T12:00:00Z'),null,'Do not archive forecasts after sunrise');
assert.equal(forecastIssue(bay,{...morning,hourly:[]},issued),null,'Missing future NWS weather blocks');
const nearStation={type:'Feature',id:'https://api.weather.gov/stations/KMBS',properties:{stationIdentifier:'KMBS'},geometry:{type:'Point',coordinates:[-83.84,43.53]}};
const tooFar={...nearStation,properties:{stationIdentifier:'KDTW'},geometry:{type:'Point',coordinates:[-83.35,42.2]}};
const candidates=stationCandidates([tooFar,nearStation],bay);
assert.equal(candidates.length,1,'Reject measurements beyond 65 km');
assert.equal(candidates[0].id,'KMBS');
function obs(mins,tempC,dewC,wind){
  return {properties:{timestamp:at(mins),temperature:{value:tempC},dewpoint:{value:dewC},windSpeed:{value:wind}}};
}
const good=observationSample([obs(-25,-1,-2,1),obs(5,-1.5,-2.8,1.5)],sunrise);
assert.equal(good.at,at(5),'Choose closest actual observation to local sunrise');
assert.equal(observationSample([obs(200,-1,-2,1)],sunrise),null,'No falsely local observations beyond 90m');
assert.equal(observationSample([{properties:{timestamp:at(0),temperature:{value:null},dewpoint:{value:-2},windSpeed:{value:1}}}],sunrise),null,'Missing NWS values cannot be zero');
const verified=verifyIssue(issue,candidates[0],good,'2026-10-18T17:00:00Z');
assert.equal(verified.verification.status,'station_weather_compared');
assert.ok(Number.isFinite(verified.verification.difference.tempF));
assert.ok(verified.verification.distanceKm<65);
assert.match(verified.verification.note,/neither confirms nor disproves hoarfrost/i);
assert.equal(verifyIssue(issue,candidates[0],null,'2026-10-18T17:00:00Z'),issue);
const pruned=pruneIssues([issue,verified,{...issue,date:'2023-01-01'}],'2026-10-19T16:00:00Z');
assert.equal(pruned.length,2,'Old history pruned; recent site history retained');
const sampleHistory=siteHistory({issues:[verified]},{reports:[]},'bay-city');
assert.equal(sampleHistory.samples,1);
assert.equal(sampleHistory.reviewedSightings.length,0);
assert.ok(sampleHistory.tempMeanAbsoluteErrorF>=0);
assert.match(sampleHistory.disclaimer,/not measured hoarfrost prediction accuracy/i);
const report={siteId:'bay-city',date:'2026-10-18',type:'frost-unspecified',
  evidenceUrl:'https://example.com/original-dated-frost-photo.jpg',issueNumber:387,
  reviewNote:'Original dated image independently reviewed; ice on grass is visible but the crystal type cannot be confidently distinguished.',
  reviewedAt:'2026-10-18T17:00:00Z'};
assert.equal(validateReviewedReport(report,[]),true);
assert.throws(()=>validateReviewedReport({...report,type:'hoarfrost-maybe'},[]));
assert.throws(()=>validateReviewedReport({...report,evidenceUrl:'http://unsafe.example/photo'},[]));
assert.throws(()=>validateReviewedReport(report,[report]),/duplicate/i);
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const doc=JSON.parse(read('../data/frost-forecast-issues.json'));
const sightings=JSON.parse(read('../data/frost-reviewed-sightings.json'));
assert.ok(Array.isArray(doc.issues),'The forecast archive must be a valid records array');
assert.ok(doc.issues.every(i=>
  lookup(i.siteId)&&validDate(i.date)&&Number.isFinite(Date.parse(i.issuedAt))&&
  Number.isFinite(Date.parse(i.sunriseAt))&&Date.parse(i.issuedAt)<Date.parse(i.sunriseAt)&&
  Number.isFinite(i.predicted?.score)&&i.predicted.score>=0&&i.predicted.score<=100&&
  ['pending','station_weather_compared'].includes(i.verification?.status)
),'Any saved forecasts must carry valid prospective provenance, sunrise times and legitimate weather data');
assert.equal(new Set(doc.issues.map(i=>key(i.siteId,i.date))).size,doc.issues.length,'Archive may not duplicate site-date forecast issues');
assert.ok(Array.isArray(sightings.reports),'Reviewed frost sightings must use a valid records array');
sightings.reports.forEach((r,index)=>assert.equal(validateReviewedReport(r,sightings.reports.slice(0,index)),true),
  'Every reviewed sighting requires unique human-reviewed evidence');

assert.ok(read('../scripts/archive-frost-weather.mjs').includes('issueTomorrow'));
assert.ok(read('../scripts/archive-frost-weather.mjs').includes('verifyPast'));
assert.ok(read('../.github/workflows/frost-weather-history.yml').includes('schedule:'));
assert.ok(read('../.github/workflows/frost-photo-review.yml').includes('FROST_OWNER_APPROVED'));
assert.ok(read('../.github/ISSUE_TEMPLATE/frost-field-sighting.yml').includes('Original dated public'));
assert.ok(read('../scripts/review-frost-sighting.mjs').includes('validateReviewedReport'));
assert.ok(read('../pages/api/frost-history.js').includes('siteHistory'));
assert.ok(read('../components/FrostVerificationHistory.js').includes('No photographs have been independently reviewed'));
assert.ok(read('../components/FrostVerificationHistory.js').includes('cannot prove hoarfrost'));
assert.ok(read('../pages/frosty-mornings.js').includes('<FrostVerificationHistory'));
assert.ok(read('../public/frosty-mornings.css').includes('.fm-verify-stats'));
console.log('Frost forecast snapshot, independent station verification, dated photo review, privacy and UI contracts passed');
