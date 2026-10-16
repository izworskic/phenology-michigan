/* One-day-ahead lake-smoke forecast issue archive.
 * What was predicted in advance is NOT what was actually seen.
 * Never backfill missed issues or turn a weather score into observation evidence.
 */
import {SITES} from './lakeSmoke.mjs';
export const HISTORY_VERSION=1;
export const HISTORY_LIMIT=120;
export const SITE_IDS=new Set(SITES.map(x=>x.id));
const empty=()=>({schemaVersion:HISTORY_VERSION,kind:'forecast_issues_not_observations',issues:[]});
const dateRegex=/^\d{4}-\d{2}-\d{2}$/;
export function easternDay(value){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const obj=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return obj.year+'-'+obj.month+'-'+obj.day;
}
export function nextDate(day){
  if(!dateRegex.test(day))throw Error('Invalid issue date');
  const d=new Date(day+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)throw Error('Invalid issue date');
  return new Date(d.getTime()+86400000).toISOString().slice(0,10);
}
const nullableNumber=(x,min,max)=>{
  if(x===null||x===undefined||x==='')return null;
  if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)return null;
  return Math.round(x*10)/10;
};
const validTime=(s)=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
function safePoint(point,targetDay,issuedAt){
  if(!point||point.date!==targetDay||!validTime(point.time))return null;
  // A next-morning forecast cannot be issued after the target hour begins.
  if(Date.parse(point.time)<=Date.parse(issuedAt))return null;
  const score=nullableNumber(point.score,0,100);
  if(score===null)return null;
  return {
    time:validTime(point.time),score,
    gapC:nullableNumber(point.spreadC,-40,50),
    windMph:nullableNumber(point.windMph,0,120),
    windFrom:typeof point.viewing?.windFrom==='string'?point.viewing.windFrom:null,
    drift:['shoreward','lakeward','alongshore','uncertain'].includes(point.viewing?.status)?point.viewing.status:null,
  };
}
export function makeIssueFromLive(live,now=new Date()){
  if(!live||!Array.isArray(live.locations))throw Error('Live response missing locations');
  const generated=validTime(live.generatedAt);
  if(!generated)throw Error('Live response missing valid timestamp');
  const age=(now.getTime()-Date.parse(generated))/3600000;
  if(age< -0.2||age>2)throw Error('Live response is stale, future-dated, or from a different day');
  const date=easternDay(generated),target=nextDate(date);
  if(easternDay(now)!==date)throw Error('Cannot archive a forecast issued on another local calendar day');
  if(live.locations.length!==SITES.length||new Set(live.locations.map(s=>s.id)).size!==SITES.length||live.locations.some(s=>!SITE_IDS.has(s.id))){
    throw Error('Incomplete or unexpected lake-smoke location set');
  }
  const sites=live.locations.map(site=>{
    const next=site.outlook?.windows?.find(w=>w.date===target);
    const view=site.outlook?.viewWindows?.find(w=>w.date===target);
    return {
      id:site.id,
      iceState:typeof site.iceCheck?.state==='string'?site.iceCheck.state:'unavailable',
      waterAt:validTime(site.water?.time),forecastAt:validTime(site.forecastUpdatedAt),
      next: safePoint(next,target,generated),
      view: safePoint(view,target,generated),
    };
  });
  // Blank historical data must stay blank. Never substitute 0 for missing source values.
  return {date,issuedAt:generated,targetDay:target,sites,
    available:sites.filter(s=>s.next!==null).length,
    method:'one-day-ahead_hourly_nws_noaa_ice_gated'};
}
export function updateArchive(archive,issue){
  const old=archive??empty();
  if(old.schemaVersion!==HISTORY_VERSION||old.kind!=='forecast_issues_not_observations'||!Array.isArray(old.issues))throw Error('Unsupported historical archive schema');
  if(!dateRegex.test(issue?.date)||issue.targetDay!==nextDate(issue.date)||!validTime(issue.issuedAt))throw Error('Invalid forecast issue');
  if(!Array.isArray(issue.sites)||issue.sites.length!==SITES.length||new Set(issue.sites.map(x=>x.id)).size!==SITES.length)throw Error('Incomplete forecast issue');
  if(issue.sites.some(x=>!SITE_IDS.has(x.id)))throw Error('Unexpected site in forecast archive');
  const existing=old.issues.find(x=>x.date===issue.date);
  if(existing){
    // Daily capture is immutable: retries must never replace the original issue with hindsight.
    return {archive:old,changed:false,reason:'already_archived'};
  }
  const entries=[...old.issues,issue].sort((a,b)=>a.date.localeCompare(b.date));
  return {archive:{...old,issues:entries.slice(-HISTORY_LIMIT)},changed:true,reason:'appended'};
}
export function validateArchive(archive){
  if(!archive||archive.schemaVersion!==HISTORY_VERSION||archive.kind!=='forecast_issues_not_observations'||!Array.isArray(archive.issues))return empty();
  const seen=new Set(),issues=[];
  for(const i of archive.issues.slice(-HISTORY_LIMIT)){
    if(!dateRegex.test(i?.date)||i.targetDay!==nextDate(i.date)||!validTime(i.issuedAt)||seen.has(i.date)||!Array.isArray(i.sites))continue;
    seen.add(i.date);
    if(i.sites.length!==SITES.length||i.sites.some(s=>!SITE_IDS.has(s.id)))continue;
    issues.push(i);
  }
  return {...empty(),issues:issues.sort((a,b)=>a.date.localeCompare(b.date))};
}
export function historyForSite(archive,siteId){
  const clean=validateArchive(archive);
  if(!SITE_IDS.has(siteId))return [];
  return clean.issues.map(i=>{
    const site=i.sites.find(s=>s.id===siteId);
    return {date:i.targetDay,issuedDate:i.date,issuedAt:i.issuedAt,
      score:site?.next?.score??null,gapC:site?.next?.gapC??null,
      windFrom:site?.next?.windFrom??null,drift:site?.view?.drift??null,
      waterAt:site?.waterAt||null,iceState:site?.iceState||null};
  });
}
export const emptyArchive=empty;
