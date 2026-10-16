import assert from 'node:assert/strict';
import fs from 'node:fs';
import HISTORY from '../data/trillium-site-history.json' with {type:'json'};
import {STOPS} from '../lib/trillium.mjs';
import {validateSiteRecord,readArchive,summarizeSiteEvidence,canonicalEvidenceLink,validDate} from '../lib/trillium-site-history.mjs';
import {issueSections,candidateFromIssue,verifyPublicObservation} from './review-trillium-site-report.mjs';
import {siteDecision} from '../lib/trillium-site-verification.mjs';
const stop=STOPS[0],now=new Date('2027-05-15T19:00:00Z');
const manager={siteId:stop.id,siteName:stop.name,stage:'FLOWERING',observedAt:'2027-05-14',reviewedAt:'2027-05-15',reviewedBy:'izworskic',
 sourceKind:'land_manager',sourceUrl:stop.url,sourceExcerpt:'On May 14 flowers were blooming in the named preserve woodland.',
 siteEvidenceNote:'The dated manager report explicitly names the public nature study area and depicts flowers on its official trail.',issueNumber:1};
assert.equal(validDate('2027-05-15'),true);assert.equal(validDate('2027-02-29'),false);
assert.equal(validateSiteRecord(manager,STOPS,now).siteId,stop.id);
assert.equal(siteDecision(stop,now,[manager],[]).state,'confirmed','Reviewed report activates fresh live site status');
assert.equal(siteDecision(stop,new Date('2027-05-23T19:00:00Z'),[manager],[]).state,'unverified','Archive retained but stale claim must expire');
for(const invalid of [
 {...manager,siteName:'Some other preserve'}, {...manager,siteId:'not-a-site'}, {...manager,reviewedAt:'2027-05-13'},
 {...manager,observedAt:'2027-05-16'}, {...manager,observedAt:'2027-01-08'}, {...manager,stage:'PEAK'},
 {...manager,sourceExcerpt:''}, {...manager,sourceUrl:'http://www.michigan.gov/anything'},
 {...manager,sourceUrl:'https://fake-michigan.gov/report'}, {...manager,reviewedBy:'1'},
 {...manager,siteEvidenceNote:'I drove past nearby'}, {...manager,issueNumber:0}
])assert.throws(()=>validateSiteRecord(invalid,STOPS,now),'Must reject bad preserve/date/evidence');
assert.equal(canonicalEvidenceLink('https://www.inaturalist.org/observations/76543?foo=bar#comments','reviewed_observation'),'https://www.inaturalist.org/observations/76543');
assert.equal(canonicalEvidenceLink('https://www.inaturalist.org/observations/76543/photo','reviewed_observation'),null);
assert.equal(canonicalEvidenceLink('https://www.inaturalist.org/observations/76543','land_manager'),null);
const obs={...manager,sourceKind:'reviewed_observation',sourceUrl:'https://www.inaturalist.org/observations/76543',observationFloweringReviewed:true};
delete obs.sourceExcerpt;
assert.equal(validateSiteRecord(obs,STOPS,now).sourceKind,'reviewed_observation');
assert.throws(()=>validateSiteRecord({...obs,observationFloweringReviewed:false},STOPS,now));
const original=readArchive(HISTORY,STOPS,now);
assert.equal(original.length,0,'No historical site bloom confirmations may be fabricated');
const record=validateSiteRecord(manager,STOPS,now);
const summaries=summarizeSiteEvidence(STOPS,[record]);
assert.equal(summaries.totalReports,1);assert.equal(summaries.sitesWithReports,1);
assert.equal(summaries.multiYearSites,0);
assert.equal(summaries.sites.find(s=>s.siteId===stop.id).firstFloweringDateByYear[0].date,'2027-05-14');
assert.equal(summaries.sites.find(s=>s.siteId===stop.id).eligibleForFutureValidation,false);
assert.ok(!JSON.stringify(summaries).includes('siteEvidenceNote'),'Reviewer proof notes must not leak in public API');
assert.ok(!JSON.stringify(summaries).includes('lat'),'No raw lat/longitude in public historical archive');
assert.throws(()=>readArchive({schemaVersion:1,records:[record,{...record,issueNumber:2}]},STOPS,now),'Duplicate source links cannot double count');
assert.throws(()=>readArchive({schemaVersion:1,records:[record,{...record,sourceUrl:'https://www.michigan.gov/dnr/places/natural-areas/warren-woods-nature-study-area',issueNumber:1}]},STOPS,now),'Duplicate intake issues cannot double count');
const issueBody=`### Preserve

${stop.name}

### Observation date

2027-05-14

### Flower stage reported

FLOWERING

### Public evidence URL

https://www.inaturalist.org/observations/76543

### Why is the observation at this preserve?

The source specifically identifies the signed public path.

### Source excerpt (land manager reports only)

Not provided

### Public sharing and privacy

- [X] I understand this issue and its evidence links will be public.
`;
const issue={number:101,title:'[Trillium field report] Site report',body:issueBody,state:'OPEN',labels:[]};
const sections=issueSections(issueBody);
assert.equal(sections.Preserve,stop.name);
assert.equal(sections['Observation date'],'2027-05-14');
const manual={reviewer:'izworskic',stage:'FLOWERING',siteEvidenceNote:'I personally examined the dated photo and the clearly identifiable official preserve trail sign.',observationFloweringReviewed:true};
const candidate=candidateFromIssue(issue,manual,STOPS,now);
assert.equal(candidate.siteId,stop.id);
assert.equal(candidate.reviewedAt,'2027-05-15');
assert.equal(candidate.observationFloweringReviewed,true);
assert.throws(()=>candidateFromIssue(issue,{...manual,observationFloweringReviewed:false},STOPS,now),'Research-grade flowering must be reviewed');
assert.throws(()=>candidateFromIssue({...issue,state:'CLOSED'},manual,STOPS,now));
assert.throws(()=>candidateFromIssue({...issue,title:'Plain issue'},manual,STOPS,now));
assert.throws(()=>candidateFromIssue({...issue,body:issueBody.replace('https://www.inaturalist.org/observations/76543','https://evil.example/flowers')},manual,STOPS,now));
const originalRequest=async()=>({ok:true,json:async()=>({results:[{id:76543,observed_on:'2027-05-14',quality_grade:'research',taxon:{name:'Trillium grandiflorum'},annotations:[{controlled_attribute_id:12,controlled_value_id:13}]}]})});
assert.equal(await verifyPublicObservation(candidate,originalRequest),true);
await assert.rejects(()=>verifyPublicObservation(candidate,async()=>({ok:true,json:async()=>({results:[{id:76543,observed_on:'2027-05-14',quality_grade:'research',taxon:{name:'Trillium erectum'},annotations:[]}]})})));
const page=fs.readFileSync(new URL('../pages/michigan-trillium.js',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/TrilliumFieldReports.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/trillium-site-history.js',import.meta.url),'utf8');
const currentApi=fs.readFileSync(new URL('../pages/api/trillium.js',import.meta.url),'utf8');
const action=fs.readFileSync(new URL('../.github/workflows/trillium-review-publish.yml',import.meta.url),'utf8');
const form=fs.readFileSync(new URL('../.github/ISSUE_TEMPLATE/trillium-field-report.yml',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/trillium.css',import.meta.url),'utf8');
assert.ok(page.includes('summarizeSiteEvidence')&&page.includes('SiteReportHistory')&&page.includes('TrilliumReportProgram'));
assert.ok(api.includes('summarizeSiteEvidence')&&api.includes('readArchive('));
assert.ok(currentApi.includes('reviewedHistory')&&currentApi.includes('siteDecision('));
assert.ok(component.includes('PUBLIC_REPORT_URL')&&component.includes('tri-evidence-archive'));
assert.ok(action.includes('workflow_dispatch')&&action.includes('github.actor')&&action.includes('github.repository_owner')&&action.includes('npm test'));
assert.ok(!action.includes('issues:\n  opened'),'Opening a user issue must never directly publish blooms');
assert.ok(form.includes('required: true')&&form.includes('Do not post GPS coordinates'));
assert.ok(css.includes('.tri-report-program')&&css.includes('.tri-evidence-archive'));
console.log('Michigan Trillium field evidence: source/date/site gates, owner review, duplicate prevention, stage verification, permanent archive and seven-day live expiry passed.');
