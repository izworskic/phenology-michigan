// Michigan Phenology shared thermal evidence engine.
// Open-Meteo ERA5-Land reanalysis + recent modeled daily data. This is NOT a
// local weather-station observation, biological emergence clock, or soil GDD.
const BASE_F=50;
const DAY_MS=86400000;
const TZ='America/Detroit';
export function localDate(date=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
export function addDays(day,n){return new Date(Date.parse(day+'T12:00:00Z')+n*DAY_MS).toISOString().slice(0,10);}
export function sameDayDifferentYear(day,year){
 const tail=day.slice(4);return String(year)+tail;
}
export function validPoint(lat,lon){
 return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=41.5&&lat<=48.6&&lon>=-90.6&&lon<=-82.0;
}
export function gddDailyF(high,low,base=BASE_F){
 if(high===null||low===null||typeof high!=='number'||typeof low!=='number'||!Number.isFinite(high)||!Number.isFinite(low)||high< -120||high>135||low< -120||low>135||low>high||!Number.isFinite(base))return null;
 return Math.max(0,(high+low)/2-base);
}
export function dailyMap(json){
 if(!json||json.timezone!==TZ||json.daily_units?.temperature_2m_max!=='°F'||json.daily_units?.temperature_2m_min!=='°F')throw Error('HEAT_UNEXPECTED_UNITS_OR_TIMEZONE');
 const t=json.daily?.time,h=json.daily?.temperature_2m_max,l=json.daily?.temperature_2m_min;
 if(!Array.isArray(t)||!Array.isArray(h)||!Array.isArray(l)||t.length!==h.length||t.length!==l.length||t.length>5200)throw Error('HEAT_INVALID_SERIES');
 const map=new Map();
 for(let i=0;i<t.length;i++){
  const date=t[i];
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||map.has(date))throw Error('HEAT_INVALID_DATE');
  map.set(date,gddDailyF(h[i],l[i]));
 }
 return map;
}
export function sumSeason(map,year,through){
 const first=year+'-01-01',end=year+through.slice(4);
 if(end<first)return null;
 let total=0,days=0,missing=0;
 for(let date=first;date<=end;date=addDays(date,1)){
  const val=map.get(date);
  if(!Number.isFinite(val)){missing++;continue;}
  total+=val;days++;
 }
 if(missing||!days)return {complete:false,days,missing,total:null};
 return {complete:true,days,missing,total:Math.round(total*10)/10};
}
export function seasonalSnapshot({archive,recent,now=new Date(),lat,lon,cutoffDate}){
 if(!validPoint(lat,lon))throw Error('HEAT_INVALID_MICHIGAN_LOCATION');
 const today=localDate(now),year=Number(today.slice(0,4)),asOfDate=addDays(today,-1);
 const archiveMap=dailyMap(archive),recentMap=dailyMap(recent);
 const makeBase={schema:'seasonal-heat-v1',provider:'Michigan Phenology',status:'PENDING',
  scope:'regional-air-temperature-model-context',location:{latitude:lat,longitude:lon,kind:'gridded-weather-near-point'},
  seasonYear:year,asOfDate,computedAt:now.toISOString(),
  method:{baseF:BASE_F,firstDay:year+'-01-01',daily:'max(0, (highF + lowF)/2 - 50F)',timeZone:TZ,
   evidence:'ERA5-Land reanalysis through archive cutoff, recent forecast-model past days afterward',
   archiveThroughDate:cutoffDate,comparison:'Same-coordinate 10 previous seasons, through same calendar day',
   limitations:'Air temperature model not a thermometer or soil observation; 2026 current series blends reanalysis and recent modeled history. No species-specific thresholds.'},
  dataUrls:['https://open-meteo.com/en/docs/historical-weather-api','https://open-meteo.com/en/docs'],monthly:[],
  caveats:['The ZIP reference coordinate is an approximate census-area point, not a garden sensor.',
   'A typical-season comparison is statistical background, not evidence of flowers blooming or leafcutter bees emerging.',
   'USA-NPN Spring Indices describe early-spring indicator plants and cannot establish summer nectar availability.']};
 if(asOfDate<year+'-01-01')return {...makeBase,status:'PENDING_FIRST_COMPLETE_DAY',totalGdd50F:null,comparison:null,daily:[]};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate))throw Error('HEAT_INVALID_CUTOFF');
 const merged=new Map();
 const totalDays=[];
 for(let d=year+'-01-01';d<=asOfDate;d=addDays(d,1)){
  const kind=d<=cutoffDate?'era5_land_reanalysis':'recent_weather_model';
  const value=kind==='era5_land_reanalysis'?archiveMap.get(d):recentMap.get(d);
  merged.set(d,Number.isFinite(value)?value:null);
  totalDays.push({date:d,value:Number.isFinite(value)?value:null,kind});
 }
 const actual=sumSeason(merged,String(year),asOfDate);
 const history=[];
 for(let past=year-10;past<year;past++){
  const value=sumSeason(archiveMap,String(past),asOfDate);
  if(value?.complete)history.push({year:past,totalGdd50F:value.total});
 }
 const baseline=history.length>=8?Math.round(history.reduce((sum,x)=>sum+x.totalGdd50F,0)/history.length*10)/10:null;
 const comparison=baseline===null?null:{meanGdd50F:baseline,years:history.map(x=>x.year),period:(year-10)+'–'+(year-1),
  differenceGdd50F:actual.complete?Math.round((actual.total-baseline)*10)/10:null,
  direction:actual.complete?(actual.total>baseline+5?'warmer-than-comparison':actual.total<baseline-5?'cooler-than-comparison':'near-comparison'):'UNKNOWN',
  isClimatologicalNormal:false};
 return {...makeBase,status:actual.complete?'AVAILABLE':'INCOMPLETE',
  totalGdd50F:actual.complete?actual.total:null,
  validDays:actual.days,missingDays:actual.missing,
  recentModeledDays:totalDays.filter(x=>x.kind==='recent_weather_model'&&x.value!==null).length,
  archiveReanalysisDays:totalDays.filter(x=>x.kind==='era5_land_reanalysis'&&x.value!==null).length,
  comparison, daily:totalDays.slice(-28).map(d=>({date:d.date,gdd50F:d.value===null?null:Math.round(d.value*10)/10,kind:d.kind})),
  sourceFreshness:'through last complete local day',modelNotObservation:true,bloomStatus:'UNVERIFIED',speciesEmergenceStatus:'UNVERIFIED'};
}
export function sourceUrls(lat,lon,today){
 if(!validPoint(lat,lon))throw Error('HEAT_INVALID_LOCATION');
 const seasonYear=Number(today.slice(0,4));
 const cutoffDate=addDays(today,-12);
 const arch=new URL('https://archive-api.open-meteo.com/v1/archive');
 const fore=new URL('https://api.open-meteo.com/v1/forecast');
 for(const u of [arch,fore]){
  u.searchParams.set('latitude',String(lat));u.searchParams.set('longitude',String(lon));
  u.searchParams.set('daily','temperature_2m_max,temperature_2m_min');
  u.searchParams.set('temperature_unit','fahrenheit');
  u.searchParams.set('timezone',TZ);
 }
 arch.searchParams.set('start_date',(seasonYear-10)+'-01-01');
 arch.searchParams.set('end_date',cutoffDate);
 arch.searchParams.set('models','era5_land');
 fore.searchParams.set('past_days','16');fore.searchParams.set('forecast_days','1');
 return {archiveUrl:arch.href,recentUrl:fore.href,cutoffDate};
}
