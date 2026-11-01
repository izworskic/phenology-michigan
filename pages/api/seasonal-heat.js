import {validPoint,requestDates,wmsUrl,seasonalSnapshot} from '../../lib/seasonal-heat.mjs';
const HOST='geoserver.usanpn.org';
async function fetchGrid(url){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!==HOST||u.pathname!=='/geoserver/wms')throw Error('UNAUTHORIZED_THERMAL_SOURCE');
 const response=await fetch(url,{headers:{accept:'application/json',
   'user-agent':'MichiganPhenologySeasonalHeat/1.0 (https://phenology.chrisizworski.com/)'},redirect:'error',signal:AbortSignal.timeout(11500)});
 if(!response.ok)throw Error('THERMAL_GRID_UNAVAILABLE');
 return response.json();
}
export const config={maxDuration:25};
export default async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const lat=Number(req.query?.lat),lon=Number(req.query?.lon);
 if(typeof req.query?.lat!=='string'||typeof req.query?.lon!=='string'
    ||!/^-?\d{1,2}(\.\d{1,4})?$/.test(req.query.lat)
    ||!/^-?\d{1,3}(\.\d{1,4})?$/.test(req.query.lon)
    ||!validPoint(lat,lon))return res.status(400).json({error:'Use a Michigan reference coordinate.',scope:'no-thermal-claim'});
 const now=new Date(),dates=requestDates(now);
 if(dates.state!=='OK'){
  res.setHeader('Cache-Control','public, s-maxage=1800');
  return res.status(200).json({schema:'seasonal-heat-v1',status:'PENDING_FIRST_COMPLETE_DAY',
   asOfDate:null,totalGdd50F:null,comparison:null,scope:'no-thermal-claim'});
 }
 try{
  const {asOfDate,previousDate}=dates;
  const currentUrl=wmsUrl(lat,lon,asOfDate,'current');
  const anomalyUrl=wmsUrl(lat,lon,asOfDate,'anomaly');
  const requests=[fetchGrid(currentUrl),fetchGrid(anomalyUrl)];
  if(previousDate)requests.push(fetchGrid(wmsUrl(lat,lon,previousDate,'current')));
  const [current,anomaly,previous=null]=await Promise.all(requests);
  const snapshot=seasonalSnapshot({lat,lon,asOfDate,current,anomaly,previous,previousDate,now});
  if(snapshot.status!=='AVAILABLE'&&snapshot.status!=='PARTIAL')return res.status(503).json({...snapshot,status:'UNAVAILABLE'});
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=1800');
  return res.status(200).json(snapshot);
 }catch(e){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({schema:'seasonal-heat-v1',status:'UNAVAILABLE',
   error:'Official USA-NPN accumulated heat data temporarily unavailable.',
   totalGdd50F:null,comparison:null,scope:'no-thermal-claim'});
 }
}
