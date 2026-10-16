// Machine-screen Jotform evidence; it is NEVER a confirmed on-site observation.
// We intentionally store no visitor PII, exact coordinates, photos or freeform notes.
import {STOPS} from './trillium.mjs';
const MANAGER_DOMAINS=new Set(['michigan.gov','www.michigan.gov','nature.org','www.nature.org','michigannature.org','www.michigannature.org','landtrust.org','www.landtrust.org']);
const FIELDS=['formID','formId','submissionID','submissionId','rawRequest'];
const stageValues=new Set(['BUDDING','FLOWERING','FADING','DONE','NEAR_PEAK','PEAK']);
const allowedDates=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export function parseInbound(body,contentType=''){
 if(!body||typeof body!=='string'||Buffer.byteLength(body)>65000)throw Error('Invalid payload size');
 let item={};
 if(/multipart\/form-data/i.test(contentType)){
  const boundary=contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1]||contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if(!boundary||boundary.length>150)throw Error('Missing multipart boundary');
  for(const chunk of body.split('--'+boundary)){
   const header=chunk.slice(0,chunk.indexOf('\r\n\r\n'));
   const key=header.match(/name="([^"]+)"/)?.[1];
   if(!key||!FIELDS.includes(key)||chunk.includes('filename='))continue;
   const value=chunk.slice(header.length+4).replace(/\r\n$/,'').trim();
   if(value.length<45000)item[key]=value;
  }
 }else if(/application\/json/i.test(contentType)){
  const parsed=JSON.parse(body);
  if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))item=parsed;
 }else if(/application\/x-www-form-urlencoded/i.test(contentType)||!contentType){
  const params=new URLSearchParams(body);
  for(const [key,value] of params)if(FIELDS.includes(key))item[key]=value;
 }else throw Error('Unsupported webhook content type');
 const raw=typeof item.rawRequest==='string'?JSON.parse(item.rawRequest):item.rawRequest;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Missing submitted form values');
 const formID=String(item.formID||item.formId||raw.formID||'');
 const submissionID=String(item.submissionID||item.submissionId||raw.submissionID||raw.id||'');
 if(formID!=='262882681844066'||!/^[0-9]{10,25}$/.test(submissionID))throw Error('Untrusted form or submission identifier');
 return {submissionID,raw};
}
function pick(raw,terms){
 const values=Object.entries(raw).filter(([k,v])=>!(/^(q\d+_?\w*|[a-z]+)$/i.test(k))?false:typeof v==='string'||typeof v==='object');
 return values.filter(([key])=>terms.some(term=>key.toLowerCase().includes(term))).map(([,v])=>v);
}
function resolveDate(raw){
 const matches=pick(raw,['dateobserved','date_observed','observationdate','dateobserv','whenwas','dateofobserv','observedat']);
 const possible=[...matches,...Object.values(raw).filter(v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))];
 for(const v of possible){
  if(typeof v==='string'){
   if(allowedDates(v))return v;
   const m=v.match(/^(\d{1,2})[-\/] (\d{1,2})[-\/] (\d{4})$/);
   if(m){const d=m[3]+'-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');if(allowedDates(d))return d;}
  }else if(v&&typeof v==='object'&&!Array.isArray(v)){
   const y=v.year||v.y,m=v.month||v.m,d=v.day||v.d;
   if(y&&m&&d){const date=String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');if(allowedDates(date))return date;}
  }
 }
 return null;
}
function inSeason(date,now){
 if(!allowedDates(date))return false;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const take=k=>today.find(p=>p.type===k)?.value;
 const thisDay=take('year')+'-'+take('month')+'-'+take('day');
 return date.slice(5)>='03-01'&&date.slice(5)<='07-15'&&date<=thisDay&&date>='2019-03-01';
}
function chooseUrl(raw){
 const values=[...pick(raw,['publicsupporting','evidenceurl','sourcelink','publicevidence']),...Object.values(raw)];
 for(const val of values){
  if(typeof val!=='string'||val.length>800||!val.startsWith('https://'))continue;
  let u;try{u=new URL(val);}catch{continue;}
  if(u.username||u.password||u.protocol!=='https:')continue;
  if(['www.inaturalist.org','inaturalist.org'].includes(u.hostname)&&/^\/observations\/\d+\/?$/.test(u.pathname))
   return {kind:'inaturalist',url:'https://www.inaturalist.org/observations/'+u.pathname.split('/')[2],observationId:u.pathname.split('/')[2]};
  if(MANAGER_DOMAINS.has(u.hostname)){u.hash='';return {kind:'manager_link',url:u.toString()};}
 }
 return null;
}
export function candidateFromWebhook(received,now=new Date()){
 const raw=received.raw;
 const fields=Object.entries(raw);
 const preserveValues=[...pick(raw,['preserve','location','where']),...fields.map(([,v])=>v)];
 const stop=STOPS.find(s=>preserveValues.some(v=>typeof v==='string'&&v.trim()===s.name));
 const date=resolveDate(raw),evidence=chooseUrl(raw);
 const stageValuesFound=[...pick(raw,['flowerstage','stage','whatflower']),...Object.values(raw)]
  .filter(v=>typeof v==='string').map(x=>x.toUpperCase().trim());
 const stage=stageValuesFound.find(v=>stageValues.has(v))||null;
 if(!stop||!date||!inSeason(date,now)||!evidence||!stage)return null;
 return {submissionID:received.submissionID,siteId:stop.id,observedAt:date,stage,sourceUrl:evidence.url,
  sourceKind:evidence.kind,evidenceStatus:'unverified_site',checkStatus:'awaiting_source_check'};
}
export async function verifyCandidate(candidate,fetcher=fetch){
 if(candidate.sourceKind!=='inaturalist'||candidate.stage!=='FLOWERING')
  return {...candidate,checkStatus:'link_only',evidenceStatus:'unverified_site'};
 const id=candidate.sourceUrl.split('/').at(-1);
 let response;
 try{response=await fetcher('https://api.inaturalist.org/v1/observations/'+encodeURIComponent(id),{
  headers:{Accept:'application/json'},signal:AbortSignal.timeout(6500)})}catch{return null;}
 if(!response.ok)return null;
 let raw;try{raw=await response.json();}catch{return null;}
 const record=raw?.results?.[0];
 if(!record||String(record.id)!==id||record.quality_grade!=='research'||record.taxon?.name!=='Trillium grandiflorum'||record.observed_on!==candidate.observedAt)return null;
 if(!Array.isArray(record.annotations)||!record.annotations.some(a=>a.controlled_attribute_id===12&&a.controlled_value_id===13))return null;
 // Research-grade species + annotated FLOWERING is verified, but NOT preserve membership.
 return {...candidate,checkStatus:'species_date_flowering_checked',evidenceStatus:'unverified_site'};
}
export function publicCandidate(c){
 return {siteId:c.siteId,observedAt:c.observedAt,stage:c.stage,sourceUrl:c.sourceUrl,checkStatus:c.checkStatus,
  evidenceStatus:'unverified_site'};
}
export function safeCandidateArchive(a){
 if(a?.schemaVersion!==1||!Array.isArray(a.records))throw Error('Invalid candidate archive');
 const ids=new Set();
 return a.records.map(r=>{
  if(!r||!/^[0-9]{10,25}$/.test(String(r.submissionID))||ids.has(String(r.submissionID))||!STOPS.some(s=>s.id===r.siteId)
   ||!allowedDates(r.observedAt)||!stageValues.has(r.stage)||!['inaturalist','manager_link'].includes(r.sourceKind)
   ||!['species_date_flowering_checked','link_only'].includes(r.checkStatus)||r.evidenceStatus!=='unverified_site'
   ||!chooseUrl({url:r.sourceUrl}))throw Error('Invalid archived candidate');
  ids.add(String(r.submissionID));return r;
 });
}
