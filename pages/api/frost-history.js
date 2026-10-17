import {lookup} from '../../lib/frostMorning.mjs';
import {siteHistory} from '../../lib/frostVerification.mjs';
const ROOT='https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/';
async function source(file){
  const r=await fetch(ROOT+file,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5500)});
  if(!r.ok)throw Error('Archive temporarily unavailable');
  const d=await r.json();
  if(d?.schemaVersion!==1)throw Error('Archive schema mismatch');
  return d;
}
export default async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const site=lookup(typeof req.query.site==='string'?req.query.site:'bay-city');
  if(!site)return res.status(400).json({error:'Unknown forecast location'});
  const [forecasts,sightings]=await Promise.allSettled([source('frost-forecast-issues.json'),source('frost-reviewed-sightings.json')]);
  if(forecasts.status==='rejected'&&sightings.status==='rejected'){
    res.setHeader('Cache-Control','public, s-maxage=90');
    return res.status(503).json({error:'Historical sources are temporarily unavailable; no results can be claimed.'});
  }
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
  return res.status(200).json({...siteHistory(forecasts.status==='fulfilled'?forecasts.value:null,sightings.status==='fulfilled'?sightings.value:null,site.id),
    location:site.name,forecastsAvailable:forecasts.status==='fulfilled',sightingsAvailable:sightings.status==='fulfilled',
    archivedAt:forecasts.status==='fulfilled'?forecasts.value.lastRunAt||null:null,
    source:'Versioned GitHub forecast snapshots and owner-reviewed original photo evidence, displayed independently.'});
}
