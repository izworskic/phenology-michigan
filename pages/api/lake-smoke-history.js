import {validateArchive,emptyArchive,HISTORY_LIMIT,SITE_IDS} from '../../lib/lakeSmokeArchive.mjs';

const ROOT='https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/';
async function getGitHubJson(file){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const res=await fetch(ROOT+file,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'GreatLakesLakeSmokeHistory/1.0'}});
    if(!res.ok)throw Error('Archive source unavailable');
    return res.json();
  }finally{clearTimeout(timer);}
}
function acceptedEvidence(input,now){
  if(input?.schemaVersion!==1||input?.kind!=='reviewed_firsthand_or_camera_observations'||!Array.isArray(input.records))throw Error('Unknown evidence schema');
  return input.records.filter(r=>{
    if(r?.status!=='confirmed'||r.phenomenon!=='lake-smoke'||!SITE_IDS.has(r.siteId))return false;
    if(typeof r.id!=='string'||r.id.length<3||typeof r.reviewer!=='string'||r.reviewer.length<2)return false;
    const observed=Date.parse(r.observedAt),reviewed=Date.parse(r.reviewedAt);
    if(!Number.isFinite(observed)||!Number.isFinite(reviewed)||observed>reviewed||reviewed>now.getTime()+3600000)return false;
    if(typeof r.sourceUrl!=='string')return false;
    try{const u=new URL(r.sourceUrl);return u.protocol==='https:' && Boolean(u.hostname) && !u.username && !u.password;}
    catch{return false;}
  }).map(r=>({id:r.id,siteId:r.siteId,observedAt:r.observedAt,reviewedAt:r.reviewedAt,sourceUrl:r.sourceUrl,sourceType:r.sourceType||'curated',reviewer:r.reviewer}))
    .slice(-100);
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=900');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const [archiveResult,evidenceResult]=await Promise.allSettled([
    getGitHubJson('lake-smoke-forecast-issues.json'),
    getGitHubJson('lake-smoke-observations.json')
  ]);
  const forecastAvailable=archiveResult.status==='fulfilled';
  const evidenceAvailable=evidenceResult.status==='fulfilled';
  const archive=forecastAvailable?validateArchive(archiveResult.value):emptyArchive();
  let evidence=[],evidenceChecked=evidenceAvailable;
  if(evidenceAvailable){
    try{evidence=acceptedEvidence(evidenceResult.value,new Date());}catch{evidenceChecked=false;}
  }
  return res.status(200).json({
    generatedAt:new Date().toISOString(),
    archiveStatus:forecastAvailable?'available':'unavailable',
    evidenceStatus:evidenceChecked?'available':'unavailable',
    policy:'Forecast issues archived when issued for the next morning; not observed fog. Confirmed evidence is a separate, manually reviewed source with direct provenance. Absence of evidence is not proof of no lake smoke.',
    retention:HISTORY_LIMIT,
    archive,
    evidence,
    evidenceCount:evidenceChecked?evidence.length:null,
    latestIssueDate:archive.issues.at(-1)?.date||null
  });
}
