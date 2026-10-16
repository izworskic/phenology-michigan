// Michigan Trillium: observed flowering REPORT timing, not first bloom or peak bloom.
// Every eligible year receives ONE equal vote regardless of photo/observer volume.
export const MIN_REPORTS_PER_YEAR=6;
export const MIN_ACTIVE_WEEKS=2;
export const MIN_CALIBRATION_YEARS=4;
export const TREND_DAY_THRESHOLD=8;
export const YEAR_START=2019;
export const ALLOWED_REGION_IDS=['southwest','southeast','west','central','north','eastup','westup'];
export const PARTITIONS={
 southwest:[[41,-91,42.5,-85]],
 southeast:[[41,-85,42.5,-82],[42.5,-83.45,44.1,-82]],
 west:[[42.5,-91,44.1,-85.1]],
 central:[[42.5,-85.1,44.1,-83.45]],
 north:[[44.1,-91,45.65,-82]],
 eastup:[[45.65,-85.5,48,-82]],
 westup:[[45.65,-91,48,-85.5]]
};
const SAFE_YEAR=2027;
const MILLIS_DAY=86400000;
export function dateToDoy(date){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const ms=Date.parse(date+'T12:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date)return null;
 const norm=Date.parse(SAFE_YEAR+'-'+date.slice(5)+'T12:00:00Z');
 // Leap day is not a stable reporting benchmark; omit instead of shifting other days.
 if(!Number.isFinite(norm))return null;
 const normDate=new Date(norm).toISOString().slice(5,10);
 if(normDate!==date.slice(5))return null;
 return Math.round((norm-Date.parse(SAFE_YEAR+'-01-01T12:00:00Z'))/MILLIS_DAY)+1;
}
export function doyLabel(doy){
 if(!Number.isFinite(doy))return null;
 const date=new Date(Date.parse(SAFE_YEAR+'-01-01T12:00:00Z')+Math.round(doy-1)*MILLIS_DAY);
 return date.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
}
function median(values){
 if(!values.length)return null;
 const a=[...values].sort((x,y)=>x-y), mid=Math.floor(a.length/2);
 return a.length%2?a[mid]:Math.round((a[mid-1]+a[mid])/2);
}
function percentile(rows,fraction){
 if(!rows.length)return null;
 const total=rows.reduce((sum,r)=>sum+r.count,0),target=Math.max(1,Math.ceil(total*fraction));
 let used=0;
 for(const row of rows){used+=row.count;if(used>=target)return row.doy;}
 return rows[rows.length-1].doy;
}
export function annualReports(weekly=[],startYear=YEAR_START,endYear=2099){
 const grouped=new Map(),seen=new Set();
 for(const pair of weekly){
  if(!Array.isArray(pair)||pair.length!==2)continue;
  const [date,count]=pair,year=Number(String(date).slice(0,4)),day=dateToDoy(date),id=String(date);
  if(!Number.isInteger(count)||count<=0||day===null||day<74||day>195||year<startYear||year>endYear||seen.has(id))continue;
  seen.add(id);
  if(!grouped.has(year))grouped.set(year,[]);
  grouped.get(year).push({doy:day,count});
 }
 const years=[];
 for(let year=startYear;year<=endYear;year++){
  const rows=(grouped.get(year)||[]).sort((a,b)=>a.doy-b.doy);
  const total=rows.reduce((n,x)=>n+x.count,0),weeks=rows.length;
  const qualified=total>=MIN_REPORTS_PER_YEAR&&weeks>=MIN_ACTIVE_WEEKS;
  years.push({year,total,weeks,qualified,low:qualified?percentile(rows,.2):null,center:qualified?percentile(rows,.5):null,high:qualified?percentile(rows,.8):null});
 }
 return years;
}
export function buildBenchmark(archive,regionId,targetYear){
 const entry=archive?.regions?.[regionId];
 const through=Math.min(2099,Number(targetYear)-1);
 if(!entry||!Array.isArray(entry.weekly)||!Number.isInteger(targetYear)||targetYear<YEAR_START+1)return {state:'unavailable',years:[],eligibleYears:0};
 const years=annualReports(entry.weekly,YEAR_START,through);
 const good=years.filter(r=>r.qualified),excluded=years.filter(r=>!r.qualified);
 const coverage={eligibleYears:good.length,excludedYears:excluded.length,allYears:years.length,allReports:years.reduce((sum,y)=>sum+y.total,0)};
 if(good.length<MIN_CALIBRATION_YEARS){
  return {state:'limited',...coverage,years,firstYear:YEAR_START,lastYear:through,reason:'Fewer than four spring seasons have at least six flowering reports across two weeks. No calibrated typical dates are shown.'};
 }
 const low=median(good.map(y=>y.low)),center=median(good.map(y=>y.center)),high=median(good.map(y=>y.high));
 const spread=median(good.map(y=>Math.abs(y.center-center)));
 return {state:'available',...coverage,years,firstYear:YEAR_START,lastYear:through,
   low,center,high,spread,
   lowLabel:doyLabel(low),centerLabel:doyLabel(center),highLabel:doyLabel(high),
   caveat:'These are the middle 60% of historical annotated flowering REPORTS, summarized by equal-weight years. They are not first bloom, peak flowering, or an individual park forecast.'};
}
function michiganDate(now){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type)?.value;
 return {year:Number(get('year')),month:Number(get('month')),date:get('year')+'-'+get('month')+'-'+get('day')};
}
export function targetBloomYear(now=new Date()){
 const {year,month}=michiganDate(now);
 return month>6?year+1:year;
}
export function compareCurrentSeason(benchmark,weekly=[],now=new Date()){
 const local=michiganDate(now);
 const data=annualReports(weekly,local.year,local.year)[0];
 const base={year:local.year,reportCount:data.total,reportWeeks:data.weeks,currentMidpoint:data.center,currentMidpointLabel:doyLabel(data.center)};
 if(local.month<3||local.month>6)return {state:'off',...base,note:'The live season comparison resumes in spring. Historical dates remain available.'};
 if(benchmark?.state!=='available')return {state:'no_baseline',...base,note:'Historical coverage is insufficient for a responsible early/late comparison.'};
 if(!data.qualified)return {state:'sparse',...base,note:'Not enough recent flowering reports this season for a timing comparison.'};
 const today=dateToDoy(local.date);
 if(today===null||today<benchmark.high+7)return {state:'developing',...base,note:'Reports are still accumulating. An early/late label before the usual reporting window finishes would be biased.'};
 const offset=data.center-benchmark.center;
 let state='typical';
 if(offset<=-TREND_DAY_THRESHOLD)state='earlier';
 else if(offset>=TREND_DAY_THRESHOLD)state='later';
 return {state,...base,offsetDays:offset,note:'Retrospective timing of reported flowers, not a claim that plants at any preserve bloomed early or late.'};
}
export function histogramUrl(regionId,year,partitionIndex=0){
 const boxes=PARTITIONS[regionId];
 if(!boxes||!boxes[partitionIndex]||!Number.isInteger(year)||year<2000||year>2099)throw new Error('Invalid history request');
 const [swlat,swlng,nelat,nelng]=boxes[partitionIndex];
 const q=new URLSearchParams({place_id:'29',taxon_name:'Trillium grandiflorum',term_id:'12',term_value_id:'13',quality_grade:'research',date_field:'observed',interval:'week',
 d1:year+'-03-15',d2:year+'-07-10',swlat:String(swlat),swlng:String(swlng),nelat:String(nelat),nelng:String(nelng)});
 return 'https://api.inaturalist.org/v1/observations/histogram?'+q.toString();
}
export function combineHistograms(histograms=[],year){
 const byWeek=new Map();
 for(const obj of histograms){
  const weeks=obj?.results?.week;
  if(!weeks||typeof weeks!=='object'||Array.isArray(weeks))throw new Error('Missing iNaturalist weekly results');
  for(const [date,count] of Object.entries(weeks)){
   if(!date.startsWith(String(year)+'-')||!Number.isInteger(count)||count<0||dateToDoy(date)===null)continue;
   byWeek.set(date,(byWeek.get(date)||0)+count);
  }
 }
 return [...byWeek].filter(([date,count])=>count>0&&dateToDoy(date)>=74&&dateToDoy(date)<=195).sort(([a],[b])=>a.localeCompare(b));
}
