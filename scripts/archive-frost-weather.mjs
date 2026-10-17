/* Daily low-cost prospective forecast archive and post-dawn NWS station audit.
 * Runs in GitHub Actions, commits archival JSON; no paid database or fake reports.
 * Requires Node 22+; never rewrites past forecast values as though issued earlier.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {SITES,localParts,evaluateGrid} from '../lib/frostMorning.mjs';
import {forecastIssue,stationCandidates,observationSample,verifyIssue,pruneIssues,key} from '../lib/frostVerification.mjs';
const PREFIX='https://api.weather.gov/';
const UA='MichiganFrostArchive/1.0 (https://phenology.chrisizworski.com/frosty-mornings)';
const path=new URL('../data/frost-forecast-issues.json',import.meta.url);
const archive=JSON.parse(readFileSync(path,'utf8'));
const now=new Date();
if(!Number.isFinite(now.getTime())||archive.schemaVersion!==1||!Array.isArray(archive.issues))throw Error('Archive invalid');
const today=localParts(now).date;
const tomorrow=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const issues=new Map(archive.issues.map(i=>[key(i.siteId,i.date),i]));
const points=new Map();
async function get(url){
  if(typeof url!=='string'||!url.startsWith(PREFIX))throw Error('Non-NWS source rejected');
  for(let attempt=0;attempt<2;attempt++){
    try{
      const r=await fetch(url,{headers:{'Accept':'application/geo+json, application/json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(11000)});
      if(!r.ok)throw Error('HTTP '+r.status);
      return await r.json();
    }catch(e){if(attempt===1)throw e;await new Promise(resolve=>setTimeout(resolve,350));}
  }
}
async function point(site){
  if(!points.has(site.id))points.set(site.id,get(PREFIX+'points/'+site.lat+','+site.lon));
  return points.get(site.id);
}
async function issueTomorrow(site){
  if(issues.has(key(site.id,tomorrow)))return;
  try{
    const p=await point(site),grid=await get(p?.properties?.forecastGridData);
    const issuedAt=grid?.properties?.updateTime||now.toISOString();
    if(Date.parse(issuedAt)>now.getTime()+3600000||now.getTime()-Date.parse(issuedAt)>24*3600000)throw Error('Grid issue too stale');
    const morning=evaluateGrid(grid.properties,now,site).mornings.find(m=>m.date===tomorrow);
    const issue=forecastIssue(site,morning,issuedAt);
    if(issue){issues.set(key(site.id,tomorrow),issue);console.log('Archived prospective',site.id,tomorrow,issue.predicted.score);}
    else console.log('No valid future forecast for',site.id,tomorrow);
  }catch(e){console.warn('No forecast archival entry',site.id,String(e));}
}
async function verifyPast(site){
  const pending=[...issues.values()].filter(i=>i.siteId===site.id&&i.verification?.status==='pending'&&
    Date.parse(i.sunriseAt)+4*3600000<now.getTime()&&now.getTime()-Date.parse(i.sunriseAt)<=6*86400000);
  if(!pending.length)return;
  let candidates=[];
  try{
    const p=await point(site);
    const stationsUrl=p?.properties?.observationStations;
    const stationData=await get(stationsUrl);
    candidates=stationCandidates(stationData.features,site);
  }catch(e){console.warn('Unable to resolve weather stations',site.id,String(e));return;}
  if(!candidates.length){console.log('No station within 65 km of',site.id);return;}
  for(const issue of pending){
    const start=new Date(Date.parse(issue.sunriseAt)-90*60000).toISOString();
    const end=new Date(Date.parse(issue.sunriseAt)+90*60000).toISOString();
    for(const st of candidates){
      try{
        const url=PREFIX+'stations/'+encodeURIComponent(st.id)+'/observations?start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end)+'&limit=30';
        const records=await get(url);
        const sample=observationSample(records.features,issue.sunriseAt);
        if(sample){
          issues.set(key(site.id,issue.date),verifyIssue(issue,st,sample,now.toISOString()));
          console.log('Compared weather',site.id,issue.date,st.id,st.distanceKm+'km');
          break;
        }
      }catch(e){console.warn('Station sample unavailable',site.id,st.id,String(e));}
    }
  }
}
async function batches(fn){
  for(let i=0;i<SITES.length;i+=3)await Promise.all(SITES.slice(i,i+3).map(fn));
}
// Capture tomorrow's true pre-sunrise NWS predictions, then reconcile existing issues.
await batches(issueTomorrow);
await batches(verifyPast);
archive.lastRunAt=now.toISOString();
archive.issues=pruneIssues([...issues.values()],now.toISOString());
writeFileSync(path,JSON.stringify(archive,null,2)+'\n');
console.log('Forecast archive entries:',archive.issues.length,
  'station-comparisons:',archive.issues.filter(i=>i.verification.status==='station_weather_compared').length);
