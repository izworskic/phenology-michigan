// Explain *regional weather suitability* for tonight and tomorrow.
// Not a calibrated migration probability, an actual sighting, or access directions.
import {shiftDate} from './salamanders.mjs';
import {checkedArchive} from './salamander-forecast-archive.mjs';

const RANK={strong:5,watch:4,guarded:2,cold:1,dry:1,unknown:0};
const KNOWN=new Set(Object.keys(RANK));
const isNum=n=>typeof n==='number'&&Number.isFinite(n);
const readable=l=>({
 strong:'Strong warm-rain weather',
 watch:'Possible movement weather',
 guarded:'Conditions limited',
 cold:'Too cold',
 dry:'Mostly dry',
 unknown:'Forecast incomplete'
}[l]||'Weather not available');
const sourceFreshness=(r,now)=>{
 const t=Date.parse(r?.nwsUpdatedAt||'');
 if(!Number.isFinite(t)||t>+now+120000)return {status:'unverified',ageHours:null,label:'NWS update time not verified'};
 const age=(+now-t)/3600000;
 return {status:age>18?'stale':'current',ageHours:Math.max(0,Math.round(age)),label:age>18?'NWS grid update is older than 18 hours':'NWS grid update checked'};
};
function drivers(n,thaw){
 if(!n||n.level==='unknown')return [
  {id:'warmth',state:'unknown',heading:'Nighttime warmth',detail:'Hourly temperature coverage is incomplete.'},
  {id:'rain',state:'unknown',heading:'Warm rain overlap',detail:'Hourly rain or precipitation information is incomplete.'},
  {id:'thaw',state:'unknown',heading:'Snow and ground thaw',detail:'No forecast suitable for a thaw interpretation.'}
 ];
 const warm=isNum(n.warmHours)?n.warmHours:0;
 const overlap=isNum(n.warmRainHours)?n.warmRainHours:0;
 const rain=isNum(n.rainChance)?n.rainChance:null;
 const warmth={id:'warmth',heading:'Nighttime warmth',
  state:warm>=5?'favorable':warm>=3?'mixed':'limited',
  detail:warm>=5?warm+' forecast hours at or above 40°F.':
   warm>=3?warm+' hours at or above 40°F; warmth may be brief.':
   warm+' forecast hours at or above 40°F; generally too cold for a strong signal.'};
 const precipitation={id:'rain',heading:'Warm rain overlap',
  state:rain===null?'unknown':overlap>=3?'favorable':overlap>=1?'mixed':'limited',
  detail:rain===null?'Precipitation probability unavailable.':
   overlap>=3?overlap+' hours pair 40°F+ air with forecast rain (35%+ hourly chance).':
   overlap>=1?overlap+' hour'+(overlap===1?'':'s')+' pairs warm air with potential rain; not a sustained window.':
   'No modeled hours combine warm air and forecast rain at 35%+ likelihood.'};
 const thawImpact=thaw?.impact||'none';
 const thawDriver={id:'thaw',heading:'Snow and ground thaw',
  state:n.thawLimited||thawImpact==='caution'?'limited':thawImpact==='watch'?'mixed':'unknown',
  detail:n.thawLimited?'Recent station snow or freezing limits this night’s weather rating.':
   n.thawRecheck?'Earlier station snow/freeze evidence may change; recheck nearer this night.':
   thawImpact==='caution'?'Station snow/freeze is a caution, but its effect on this later night is uncertain.':
   thawImpact==='watch'?'Trace or shallow station snow reported; woodlands may differ.':
   thaw?.state==='warming'?'Station warming/snow-free evidence is favorable but woodland soil thaw remains unmeasured.':
   'Forest soil thaw and individual breeding-pool conditions are not measured.'};
 return [warmth,precipitation,thawDriver];
}
function advice(level,source){
 if(source.status==='stale')return 'Update needed: NWS grid data is older than 18 hours. Check a fresh forecast before interpreting tonight.';
 if(source.status==='unverified')return 'Forecast source update time is not independently verified. Use this only as a preliminary weather guide.';
 switch(level){
  case 'strong':return 'Weather fits a potential Big Night. Movement is not confirmed; choose an authorized nature-center program rather than a roadside search.';
  case 'watch':return 'A few useful conditions overlap, but timing or thaw remains uncertain. Check the local NWS outlook and authorized programs.';
  case 'guarded':return 'Temperature, precipitation type, or recent snow/freeze restricts the signal. Conditions may improve on another night.';
  case 'cold':return 'The evening is likely too cold for a strong regional movement-weather signal.';
  case 'dry':return 'A sustained warm-rain overlap is not indicated for this night.';
  default:return 'The hourly data are insufficient to give a trustworthy regional weather signal.';
 }
}
const scored=n=>n&&KNOWN.has(n.level)&&n.level!=='unknown';
function compareYesterday(current,prior){
 if(!scored(current)||!scored(prior))return {status:'unavailable',label:'Comparable forecast unavailable'};
 const delta=RANK[current.level]-RANK[prior.level];
 const tempDelta=isNum(current.temp)&&isNum(prior.temp)?current.temp-prior.temp:null;
 const rainDelta=isNum(current.rainChance)&&isNum(prior.rainChance)?current.rainChance-prior.rainChance:null;
 return {status:delta>0?'improved':delta<0?'weakened':'unchanged',
  label:delta>0?'More favorable than yesterday’s outlook':delta<0?'Less favorable than yesterday’s outlook':'Same overall weather category as yesterday',
  previousLevel:prior.level,currentLevel:current.level,tempDelta,rainDelta};
}
export function bigNightDecision(region,previousIssue,day,now=new Date()){
 const today=region?.nights?.[0]||null,tomorrow=region?.nights?.[1]||null;
 const source=sourceFreshness(region,now);
 if(region?.season!=='spring'||!today||!tomorrow)return {
  status:region?.season==='unavailable'?'unavailable':'off_season',
  source:region?.season==='unavailable'?source:null,tonight:null,tomorrow:null,
  comparison:{status:'unavailable',label:'Available during spring forecast season'},
  priorIssue:null,drivers:[],advice:'Spring warm-rain monitoring resumes in March; no current salamander movement is implied.'};
 const tomorrowRank=scored(tomorrow)?RANK[tomorrow.level]:null;
 const tonightRank=scored(today)?RANK[today.level]:null;
 const comparison=tomorrowRank===null||tonightRank===null?{status:'unavailable',label:'Both evenings need complete forecasts'}:
  tomorrowRank>tonightRank?{status:'tomorrow',label:'Tomorrow has the stronger weather signal'}:
  tomorrowRank<tonightRank?{status:'tonight',label:'Tonight has the stronger weather signal'}:
  {status:'similar',label:'Tonight and tomorrow have similar weather ratings'};
 const priorRegion=previousIssue?.regions?.find(r=>r.id===region.id);
 const yesterday=priorRegion&&previousIssue.issueDay===shiftDate(day,-1)?{
  issueDay:previousIssue.issueDay,archivedAt:previousIssue.archivedAt,
  tonight:compareYesterday(today,priorRegion.nights?.[1]),
  tomorrow:compareYesterday(tomorrow,priorRegion.nights?.[2])
 }:null;
 const makeNight=n=>({date:n.date,level:KNOWN.has(n.level)?n.level:'unknown',
  label:readable(n.level),temp:isNum(n.temp)?n.temp:null,
  rainChance:isNum(n.rainChance)?n.rainChance:null,
  warmRainHours:isNum(n.warmRainHours)?n.warmRainHours:null,
  thawLimited:!!n.thawLimited,drivers:drivers(n,region.thaw),
  advice:advice(n.level,source)});
 return {status:source.status==='stale'?'stale':source.status==='unverified'?'source_unverified':'ready',
  source,tonight:makeNight(today),tomorrow:makeNight(tomorrow),comparison,
  priorIssue:yesterday,
  bestIn48Hours:comparison.status==='tomorrow'?'tomorrow':comparison.status==='tonight'?'tonight':null,
  drivers:drivers(today,region.thaw),advice:advice(today.level,source)};
}
export function attachBigNightDecisions(regions,issues,day,now=new Date()){
 const previous=checkedArchive(issues,day).find(r=>r.issueDay===shiftDate(day,-1))||null;
 const enhanced=regions.map(r=>({...r,bigNight:bigNightDecision(r,previous,day,now)}));
 const rank=r=>r.season!=='spring'||r.bigNight?.source?.status!=='current'?0:
  (RANK[r.tonight?.level]||0);
 const watch=enhanced.filter(r=>r.season==='spring').sort((a,b)=>rank(b)-rank(a)||
  ((b.tonight?.warmRainHours||0)-(a.tonight?.warmRainHours||0))||a.name.localeCompare(b.name));
 return {regions:enhanced,statewide:{
  strongTonight:enhanced.filter(r=>r.season==='spring'&&r.bigNight.source.status==='current'&&r.tonight?.level==='strong').length,
  possibleTonight:enhanced.filter(r=>r.season==='spring'&&r.bigNight.source.status==='current'&&r.tonight?.level==='watch').length,
  regionsWithCurrentSource:enhanced.filter(r=>r.season==='spring'&&r.bigNight.source.status==='current').length,
  regionalRanking:watch.map(r=>({id:r.id,name:r.name,
   level:r.bigNight.source.status==='current'?r.tonight?.level:'unknown',
   label:r.bigNight.source.status==='current'?readable(r.tonight?.level):r.bigNight.source.label,
   warmRainHours:r.bigNight.source.status==='current'?r.tonight?.warmRainHours:null}))
 }};
}
