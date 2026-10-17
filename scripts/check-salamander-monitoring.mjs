import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewMonitoring,readMonitoringArchive,monitoringCoverage} from '../lib/salamander-monitoring.mjs';
import {fieldEvidenceReadiness} from '../lib/salamander-field-review.mjs';

const now=new Date('2027-04-18T15:00:00Z'),today='2027-04-18';
const base={regionId:'central-up',night:'2027-04-11',outcome:'none_encountered',
 method:'stationary_repeat',minutes:45,observers:2,completed:true,repeatedProtocol:true,
 organization:'Michigan Nature Association',
 sourceUrl:'https://michigannature.wordpress.com/2027/04/field-monitoring-summary/',
 sourceExcerpt:'After 45 minutes of stationary monitoring during a completed evening watch, no salamanders or amphibians were observed.',
 ownerApproved:true,sourceChecked:true,dateChecked:true,effortChecked:true,privacyChecked:true,
 visitorName:'DO NOT LEAK PRIVATE NAME',coords:[46.1234,-87.5432],notes:'DO NOT LEAK PRIVATE SITE'};
const archive=reviewMonitoring(base,[],now);
assert.equal(archive.length,1);
assert.equal(archive[0].outcome,'none_encountered');
assert.equal(archive[0].minutes,45);
assert.equal(archive[0].observers,2);
assert.equal(archive[0].type,'standardized_monitoring_night');
assert.equal(archive[0].reviewStatus,'owner_source_reviewed');
assert.equal(archive[0].reviewedOn,today);
for(const secret of ['DO NOT LEAK','coords','notes','sourceExcerpt','visitorName']){
 assert.ok(!JSON.stringify(archive).includes(secret),'Private submitter field copied: '+secret);
}
const coverage=monitoringCoverage(archive,today);
assert.equal(coverage.sessions,1);
assert.equal(coverage.withNoEncounters,1);
assert.equal(coverage.withMovement,0);
assert.equal(coverage.minutesObserved,45);
assert.equal(coverage.observerMinutes,90);
assert.equal(coverage.observedRegionNights,1);
assert.equal(coverage.regions,1);
assert.equal(coverage.calibrationReady,false);
assert.equal(coverage.asIssuedForecastSnapshots,0);
assert.equal(coverage.heldOutEvaluationPassed,false);
assert.equal(readMonitoringArchive(archive,today).length,1);
assert.throws(()=>reviewMonitoring(base,archive,now),/Duplicate/);
for(const flag of ['ownerApproved','sourceChecked','dateChecked','effortChecked','privacyChecked']){
 assert.throws(()=>reviewMonitoring({...base,[flag]:false},[],now),/signoff/);
}
for(const [k,val] of Object.entries({completed:false,repeatedProtocol:false,minutes:19,observers:0,method:'incidental',outcome:'unknown',night:'2027-02-19',sourceUrl:'https://evil.example.com/review',regionId:'secret-pool'})){
 assert.throws(()=>reviewMonitoring({...base,[k]:val},[],now),'Must reject invalid '+k);
}
assert.throws(()=>reviewMonitoring({...base,night:'2027-05-02'},[],now),/date/);
assert.throws(()=>reviewMonitoring({...base,sourceExcerpt:'No wildlife data are available due to an unvisited site.'},[],now),/Source/);
assert.throws(()=>reviewMonitoring({...base,sourceExcerpt:'We watched for 45 minutes, but results were not recorded.'},[],now),/none encountered/);
assert.throws(()=>reviewMonitoring({...base,sourceExcerpt:'A survey was completed at N 46.540, no salamanders were seen.'},[],now),/site details/);
assert.throws(()=>reviewMonitoring({...base,organization:'A nearby vernal pool at 46.521'},[],now),/Organization/);
const moved={...base,outcome:'movement_seen',night:'2027-04-12',
 sourceExcerpt:'The 45-minute completed monitored watch documented spotted salamanders moving toward spring breeding habitat.'};
const two=reviewMonitoring(moved,archive,now);
assert.equal(two.length,2);
const summary=monitoringCoverage(two,today);
assert.equal(summary.withMovement,1);
assert.equal(summary.withNoEncounters,1);
assert.equal(summary.observerMinutes,180);
const ready=fieldEvidenceReadiness([],today,two);
assert.equal(ready.standardizedMonitoringNights,2);
assert.equal(ready.validatedNonMovementNights,1);
assert.equal(ready.reviewedMovementSurveys,1);
assert.equal(ready.calibrationReady,false);
assert.equal(ready.candidateForProspectiveTesting,false);
assert.throws(()=>reviewMonitoring({...base,method:'foot_route_repeat',sourceUrl:'https://michigannature.wordpress.com/2027/04/field-monitoring-summary/?gps=1'},[],now));
assert.equal(readMonitoringArchive([{...archive[0],completed:false}],today).length,0);
assert.equal(monitoringCoverage([],today).sessions,0);
assert.equal(fieldEvidenceReadiness([],today,[]).validatedNonMovementNights,0);
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/salamander-monitored-nights.json',import.meta.url),'utf8')),[],'No invented negatives');
const ui=fs.readFileSync(new URL('../components/SalamanderObservations.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/salamander-observations.js',import.meta.url),'utf8');
const wf=fs.readFileSync(new URL('../.github/workflows/salamander-monitoring-review.yml',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/salamander-migration.css',import.meta.url),'utf8');
assert.ok(ui.includes('Log a completed monitoring night')&&ui.includes('No movement')===false);
assert.ok(ui.includes('form.jotform.com/262892813306057')&&ui.includes('None encountered'));
assert.ok(api.includes('MONITORED')&&api.includes('monitored:readiness.monitoring'));
assert.ok(wf.includes('github.actor')&&wf.includes('github.repository_owner')&&wf.includes('npm test')&&wf.includes('npm run build'));
assert.ok(wf.includes('inputs.effort_checked')&&wf.includes('git push origin HEAD:main'));
assert.ok(css.includes('sala-monitoring-dashboard'));
console.log('Salamander standardized monitoring: actual effort, explicit zero versus no reporting, source review, privacy, date, duplicates, model gate and UI tests passed.');
