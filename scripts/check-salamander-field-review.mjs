import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewFieldReport,fieldEvidenceReadiness,localNowDate} from '../lib/salamander-field-review.mjs';
import {reviewedMigration} from '../lib/salamander-observations.mjs';
const now=new Date('2026-10-16T14:00:00Z');
assert.equal(localNowDate(now),'2026-10-16');
const input={
 regionId:'central-up',observedOn:'2026-04-07',method:'institutional_report',organization:'City of Marquette',
 sourceUrl:'https://www.marquettemi.gov/2026/04/seasonal-amphibian-movement/',
 sourceExcerpt:'The official notice documented salamanders migrating toward seasonal habitat following a rainy evening.',
 summary:'A dated municipal report documented spring amphibian movement in the broad central Upper Peninsula region.',
 ownerApproved:true,dateChecked:true,sourceChecked:true,privacyChecked:true
};
const initial=reviewFieldReport(input,[],now);
assert.equal(initial.length,1);
assert.equal(initial[0].type,'migration_observed');
assert.equal(initial[0].regionId,'central-up');
assert.equal(initial[0].reviewedOn,'2026-10-16');
assert.equal(initial[0].method,'institutional_report');
assert.equal(initial[0].verification,'source_reviewed');
assert.equal(initial[0].privacy,'regional_only');
assert.equal(reviewedMigration(initial,'2026-10-16').length,1);
assert.throws(()=>reviewFieldReport(input,initial,now),/Duplicate/);
for(const key of ['ownerApproved','dateChecked','sourceChecked','privacyChecked']){
 assert.throws(()=>reviewFieldReport({...input,[key]:false},[],now),/signoff/);
}
assert.throws(()=>reviewFieldReport({...input,sourceUrl:'https://evil.example.org/news/movement'},[],now));
assert.throws(()=>reviewFieldReport({...input,sourceUrl:'http://www.marquettemi.gov/2026/movement/'},[],now));
assert.throws(()=>reviewFieldReport({...input,sourceUrl:'https://www.marquettemi.gov/2026/movement/?id=secret'},[],now));
assert.throws(()=>reviewFieldReport({...input,sourceUrl:'https://www.marquettemi.gov/'},[],now));
assert.throws(()=>reviewFieldReport({...input,regionId:'secret-pool'},[],now));
assert.throws(()=>reviewFieldReport({...input,observedOn:'2026-12-01'},[],now));
assert.throws(()=>reviewFieldReport({...input,observedOn:'2026-02-25'},[],now));
assert.throws(()=>reviewFieldReport({...input,observedOn:'2026-04-31'},[],now));
assert.throws(()=>reviewFieldReport({...input,observedOn:'2027-04-08'},[],now));
assert.throws(()=>reviewFieldReport({...input,method:'sighting_only'},[],now));
assert.throws(()=>reviewFieldReport({...input,sourceExcerpt:'A salamander photograph exists on the web.'},[],now));
assert.throws(()=>reviewFieldReport({...input,summary:'Salamanders crossing at 46.546 -87.395.'},[],now));
assert.throws(()=>reviewFieldReport({...input,summary:'Salamanders were reported near 123 Road.'},[],now));
assert.throws(()=>reviewFieldReport({...input,organization:'unknown'},[{bad:'record'}],now),/invalid records/);
const one=fieldEvidenceReadiness(initial,'2026-10-16');
assert.equal(one.sourceReviewedEvents,1);
assert.equal(one.years,1);assert.equal(one.regions,1);
assert.equal(one.calibrationReady,false);
assert.equal(one.phase,'descriptive_archive');
const empty=fieldEvidenceReadiness([], '2026-10-16');
assert.equal(empty.sourceReviewedEvents,0);
assert.equal(empty.phase,'collecting_evidence');
assert.equal(empty.validatedNonMovementNights,0);
const larger=Array.from({length:32},(_,i)=>({...input,type:'migration_observed',regionId:['central-up','mid','southeast','northwest'][i%4],observedOn:'202'+String(i%3+3)+'-04-'+String(i%25+1).padStart(2,'0'),reviewedOn:'2026-10-16',sourceUrl:'https://www.marquettemi.gov/2026/reviewed-event-'+i+'/'}));
const sample=fieldEvidenceReadiness(larger,'2026-10-16');
assert.equal(sample.calibrationReady,false,'Positive-only evidence cannot calibrate prediction');
const data=JSON.parse(fs.readFileSync(new URL('../data/salamander-migration-reports.json',import.meta.url),'utf8'));
assert.deepEqual(data,[],'No fabricated observations or migrations may be seeded');
const wf=fs.readFileSync(new URL('../.github/workflows/salamander-field-review.yml',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/salamander-observations.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../components/SalamanderObservations.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/salamander-migration.js',import.meta.url),'utf8');
assert.ok(wf.includes('workflow_dispatch')&&wf.includes('github.actor')&&wf.includes('github.repository_owner'));
assert.ok(wf.includes('npm test')&&wf.includes('npm run build'));
assert.ok(api.includes('history:archive')&&api.includes('fieldEvidenceReadiness')&&api.includes('if(!spring)'));
assert.ok(ui.includes('form.jotform.com/262884591479072')&&ui.includes('calibrationReady')&&ui.includes('Historical archive'));
assert.ok(page.includes('SalamanderObservations'));
console.log('Salamander field evidence: source, owner review, privacy, invalid dates, duplicates, positive-only calibration, off-season and UI gates passed.');
