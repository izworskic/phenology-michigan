import INITIAL from '../data/trillium-site-onset-summary.json' with {type:'json'};
import {STOPS} from './trillium.mjs';
const SOURCE='https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/trillium-site-onset-summary.json';
function dayKey(now){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
export function validatedSiteOnset(data,now=new Date()){
 if(!data||data.schema!=='trillium-site-onset-v1'||data.species!=='Trillium grandiflorum'||data.phenophase!=='open flowers'
   ||typeof data.generatedForDate!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(data.generatedForDate)||data.generatedForDate>dayKey(now)
   ||!Array.isArray(data.sites)||data.sites.length!==STOPS.length||!data.summary)return null;
 const ids=new Set();
 for(const row of data.sites){
  const site=STOPS.find(s=>s.id===row.siteId);
  if(!site||ids.has(row.siteId)||site.name!==row.siteName
    ||!Number.isInteger(row.reviewedVisits)||row.reviewedVisits<0
    ||!Number.isInteger(row.boundedPlotYears)||row.boundedPlotYears<0
    ||!Array.isArray(row.onsets)||row.onsets.length>1000
    ||!row.calibration||!['not-calibrated','retrospectively-calibrated'].includes(row.calibration.state)
    ||(row.calibration.state==='not-calibrated'&&row.calibration.thresholdSoilGdd40!=null))return null;
  ids.add(row.siteId);
 }
 return data;
}
export async function loadSiteOnset(){
 try{
  const ctrl=new AbortController();
  const timeout=setTimeout(()=>ctrl.abort(),3500);
  let res;
  try{res=await fetch(SOURCE+'?k='+Math.floor(Date.now()/600000),{signal:ctrl.signal,headers:{'User-Agent':'phenology-michigan/trillium-site-science'}});}
  finally{clearTimeout(timeout);}
  if(res.ok){const fresh=validatedSiteOnset(await res.json());if(fresh)return fresh;}
 }catch{/* Keep the reviewed bundled archive instead of guessing. */}
 return validatedSiteOnset(INITIAL);
}
