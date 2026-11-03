import BUNDLED from '../data/michigan-phenophase-geography.json' with {type:'json'};
import CONFIG from '../data/michigan-observation-regions.json' with {type:'json'};

const URL='https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/michigan-phenophase-geography.json';
const PHASES=new Set(CONFIG.phenophases.map(x=>x.id));
const GROUPS=new Set(['plants','insects','birds']);
const COVERAGES=new Set(['multiple-reporters-or-sites','limited-sample']);
const STATES=new Set(['ok','partial','pending','unavailable','offline-fixture','stale']);

function localDay(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function date(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value+'T12:00:00Z'))
  && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
const nonneg=v=>Number.isSafeInteger(v)&&v>=0;

export function normalizeGeographyArchive(input,now=new Date()){
 if(!input||input.schema!=='michigan-phenophase-geography-v1'
   ||!date(input.asOfDate)||!date(input.windowStart)||!date(input.windowEnd)
   ||!Array.isArray(input.regions)||input.regions.length!==CONFIG.regions.length
   ||!input.sourceStatus||!STATES.has(input.sourceStatus.usaNpn)||!STATES.has(input.sourceStatus.iNaturalist)
   ||input.science?.noSubmissionRequired!==true
   ||input.science?.sourceNpn!=='https://data.usanpn.org/observations/'
   ||input.science?.sourceInaturalist!=='https://www.inaturalist.org/observations?place_id=29')return null;
 const age=(Date.parse(localDay(now)+'T12:00:00Z')-Date.parse(input.asOfDate+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(age)||age<0||age>120)return null;
 for(let i=0;i<CONFIG.regions.length;i++){
  const r=input.regions[i],known=CONFIG.regions[i];
  if(!r||r.id!==known.id||r.name!==known.name||r.lat!==known.lat||r.lon!==known.lon
    ||!Array.isArray(r.phases)||r.phases.length>6||!nonneg(r.sampledReportCount)
    ||typeof r.hasMultipleReportingSites!=='boolean')return null;
  for(const x of r.phases){
   if(!PHASES.has(x.id)||!GROUPS.has(x.group)||!COVERAGES.has(x.coverage)
      ||!date(x.latest)||x.latest>input.asOfDate
      ||!nonneg(x.reportingSites)||!nonneg(x.reportingObservers)
      ||!nonneg(x.uniqueReportingDays)||!x.sourceReports
      ||!nonneg(x.sourceReports['usa-npn'])||!nonneg(x.sourceReports.inaturalist)
      ||!Array.isArray(x.species)||x.species.length>4)return null;
   for(const species of x.species){
    if(typeof species.name!=='string'||species.name.length<2||species.name.length>80
       ||!date(species.date)||species.date>x.latest
       ||!['usa-npn','inaturalist'].includes(species.source))return null;
   }
  }
 }
 if(age<=2) return {...input,status:input.sourceStatus.usaNpn==='pending'?'pending':'current'};
 // Reports are NO LONGER current after 2 Michigan calendar days. Retain only
 // neutral reference-region geometry, never stale positive phase badges.
 return {...input,status:'stale',sourceStatus:{...input.sourceStatus,usaNpn:'stale',iNaturalist:'stale'},
  regions:input.regions.map(r=>({...r,phases:[],sampledReportCount:0,hasMultipleReportingSites:false}))};
}

export async function readGeographyEvidence(){
 try{
  const controller=new AbortController();
  const stop=setTimeout(()=>controller.abort(),3500);
  let response;
  try{response=await fetch(URL+'?v='+Math.floor(Date.now()/600000),{
     signal:controller.signal,headers:{'User-Agent':'phenology-michigan/automated-geographic-evidence'}
    });}finally{clearTimeout(stop);}
  if(response.ok){const parsed=normalizeGeographyArchive(await response.json());if(parsed)return parsed;}
 }catch{/* Ignore an unavailable source, but NEVER manufacture current geographic evidence. */}
 return normalizeGeographyArchive(BUNDLED);
}
