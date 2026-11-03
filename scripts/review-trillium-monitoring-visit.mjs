// Explicit owner-reviewed repeat visits. NEVER auto-promote issue content to field truth.
// This workflow writes a trusted archive, not a live preserve bloom status.
import fs from 'node:fs';
import {STOPS} from '../lib/trillium.mjs';

const ARCHIVE=new URL('../data/trillium-monitoring-visits.json',import.meta.url);
const SECTION=/^### (.+)\s*$/gm;
const CHOICE=new Set(['yes','no','uncertain']);
export function sections(body){
 if(typeof body!=='string'||body.length>14000)return {};
 const matches=[...body.matchAll(SECTION)], out={};
 for(let i=0;i<matches.length;i++){
  const x=matches[i],next=matches[i+1]?.index??body.length;
  out[x[1].trim()]=body.slice(x.index+x[0].length,next).trim();
 }
 return out;
}
function checked(text){
 return typeof text==='string'&&/\- \[[xX]\]/.test(text);
}
function michiganDay(now){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function validDay(value,now){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const date=new Date(value+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&value<=michiganDay(now)
    &&value.slice(5)>='03-15'&&value.slice(5)<='06-30'&&Number(value.slice(0,4))>=2010;
}
export function candidateFromIssue(issue,review,now=new Date()){
 if(!issue||typeof issue!=='object'||issue.state!=='OPEN'||!/^\[Trillium monitoring visit\] /i.test(issue.title||'')||!Number.isSafeInteger(issue.number)||issue.number<1)
  throw Error('Must review an existing OPEN, numbered repeat-visit issue');
 if(review?.siteVerified!==true||review?.speciesVerified!==true||review?.samePlotVerified!==true
  ||typeof review.note!=='string'||review.note.trim().length<30||review.note.length>900)
  throw Error('Owner must independently affirm preserve identity, species, stable patch and detailed evidence');
 if(typeof review.reviewer!=='string'||!/^[a-zA-Z0-9_-]{3,39}$/.test(review.reviewer))
  throw Error('Reviewer must be identified');
 const fields=sections(issue.body||'');
 const site=STOPS.find(s=>s.name===fields['Preserve']);
 if(!site)throw Error('Preserve identity is missing or unrecognized');
 const code=fields['Stable tracked patch code'];
 if(!['A','B','C'].includes(code))throw Error('Only stable A/B/C codes permitted');
 const date=fields['Date plants were actually inspected'];
 if(!validDay(date,now))throw Error('Invalid or future site observation date');
 const flower=fields['Open flowers'],buds=fields['Flowers or flower buds'],snow=fields['Snow on the monitored patch'];
 if(![flower,buds,snow].every(v=>CHOICE.has(v)))throw Error('Yes/no/uncertain required for each observed variable');
 if(flower==='yes'&&buds==='no')throw Error('Open flowers cannot coexist with no flowers/buds');
 if(!checked(fields['Privacy and access']))throw Error('Public-issue access and privacy confirmation missing');
 const loc=fields['How can the same publicly accessible patch and preserve be verified?'];
 if(typeof loc!=='string'||loc.length<30)throw Error('Submitter must describe verifiable repeated site identity');
 const evidence=(fields['Optional public supporting observation or field log URL']||'').replace(/_No response_/ig,'').trim();
 if(evidence){
  let url;try{url=new URL(evidence);}catch{throw Error('Invalid optional public evidence URL');}
  if(url.protocol!=='https:'||url.username||url.password||evidence.length>600)throw Error('Evidence must be an ordinary public HTTPS link');
 }
 const row={siteId:site.id,plotId:code,observedAt:date,openFlowers:flower,buds,snow,
  reviewedAt:michiganDay(now),reviewedBy:review.reviewer,
  siteProofReviewed:true,speciesChecked:true,unitStable:true,
  reviewNote:review.note.trim(),issueNumber:issue.number};
 const soil=(fields['Optional spot soil temperature in Fahrenheit']||'').replace(/_No response_/ig,'').trim();
 const depth=(fields['Optional soil probe depth in centimeters']||'').replace(/_No response_/ig,'').trim();
 if(Boolean(soil)!==Boolean(depth))throw Error('Spot soil reading and actual depth must both be provided or both omitted');
 if(soil){
  if(!/^-?\d+(?:\.\d+)?$/.test(soil)||!/^[0-9]+$/.test(depth))throw Error('Invalid soil measurement numbers');
  const fahrenheit=Number(soil),depthCm=Number(depth);
  if(!Number.isFinite(fahrenheit)||fahrenheit<15||fahrenheit>95||!Number.isInteger(depthCm)||depthCm<2||depthCm>20)
   throw Error('Soil probe temperature or depth outside plausible range');
  row.soilProbe={fahrenheit,depthCm,method:'field_probe'};
 }
 return row;
}
export function appendVisit(archive,row){
 if(archive?.schemaVersion!==1||archive?.species!=='Trillium grandiflorum'||archive?.phenophase!=='open_flowers'||!Array.isArray(archive.visits))
  throw Error('Existing field archive failed schema validation');
 if(archive.visits.some(v=>v.issueNumber===row.issueNumber))
  throw Error('This public issue was previously accepted');
 if(archive.visits.some(v=>v.siteId===row.siteId&&v.plotId===row.plotId&&v.observedAt===row.observedAt))
  throw Error('Duplicate site/patch/date: review the existing visit instead of double-counting');
 return {...archive,visits:[...archive.visits,row].sort((a,b)=>a.siteId.localeCompare(b.siteId)||a.plotId.localeCompare(b.plotId)||a.observedAt.localeCompare(b.observedAt))};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const body=JSON.parse(fs.readFileSync(process.env.TRILLIUM_MONITORING_ISSUE_FILE||'/tmp/trillium-monitoring-issue.json','utf8'));
 const approval={
  siteVerified:process.env.SITE_VERIFIED==='true',
  speciesVerified:process.env.SPECIES_VERIFIED==='true',
  samePlotVerified:process.env.SAME_PLOT_VERIFIED==='true',
  note:process.env.REVIEW_NOTE,
  reviewer:process.env.GITHUB_ACTOR,
 };
 const row=candidateFromIssue(body,approval);
 const archived=JSON.parse(fs.readFileSync(ARCHIVE,'utf8'));
 fs.writeFileSync(ARCHIVE,JSON.stringify(appendVisit(archived,row),null,2)+'\n');
 console.log('Accepted one independently reviewed site phenophase visit:',row.siteId,row.plotId,row.observedAt,row.openFlowers);
 console.log('No automatic preserve-bloom label or exact first-flower date was published.');
}
