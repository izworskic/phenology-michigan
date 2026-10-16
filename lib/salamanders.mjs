// Michigan spring mole-salamander migration: interpretable weather heuristics, NOT a calibrated probability model.
// No live sightings or specific breeding-pool coordinates are used.
export const REGIONS=[
 {id:'southeast',name:'Detroit & Ann Arbor',place:'Southeast Lower Peninsula',lat:42.35,lon:-83.40,window:'Mid-March through April'},
 {id:'southwest',name:'Kalamazoo & Southwest',place:'Southwest Lower Peninsula',lat:42.32,lon:-85.57,window:'Mid-March through April'},
 {id:'west',name:'Grand Rapids & West',place:'West Lower Peninsula',lat:42.97,lon:-85.67,window:'Mid-March through late April'},
 {id:'mid',name:'Lansing & Mid-Michigan',place:'Central Lower Peninsula',lat:42.74,lon:-84.56,window:'Mid-March through late April'},
 {id:'saginaw-bay',name:'Saginaw Bay & Bay City',place:'East-central Lower Peninsula',lat:43.61,lon:-83.90,window:'Late March through April'},
 {id:'northwest',name:'Traverse City & Northwest',place:'Northwest Lower Peninsula',lat:44.76,lon:-85.62,window:'Late March through early May'},
 {id:'northeast',name:'Gaylord & Northeast',place:'Northeast Lower Peninsula',lat:45.02,lon:-84.68,window:'Late March through early May'},
 {id:'central-up',name:'Marquette & Central U.P.',place:'Central Upper Peninsula',lat:46.54,lon:-87.40,window:'April through May'},
 {id:'western-up',name:'Houghton & Western U.P.',place:'Western Upper Peninsula',lat:47.12,lon:-88.57,window:'April through May'}
];
export const FORECAST_SOURCE='https://open-meteo.com/en/docs';
export const SOURCE_NOTE='Hourly air temperature, predicted rain and modelled snow depth; ground thaw, pool water, migration and sightings are not directly observed.';
export function localDate(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function localMonth(now=new Date()){return Number(localDate(now).slice(5,7));}
export function isSeason(now=new Date()){const m=localMonth(now);return m>=3&&m<=5;}
export function forecastUrl(){
 const p=new URLSearchParams({
  latitude:REGIONS.map(r=>r.lat).join(','),longitude:REGIONS.map(r=>r.lon).join(','),
  hourly:'temperature_2m,rain,snow_depth',daily:'temperature_2m_max,temperature_2m_min',
  temperature_unit:'fahrenheit',precipitation_unit:'mm',timezone:'America/Detroit',past_days:'5',forecast_days:'8'
 });
 return 'https://api.open-meteo.com/v1/forecast?'+p;
}
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round=(n,d=0)=>finite(n)?Number(n.toFixed(d)):null;
const max=(a)=>a.length?Math.max(...a):null;
// Group 6 p.m.–3 a.m. hours into a single migration night. The 00:00–03:00 hours belong to the previous date.
export function nightKey(time){
 if(typeof time!=='string'||time.length<13)return null;
 const h=Number(time.slice(11,13)),day=time.slice(0,10);
 if(h>=18)return day;
 if(h<=3){const dt=new Date(day+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-1);return dt.toISOString().slice(0,10);}
 return null;
}
export function thawContext(payload,today){
 const d=payload?.daily;
 if(!Array.isArray(d?.time)||!Array.isArray(d?.temperature_2m_max))return {state:'unknown',label:'Ground thaw unverified',detail:'Ground and pool conditions are not measured.'};
 const last=d.time.map((date,i)=>({date,hi:d.temperature_2m_max[i],lo:d.temperature_2m_min?.[i]}))
  .filter(v=>v.date<today&&v.date>=shiftDate(today,-4)).slice(-3);
 const mild=last.filter(v=>finite(v.hi)&&v.hi>=43).length;
 const hardFreeze=last.filter(v=>finite(v.hi)&&v.hi<32).length;
 const hourly=payload?.hourly;
 let depth=null;
 if(Array.isArray(hourly?.time)&&Array.isArray(hourly.snow_depth)){
  for(let i=0;i<hourly.time.length;i++){
   if(hourly.time[i].slice(0,10)<=today&&finite(hourly.snow_depth[i]))depth=hourly.snow_depth[i];
   if(hourly.time[i].slice(0,10)>today)break;
  }
 }
 if(depth!==null&&depth>0.03)return {state:'snow',label:'Snowpack may remain',detail:'Forecast-model snow depth is above 3 cm near the regional weather point; thaw may be delayed.',depth:round(depth*100)};
 if(hardFreeze>=2)return {state:'cold',label:'Recent freezing days',detail:'Regional air temperatures have remained near or below freezing. Ground thaw is not confirmed.'};
 if(mild>=2&&depth!==null&&depth<=0.03)return {state:'suggestive',label:'Thaw appears plausible',detail:'Recent mild air and low modelled snow depth suggest thaw may be advancing. Ground and pool water are not measured.',depth:round(depth*100)};
 if(mild>=2)return {state:'possible',label:'Recent spring warmth',detail:'Recent mild days support a thaw possibility, but local soil and snowpack have not been checked.'};
 return {state:'unknown',label:'Ground thaw unverified',detail:'There is not enough evidence to infer local ground thaw.'};
}
export function shiftDate(date,delta){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);
}
export function assessNight(hours,thaw){
 const h=hours.filter(v=>finite(v.temp));
 if(h.length<6)return {level:'unknown',label:'Incomplete forecast',temp:null,rain:null,wetHours:0,warmWetHours:0,details:'Not enough hourly data to interpret the night.'};
 const temps=h.map(v=>v.temp),average=round(temps.reduce((a,b)=>a+b,0)/temps.length),minimum=round(Math.min(...temps));
 const rainKnown=h.filter(v=>finite(v.rain)),rain=rainKnown.length>=6?round(rainKnown.reduce((a,b)=>a+Math.max(0,b.rain),0),1):null;
 const wetHours=rainKnown.filter(v=>v.rain>=0.1).length;
 const warmWetHours=rainKnown.filter(v=>v.rain>=0.1&&v.temp>=40).length;
 const warmHours=h.filter(v=>v.temp>=40).length;
 const common={temp:average,minTemp:minimum,rain,wetHours,warmWetHours,warmHours};
 if(rain===null)return {...common,level:'unknown',label:'Rain data missing',details:'The forecast is missing rainfall amounts.'};
 if(warmHours<3)return {...common,level:'cold',label:'Too cold',details:'Few nighttime hours are forecast to stay at or above 40°F.'};
 if(rain<0.3)return {...common,level:'dry',label:'Dry night',details:'Little or no nighttime rain is forecast.'};
 if(thaw.state==='snow'||thaw.state==='cold')return {...common,level:'guarded',label:'Thaw uncertain',details:'Warm rain is possible, but cold ground or remaining snow could prevent movement.'};
 if(warmWetHours>=3&&rain>=1.0&&warmHours>=5)return {...common,level:'strong',label:'Strong weather signal',details:'Several warm, rainy hours match conditions associated with spring migrations. This is NOT a confirmed Big Night.'};
 if(warmWetHours>=1||rain>=0.3)return {...common,level:'watch',label:'Possible movement',details:'Some overlap of rain and mild temperatures; conditions are less convincing than a sustained warm rain.'};
 return {...common,level:'guarded',label:'Conditions mixed',details:'Rain and warmth may not overlap during the migration window.'};
}
export function analyzeRegion(region,payload,now=new Date()){
 const today=localDate(now),thaw=thawContext(payload,today),series=payload?.hourly;
 const groups=new Map();
 if(Array.isArray(series?.time)){
  for(let i=0;i<series.time.length;i++){
   const key=nightKey(series.time[i]);
   if(!key||key<today||key>=shiftDate(today,7))continue;
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push({temp:series.temperature_2m?.[i],rain:series.rain?.[i]});
  }
 }
 const nights=Array.from({length:7},(_,i)=>{
  const date=shiftDate(today,i),entry=assessNight(groups.get(date)||[],thaw);
  return {date,...entry};
 });
 const priority={strong:4,watch:3,guarded:2,cold:1,dry:1,unknown:0};
 const best=nights.filter(x=>['strong','watch'].includes(x.level)).sort((a,b)=>priority[b.level]-priority[a.level]||a.date.localeCompare(b.date))[0]||null;
 const first=nights[0];
 return {...region,season:'spring',thaw,nights,best,tonight:first,source:'Open-Meteo forecast / site-defined weather rules'};
}
export function offlineRegion(region){return {...region,season:'off',thaw:null,nights:[],best:null,tonight:null,source:'Seasonal timing only'};}
