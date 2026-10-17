import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS,shiftDate} from '../lib/salamanders.mjs';
import {createForecastIssue} from '../lib/salamander-forecast-archive.mjs';
import {evaluationDiagnostics,MIN_GROUP_SESSIONS,MIN_GROUP_PROGRAMS} from '../lib/salamander-evaluation.mjs';

const asOf='2027-04-20';
const makeIssue=(day,partial=false,override={})=>{
 const rows=(partial?REGIONS.slice(0,6):REGIONS).map((r,i)=>({id:r.id,season:'spring',thaw:{state:'unknown'},
  nights:Array.from({length:7},(_,lead)=>({date:shiftDate(day,lead),
   level:lead===0?(override[r.id]||(i===0?'strong':i===1?'watch':i===2?'unknown':'dry')):'dry',
   temp:45,rainChance:45,warmRainHours:2,thawLimited:false}))}));
 return createForecastIssue({status:'spring_watch',generatedAt:day+'T19:05:00.000Z',regions:rows},new Date(day+'T19:10:00.000Z'));
};
const survey=(day,region='southeast',outcome='movement_seen',org='Michigan Nature Association',method='stationary_repeat')=>({
 type:'standardized_monitoring_night',regionId:region,night:day,outcome,method,minutes:40,observers:2,
 completed:true,repeatedProtocol:true,organization:org,
 sourceUrl:'https://michigannature.wordpress.com/2027/04/reviewed-monitoring-'+day+'/',
 reviewedOn:'2027-04-20',reviewStatus:'owner_source_reviewed',privacy:'broad_region_only',
 privateLatitude:46.3333,siteCoordinates:'DO NOT EXPOSE'
});
const empty=evaluationDiagnostics([],[],asOf);
assert.equal(empty.status,'awaiting_forecasts');
assert.equal(empty.pairing.reviewedSessions,0);
assert.equal(empty.checksMet,0);
assert.equal(empty.verifiedSkill,false);
assert.equal(empty.calibratedProbability,false);
assert.equal(empty.heldOutEvaluated,false);
assert.ok(!JSON.stringify(empty).includes('DO NOT EXPOSE'));
const first=makeIssue('2027-04-10');
const noPair=evaluationDiagnostics([first],[],asOf);
assert.equal(noPair.forecast.issueDays,1);
assert.equal(noPair.forecast.sameNightRegionForecasts,9);
assert.equal(noPair.forecast.signals.strong,1);
assert.equal(noPair.forecast.signals.watch,1);
assert.equal(noPair.forecast.signals.unknown,1);
assert.equal(noPair.forecast.signals.other,6);
assert.equal(noPair.status,'awaiting_paired_surveys');
assert.equal(noPair.pairing.matchedSessions,0);
const mixed=evaluationDiagnostics([first],[
 survey('2027-04-10','southeast','movement_seen'),
 survey('2027-04-10','southwest','none_encountered'),
 survey('2027-04-10','west','movement_seen'),
 survey('2027-04-10','mid','none_encountered'),
 survey('2027-04-10','west','none_encountered','City of Marquette','foot_route_repeat'),
 survey('2027-04-10','northeast','movement_seen'),
 survey('2027-04-10','west','movement_seen'), // duplicate program+region+night; must not inflate counts
 survey('2027-04-10','central-up','movement_seen'),
 survey('2027-04-10','northwest','none_encountered'),
 survey('2027-04-10','saginaw-bay','movement_seen'),
 survey('2027-04-10','southwest','none_encountered','City of Marquette','stationary_repeat')
],asOf);
assert.equal(mixed.pairing.reviewedSessions,11);
assert.equal(mixed.pairing.matchedSessions,8);
assert.equal(mixed.pairing.duplicateProgramNightExcluded,1);
assert.equal(mixed.pairing.forecastUnknown,2);
assert.equal(mixed.pairing.matchedDistinctRegionNights,7);
assert.equal(mixed.pairing.matchedDistinctPrograms>=2,true);
assert.equal(mixed.status,'descriptive_only');
assert.equal(mixed.signalEvidence.find(x=>x.id==='strong').movement,null,'Single positive cannot be public cell');
assert.ok(!JSON.stringify(mixed).includes('DO NOT EXPOSE'));
assert.ok(!JSON.stringify(mixed).includes('privateLatitude'));
assert.ok(!JSON.stringify(mixed).includes('2027-04-10T19:10'));
assert.equal(mixed.accuracyMetricsPublished,false);
assert.equal(mixed.forecast.signals.strong,1);
const gaps=evaluationDiagnostics([makeIssue('2027-04-11',true)],[
 survey('2027-04-11','western-up','none_encountered'),
 survey('2027-04-11','northeast','none_encountered'),
 survey('2027-04-11','southwest','none_encountered'),
 survey('2027-04-09','west','movement_seen')
],asOf);
assert.equal(gaps.pairing.missingAsIssuedForecast,1);
assert.equal(gaps.pairing.regionWithoutForecast,2);
assert.equal(gaps.pairing.matchedSessions,1);
assert.equal(gaps.pairing.unmatchedSessions,3);
const dates=Array.from({length:9},(_,i)=>'2027-04-'+String(i+1).padStart(2,'0'));
const issues=dates.map(d=>makeIssue(d));
const orgs=['Michigan Nature Association','City of Marquette','Michigan DNR'];
const sightings=dates.map((d,i)=>survey(d,'southeast',i<3?'movement_seen':'none_encountered',orgs[i%3]));
let strong=evaluationDiagnostics(issues,sightings,asOf);
assert.equal(strong.pairing.matchedSessions,9);
assert.equal(strong.pairing.matchedDistinctRegionNights,9);
assert.equal(strong.pairing.matchedDistinctPrograms,3);
assert.equal(strong.pairing.matchedSeasons,1);
const strongRow=strong.signalEvidence.find(x=>x.id==='strong');
assert.equal(strongRow.status,'descriptive_counts_available');
assert.equal(strongRow.reviewedSessions,9);
assert.equal(strongRow.movement,3);
assert.equal(strongRow.noEncounters,6);
assert.equal(strongRow.programs,3);
assert.equal(strongRow.regionNights,9);
assert.equal(strong.accuracyMetricsPublished,false);
assert.equal(strong.heldOutEvaluated,false);
assert.equal(strong.checks.find(x=>x.id==='holdout').met,false);
assert.equal(strong.checks.find(x=>x.id==='sites').met,false);
assert.equal(MIN_GROUP_SESSIONS,8);
assert.equal(MIN_GROUP_PROGRAMS,3);
const below=evaluationDiagnostics(issues,sightings.slice(0,7),asOf);
assert.equal(below.signalEvidence.find(x=>x.id==='strong').status,'insufficient_or_sensitive');
assert.equal(below.signalEvidence.find(x=>x.id==='strong').movement,null);
const lopsided=evaluationDiagnostics(issues,sightings.map((x,i)=>({...x,outcome:i===0?'movement_seen':'none_encountered'})),asOf);
assert.equal(lopsided.signalEvidence.find(x=>x.id==='strong').movement,null,'One-case outcome cell must be suppressed');
const singleProgram=evaluationDiagnostics(issues,sightings.map(x=>({...x,organization:'Michigan Nature Association'})),asOf);
assert.equal(singleProgram.signalEvidence.find(x=>x.id==='strong').reviewedSessions,null,'Single repeated program must not unlock comparative claims');
const older=evaluationDiagnostics([makeIssue('2027-04-01')],[survey('2027-04-02')],asOf);
assert.equal(older.pairing.missingAsIssuedForecast,1,'Never pair an older seven-night forecast in lieu of issued same night');
const stale=evaluationDiagnostics([{...first,archivedAt:'2027-04-11T19:10:00.000Z'}],[survey('2027-04-10')],asOf);
assert.equal(stale.forecast.issueDays,0,'Invalid hindsight snapshot must be rejected');
assert.equal(stale.pairing.missingAsIssuedForecast,1);
const hiddenArchive=JSON.parse(fs.readFileSync(new URL('../data/salamander-monitored-nights.json',import.meta.url),'utf8'));
const forecastArchive=JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8'));
assert.deepEqual(hiddenArchive,[]);
assert.deepEqual(forecastArchive,[]);
const ui=fs.readFileSync(new URL('../components/SalamanderEvaluation.js',import.meta.url),'utf8');
const mount=fs.readFileSync(new URL('../components/SalamanderObservations.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/salamander-observations.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/salamander-migration.css',import.meta.url),'utf8');
assert.ok(ui.includes('Can we trust the Big Night forecast?')&&ui.includes('Skill not established'));
assert.ok(ui.includes('no encounters')||ui.includes('None encountered'));
assert.ok(ui.includes('No issued spring history yet')&&ui.includes('forecast hits'));
assert.ok(mount.includes('<SalamanderEvaluation evaluation={payload?.migration?.evaluation}/>'));
assert.ok(api.includes('evaluationDiagnostics(FORECAST_ISSUES,MONITORED,day)')&&api.includes('   evaluation,'));
assert.ok(css.includes('.sala-eval-gates')&&css.includes('.sala-eval-condition'));
console.log('Salamander evaluation: as-issued pairing, zero effort gaps, program-night deduplication, suppression, balanced cells, no-hindsight, privacy and skill claim gates passed.');
