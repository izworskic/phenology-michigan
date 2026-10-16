// Maintainer-only GitHub Actions publisher. Candidate GitHub Issues never automatically
// become evidence. A trusted manual dispatch with a written on-site verification note
// is required. Does not save observer names, photos or plant coordinates.
import fs from 'node:fs/promises';
import {STOPS} from '../lib/trillium.mjs';
import {readArchive,validateSiteRecord,canonicalEvidenceLink} from '../lib/trillium-site-history.mjs';
const path=new URL('../data/trillium-site-history.json',import.meta.url);
export function issueSections(body){
 if(typeof body!=='string'||body.length>25000)throw Error('Invalid intake text');
 const chunks=body.split(/^### /m).slice(1),fields={};
 for(const chunk of chunks){
  const i=chunk.indexOf('\n');if(i<0)continue;
  const title=chunk.slice(0,i).trim(),value=chunk.slice(i+1).trim();
  if(title in fields)throw Error('Duplicated form fields');
  fields[title]=value;
 }
 return fields;
}
export function candidateFromIssue(issue,inputs,stops=STOPS,now=new Date()){
 if(issue?.state!=='OPEN' && issue?.state!=='open')throw Error('Only open intake issues can be reviewed');
 if(!Number.isSafeInteger(issue.number)||issue.number<=0)throw Error('Issue number required');
 if(typeof issue.title!=='string'||!issue.title.startsWith('[Trillium field report]'))throw Error('Issue is not a field report intake');
 const f=issueSections(issue.body);
 const preserve=f.Preserve,stop=stops.find(s=>s.name===preserve);
 if(!stop)throw Error('Unrecognized preserve selection');
 const url=f['Public evidence URL'],kind=/^https:\/\/(www\.)?inaturalist\.org\/observations\/\d+/.test(url||'')?'reviewed_observation':'land_manager';
 if(!canonicalEvidenceLink(url,kind))throw Error('Evidence link is not permitted');
 if(typeof inputs.stage!=='string')throw Error('Reviewer must independently choose the reviewed stage');
 const reviewer=inputs.reviewer;
 const todayParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=t=>todayParts.find(p=>p.type===t).value;
 const reviewedAt=get('year')+'-'+get('month')+'-'+get('day');
 const raw={siteId:stop.id,siteName:stop.name,observedAt:f['Observation date'],reviewedAt,
  stage:inputs.stage,sourceKind:kind,sourceUrl:url,reviewedBy:reviewer,issueNumber:issue.number,
  siteEvidenceNote:inputs.siteEvidenceNote,
  ...(kind==='land_manager'?{sourceExcerpt:f['Source excerpt (land manager reports only)']}:{observationFloweringReviewed:inputs.observationFloweringReviewed===true}),
  ...(['PEAK','NEAR_PEAK'].includes(inputs.stage)?{peakEvidenceNote:inputs.peakEvidenceNote}:{}),
 };
 return validateSiteRecord(raw,stops,now);
}
export async function verifyPublicObservation(record,request=fetch){
 if(record.sourceKind!=='reviewed_observation')return true;
 const id=new URL(record.sourceUrl).pathname.split('/').at(-1);
 const response=await request('https://api.inaturalist.org/v1/observations/'+id,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('iNaturalist observation not accessible');
 const data=await response.json(),o=data?.results?.[0];
 if(!o||String(o.id)!==id||o.quality_grade!=='research'||o.taxon?.name!=='Trillium grandiflorum'||o.observed_on!==record.observedAt)
  throw Error('Observation species, date, or research-grade evidence does not match');
 if(!o.annotations?.some(a=>a.controlled_attribute_id===12&&a.controlled_value_id===13))
  throw Error('Species flowering annotation not verifiable');
 return true;
}
async function main(){
 const file=process.env.TRILLIUM_ISSUE_JSON,actor=process.env.GITHUB_ACTOR,owner=process.env.GITHUB_REPOSITORY_OWNER;
 if(!actor||actor!==owner)throw Error('Only repository owner may publish on-site bloom evidence');
 const inputs={reviewer:actor,stage:process.env.REVIEWED_STAGE,siteEvidenceNote:process.env.ON_SITE_REVIEW_NOTE,
   peakEvidenceNote:process.env.PEAK_REVIEW_NOTE,observationFloweringReviewed:process.env.OBSERVATION_FLOWERING_REVIEWED==='true'};
 let record;
 if(process.env.REVIEW_SOURCE==='jotform'){
   // The owner independently reviews the received Jotform submission.
   // The numeric external reference is internal provenance, never displayed as a person.
   const number=String(process.env.REVIEW_EXTERNAL_ID||'');
   const site=STOPS.find(s=>s.id===process.env.REVIEW_SITE_ID);
   const current=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
   const get=k=>current.find(p=>p.type===k)?.value;
   const nowDate=get('year')+'-'+get('month')+'-'+get('day');
   if(!site||!/^[0-9]{10,25}$/.test(number))throw Error('Valid approved form ID and exact preserve required');
   const url=process.env.REVIEW_EVIDENCE_URL;
   const kind=/^https:\/\/(www\.)?inaturalist\.org\/observations\/\d+/.test(url||'')?'reviewed_observation':'land_manager';
   record=validateSiteRecord({siteId:site.id,siteName:site.name,observedAt:process.env.REVIEW_OBSERVED_AT,reviewedAt:nowDate,
      reviewedBy:actor,stage:inputs.stage,sourceKind:kind,sourceUrl:url,issueNumber:number,
      siteEvidenceNote:inputs.siteEvidenceNote,peakEvidenceNote:inputs.peakEvidenceNote,
      sourceExcerpt:process.env.REVIEW_SOURCE_EXCERPT,intakeKind:'jotform',observationFloweringReviewed:inputs.observationFloweringReviewed},STOPS);
 }else{
   if(!file)throw Error('Existing GitHub issue input required');
   const issue=JSON.parse(await fs.readFile(file,'utf8'));
   record=candidateFromIssue(issue,inputs,STOPS);
 }
 await verifyPublicObservation(record);
 const existing=JSON.parse(await fs.readFile(path,'utf8')),rows=readArchive(existing,STOPS);
 if(rows.some(r=>r.issueNumber===record.issueNumber||r.siteId===record.siteId&&r.sourceUrl===record.sourceUrl))
  throw Error('Source or issue is already archived; duplicate will not count');
 const output={...existing,updatedAt:record.reviewedAt,records:[...rows,record].sort((a,b)=>a.observedAt.localeCompare(b.observedAt))};
 await fs.writeFile(path,JSON.stringify(output,null,2)+'\n','utf8');
 console.log('Published manually reviewed preserve evidence: '+record.siteId+' '+record.observedAt+' from intake #'+record.issueNumber+' (no plant coordinates retained).');
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)await main();
