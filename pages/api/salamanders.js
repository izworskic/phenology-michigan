import {REGIONS,isSeason,localDate,analyzeRegion,offlineRegion,SOURCE_NOTE} from '../../lib/salamanders.mjs';
const UA='Michigan Salamander Migration Forecast (https://phenology.chrisizworski.com/salamander-migration)';
async function getNws(url){
 const r=await fetch(url,{headers:{Accept:'application/geo+json','User-Agent':UA},signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw Error('NWS request '+r.status);
 return r.json();
}
async function regionForecast(region,now){
 const point=await getNws('https://api.weather.gov/points/'+region.lat+','+region.lon);
 const url=point?.properties?.forecastHourly;
 if(!url||!url.startsWith('https://api.weather.gov/'))throw Error('Missing official NWS forecast endpoint');
 const hourly=await getNws(url);
 const periods=hourly?.properties?.periods;
 if(!Array.isArray(periods)||periods.length<6)throw Error('Empty hourly forecast');
 return analyzeRegion(region,periods,now);
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
 const now=new Date(),active=isSeason(now);
 const basis={generatedAt:now.toISOString(),date:localDate(now),status:active?'spring_watch':'off_season',
  confirmedMovement:false,explanation:SOURCE_NOTE,
  sources:[
   {name:'National Weather Service API',url:'https://www.weather.gov/documentation/services-web-api'},
   {name:'Michigan DNR salamander information',url:'https://www.michigan.gov/dnr/education/michigan-species/reptiles/lizards'},
   {name:'Michigan Nature Association spring migration',url:'https://michigannature.wordpress.com/2026/03/27/march-of-the-amphibians-springtime-salamander-migration-is-officially-underway/'},
   {name:'University of New Hampshire Extension Big Night',url:'https://extension.unh.edu/blog/2026/03/what-big-night-spring-how-can-you-help-amphibians-during-time'}
  ]};
 // Do not create spurious fall/winter Big Night alerts or unnecessary provider calls.
 if(!active)return res.status(200).json({...basis,regions:REGIONS.map(offlineRegion)});
 const results=await Promise.allSettled(REGIONS.map(region=>regionForecast(region,now)));
 let successes=0;
 const regions=results.map((result,i)=>{
  if(result.status==='fulfilled'){successes++;return result.value;}
  return {...offlineRegion(REGIONS[i]),season:'unavailable',source:'NWS hourly forecast unavailable for this region'};
 });
 return res.status(200).json({...basis,status:successes?'spring_watch':'forecast_unavailable',
  ...(successes<REGIONS.length?{error:successes?'Some regional NWS forecasts are unavailable; their values are not imputed.':'NWS forecasts temporarily unavailable. No migration assessment can be issued.'}:{}),
  regions});
}