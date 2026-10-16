// Reproducible thermal archive from Open-Meteo ERA5 daily historical air temperatures.
// 7 regions x 8 historical springs; low-frequency one-off backfill and annual extension.
// No paid scraping connector, personal data, photographs, or observer coordinates.
import fs from 'node:fs/promises';
import {REGIONS} from '../lib/trillium.mjs';
const OUT=new URL('../data/trillium-thermal-history.json',import.meta.url);
const currentYear=new Date().getUTCFullYear();
const selected=process.argv.find(arg=>/^--year=\d{4}$/.test(arg));
const startYear=selected?Number(selected.slice(7)):2019;
const endYear=selected?startYear:Math.min(2026,currentYear);
if(startYear<2019||endYear>currentYear)throw Error('Requested year is outside available history');
let existing;
try{existing=JSON.parse(await fs.readFile(OUT,'utf8'));}catch{existing={schemaVersion:1,regions:{}};}
const archive={schemaVersion:1,source:'Open-Meteo Historical Weather Archive, ERA5',model:'era5',unit:'fahrenheit',variable:'temperature_2m_mean',timezone:'America/Detroit',startMonthDay:'03-01',endMonthDay:'06-30',baseHeatF:40,notes:'Representative regional coordinate air temperatures, not in-situ forest floor soil temperatures or a validated trillium emergence threshold.',retrievedAt:new Date().toISOString().slice(0,10),regions:existing.regions||{}};
const timer=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function download(url){
 for(let attempt=1;attempt<=4;attempt++){
  const controller=new AbortController(),watch=setTimeout(()=>controller.abort(),18000);
  try{
   const r=await fetch(url,{headers:{'User-Agent':'Michigan Phenology Trillium Thermal Archive/1.0 (https://phenology.chrisizworski.com)','Accept':'application/json'},signal:controller.signal});
   if(!r.ok)throw Error('Open-Meteo HTTP '+r.status);
   const body=await r.json();
   if(!Array.isArray(body?.daily?.time)||!Array.isArray(body.daily.temperature_2m_mean))throw Error('Missing ERA5 daily fields');
   return body.daily;
  }catch(e){if(attempt===4)throw e;await timer(attempt*1800);}
  finally{clearTimeout(watch);}
 }
}
for(const region of REGIONS){
 const record=archive.regions[region.id]||{coordinate:[region.lat,region.lon],years:{}};
 record.coordinate=[region.lat,region.lon];record.years ||= {};
 for(let year=startYear;year<=endYear;year++){
  if(Array.isArray(record.years[year])&&record.years[year].length===122&&!selected)continue;
  const q=new URLSearchParams({latitude:String(region.lat),longitude:String(region.lon),start_date:year+'-03-01',end_date:year+'-06-30',daily:'temperature_2m_mean',temperature_unit:'fahrenheit',timezone:'America/Detroit',models:'era5'});
  const daily=await download('https://archive-api.open-meteo.com/v1/archive?'+q.toString());
  if(daily.time.length!==122||daily.temperature_2m_mean.length!==122||daily.time[0]!==year+'-03-01'||daily.time.at(-1)!==year+'-06-30')throw Error('Partial archive '+region.id+' '+year);
  const temps=daily.temperature_2m_mean.map(n=>n===null?null:Number.isFinite(Number(n))?Math.round(Number(n)*10)/10:null);
  if(temps.filter(n=>n!==null).length<119)throw Error('Too many missing temperature days '+region.id+' '+year);
  record.years[year]=temps;
  console.log('ERA5',region.id,year,'days',temps.length);
  await timer(350);
 }
 archive.regions[region.id]=record;
}
await fs.writeFile(OUT,JSON.stringify(archive,null,2)+'\n');
console.log('Saved ERA5 temperatures for',Object.keys(archive.regions).length,'Michigan regions. No bloom inference until held-out validation.');
