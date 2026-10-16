// Reviewed, durable site observations. Never derive site proof from map-pin distance.
// Records contain links, dates and reviewer provenance, not GPS coordinates or observer details.
const MANAGER=new Set(['michigan.gov','www.michigan.gov','michigannature.org','www.michigannature.org','nature.org','www.nature.org','landtrust.org','www.landtrust.org']);
const INAT=new Set(['inaturalist.org','www.inaturalist.org']);
const STAGES=new Set(['BUDDING','FLOWERING','FADING','DONE','NEAR_PEAK','PEAK']);
const REPORT_SEASON_START='03-01',REPORT_SEASON_END='07-15';
export function validDate(s){
 return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
}
function yesterdayOrNow(s,now){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const y=today.find(p=>p.type==='year').value,m=today.find(p=>p.type==='month').value,d=today.find(p=>p.type==='day').value;
 return s<=y+'-'+m+'-'+d;
}
export function canonicalEvidenceLink(raw,kind){
 if(typeof raw!=='string'||raw.length>600)return null;
 let u;try{u=new URL(raw);}catch{return null;}
 if(u.protocol!=='https:'||u.username||u.password)return null;
 if(kind==='land_manager'&&!MANAGER.has(u.hostname))return null;
 if(kind==='reviewed_observation'&&(!INAT.has(u.hostname)||!/^\/observations\/\d+$/.test(u.pathname)))return null;
 u.hash='';u.search=kind==='reviewed_observation'?'':u.search;
 return u.toString();
}
export function validateSiteRecord(raw,stops,now=new Date()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Record must be an object');
 const stop=stops.find(s=>s.id===raw.siteId);
 if(!stop||raw.siteName!==stop.name)throw Error('Must match one known site and its full preserve name');
 if(!validDate(raw.observedAt)||!validDate(raw.reviewedAt))throw Error('Bad observation or review date');
 if(!yesterdayOrNow(raw.observedAt,now)||!yesterdayOrNow(raw.reviewedAt,now)||raw.reviewedAt<raw.observedAt)throw Error('Cannot publish future observations or review before an observation');
 const year=Number(raw.observedAt.slice(0,4)),day=raw.observedAt.slice(5);
 if(year<2010||day<REPORT_SEASON_START||day>REPORT_SEASON_END)throw Error('Out-of-season or implausible historic observation');
 if(!STAGES.has(raw.stage))throw Error('Unrecognized stage');
 if(!['land_manager','reviewed_observation'].includes(raw.sourceKind))throw Error('Unrecognized source kind');
 const url=canonicalEvidenceLink(raw.sourceUrl,raw.sourceKind);
 if(!url)throw Error('Source must be an allowed HTTPS land-manager or public iNaturalist record');
 if(typeof raw.reviewedBy!=='string'||!/^[a-zA-Z0-9_-]{3,39}$/.test(raw.reviewedBy))throw Error('Reviewer GitHub login required');
 if(typeof raw.siteEvidenceNote!=='string'||raw.siteEvidenceNote.trim().length<24||raw.siteEvidenceNote.length>700)throw Error('Reviewer must document positive, on-site identity evidence');
 if(raw.intakeKind==='jotform'?!/^[0-9]{10,25}$/.test(String(raw.issueNumber)):(!Number.isSafeInteger(raw.issueNumber)||raw.issueNumber<1))throw Error('Valid source intake identifier required');
 if(raw.sourceKind==='land_manager'&&(typeof raw.sourceExcerpt!=='string'||raw.sourceExcerpt.trim().length<12||raw.sourceExcerpt.length>600))throw Error('Manager source requires a dated cited excerpt');
 if(raw.sourceKind==='reviewed_observation'&&raw.observationFloweringReviewed!==true)throw Error('Public observation needs explicit species/phenology review');
 if(['PEAK','NEAR_PEAK'].includes(raw.stage) && !(typeof raw.peakEvidenceNote==='string'&&raw.peakEvidenceNote.trim().length>=24))throw Error('Peak stages require explicit independently reviewed evidence');
 return {siteId:stop.id,siteName:stop.name,region:stop.region,stage:raw.stage,observedAt:raw.observedAt,reviewedAt:raw.reviewedAt,
  reviewedBy:raw.reviewedBy,sourceKind:raw.sourceKind,sourceUrl:url,siteEvidenceNote:raw.siteEvidenceNote.trim(),
  ...(raw.sourceKind==='land_manager'?{sourceExcerpt:raw.sourceExcerpt.trim()}:{observationFloweringReviewed:true}),
  ...(['PEAK','NEAR_PEAK'].includes(raw.stage)?{peakEvidenceNote:raw.peakEvidenceNote.trim()}:{}),issueNumber:raw.issueNumber,...(raw.intakeKind==='jotform'?{intakeKind:'jotform'}:{})};
}
export function readArchive(archive,stops,now=new Date()){
 if(archive?.schemaVersion!==1||!Array.isArray(archive.records))throw Error('Invalid site evidence archive');
 const seenSources=new Set(),seenIssues=new Set();
 return archive.records.map(x=>{
  const r=validateSiteRecord(x,stops,now);
  const key=r.siteId+'|'+r.sourceUrl;
  if(seenSources.has(key)||seenIssues.has(r.issueNumber))throw Error('Duplicate evidence source or intake issue');
  seenSources.add(key);seenIssues.add(r.issueNumber);return r;
 }).sort((a,b)=>b.observedAt.localeCompare(a.observedAt)||a.siteId.localeCompare(b.siteId));
}
export function summarizeSiteEvidence(stops,records){
 const all=stops.map(s=>{
  const rows=records.filter(r=>r.siteId===s.id).sort((a,b)=>b.observedAt.localeCompare(a.observedAt));
  const years=[...new Set(rows.map(r=>r.observedAt.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
  const flowering=rows.filter(r=>['FLOWERING','NEAR_PEAK','PEAK'].includes(r.stage));
  const stageCounts={};for(const r of rows)stageCounts[r.stage]=(stageCounts[r.stage]||0)+1;
  return {siteId:s.id,siteName:s.name,region:s.region,reportCount:rows.length,floweringReports:flowering.length,
   observedYears:years,yearsWithEvidence:years.length,firstFloweringDateByYear:years.map(year=>({year,
     date:flowering.filter(r=>r.observedAt.startsWith(year)).sort((a,b)=>a.observedAt.localeCompare(b.observedAt))[0]?.observedAt||null})),
   latest:rows[0]?publicReport(rows[0]):null,reports:rows.slice(0,15).map(publicReport),
   eligibleForFutureValidation:new Set(flowering.map(r=>r.observedAt.slice(0,4))).size>=3};
 });
 return {sites:all,totalReports:records.length,sitesWithReports:all.filter(s=>s.reportCount).length,
   multiYearSites:all.filter(s=>s.yearsWithEvidence>=2).length};
}
export function publicReport(r){
 return {stage:r.stage,observedAt:r.observedAt,reviewedAt:r.reviewedAt,sourceKind:r.sourceKind,sourceUrl:r.sourceUrl,
  issueUrl:r.intakeKind==='jotform'?null:'https://github.com/izworskic/phenology-michigan/issues/'+r.issueNumber};
}
export function currentSiteReports(records){return records.map(r=>({...r}));}
