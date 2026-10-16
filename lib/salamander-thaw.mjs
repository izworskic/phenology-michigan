// Daily regional climate observations are contextual THAW evidence only, not ground / pool / wildlife sensors.
// Data: NOAA Regional Climate Centers ACIS StnData (maxt,mint,snwd, °F/°F/inches).
// Recent ACIS records are preliminary and may be missing or revised. Never turn M/T/'' into zero.
const DAY=86400000;
export const ACIS_DOCS='https://docs.rcc-acis.org/acisws/';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
export function ageDays(day,today){
 if(!validDate(day)||!validDate(today))return null;
 return Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/DAY);
}
export function acisUrl(station,today){
 if(!/^[A-Z0-9]{4,7}$/.test(station)||!validDate(today))throw Error('Invalid ACIS query scope');
 const d=new Date(today+'T12:00:00Z'),before=new Date(d);before.setUTCDate(d.getUTCDate()-8);
 const end=new Date(d);end.setUTCDate(d.getUTCDate()-1);
 const params=new URLSearchParams({sid:station,sdate:before.toISOString().slice(0,10),edate:end.toISOString().slice(0,10),elems:'maxt,mint,snwd',output:'json'});
 return 'https://data.rcc-acis.org/StnData?'+params;
}
export function climateNumber(raw){
 if(typeof raw==='number')return Number.isFinite(raw)?raw:null;
 if(typeof raw!=='string'||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim()))return null;
 const n=Number(raw.trim());return Number.isFinite(n)?n:null;
}
function snowReading(value){
 if(typeof value==='string'&&value.trim()==='T')return {inches:null,trace:true};
 const inches=climateNumber(value);
 if(inches===null||inches<0)return {inches:null,trace:false};
 return {inches,trace:false};
}
export function parseAcisDaily(payload,today){
 if(!validDate(today)||!Array.isArray(payload?.data)||payload?.error)return {rows:[],stationName:null,available:false};
 const byDay=new Map();
 for(const r of payload.data){
  if(!Array.isArray(r)||!validDate(r[0]))continue;
  const age=ageDays(r[0],today);if(age===null||age<1||age>8)continue;
  let high=climateNumber(r[1]),low=climateNumber(r[2]);
  if(high!==null&&(high>135||high< -85))high=null;
  if(low!==null&&(low>125||low< -100))low=null;
  if(high!==null&&low!==null&&low>high){high=null;low=null;}
  const snow=snowReading(r[3]);
  byDay.set(r[0],{date:r[0],high,low,snowInches:snow.inches,snowTrace:snow.trace});
 }
 return {rows:[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)),
  stationName:typeof payload.meta?.name==='string'?payload.meta.name.slice(0,90):null,
  available:byDay.size>0};
}
export function summarizeThaw(parsed,today,stationId){
 const rows=Array.isArray(parsed?.rows)?parsed.rows.filter(r=>ageDays(r.date,today)>=1&&ageDays(r.date,today)<=8).sort((a,b)=>a.date.localeCompare(b.date)):[];
 const recent=rows.filter(r=>ageDays(r.date,today)<=5);
 const tempDays=recent.filter(r=>r.high!==null&&Number.isFinite(r.high));
 const warmDays=tempDays.filter(r=>r.high>=45).length;
 const freezeDays=rows.filter(r=>ageDays(r.date,today)<=3&&r.high!==null&&r.high<=32).length;
 const snow=rows.filter(r=>ageDays(r.date,today)<=2&&(r.snowInches!==null||r.snowTrace)).at(-1)||null;
 const latestReportedSnow=rows.filter(r=>r.snowInches!==null||r.snowTrace).at(-1)||null;
 const latestTemp=rows.filter(r=>r.high!==null).at(-1)||null;
 const maxAge=latestTemp?ageDays(latestTemp.date,today):null;
 const snowFresh=!!snow;
 const snowInches=snowFresh?snow.snowInches:null;
 let state='unknown',impact='none',label='Ground thaw unverified',detail='Too few recent station observations to characterize thaw. Forest soils and pools are never directly measured.';
 if(snowFresh&&(snowInches>=1)){
  state='snowpack';impact='caution';label='Snow depth recently reported';
  detail='A nearby climate station recently reported at least 1 inch of snow. Forest-floor thaw may lag even when warm rain is forecast.';
 }else if(freezeDays>=2){
  state='freeze';impact='caution';label='Recent hard-freeze caution';
  detail='The station reported at least two freezing daytime highs in three days. Ground thaw cannot be assumed.';
 }else if(snowFresh&&(snow.snowTrace||(snowInches>0&&snowInches<1))){
  state='patchy';impact='watch';label='Trace / shallow snow reported';
  detail='A recent station reading indicates some snow remains; nearby woodland snow and soil can differ.';
 }else if(tempDays.length>=3&&warmDays>=3&&snowFresh&&snowInches===0){
  state='warming';label='Recent warming, station snow-free';
  detail='Three or more recent mild days and zero reported station snow depth support spring thaw conditions, but do not verify forest soil or breeding-pool thaw.';
 }else if(tempDays.length>=3&&warmDays>=3){
  state='warmth_only';label='Recent warming; snow uncertain';
  detail='Daily highs suggest spring warming, but a recent reliable snow-depth observation is missing. Forest ground thaw is unverified.';
 }else if(tempDays.length>=2){
  state='mixed';label='Mixed recent temperatures';
  detail='Recent temperature history does not establish sustained warming. Forest soil and snow remain unverified.';
 }else if(snowFresh&&snowInches===0){
  state='snowfree_only';label='Station reported no snow';
  detail='The nearby station reported zero snow depth, but recent temperature coverage is incomplete. This is not a ground-thaw observation.';
 }
 const station=typeof stationId==='string'?stationId:'';
 const history=rows.map(x=>({date:x.date,high:x.high,low:x.low,snowInches:x.snowInches,snowTrace:!!x.snowTrace}));
 const latestSnow=latestReportedSnow?{date:latestReportedSnow.date,
   inches:latestReportedSnow.snowInches,trace:!!latestReportedSnow.snowTrace,
   ageDays:ageDays(latestReportedSnow.date,today),
   fresh:snowFresh&&latestReportedSnow.date===snow.date}:null;
 return {state,impact,label,detail,station,stationName:parsed?.stationName||null,
  observedThrough:latestTemp?.date||null,observationAgeDays:maxAge,warmDays,temperatureDays:tempDays.length,freezeDays,
  latestSnow,history,source:'NOAA Regional Climate Centers ACIS',groundThawObserved:false};
}
// A current snow/freeze caution should NOT suppress forecasts a week away:
// melting or refreezing between observation and forecast is unknown.
export function applyThawToNight(night,thaw,date,today){
 const result={...night,weatherLevel:night.level,thawLimited:false,thawRecheck:false};
 if(!thaw||night.level==='unknown'||!['strong','watch'].includes(night.level))return result;
 const lead=ageDays(today,date); // negative for future, 0 for tonight
 const leadDays=lead===null?null:-lead;
 if(leadDays===null||leadDays<0)return result;
 if(leadDays>2){
  if(thaw.impact!=='none')return {...result,thawRecheck:true,details:night.details+' Earlier snow/freeze evidence may change before this night; recheck closer to the date.'};
  return result;
 }
 if(thaw.impact==='caution'){
  return {...result,level:'guarded',label:'Thaw caution',thawLimited:true,
   details:night.details+' '+thaw.detail+' Treat this as warm-rain weather, not a migration-ready ground forecast.'};
 }
 if(thaw.impact==='watch'&&night.level==='strong'){
  return {...result,level:'watch',label:'Warm rain; snow caution',thawLimited:true,
   details:night.details+' '+thaw.detail};
 }
 return result;
}
