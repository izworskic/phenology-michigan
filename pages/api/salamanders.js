import {REGIONS,isSeason,localDate,forecastUrl,analyzeRegion,offlineRegion,SOURCE_NOTE} from '../../lib/salamanders.mjs';

export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
 const now=new Date(),active=isSeason(now);
 const basis={generatedAt:now.toISOString(),date:localDate(now),status:active?'spring_watch':'off_season',
  confirmedMovement:false,explanation:SOURCE_NOTE,
  sources:[
   {name:'Open-Meteo forecast documentation',url:'https://open-meteo.com/en/docs'},
   {name:'Michigan DNR salamander information',url:'https://www.michigan.gov/dnr/education/michigan-species/reptiles/lizards'},
   {name:'Michigan Nature Association spring migration',url:'https://michigannature.wordpress.com/2026/03/27/march-of-the-amphibians-springtime-salamander-migration-is-officially-underway/'},
   {name:'University of New Hampshire Extension Big Night',url:'https://extension.unh.edu/blog/2026/03/what-big-night-spring-how-can-you-help-amphibians-during-time'}
  ]};
 // No spring-migration warnings in October, no off-season weather API calls.
 if(!active)return res.status(200).json({...basis,regions:REGIONS.map(offlineRegion)});
 try{
  const r=await fetch(forecastUrl(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(11000)});
  if(!r.ok)throw Error('forecast upstream '+r.status);
  const value=await r.json(),points=Array.isArray(value)?value:[value];
  if(points.length!==REGIONS.length)throw Error('Unexpected multi-location forecast count');
  const regions=REGIONS.map((region,i)=>analyzeRegion(region,points[i],now));
  return res.status(200).json({...basis,regions});
 }catch{
  return res.status(200).json({...basis,status:'forecast_unavailable',error:'Regional forecast could not be refreshed. No migration assessment is being presented.',regions:REGIONS.map(r=>({...offlineRegion(r),season:'unavailable'}))});
 }
}