import {REGIONS} from '../../lib/trillium.mjs';
import FLOWERING from '../../data/trillium-flowering-history.json';
import ERA5 from '../../data/trillium-thermal-history.json';
import {fitThermalModel,decideThermal} from '../../lib/trillium-thermal.mjs';
const OPEN_METEO_ARCHIVE='https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_FORECAST='https://api.open-meteo.com/v1/forecast';
const MS_DAY=86400000;
function localDate(now){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>p.find(x=>x.type===k)?.value;
 return {year:Number(get('year')),month:Number(get('month')),date:get('year')+'-'+get('month')+'-'+get('day')};
}
const dateOffset=(date,offset)=>new Date(Date.parse(date+'T12:00:00Z')+offset*MS_DAY).toISOString().slice(0,10);
function url(base,params){const u=new URL(base);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));return u.toString();}
async function fetchDays(fullUrl){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{
  const res=await fetch(fullUrl,{signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'Michigan Trillium Weather Context (https://phenology.chrisizworski.com)'}});
  if(!res.ok)throw Error('Open-Meteo HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data?.daily?.time)||!Array.isArray(data?.daily?.temperature_2m_mean))throw Error('Missing temperature timeline');
  if(data.daily.time.length!==data.daily.temperature_2m_mean.length)throw Error('Mismatched temperature timeline');
  return data.daily;
 }finally{clearTimeout(timeout);}
}
async function currentSeasonDays(region,local){
 const start=local.year+'-03-01';
 const archiveThrough=dateOffset(local.date,-11);
 const requireArchive=archiveThrough>=start;
 const queryBase={latitude:region.lat,longitude:region.lon,daily:'temperature_2m_mean',temperature_unit:'fahrenheit',timezone:'America/Detroit'};
 const reqs=[fetchDays(url(OPEN_METEO_FORECAST,{...queryBase,past_days:16,forecast_days:8}))];
 if(requireArchive)reqs.push(fetchDays(url(OPEN_METEO_ARCHIVE,{...queryBase,start_date:start,end_date:archiveThrough,models:'era5'})));
 const response=await Promise.all(reqs);
 const byDate=new Map();
 if(requireArchive){
  const old=response[1];
  for(let i=0;i<old.time.length;i++){
   const mean=old.temperature_2m_mean[i];
   if(typeof mean==='number'&&Number.isFinite(mean))byDate.set(old.time[i],{date:old.time[i],meanF:mean,kind:'reanalysis'});
  }
 }
 const recent=response[0];
 for(let i=0;i<recent.time.length;i++){
  const date=recent.time[i],mean=recent.temperature_2m_mean[i];
  if(typeof mean==='number'&&Number.isFinite(mean))byDate.set(date,{date,meanF:mean,kind:date>local.date?'forecast':'model_recent'});
 }
 return [...byDate.values()].filter(day=>day.date>=start&&day.date<=local.year+'-06-30');
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const regionId=typeof req.query.region==='string'?req.query.region:'';
 const region=REGIONS.find(item=>item.id===regionId);
 if(!region)return res.status(400).json({error:'Choose a valid Michigan region.'});
 const now=new Date(),local=localDate(now);
 const model=fitThermalModel(FLOWERING,ERA5,region.id,local.year+1);
 res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=21600');
 const disclosure='Base-40°F seasonal air-temperature accumulation from March 1 is a descriptive spring-heat index, not a species-validated soil temperature or trillium bloom probability. ERA5 and forecast grid weather represent a region, not a specific preserve. A calendar comparison is not plant confirmation.';
 if(local.month<3||local.month>6)return res.status(200).json({region:region.id,updatedAt:now.toISOString(),state:'off',label:'Spring thermal tracker is off season',reason:'The weather-driven spring index resumes March 1. No autumn flowering claim.',model,method:disclosure,source:'Open-Meteo ERA5 / Open-Meteo forecast'});
 try{
  const daily=await currentSeasonDays(region,local);
  const decision=decideThermal({archive:ERA5,regionId:region.id,year:local.year,nowDate:local.date,daily,model});
  return res.status(200).json({region:region.id,updatedAt:now.toISOString(),...decision,method:disclosure,
    source:'Open-Meteo ERA5 reanalysis for historical weather + Open-Meteo recent modeled and seven-day forecast mean air temperature',
    sourceUrls:['https://open-meteo.com/en/docs/historical-weather-api','https://open-meteo.com/en/docs']});
 }catch{
  return res.status(200).json({region:region.id,updatedAt:now.toISOString(),state:'unavailable',label:'Spring heat data temporarily unavailable',
   reason:'Required historical/recent temperatures could not be retrieved. We do not infer a bloom signal from incomplete daily records.',
   model,method:disclosure,source:'Open-Meteo ERA5 / Open-Meteo forecast'});
 }
}
