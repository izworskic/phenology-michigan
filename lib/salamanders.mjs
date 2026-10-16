// Michigan spring mole-salamander migration: NWS weather-fit heuristics, NOT a calibrated probability model.
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
export const SOURCE_NOTE='National Weather Service hourly air temperature, precipitation likelihood and forecast wording. Ground thaw, snowpack, breeding pools and actual salamander movement are NOT observed.';
function parts(date){
 return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(v=>['year','month','day','hour'].includes(v.type)).map(v=>[v.type,Number(v.value)]));
}
export function localDate(now=new Date()){const p=parts(now);return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');}
export function localMonth(now=new Date()){return parts(now).month;}
export function isSeason(now=new Date()){const m=localMonth(now);return m>=3&&m<=5;}
export function shiftDate(date,delta){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);
}
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round=n=>finite(n)?Math.round(n):null;
// Group 6 p.m.–3 a.m. into one migration night; 00:00–03:00 belongs to the previous date.
export function nightKey(time){
 if(typeof time!=='string'||time.length<13)return null;
 const h=Number(time.slice(11,13)),day=time.slice(0,10);
 if(h>=18)return day;
 if(h<=3)return shiftDate(day,-1);
 return null;
}
function hourlyLocalKey(startTime){
 const dt=new Date(startTime);
 if(Number.isNaN(dt.getTime()))return null;
 const p=parts(dt);
 return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-')+'T'+String(p.hour).padStart(2,'0')+':00';
}
export function thawContext(){
 return {state:'unknown',label:'Local ground thaw unverified',detail:'An NWS air forecast cannot confirm that forest soils have thawed or that breeding pools have filled. Check conditions on the ground.'};
}
export function assessNight(hours){
 const valid=hours.filter(h=>finite(h.temp));
 if(valid.length<6)return {level:'unknown',label:'Incomplete forecast',temp:null,rainChance:null,warmRainHours:0,details:'Not enough hourly readings to interpret this night.'};
 const warmHours=valid.filter(h=>h.temp>=40).length;
 const temp=round(valid.reduce((sum,h)=>sum+h.temp,0)/valid.length);
 const minTemp=round(Math.min(...valid.map(h=>h.temp)));
 const knownPop=valid.filter(h=>finite(h.pop));
 if(knownPop.length<6)return {level:'unknown',label:'Rain forecast missing',temp,rainChance:null,warmRainHours:0,details:'Hourly precipitation forecasts are incomplete.'};
 const rainChance=round(Math.max(...knownPop.map(h=>h.pop)));
 const warmRainHours=knownPop.filter(h=>h.temp>=40&&h.rainSignal&&h.pop>=35&&!h.snowSignal).length;
 const stronger=knownPop.filter(h=>h.temp>=40&&h.rainSignal&&h.pop>=55&&!h.snowSignal).length;
 const snowHours=valid.filter(h=>h.snowSignal).length;
 const common={temp,minTemp,rainChance,warmHours,warmRainHours,snowHours};
 if(warmHours<3)return {...common,level:'cold',label:'Too cold',details:'Too few hours are forecast to stay at or above about 40°F.'};
 if(snowHours>=3)return {...common,level:'guarded',label:'Snow in forecast',details:'Snow or mixed precipitation may mean ground and travel conditions are unsuitable.'};
 if(stronger>=3&&warmHours>=5)return {...common,level:'strong',label:'Strong weather signal',details:'Several hours of likely rain and air above 40°F match common migration conditions. Ground thaw and movement remain unconfirmed.'};
 if(warmRainHours>=1)return {...common,level:'watch',label:'Possible movement',details:'Some warm hours overlap with forecast rain; local thaw and habitat must also cooperate.'};
 if(rainChance>=35)return {...common,level:'guarded',label:'Conditions mixed',details:'Rain and warm hours may not overlap during the night.'};
 return {...common,level:'dry',label:'Mostly dry',details:'Little nighttime rain is indicated in the forecast.'};
}
export function analyzeRegion(region,periods,now=new Date()){
 const today=localDate(now),groups=new Map();
 for(const h of Array.isArray(periods)?periods:[]){
  const time=hourlyLocalKey(h.startTime);
  const date=nightKey(time);
  if(!date||date<today||date>=shiftDate(today,7))continue;
  if(!groups.has(date))groups.set(date,[]);
  const temperature=finite(h.temperature)?(h.temperatureUnit==='C'?h.temperature*9/5+32:h.temperature):null;
  const forecast=String(h.shortForecast||'');
  groups.get(date).push({temp:temperature,pop:h.probabilityOfPrecipitation?.value??null,
   rainSignal:/rain|showers?|drizzle|thunder/i.test(forecast),
   snowSignal:/snow|sleet|ice pellets|freezing rain/i.test(forecast)});
 }
 const nights=Array.from({length:7},(_,i)=>{const date=shiftDate(today,i);return {date,...assessNight(groups.get(date)||[])};});
 const ranking={strong:4,watch:3,guarded:2,cold:1,dry:1,unknown:0};
 const best=nights.filter(n=>['strong','watch'].includes(n.level)).sort((a,b)=>ranking[b.level]-ranking[a.level]||a.date.localeCompare(b.date))[0]||null;
 return {...region,season:'spring',thaw:thawContext(),nights,best,tonight:nights[0],source:'National Weather Service hourly forecast / editorial weather rules'};
}
export function offlineRegion(region){return {...region,season:'off',thaw:null,nights:[],best:null,tonight:null,source:'Seasonal timing only'};}
