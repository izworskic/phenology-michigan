import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STOPS} from '../lib/trillium.mjs';
import {parseInbound,candidateFromWebhook,verifyCandidate,safeCandidateArchive,publicCandidate} from '../lib/trillium-auto-intake.mjs';
const now=new Date('2027-05-16T16:00:00Z'),stop=STOPS[0];
const raw={formID:'262882681844066',id:'2523456789101234567',q4_preserve:stop.name,
 q5_dateObserved:{month:'05',day:'14',year:'2027'},q6_whatFlowerStage:'FLOWERING (open flowers)',
 q7_publicSupportingEvidenceURL:'https://www.inaturalist.org/observations/12345',
 q9_howCanEditorVerify:'Includes specific public preserve trail sign; should not be archived',
 q10_contact:'sensitive@example.net'};
const sent={submissionID:'2523456789101234567',formID:'262882681844066',rawRequest:JSON.stringify(raw)};
const parsed=parseInbound(new URLSearchParams(sent).toString(),'application/x-www-form-urlencoded; charset=utf-8');
assert.equal(parsed.submissionID,sent.submissionID);
const candidate=candidateFromWebhook(parsed,now);
assert.ok(candidate);
assert.equal(candidate.siteId,stop.id);assert.equal(candidate.observedAt,'2027-05-14');
assert.equal(candidate.sourceKind,'inaturalist');
assert.equal(candidate.stage,'FLOWERING');
assert.ok(!JSON.stringify(candidate).includes('sensitive@example.net'),'Never store visitor email');
assert.ok(!JSON.stringify(candidate).includes('trail sign'),'Never store submitted location details');
const multipart='----trillium-boundary';
const multipartBody=Object.entries(sent).map(([key,value])=>'--'+multipart+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+value+'\r\n').join('')+'--'+multipart+'--\r\n';
assert.equal(parseInbound(multipartBody,'multipart/form-data; boundary='+multipart).submissionID,sent.submissionID);
assert.equal(parseInbound(JSON.stringify(sent),'application/json').submissionID,sent.submissionID);
assert.throws(()=>parseInbound(new URLSearchParams({...sent,formID:'unknown'}).toString(),'application/x-www-form-urlencoded'),'Reject rogue webhooks');
assert.throws(()=>parseInbound('file data','text/plain'));
assert.throws(()=>parseInbound('a'.repeat(70000),'application/json'),'Body size guard');
assert.equal(candidateFromWebhook({...parsed,raw:{...raw,q4_preserve:'Other Michigan preserve'}},now),null);
assert.equal(candidateFromWebhook({...parsed,raw:{...raw,q5_dateObserved:{month:'05',day:'25',year:'2027'}}},now),null,'Future observation rejected');
assert.equal(candidateFromWebhook({...parsed,raw:{...raw,q7_publicSupportingEvidenceURL:'https://attacker.example/record'}},now),null);
assert.equal(candidateFromWebhook({...parsed,raw:{...raw,q6_whatFlowerStage:'BOOM_NOW'}} ,now),null);
const validObservation={id:12345,observed_on:'2027-05-14',quality_grade:'research',taxon:{name:'Trillium grandiflorum'},annotations:[{controlled_attribute_id:12,controlled_value_id:13}]};
const mock=o=>async()=>({ok:true,json:async()=>({results:[o]})});
const confirmed=await verifyCandidate(candidate,mock(validObservation));
assert.equal(confirmed.checkStatus,'species_date_flowering_checked');
assert.equal(confirmed.evidenceStatus,'unverified_site','Research-grade observation NEVER establishes preserve membership');
assert.equal(publicCandidate(confirmed).evidenceStatus,'unverified_site');
assert.equal(publicCandidate(confirmed).submissionID,undefined,'No contributor identifier in public API');
for(const wrong of [{...validObservation,taxon:{name:'Trillium erectum'}},{...validObservation,annotations:[]},
 {...validObservation,quality_grade:'casual'},{...validObservation,observed_on:'2027-05-15'}]){
 assert.equal(await verifyCandidate(candidate,mock(wrong)),null,'Reject wrong species/annotation/date/grade');
}
const manager=candidateFromWebhook({...parsed,raw:{...raw,q7_publicSupportingEvidenceURL:'https://www.michigan.gov/dnr/places/natural-areas/warren-dunes-nature-study-area'}},now);
assert.equal((await verifyCandidate(manager)).checkStatus,'link_only','Manager link can be stored but NOT called blooming');
const archive=JSON.parse(fs.readFileSync(new URL('../data/trillium-automatic-reports.json',import.meta.url),'utf8'));
assert.equal(safeCandidateArchive(archive).length,0,'Never seed production with invented blooms');
const row={...confirmed,receivedAt:'2027-05-16T16:00:00.000Z'};
assert.equal(safeCandidateArchive({schemaVersion:1,records:[row]}).length,1);
assert.throws(()=>safeCandidateArchive({schemaVersion:1,records:[row,row]}),'Cannot double count identical Jotform submissions');
assert.throws(()=>safeCandidateArchive({schemaVersion:1,records:[{...row,evidenceStatus:'confirmed'}]}),'Public candidate never becomes confirmed without site proof');
const endpoint=fs.readFileSync(new URL('../pages/api/trillium-autosubmit.js',import.meta.url),'utf8');
const publicApi=fs.readFileSync(new URL('../pages/api/trillium-auto-reports.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/michigan-trillium.js',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/TrilliumFieldReports.js',import.meta.url),'utf8');
assert.ok(endpoint.includes('TRILLIUM_WEBHOOK_SECRET')&&endpoint.includes('timingSafeEqual')&&endpoint.includes('GH_TOKEN'));
assert.ok(endpoint.includes('safeCandidateArchive')&&endpoint.includes('PUT')&&endpoint.includes('sha:old.data.sha'));
assert.ok(endpoint.includes('res.status(401)')&&endpoint.includes('bodyParser:false'));
assert.ok(publicApi.includes('evidenceStatus')===false&&publicApi.includes('publicCandidate'));
assert.ok(page.includes('/api/trillium-auto-reports')&&component.includes('Automatically checked source links'));
console.log('Trillium automatic Jotform ingestion: secure body parser, exact site/species/date/flowering checks, source-only public display, privacy, duplication and season gates passed.');
