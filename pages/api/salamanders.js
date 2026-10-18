import {REGIONS,isSeason,localDate,analyzeRegion,offlineRegion,SOURCE_NOTE,thawContext} from '../../lib/salamanders.mjs';
import {acisUrl,parseAcisDaily,summarizeThaw,ACIS_DOCS} from '../../lib/salamander-thaw.mjs';
const UA='Michigan Salamander Migration Forecast (https://phenology.chrisizworski.com/salamander-migration)';
async function getNws(url){
 const r=await fetch(url,{headers:{Accept:'application/geo+json','User-Agent':UA},signal:AbortSignal.timeout(6500)});
 if(!r.ok)throw Error('NWS request '+r.status);
 return r.json();
}
async function stationHistory(region,now){
 const r=await fetch(acisUrl(region.sid,localDate(now)),{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('NOAA RCC climate service unavailable');
 const payload=await r.json();
 if(payload?.error)throw Error('Climate station did not return observations');
 const observations=parseAcisDaily(payload,localDate(now));
 return summarizeThaw(observations,localDate(now),region.sid);
}
async function nwsPeriods(region){
 const point=await getNws('https://api.weather.gov/points/'+region.lat+','+region.lon);
 const url=point?.properties?.forecastHourly;
 if(!url||!url.startsWith('https://api.weather.gov/'))throw Error('Missing official NWS forecast endpoint');
 const hourly=await getNws(url);
 const periods=hourly?.properties?.periods;
 if(!Array.isArray(periods)||periods.length<6)throw Error('Empty hourly forecast');
 return {periods,updatedAt:typeof hourly?.properties?.updateTime==='string'?hourly.properties.updateTime:null};
}
async function regionForecast(region,now){
 // Missing climate station data must not break the live NWS layer; do not fake snow-free readings.
 const [wx,climate]=await Promise.allSettled([nwsPeriods(region),stationHistory(region,now)]);
 const thaw=climate.status==='fulfilled'?climate.value:{...thawContext(),station:region.sid,source:'NOAA RCC ACIS unavailable',dataUnavailable:true};
 if(wx.status!=='fulfilled')return {...offlineRegion(region),season:'unavailable',thaw,source:'NWS hourly forecast unavailable for this region'};
 return {...analyzeRegion(region,wx.value.periods,now,thaw),nwsUpdatedAt:wx.value.updatedAt};
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
 const now=new Date(),active=isSeason(now);
 const basis={generatedAt:now.toISOString(),date:localDate(now),status:active?'spring_watch':'off_season',
  confirmedMovement:false,explanation:SOURCE_NOTE,
  sources:[
   {name:'National Weather Service API',url:'https://www.weather.gov/documentation/services-web-api'},
   {name:'NOAA Regional Climate Centers: ACIS daily stations',url:ACIS_DOCS},
   {name:'Regional Climate Centers preliminary-data disclaimer',url:'https://www.rcc-acis.org/disclaimer.html'},
   {name:'Michigan DNR salamander information',url:'https://www.michigan.gov/dnr/education/michigan-species/reptiles/lizards'},
   {name:'Michigan Nature Association spring migration',url:'https://michigannature.wordpress.com/2026/03/27/march-of-the-amphibians-springtime-salamander-migration-is-officially-underway/'},
   {name:'University of New Hampshire Extension Big Night',url:'https://extension.unh.edu/blog/2026/03/what-big-night-spring-how-can-you-help-amphibians-during-time'}
  ]};
 // Do not create spurious fall/winter Big Night alerts or unnecessary provider calls.
 if(!active)return res.status(200).json({...basis,regions:REGIONS.map(offlineRegion)});
 const results=await Promise.allSettled(REGIONS.map(region=>regionForecast(region,now)));
 const regions=results.map((result,i)=>result.status==='fulfilled'?result.value:({...offlineRegion(REGIONS[i]),season:'unavailable',thaw:{...thawContext(),station:REGIONS[i].sid},source:'NWS forecast unavailable for this region'}));
 const successes=regions.filter(r=>r.season==='spring').length;
 return res.status(200).json({...basis,status:successes?'spring_watch':'forecast_unavailable',
  ...(successes<REGIONS.length?{error:successes?'Some regional NWS forecasts are unavailable; their values are not imputed.':'NWS forecasts temporarily unavailable. No migration assessment can be issued.'}:{}),
  regions});
}