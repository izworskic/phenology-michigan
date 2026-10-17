// Append-only as-issued weather snapshot contract. No invented/backfilled forecasts.
// Each snapshot captures what the public /api/salamanders endpoint calculated BEFORE
// that spring evening, including the model version and source issue timestamp.
import {REGIONS,isSeason,localDate,shiftDate} from './salamanders.mjs';
import {readMonitoringArchive} from './salamander-monitoring.mjs';
export const ARCHIVE_VERSION='salamander-as-issued-v1';
export const FORECAST_METHOD='NWS-hourly-rain-temp-v1+RCC-ACIS-thaw-v1';
export const SNAPSHOT_SOURCE='https://phenology.chrisizworski.com/api/salamanders';
const IDS=new Set(REGIONS.map(r=>r.id));
const LEVELS=new Set(['strong','watch','guarded','cold','dry','unknown']);
const isoDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function hourMichigan(date){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date);
 return Number(parts.find(p=>p.type==='hour')?.value);
}
const intRange=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const ms=x=>new Date(x).getTime();
function validEntry(s){
 if(!s||s.schema!==ARCHIVE_VERSION||!isoDay(s.issueDay)||!Array.isArray(s.regions)||!s.regions.length||s.regions.length>REGIONS.length)return false;
 const captured=ms(s.archivedAt),issued=ms(s.apiGeneratedAt);
 if(!Number.isFinite(captured)||!Number.isFinite(issued)||localDate(new Date(captured))!==s.issueDay||
  localDate(new Date(issued))!==s.issueDay||hourMichigan(new Date(captured))>=18||
  issued>captured+120000||captured-issued>90*60000)return false;
 if(s.source!==SNAPSHOT_SOURCE||s.method!==FORECAST_METHOD)return false;
 const seen=new Set();
 return s.regions.every(r=>{
  if(!r||!IDS.has(r.id)||seen.has(r.id)||!Array.isArray(r.nights)||r.nights.length!==7)return false;
  seen.add(r.id);
  return r.nights.every((n,i)=>n?.date===shiftDate(s.issueDay,i)&&LEVELS.has(n.level)&&
   (n.temp===null||intRange(n.temp,-50,115))&&(n.rainChance===null||intRange(n.rainChance,0,100))&&
   (n.warmRainHours===null||intRange(n.warmRainHours,0,12))&&typeof n.thawLimited==='boolean');
 });
}
function pickNight(n,date){
 if(!n||n.date!==date||!LEVELS.has(n.level))return null;
 const number=(v,min,max)=>intRange(v,min,max)?v:null;
 const forecast={date,level:n.level,
  temp:number(n.temp,-50,115),rainChance:number(n.rainChance,0,100),
  warmRainHours:number(n.warmRainHours,0,12),
  thawLimited:n.thawLimited===true};
 // Don't archive a malformed positive score as a known forecast.
 if((forecast.level==='strong'||forecast.level==='watch')&&
  (forecast.temp===null||forecast.rainChance===null))return null;
 return forecast;
}
export function createForecastIssue(feed,archivedAt=new Date()){
 const captured=new Date(archivedAt);
 if(!Number.isFinite(+captured)||!isSeason(captured))throw Error('Snapshots only during spring season (March-May)');
 const today=localDate(captured),hour=hourMichigan(captured);
 if(hour<12||hour>=18)throw Error('Archives only between noon and 6 p.m. Michigan time, before migration night');
 if(feed?.status!=='spring_watch'||!Array.isArray(feed.regions))throw Error('Live spring NWS forecast unavailable');
 const generated=new Date(feed.generatedAt);
 if(!Number.isFinite(+generated)||localDate(generated)!==today||+generated>+captured+120000||
  +captured-(+generated)>90*60000)throw Error('Forecast source timestamp stale, in future, or wrong local day');
 const seen=new Set(),regions=[];
 for(const row of feed.regions){
  if(!row||!IDS.has(row.id)||seen.has(row.id))continue;
  seen.add(row.id);
  if(row.season!=='spring'||!Array.isArray(row.nights)||row.nights.length<7)continue;
  const nights=Array.from({length:7},(_,i)=>pickNight(row.nights[i],shiftDate(today,i)));
  if(nights.some(n=>!n))continue;
  regions.push({id:row.id,station:REGIONS.find(r=>r.id===row.id).sid,
   thawState:['snowpack','freeze','warming','patchy','unknown'].includes(row.thaw?.state)?row.thaw.state:'unknown',
   nights});
 }
 if(regions.length<6)throw Error('Too few reliable forecast regions (at least 6 of 9 required)');
 const snap={schema:ARCHIVE_VERSION,issueDay:today,apiGeneratedAt:generated.toISOString(),
  archivedAt:captured.toISOString(),source:SNAPSHOT_SOURCE,method:FORECAST_METHOD,
  coverage:{forecastRegions:regions.length,totalRegions:REGIONS.length,partial:regions.length<REGIONS.length},
  regions:regions.sort((a,b)=>REGIONS.findIndex(r=>r.id===a.id)-REGIONS.findIndex(r=>r.id===b.id))};
 if(!validEntry(snap))throw Error('Candidate snapshot failed as-issued contract');
 return snap;
}
export function checkedArchive(rows,day){
 if(!isoDay(day)||!Array.isArray(rows))return [];
 const seen=new Set(),all=[];
 for(const r of rows){
  if(!validEntry(r)||r.issueDay>day||seen.has(r.issueDay))continue;
  seen.add(r.issueDay);all.push(r);
 }
 return all.sort((a,b)=>a.issueDay.localeCompare(b.issueDay));
}
export function appendForecastIssue(archive,newIssue){
 if(!validEntry(newIssue))throw Error('As-issued snapshot failed provenance checks');
 if(!Array.isArray(archive)||checkedArchive(archive,newIssue.issueDay).length!==archive.filter(r=>r.issueDay<=newIssue.issueDay).length)throw Error('Existing spring forecast archive contains invalid/duplicate entries');
 if(archive.some(r=>r.issueDay===newIssue.issueDay))return {state:'already_recorded',archive};
 if(archive.some(r=>r.issueDay>newIssue.issueDay))throw Error('Backdating or out-of-order issue forbidden; never backfill forecasts');
 if(archive.length>=600)throw Error('Archive cap reached; migrate old years to audited storage');
 return {state:'added',archive:[...archive,newIssue]};
}
const forecastFor=(issue,regionId,night)=>{
 const region=issue.regions.find(r=>r.id===regionId),index=(Date.parse(night+'T12:00:00Z')-Date.parse(issue.issueDay+'T12:00:00Z'))/86400000;
 return Number.isInteger(index)&&index>=0&&index<7?region?.nights?.[index]||null:null;
};
// Aggregate *coverage* only; do not compute skill, success rate or probability.
// A report is a site/protocol-specific observation, not a verified regional truth label.
export function forecastArchiveCoverage(issues,monitoring,day){
 const archive=checkedArchive(issues,day);
 const nights=archive.reduce((sum,issue)=>sum+issue.regions.reduce((s,r)=>s+r.nights.filter(n=>n.level!=='unknown').length,0),0);
 const regions=new Set(archive.flatMap(issue=>issue.regions.map(r=>r.id)));
 const years=new Set(archive.map(r=>r.issueDay.slice(0,4)));
 const first=archive[0]?.issueDay||null,last=archive.at(-1)?.issueDay||null;
 const surveyed=readMonitoringArchive(monitoring,day);
 const byDate=new Map(archive.map(issue=>[issue.issueDay,issue]));
 let aligned=0,positive=0,zeros=0,unknown=0;
 const pairedYears=new Set();
 for(const r of surveyed){
  const f=byDate.has(r.night)?forecastFor(byDate.get(r.night),r.regionId,r.night):null;
  if(!f){continue;}
  if(f.level==='unknown'){unknown++;continue;}
  aligned++;if(r.outcome==='movement_seen')positive++;else if(r.outcome==='none_encountered')zeros++;
  pairedYears.add(r.night.slice(0,4));
 }
 return {archiveState:archive.length?'archiving':'not_started',issueDays:archive.length,
  forecastRegionNights:nights,regions:regions.size,years:years.size,firstIssueDay:first,lastIssueDay:last,
  pairedSurveyNights:aligned,pairedMovementSurveys:positive,pairedNoEncounterSurveys:zeros,
  pairedYears:pairedYears.size,unknownForecastMatches:unknown,
  archivedTargetNights:archive.reduce((sum,issue)=>sum+issue.regions.length*7,0),
  comparisonStatus:aligned?'descriptive_pairs_only':'no_aligned_reviewed_surveys',
  accuracyStatus:'not_evaluated',probabilityCalibrated:false,
  explanation:'Each record preserves a date-stamped 7-night forecast as it existed before the first night. Survey matching requires that same day’s issued forecast and independently reviewed effort. Matched region nights describe coverage, not accuracy: individual-site no-encounter observations do not establish regional absence. No retrospective scores, predictive hit rates or calibrated probabilities are claimed.'};
}
