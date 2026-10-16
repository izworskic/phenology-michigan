import {REGIONS,normalizeSightings,outlook} from '../../lib/trillium.mjs';
const INAT='https://api.inaturalist.org/v1/observations';
const OPEN_METEO='https://api.open-meteo.com/v1/forecast';
const USER_AGENT='Michigan Trillium Bloom Planner (https://phenology.chrisizworski.com)';
async function json(url,timeout=6500){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const resp=await fetch(url,{headers:{'User-Agent':USER_AGENT,'Accept':'application/json'},signal:controller.signal});if(!resp.ok)throw new Error('HTTP '+resp.status);return await resp.json();}
 finally{clearTimeout(timer);}
}
function weatherUrl(region){
 const u=new URL(OPEN_METEO);
 Object.entries({latitude:region.lat,longitude:region.lon,daily:'temperature_2m_max,temperature_2m_min,precipitation_sum',temperature_unit:'fahrenheit',precipitation_unit:'inch',timezone:'America/Detroit',forecast_days:7}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 return u.toString();
}
async function regionalWeather(region){
 const data=await json(weatherUrl(region));
 const daily=data?.daily;
 if(!Array.isArray(daily?.time)||!Array.isArray(daily.temperature_2m_max)||!Array.isArray(daily.temperature_2m_min))throw new Error('incomplete daily weather');
 return {source:'Open-Meteo 7-day daily forecast',days:daily.time.map((date,i)=>({date,maxF:Number(daily.temperature_2m_max[i]),minF:Number(daily.temperature_2m_min[i]),rainIn:Number(daily.precipitation_sum?.[i]||0)})).filter(d=>Number.isFinite(d.maxF)&&Number.isFinite(d.minF))};
}
async function recentFlowers(now){
 // A species observation without the annotation does NOT prove an open flower.
 const d=new Date(now.getTime()-10*86400000).toISOString().slice(0,10);
 const u=new URL(INAT);
 Object.entries({place_id:29,taxon_name:'Trillium grandiflorum',term_id:12,term_value_id:13,quality_grade:'research',d1:d,order_by:'observed_on',order:'desc',per_page:120}).forEach(([k,v])=>u.searchParams.set(k,String(v)));
 const raw=await json(u.toString());
 if(!Array.isArray(raw?.results))throw new Error('invalid observation feed');
 return normalizeSightings(raw.results,now);
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const now=new Date(), month=now.getUTCMonth()+1;
 const active=month>=3&&month<=6;
 let sightings=[],observationStatus=active?'Unavailable':'Outside observation season';
 if(active){try{sightings=await recentFlowers(now);observationStatus='iNaturalist research-grade flowering annotations';}catch{observationStatus='Flower observations temporarily unavailable';}}
 const results=await Promise.all(REGIONS.map(async(region)=>{
   let weather=null,forecastStatus=active?'Unavailable':'Off season';
   if(active){try{weather=await regionalWeather(region);forecastStatus='Open-Meteo daily forecast';}catch{forecastStatus='Forecast temporarily unavailable';}}
   return {...region,...outlook(region,now,weather,sightings),forecastStatus};
 }));
 res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=21600');
 return res.status(200).json({updatedAt:now.toISOString(),year:now.getFullYear(),regions:results,observationStatus,method:'Seasonal ranges are broad planning context; Open-Meteo temperature is a weather nudge, not a calibrated flowering model. iNaturalist plant-phenology annotations confirm regional flowers in public observations, not bloom at a listed trail.',sources:{flowering:'https://www.inaturalist.org/observations?place_id=29&taxon_name=Trillium%20grandiflorum&term_id=12&term_value_id=13',forecast:'https://open-meteo.com/',timing:'https://www2.dnr.state.mi.us/publications/pdfs/huntingwildlifehabitat/Landowners_Guide/Resource_Dir/Acrobat/Wildflowers.PDF'}});
}
