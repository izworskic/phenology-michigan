// Source-reviewed standardized salamander monitoring sessions (not regional absence claims).
// No online submission may publish a record; GitHub owner approval is mandatory.
// One completed 20–180 minute repeated, authorized survey with explicit effort and public
// institutional source is the unit. ZERO means "not encountered during this survey".
import {REGIONS} from './salamanders.mjs';
const REGION_IDS=new Set(REGIONS.map(x=>x.id));
const METHODS=new Set(['stationary_repeat','foot_route_repeat']);
const OUTCOMES=new Set(['movement_seen','none_encountered']);
const SOURCE_HOSTS=new Set(['michigan.gov','www.michigan.gov','marquettemi.gov','www.marquettemi.gov','michigannature.org','www.michigannature.org','michigannature.wordpress.com','nature.org','www.nature.org','mivernalpools.com','www.mivernalpools.com','vppartnership.iescentral.com','msu.edu','www.msu.edu','canr.msu.edu','www.canr.msu.edu']);
const LOCATIONS=/(?:\bGPS\b|\bcoordinates?\b|\b(?:lat|lon)(?:itude|gitude)?\b|\b(?:road|street|highway|hwy|route|trailhead|parking lot|vernal pool|breeding pool|crossing)\s+(?:at|near|on|behind|beside)\b|[-+]?\d{2}\.\d{3,}|\b\d{1,4}\s+(?:st\.|rd\.|road|street|drive|avenue|hwy|route)\b)/i;
const todayInMichigan=(now)=>{const a=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const v=k=>a.find(x=>x.type===k).value;return v('year')+'-'+v('month')+'-'+v('day');};
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const allowedText=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.trim().length<=max&&!LOCATIONS.test(s);
function safeUrl(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!SOURCE_HOSTS.has(u.hostname)||u.pathname.length<5||u.toString().length>600)return null;return u.toString();}catch{return null;}
}
const pass=(ok,msg)=>{if(!ok)throw Error(msg);};
const validNight=(d,today)=>dateOk(d)&&d>='2019-03-01'&&d<=today&&d.slice(5)>='03-01'&&d.slice(5)<='05-31';
function safeRecord(r,today){
 if(!r||r.type!=='standardized_monitoring_night'||!REGION_IDS.has(r.regionId)||!validNight(r.night,today)||!dateOk(r.reviewedOn)||r.reviewedOn<r.night||r.reviewedOn>today||!METHODS.has(r.method)||!OUTCOMES.has(r.outcome)||r.completed!==true||r.repeatedProtocol!==true||!integer(r.minutes,20,180)||!integer(r.observers,1,12)||!allowedText(r.organization,4,100)||!safeUrl(r.sourceUrl)||r.reviewStatus!=='owner_source_reviewed'||r.privacy!=='broad_region_only')return null;
 // Never copy any other keys (no submitted notes, names, GPS, photos, source excerpt).
 return {type:'standardized_monitoring_night',regionId:r.regionId,night:r.night,
  outcome:r.outcome,method:r.method,minutes:r.minutes,observers:r.observers,
  completed:true,repeatedProtocol:true,organization:r.organization.trim(),
  sourceUrl:safeUrl(r.sourceUrl),reviewedOn:r.reviewedOn,reviewStatus:'owner_source_reviewed',privacy:'broad_region_only'};
}
export function readMonitoringArchive(rows,day){
 if(!Array.isArray(rows)||!dateOk(day))return [];
 return rows.map(r=>safeRecord(r,day)).filter(Boolean).sort((a,b)=>a.night.localeCompare(b.night)||a.regionId.localeCompare(b.regionId));
}
export function reviewMonitoring(input,archive,now=new Date()){
 const today=todayInMichigan(now);
 pass(input?.ownerApproved===true&&input?.sourceChecked===true&&input?.dateChecked===true&&input?.effortChecked===true&&input?.privacyChecked===true,'Owner source/date/effort/privacy signoff required');
 pass(REGION_IDS.has(input.regionId),'Unknown broad region');
 pass(validNight(input.night,today),'Not a valid past March–May monitoring date');
 pass(METHODS.has(input.method),'Only repeat stationary or authorized fixed-route surveys qualify');
 pass(OUTCOMES.has(input.outcome),'Incomplete and uncertain observations cannot become zero encounters');
 pass(input.completed===true&&input.repeatedProtocol===true,'Only completed repeatable monitoring qualifies');
 pass(integer(input.minutes,20,180)&&integer(input.observers,1,12),'Survey effort missing or outside 20–180 min / 1–12 observers');
 pass(allowedText(input.organization,4,100),'Organization missing or contains a sensitive location');
 pass(safeUrl(input.sourceUrl),'Source must be public HTTPS institutional monitoring record on allowlist');
 const excerpt=String(input.sourceExcerpt||'');
 pass(allowedText(excerpt,40,600),'Direct evidence excerpt required without site details');
 pass(/(?:monitor(?:ed|ing)|survey(?:ed)?|observ(?:ed|ation)|watch(?:ed|ing))\b/i.test(excerpt),'Source must document a real monitored effort');
 if(input.outcome==='none_encountered')pass(/(?:no|zero|none)\b.{0,60}(?:salamander|movement|crossing|amphibian)|(?:salamander|movement|amphibian).{0,60}(?:none|zero|not observed|not detected)/i.test(excerpt),'Source must explicitly say none encountered during completed survey');
 else pass(/(?:salamander|amphibian).{0,70}(?:mov(?:ed|ing|ement)|migrat(?:ed|ing|ion)|cross(?:ed|ing))|(?:migrat|movement).{0,60}(?:salamander|amphibian)/i.test(excerpt),'Source must explicitly document animal movement, not a species identification');
 const old=readMonitoringArchive(archive,today);
 pass(Array.isArray(archive)&&old.length===archive.length,'Existing monitoring archive contains invalid records');
 pass(old.length<500,'Archive capacity reached; require reviewed storage expansion');
 const record=safeRecord({type:'standardized_monitoring_night',regionId:input.regionId,night:input.night,outcome:input.outcome,
  method:input.method,minutes:input.minutes,observers:input.observers,completed:true,repeatedProtocol:true,
  organization:input.organization,sourceUrl:input.sourceUrl,reviewedOn:today,reviewStatus:'owner_source_reviewed',privacy:'broad_region_only'},today);
 pass(!!record,'Could not create a sanitized monitoring record');
 // Restrict one program's site/protocol to one outcome in a region-night; never turn repeated uploads into independent negative evidence.
 const key=r=>[r.regionId,r.night,r.organization.toLowerCase(),r.method].join('|');
 pass(!old.some(r=>key(r)===key(record)),'Duplicate or conflicting outcome for same regional program and night');
 return [...old,record].sort((a,b)=>a.night.localeCompare(b.night));
}
export function monitoringCoverage(rows,day){
 const safe=readMonitoringArchive(rows,day),movement=safe.filter(r=>r.outcome==='movement_seen'),
  zero=safe.filter(r=>r.outcome==='none_encountered');
 const years=new Set(safe.map(r=>r.night.slice(0,4))),regions=new Set(safe.map(r=>r.regionId)),
  programs=new Set(safe.map(r=>r.organization.toLowerCase()+'|'+r.regionId+'|'+r.method)),
  regionNights=new Set(safe.map(r=>r.regionId+'|'+r.night));
 const byYear=[...years].sort().map(year=>({year,sessions:safe.filter(r=>r.night.startsWith(year)).length}));
 return {state:safe.length?'collecting':'awaiting_monitors',
  sessions:safe.length,withMovement:movement.length,withNoEncounters:zero.length,
  observedRegionNights:regionNights.size,years:years.size,regions:regions.size,
  independentPrograms:programs.size,minutesObserved:safe.reduce((n,r)=>n+r.minutes,0),
  observerMinutes:safe.reduce((n,r)=>n+r.minutes*r.observers,0),
  annual:byYear,sourceReviewed:true,hasMonitoringGaps:!safe.length,
  // Directly observed zero is site/protocol-specific, not a zero for the whole Michigan region.
  calibrationReady:false,asIssuedForecastSnapshots:0,heldOutEvaluationPassed:false,
  explanation:'Zero encountered means none observed during one completed, effort-recorded survey—not no salamanders in the entire region. Before estimating forecast skill, archive forecasts as issued and hold out independent monitoring seasons with comparable effort and both outcomes. Reports currently do not calibrate the seven-night predictor.'};
}
