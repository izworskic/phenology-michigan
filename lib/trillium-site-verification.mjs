// A conservative, testable, site-specific evidence layer.
// The public map contains approximate *destination* pins, not preserve boundaries.
// Observations within 5 km are nearby evidence ONLY; they never verify the site.
export const SITE_RADIUS_KM=5;
export const SITE_REPORT_MAX_AGE_DAYS=7;
export const NEARBY_MAX_AGE_DAYS=10;
export const MAX_POSITIONAL_ACCURACY_M=500;
const DAY=86400000;
const STAGES=['BUDDING','FLOWERING','NEAR_PEAK','PEAK','FADING','DONE'];
const FLOWERING_STAGES=new Set(['FLOWERING','NEAR_PEAK','PEAK']);
const MANAGER_HOSTS=new Set(['www.michigan.gov','michigan.gov','www.michigannature.org','michigannature.org','www.nature.org','nature.org','landtrust.org','www.landtrust.org']);
const INAT_HOSTS=new Set(['www.inaturalist.org','inaturalist.org']);

export function distanceKm(lat1,lon1,lat2,lon2){
 const radians=n=>n*Math.PI/180, dlat=radians(lat2-lat1),dlon=radians(lon2-lon1);
 const a=Math.sin(dlat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(Math.min(1,a)),Math.sqrt(Math.max(0,1-a)));
}
function validIsoDate(date){
 return typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date+'T00:00:00Z')) && new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
}
export function dayAge(date,now=new Date()){
 if(!validIsoDate(date))return null;
 // Calendar day age in Michigan local time; avoid future-dated records being treated as current.
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>today.find(p=>p.type===k)?.value;
 const todayUtc=Date.parse(get('year')+'-'+get('month')+'-'+get('day')+'T00:00:00Z');
 return Math.round((todayUtc-Date.parse(date+'T00:00:00Z'))/DAY);
}
function publicOpenCoords(raw){
 // Obscured and uncertain coordinates must never be used to imply proximity.
 if(raw?.geoprivacy && raw.geoprivacy!=='open')return null;
 if(raw?.taxon_geoprivacy && raw.taxon_geoprivacy!=='open')return null;
 if(raw?.coordinates_obscured===true)return null;
 const lat=Number(raw?.geojson?.coordinates?.[1]??raw?.location?.split(',')?.[0]);
 const lon=Number(raw?.geojson?.coordinates?.[0]??raw?.location?.split(',')?.[1]);
 const accuracy=Number(raw?.positional_accuracy);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41||lat>48||lon< -91||lon> -82 ||!Number.isFinite(accuracy)||accuracy<=0||accuracy>MAX_POSITIONAL_ACCURACY_M)return null;
 return {lat,lon,accuracy};
}
function floweringAnnotation(raw){
 return Array.isArray(raw?.annotations)&&raw.annotations.some(a=>a?.controlled_attribute_id===12 && a?.controlled_value_id===13);
}
export function nearbyFlowers(stop,results=[],now=new Date()){
 const seen=new Set();
 return results.filter(o=>Number.isSafeInteger(o?.id)&&!seen.has(o.id)&&seen.add(o.id) && o.quality_grade==='research'&&floweringAnnotation(o)).flatMap(o=>{
  const age=dayAge(o.observed_on,now),p=publicOpenCoords(o);
  if(age===null||age<0||age>NEARBY_MAX_AGE_DAYS||!p)return [];
  const km=distanceKm(stop.lat,stop.lon,p.lat,p.lon);
  if(km+p.accuracy/1000>SITE_RADIUS_KM)return [];
  return [{id:o.id,observedOn:o.observed_on,ageDays:age,url:'https://www.inaturalist.org/observations/'+o.id}];
 }).sort((a,b)=>b.observedOn.localeCompare(a.observedOn)).slice(0,3);
}
export function verifiedSiteReport(stop,reports=[],now=new Date()){
 const eligible=(Array.isArray(reports)?reports:[]).flatMap(report=>{
  if(report?.siteId!==stop.id||!STAGES.includes(report.stage)||!['land_manager','reviewed_observation'].includes(report.sourceKind))return [];
  if(!report.reviewedBy||typeof report.reviewedBy!=='string'||report.reviewedBy.length<3)return [];
  if(!validIsoDate(report.reviewedAt)||!validIsoDate(report.observedAt))return [];
  const age=dayAge(report.observedAt,now);
  const reviewAge=dayAge(report.reviewedAt,now);
  if(age===null||age<0||age>SITE_REPORT_MAX_AGE_DAYS||reviewAge===null||reviewAge<0||reviewAge>SITE_REPORT_MAX_AGE_DAYS||reviewAge>age)return [];
  if(typeof report.sourceUrl!=='string')return [];
  let source;
  try{source=new URL(report.sourceUrl);}catch{return [];}
  if(source.protocol!=='https:')return [];
  if(report.sourceKind==='land_manager'&&!MANAGER_HOSTS.has(source.hostname))return [];
  if(report.sourceKind==='reviewed_observation'&&!INAT_HOSTS.has(source.hostname))return [];
  if(report.sourceKind==='reviewed_observation'&&!/^\/observations\/\d+$/.test(source.pathname))return [];
  if(report.sourceKind==='land_manager' && typeof report.sourceExcerpt!=='string')return [];
  // Source excerpts are provenance notes for the editor, never rendered verbatim.
  return [{stage:report.stage,observedAt:report.observedAt,reviewedAt:report.reviewedAt,sourceUrl:report.sourceUrl,sourceKind:report.sourceKind}];
 });
 return eligible.sort((a,b)=>b.observedAt.localeCompare(a.observedAt))[0]||null;
}
export function siteDecision(stop,now,reports=[],nearby=[],region=null){
 const report=verifiedSiteReport(stop,reports,now);
 const flowers=Array.isArray(nearby)?nearby:[];
 const month=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).format(now));
 const inTrackingSeason=month>=3&&month<=6;
 if(!inTrackingSeason){
  return {siteId:stop.id,state:'off',label:'Outside spring season',explanation:'No current site-specific bloom claim. Check back in spring.',report:null,nearbyCount:0,nearbyExamples:[]};
 }
 if(report){
  const labels={BUDDING:'Buds reported at this site',FLOWERING:'Flowers confirmed at this site',NEAR_PEAK:'Near peak reported at this site',PEAK:'Peak reported at this site',FADING:'Fading reported at this site',DONE:'Bloom finished at this site'};
  return {siteId:stop.id,state:FLOWERING_STAGES.has(report.stage)?'confirmed':report.stage==='BUDDING'?'budding':'fading',
   label:labels[report.stage],explanation:'Dated, editorially reviewed site-specific evidence. Conditions can change after the report.',report,nearbyCount:flowers.length,nearbyExamples:flowers.slice(0,2)};
 }
 if(flowers.length){
  return {siteId:stop.id,state:'nearby',label:'Flowers reported nearby — not at this site',
   explanation:'A dated research-grade flowering record exists within about 5 km of the approximate destination pin. This does not establish a bloom inside the preserve.',report:null,nearbyCount:flowers.length,nearbyExamples:flowers.slice(0,2)};
 }
 return {siteId:stop.id,state:'unverified',label:'No recent site bloom confirmation',
 explanation:region?.state==='off'?'This preserve is outside its typical regional window.':'The preserve may still have flowers; no recent qualifying site-specific report is on file.',report:null,nearbyCount:0,nearbyExamples:[]};
}
