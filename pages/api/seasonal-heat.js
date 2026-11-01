import {validPoint,localDate,sourceUrls,seasonalSnapshot} from '../../lib/seasonal-heat.mjs';
const USER_AGENT='MichiganPhenologySeasonalHeat/1.0 (https://phenology.chrisizworski.com/)';
async function fetchJson(url){
 const u=new URL(url);
 if(u.protocol!=='https:'||!['archive-api.open-meteo.com','api.open-meteo.com'].includes(u.hostname))throw Error('HEAT_SOURCE_NOT_ALLOWED');
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':USER_AGENT},signal:AbortSignal.timeout(13000),redirect:'error'});
 if(!r.ok)throw Error('HEAT_SOURCE_UNAVAILABLE');
 return r.json();
}
export const config={maxDuration:30};
export default async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const lat=Number(req.query?.lat),lon=Number(req.query?.lon);
 if(!req.query?.lat||!req.query?.lon||typeof req.query.lat!=='string'||typeof req.query.lon!=='string'
    ||!/^-?\d{1,2}(\.\d{1,4})?$/.test(req.query.lat)
    ||!/^-?\d{1,3}(\.\d{1,4})?$/.test(req.query.lon)
    ||!validPoint(lat,lon))return res.status(400).json({error:'Enter a supported Michigan reference coordinate.',scope:'no-thermal-claim'});
 const now=new Date();
 const today=localDate(now);
 const {archiveUrl,recentUrl,cutoffDate}=sourceUrls(lat,lon,today);
 try{
  const [archive,recent]=await Promise.all([fetchJson(archiveUrl),fetchJson(recentUrl)]);
  const data=seasonalSnapshot({archive,recent,now,lat,lon,cutoffDate});
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=1800');
  return res.status(200).json(data);
 }catch(error){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({schema:'seasonal-heat-v1',status:'UNAVAILABLE',scope:'no-thermal-claim',
   error:'Seasonal heat evidence unavailable from required source.',asOfDate:null,
   totalGdd50F:null,comparison:null});
 }
}
