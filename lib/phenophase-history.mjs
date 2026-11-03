import BUNDLED_INDEX from '../data/michigan-phenophase-archive-index.json' with {type:'json'};
import BUNDLED_2026 from '../data/michigan-phenophase-archive/2026.json' with {type:'json'};
import REGIONS from '../data/michigan-observation-regions.json' with {type:'json'};

const RAW='https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/';
const YEAR_SCHEMA='michigan-phenophase-snapshot-archive-v1';
const INDEX_SCHEMA='michigan-phenophase-snapshot-index-v1';
const EXPECTED_REGIONS=REGIONS.regions.map(r=>r.id);
const PHASES=new Set(REGIONS.phenophases.map(p=>p.id));
const SOURCE_LABELS=new Set(['usa-npn','inaturalist']);
const COVERAGE=new Set(['multiple-reporters-or-sites','limited-sample']);
const RAW_LIMIT=16_000_000;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  && Number.isFinite(Date.parse(s+'T12:00:00Z'))
  && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000;
const exact=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)
  &&Object.keys(obj).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(obj,k));
const status=x=>exact(x,['usaNpn','iNaturalist','iNaturalistCappedQueries','iNaturalistFailedQueries'])
  &&x.usaNpn==='ok'&&['ok','partial','unavailable'].includes(x.iNaturalist)
  &&count(x.iNaturalistCappedQueries)&&count(x.iNaturalistFailedQueries)
  &&(x.iNaturalist!=='ok'||x.iNaturalistFailedQueries===0);

export function validateHistoryIndex(index){
 if(!exact(index,['schema','years','snapshotCount','interpretation'])
   ||index.schema!==INDEX_SCHEMA||!Array.isArray(index.years)
   ||index.years.length>100||!count(index.snapshotCount)
   ||index.interpretation?.oneSnapshotPerCollectionDay!==true
   ||index.interpretation?.visitorSubmissionsRequired!==false
   ||index.interpretation?.windowDays!==15)return null;
 let previous=0,total=0;
 for(const row of index.years){
  if(!exact(row,['year','file','firstSnapshot','lastSnapshot','snapshotDays','missingCollectionDaysBetweenSnapshots','latestSourceStatus'])
     ||!Number.isSafeInteger(row.year)||row.year<2026||row.year>2200||row.year<=previous
     ||row.file!==`/data/michigan-phenophase-archive/${row.year}.json`
     ||!date(row.firstSnapshot)||!date(row.lastSnapshot)
     ||!row.firstSnapshot.startsWith(row.year+'-')||!row.lastSnapshot.startsWith(row.year+'-')
     ||row.firstSnapshot>row.lastSnapshot||!count(row.snapshotDays)||row.snapshotDays===0
     ||!count(row.missingCollectionDaysBetweenSnapshots)||!status(row.latestSourceStatus))return null;
  previous=row.year;
  const span=Math.round((Date.parse(row.lastSnapshot+'T12:00:00Z')-Date.parse(row.firstSnapshot+'T12:00:00Z'))/86400000)+1;
  if(span!==row.snapshotDays+row.missingCollectionDaysBetweenSnapshots)return null;
  total+=row.snapshotDays;
 }
 return total===index.snapshotCount?index:null;
}

export function validateHistoryYear(archive,year){
 if(!exact(archive,['schema','year','snapshots'])||archive.schema!==YEAR_SCHEMA
   ||archive.year!==year||!Array.isArray(archive.snapshots)
   ||archive.snapshots.length>366)return null;
 let prev='';
 for(const snap of archive.snapshots){
  if(!exact(snap,['asOfDate','windowStart','windowEnd','kind','sourceStatus','regions'])
    ||!date(snap.asOfDate)||!snap.asOfDate.startsWith(year+'-')||snap.asOfDate<=prev
    ||snap.kind!=='overlapping-14-day-reporting-snapshot'||!date(snap.windowStart)
    ||snap.windowEnd!==snap.asOfDate||!status(snap.sourceStatus)
    ||Math.round((Date.parse(snap.windowEnd+'T12:00:00Z')-Date.parse(snap.windowStart+'T12:00:00Z'))/86400000)!==14
    ||!Array.isArray(snap.regions)||snap.regions.length!==EXPECTED_REGIONS.length)return null;
  prev=snap.asOfDate;
  for(let i=0;i<snap.regions.length;i++){
   const reg=snap.regions[i];
   if(!exact(reg,['id','sampledReports','unavailableInatPhases','phases'])
     ||reg.id!==EXPECTED_REGIONS[i]||!count(reg.sampledReports)
     ||!Array.isArray(reg.unavailableInatPhases)
     ||reg.unavailableInatPhases.some(p=>!PHASES.has(p))
     ||new Set(reg.unavailableInatPhases).size!==reg.unavailableInatPhases.length
     ||!Array.isArray(reg.phases)||reg.phases.length>6)return null;
   let total=0;const seen=new Set();
   for(const p of reg.phases){
    if(!exact(p,['id','latest','coverage','reports','reportingSites','reportingObservers','uniqueReportingDays','species'])
      ||!PHASES.has(p.id)||seen.has(p.id)||!COVERAGE.has(p.coverage)
      ||!date(p.latest)||p.latest<snap.windowStart||p.latest>snap.windowEnd
      ||!exact(p.reports,['usa-npn','inaturalist'])
      ||!count(p.reports['usa-npn'])||!count(p.reports.inaturalist)
      ||!count(p.reportingSites)||!count(p.reportingObservers)||!count(p.uniqueReportingDays)
      ||p.uniqueReportingDays>15||p.reportingSites>p.reports['usa-npn']
      ||p.reportingObservers>p.reports.inaturalist
      ||!Array.isArray(p.species)||p.species.length>4)return null;
    seen.add(p.id);
    const n=p.reports['usa-npn']+p.reports.inaturalist;
    if(!n)return null;total+=n;
    for(const sp of p.species){
     if(!exact(sp,['name','date','source'])||typeof sp.name!=='string'
       ||sp.name.length<2||sp.name.length>80||sp.name.includes('<')||sp.name.includes('>')
       ||!date(sp.date)||sp.date<snap.windowStart||sp.date>p.latest||!SOURCE_LABELS.has(sp.source))return null;
    }
   }
   if(total>reg.sampledReports)return null;
  }
 }
 return archive;
}

async function download(path){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),4000);
 try{
  const res=await fetch(RAW+path+'?v='+Math.floor(Date.now()/600000),{
   signal:controller.signal,headers:{'User-Agent':'phenology-michigan/snapshot-archive'}
  });
  if(!res.ok)return null;
  if(Number(res.headers.get('content-length')||0)>RAW_LIMIT)return null;
  const body=await res.text();
  if(body.length>RAW_LIMIT)return null;
  return JSON.parse(body);
 }catch{return null;}finally{clearTimeout(timer);}
}

export async function readHistoryIndex(){
 const remote=validateHistoryIndex(await download('michigan-phenophase-archive-index.json'));
 return remote||validateHistoryIndex(BUNDLED_INDEX);
}

export async function readHistoryYear(year){
 if(!Number.isInteger(year)||year<2026||year>2200)return null;
 const index=await readHistoryIndex();
 if(!index?.years.some(y=>y.year===year))return null;
 const remote=validateHistoryYear(await download(`michigan-phenophase-archive/${year}.json`),year);
 if(remote)return remote;
 return year===2026?validateHistoryYear(BUNDLED_2026,2026):null;
}
