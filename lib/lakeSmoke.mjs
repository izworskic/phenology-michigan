/* Great Lakes lake smoke (steam fog) planning heuristic.
 * Not a visibility forecast, observation, or meteorological probability.
 * Water temperature must be site-specific and recent before a score is shown.
 */
export const SITES = [
  {id:'marquette',name:'Marquette Lower Harbor',lake:'Superior',lat:46.547,lon:-87.386,waterLat:46.555,waterLon:-87.340,tz:'America/Detroit',view:'Harbor shoreline · check local access and conditions'},
  {id:'munising',name:'Munising / Sand Point',lake:'Superior',lat:46.411,lon:-86.627,waterLat:46.425,waterLon:-86.590,tz:'America/Detroit',view:'Open water near Sand Point · verify seasonal access'},
  {id:'grand-marais',name:'Grand Marais',lake:'Superior',lat:46.669,lon:-85.984,waterLat:46.698,waterLon:-85.964,tz:'America/Detroit',view:'Lake Superior shoreline'},
  {id:'whitefish-point',name:'Whitefish Point',lake:'Superior',lat:46.771,lon:-84.964,waterLat:46.797,waterLon:-84.943,tz:'America/Detroit',view:'Exposed Superior shore · conditions can be severe'},
  {id:'frankfort',name:'Frankfort Beach',lake:'Michigan',lat:44.631,lon:-86.251,waterLat:44.630,waterLon:-86.311,tz:'America/Detroit',view:'Lake Michigan beach and harbor'},
  {id:'ludington',name:'Ludington Waterfront',lake:'Michigan',lat:43.953,lon:-86.468,waterLat:43.955,waterLon:-86.523,tz:'America/Detroit',view:'Public waterfront near Lake Michigan'},
  {id:'grand-haven',name:'Grand Haven',lake:'Michigan',lat:43.054,lon:-86.252,waterLat:43.049,waterLon:-86.320,tz:'America/Detroit',view:'Beach area · stay clear of piers during hazardous weather'},
  {id:'st-joseph',name:'St. Joseph',lake:'Michigan',lat:42.110,lon:-86.489,waterLat:42.111,waterLon:-86.543,tz:'America/Detroit',view:'Lake Michigan beachfront'},
  {id:'mackinaw-city',name:'Mackinaw City / Straits',lake:'Huron',lat:45.777,lon:-84.729,waterLat:45.773,waterLon:-84.657,tz:'America/Detroit',view:'Straits waterfront · local conditions vary over short distances'},
  {id:'alpena',name:'Alpena',lake:'Huron',lat:45.061,lon:-83.427,waterLat:45.050,waterLon:-83.355,tz:'America/Detroit',view:'Thunder Bay shoreline'},
  {id:'tawas',name:'Tawas Point',lake:'Huron',lat:44.255,lon:-83.449,waterLat:44.254,waterLon:-83.395,tz:'America/Detroit',view:'Tawas Point shoreline'},
  {id:'saginaw-bay',name:'Saginaw Bay / Bay City',lake:'Huron',lat:43.659,lon:-83.899,waterLat:43.672,waterLon:-83.818,tz:'America/Detroit',view:'Saginaw Bay shoreline · shallow-bay temperatures can change rapidly'},
  {id:'lexington',name:'Lexington',lake:'Huron',lat:43.267,lon:-82.531,waterLat:43.279,waterLon:-82.465,tz:'America/Detroit',view:'Southern Lake Huron waterfront'},
  {id:'monroe',name:'Monroe / Sterling State Park',lake:'Erie',lat:41.948,lon:-83.338,waterLat:41.930,waterLon:-83.270,tz:'America/Detroit',view:'Western Lake Erie shore'},
  {id:'oswego',name:'Oswego',lake:'Ontario',lat:43.462,lon:-76.518,waterLat:43.516,waterLon:-76.505,tz:'America/New_York',view:'Lake Ontario public waterfront'}
];
export const SOURCE_LINKS=[
  {name:'NOAA GLSEA satellite surface temperature',url:'https://coastwatch.glerl.noaa.gov/satellite-data-products/lake-surface-temperature/'},
  {name:'NOAA National Data Buoy Center recent water observations',url:'https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt'},
  {name:'NOAA ERDDAP ACSPO GLSEA grid',url:'https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph'},
  {name:'National Weather Service API',url:'https://www.weather.gov/documentation/services-web-api'},
  {name:'NOAA GLSEA / National Ice Center ice concentration',url:'https://apps.glerl.noaa.gov/erddap/info/GL_Ice_Concentration_GCS/index.html'},
  {name:'NOAA: wind direction means where wind comes FROM',url:'https://www.noaa.gov/jetstream/synoptic/origin-of-wind'}
];
export const fFromC = x => x == null ? null : Math.round((x*9/5+32)*10)/10;
export function windMph(value) {
  if(typeof value==='number' && Number.isFinite(value)) return value;
  if(typeof value!=='string') return null;
  if(/calm/i.test(value))return 0;
  const nums=value.match(/\d+(\.\d+)?/g);
  if(!nums)return null;
  return Math.max(...nums.map(Number))*(/km\/h/i.test(value)?0.621371:1);
}
export function localParts(date,tz='America/Detroit'){
  const items=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const p=Object.fromEntries(items.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour)%24};
}
export function scoreWindow(waterC,airF,wind,pop=0){
  if(!Number.isFinite(waterC)||!Number.isFinite(airF)||!Number.isFinite(wind))return null;
  const spread=waterC-(airF-32)*5/9;
  // Water colder than air does not meet the steam-fog setup.
  if(spread<2)return {score:0,spreadC:Math.round(spread*10)/10,signal:'Unfavorable'};
  let raw=spread<4?21:spread<7?49:spread<10?68:82;
  if(spread>=13)raw+=5;
  if(wind>=3&&wind<=10)raw+=11;
  else if(wind<3)raw-=5;
  else if(wind<=16)raw-=12;
  else raw-=35;
  if(Number.isFinite(pop)&&pop>=70)raw-=8;
  const score=Math.max(0,Math.min(100,Math.round(raw)));
  return {score,spreadC:Math.round(spread*10)/10,signal:score>=75?'Strong setup':score>=50?'Promising':score>=30?'Possible':'Unfavorable'};
}
export function periodAirF(period){
  const n=Number(period?.temperature);
  if(!Number.isFinite(n))return null;
  return period.temperatureUnit==='C'?fFromC(n):n;
}
export function morningOutlook(site,water,periods,now=new Date()){
  if(!water||!Number.isFinite(water.c)||!water.time||!Number.isFinite(Date.parse(water.time)))return {windows:[],hourly:[],best:null};
  const ageH=(now.getTime()-Date.parse(water.time))/3600000;
  if(ageH< -6||ageH>96)return {windows:[],hourly:[],best:null};
  const end=now.getTime()+72*3600000;
  const hourly=(Array.isArray(periods)?periods:[]).map(p=>{
    const date=new Date(p.startTime);
    const tm=date.getTime();
    if(!Number.isFinite(tm)||tm<now.getTime()-3600000||tm>end)return null;
    const local=localParts(date,site.tz);
    if(local.hour<5||local.hour>10)return null;
    const temp=periodAirF(p);
    const wind=windMph(p.windSpeed);
    const pop=p.probabilityOfPrecipitation?.value;
    const result=scoreWindow(water.c,temp,wind,pop);
    if(!result)return null;
    return {time:date.toISOString(),date:local.date,hour:local.hour,airF:temp,waterF:fFromC(water.c),windMph:Math.round(wind),pop:Number.isFinite(pop)?pop:null,...result};
  }).filter(Boolean);
  const buckets=new Map();
  for(const point of hourly){
    const previous=buckets.get(point.date);
    if(!previous||point.score>previous.score)buckets.set(point.date,point);
  }
  const windows=[...buckets.values()].sort((a,b)=>a.time.localeCompare(b.time));
  const best=windows.slice().sort((a,b)=>b.score-a.score||a.time.localeCompare(b.time))[0]||null;
  return {windows,hourly,best};
}
export function siteStatus(outlook,water){
  if(!water||!Number.isFinite(water.c))return {label:'Water data unavailable',tone:'unknown'};
  if(!outlook?.windows?.length)return {label:'Morning forecast unavailable',tone:'unknown'};
  const p=outlook.best;
  return {label:p.signal,tone:p.score>=75?'strong':p.score>=50?'possible':'low'};
}
