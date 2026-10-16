// Trillium spring-heat context: a descriptive base-40F air-temperature index.
// This is NOT a species-validated soil-temperature threshold or bloom percentage.
// Weather-driven dates are suppressed unless a leave-one-year-out backtest wins
// against the prior year's equal-weight historical-calendar baseline.
import {annualReports,dateToDoy,doyLabel} from './trillium-history.mjs';
export const BASE_F=40;
export const MIN_TRAINING_SPRINGS=5;
export const MAX_HEAT_MAE_DAYS=9;
export const IMPROVEMENT_RATIO=.9;
const MAR_1_DOY=dateToDoy('2027-03-01');
const MAX_DAYS=122;
export const heatUnit=(meanF)=>Number.isFinite(meanF)?Math.max(0,meanF-BASE_F):null;
export function dailyHeatSeries(tempF=[]){
 if(!Array.isArray(tempF)||tempF.length!==MAX_DAYS)return null;
 let sum=0;const daily=[];
 for(const value of tempF){
  if(value===null||!Number.isFinite(Number(value)))return null;
  const heat=heatUnit(Number(value));if(heat===null)return null;
  sum+=heat;
  daily.push(Math.round(sum*10)/10);
 }
 return daily;
}
function median(values){if(!values.length)return null;const ordered=[...values].sort((a,b)=>a-b),mid=Math.floor(ordered.length/2);return ordered.length%2?ordered[mid]:(ordered[mid-1]+ordered[mid])/2}
const mean=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
const choose=(values,fraction)=>{const a=[...values].sort((x,y)=>x-y);return a[Math.floor(fraction*(a.length-1))]??null;};
function centerIndex(doy){return Math.round(doy-MAR_1_DOY);}
function crossing(series,threshold){
 const n=series.findIndex(value=>value>=threshold);
 return n<0?null:MAR_1_DOY+n;
}
export function fitThermalModel(floweringArchive,thermalArchive,regionId,targetYear){
 const weeks=floweringArchive?.regions?.[regionId]?.weekly,yearRecords=thermalArchive?.regions?.[regionId]?.years;
 if(!Array.isArray(weeks)||!yearRecords)return {state:'unavailable',reason:'Historical air-temperature series have not been populated for this region.'};
 const eligible=annualReports(weeks,2019,targetYear-1).filter(y=>y.qualified);
 const samples=[];
 for(const row of eligible){
  const temps=yearRecords[row.year],heat=dailyHeatSeries(temps);
  if(!heat)continue;
  const index=centerIndex(row.center);
  if(index<0||index>=heat.length)continue;
  samples.push({year:row.year,center:row.center,atCenter:heat[index],heat});
 }
 if(samples.length<MIN_TRAINING_SPRINGS)return {state:'limited',eligibleYears:samples.length,reason:'Fewer than five observed spring seasons have complete temperatures and enough flowering reports.'};
 const threshold=Math.round(median(samples.map(x=>x.atCenter)));
 const folds=samples.map(sample=>{
  const training=samples.filter(o=>o.year!==sample.year);
  const looThreshold=median(training.map(x=>x.atCenter));
  const predicted=crossing(sample.heat,looThreshold);
  const baseline=median(training.map(x=>x.center));
  const heatError=predicted===null?30:Math.abs(predicted-sample.center);
  const calendarError=Math.abs(baseline-sample.center);
  return {year:sample.year,predicted,actual:sample.center,heatError,calendarError};
 });
 const heatMae=mean(folds.map(x=>x.heatError)),calendarMae=mean(folds.map(x=>x.calendarError));
 const validated=heatMae<=MAX_HEAT_MAE_DAYS && heatMae<=calendarMae*IMPROVEMENT_RATIO && folds.every(x=>x.predicted!==null);
 return {state:validated?'validated':'descriptive',eligibleYears:samples.length,threshold,heatMae:Math.round(heatMae*10)/10,
  calendarMae:Math.round(calendarMae*10)/10,validation:'Leave-one-year-out, equal weight by eligible spring; one median heat threshold fitted only on other years in each test.',
  heldOut:folds,
  reason:validated?'Thermal crossing timing improved on the held-out historical springs. Forecast remains contextual, not site-level confirmation.':'Historical heat accumulation did not consistently outperform the calendar benchmark. No weather-derived bloom date is displayed.'};
}
export function thermalArchiveDay(archive,regionId,dayIndex,yearLimit=2099){
 const series=Object.entries(archive?.regions?.[regionId]?.years||{})
  .filter(([year])=>Number(year)<yearLimit)
  .map(([,temps])=>dailyHeatSeries(temps))
  .filter(x=>x&&dayIndex>=0&&dayIndex<x.length)
  .map(x=>x[dayIndex]);
 return series.length>=4?{median:Math.round(median(series)),low:Math.round(choose(series,.25)),high:Math.round(choose(series,.75)),n:series.length}:null;
}
export function decideThermal({archive,regionId,year,nowDate,daily=[],model,forecastStartDate}){
 const output={state:'unavailable',label:'Thermal data unavailable',reason:'No complete spring-temperature record. The seasonal calendar remains available.',baseF:BASE_F,model:{state:model?.state||'unavailable',eligibleYears:model?.eligibleYears||0,heatMae:model?.heatMae??null,calendarMae:model?.calendarMae??null},days:[]};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(nowDate))||Number(nowDate.slice(0,4))!==year)return output;
 const nowDoy=dateToDoy(nowDate),idx=centerIndex(nowDoy);
 if(idx<0||idx>=MAX_DAYS)return {...output,state:'off',label:'Outside spring tracking period',reason:'No current bloom or spring-heat claim outside March–June.'};
 let sum=0,actualToday=null,forecastPlus7=null;
 const sorted=[...daily].sort((a,b)=>a.date.localeCompare(b.date)),byDate=new Map(sorted.map(d=>[d.date,d]));
 const points=[];
 const dayStart=Date.parse(year+'-03-01T12:00:00Z');
 const totalDays=Math.min(MAX_DAYS,idx+8);
 for(let i=0;i<totalDays;i++){
  const date=new Date(dayStart+i*86400000).toISOString().slice(0,10),record=byDate.get(date);
  if(!record||!Number.isFinite(record.meanF))return {...output,reason:'Missing days in the observed/forecast temperature sequence; suppressing the thermal estimate.'};
  const future=date>nowDate;
  if(future&&record.kind!=='forecast')return {...output,reason:'Future daily temperatures must come from a labeled forecast.'};
  sum+=heatUnit(record.meanF);
  const normal=thermalArchiveDay(archive,regionId,i,year);
  const item={date,dayIndex:i,heat:Math.round(sum),historical:normal?.median??null,kind:future?'forecast':'observed'};
  points.push(item);
  if(date===nowDate)actualToday={...item,low:normal?.low??null,high:normal?.high??null,years:normal?.n??0};
  if(i===totalDays-1)forecastPlus7=item;
 }
 const relative=actualToday?.low===null?'insufficient':actualToday.heat<actualToday.low?'behind':actualToday.heat>actualToday.high?'ahead':'typical';
 const nextDays=points.filter(x=>x.kind==='forecast');
 const added=nextDays.length?Math.round(nextDays.at(-1).heat-actualToday.heat):0;
 const result={...output,state:'tracking',label:relative==='behind'?'Spring warmth behind recent history':relative==='ahead'?'Spring warmth ahead of recent history':relative==='typical'?'Spring warmth within historical range':'Not enough history for a warmth comparison',
  reason:'Air-temperature heat accumulation is a weather-development signal, not evidence that trilliums are flowering.',
  baseF:BASE_F,through:nowDate,currentHeat:actualToday.heat,historicalHeat:actualToday.historical,historicalLow:actualToday.low,historicalHigh:actualToday.high,
  historicalYears:actualToday.years,relative,forecastHeatAdded:added,forecastDays:nextDays.length,days:points,model:output.model};
 if(model?.state==='validated'&&points.length){
  const threshold=model.threshold;
  const crossed=points.find(p=>p.heat>=threshold);
  result.model={...output.model,threshold,referenceLabel:'Heat index historically associated with the median flowering-report week'};
  if(crossed){
   result.thermalSignal={date:crossed.date,daysFromToday:Math.round((Date.parse(crossed.date+'T12:00:00Z')-Date.parse(nowDate+'T12:00:00Z'))/86400000),
    kind:crossed.kind==='forecast'?'forecast_crossing':'already_crossed',
    explanation:'Historical reporting-heat reference reached or forecast within seven days. This does not verify bloom or botanical peak.'};
  }
 }
 return result;
}
