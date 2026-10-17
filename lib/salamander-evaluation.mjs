// Read-only retrospective *coverage diagnostics*, not animal movement verification.
// No contingency-table forecast performance rates are published: a reviewed site-
 // specific no-encounter survey is not a region-level absence label.
import {checkedArchive} from './salamander-forecast-archive.mjs';
import {readMonitoringArchive} from './salamander-monitoring.mjs';

export const EVALUATION_POLICY='salamander-evidence-evaluation-v1';
export const MIN_GROUP_SESSIONS=8;
export const MIN_GROUP_REGION_NIGHTS=5;
export const MIN_GROUP_PROGRAMS=3;
export const MIN_OUTCOME_CASES=3;

const groupFor=level=>level==='strong'?'strong':level==='watch'?'watch':
 ['guarded','cold','dry'].includes(level)?'other':null;
const groups=[
 {id:'strong',label:'Strong weather signal'},
 {id:'watch',label:'Possible movement signal'},
 {id:'other',label:'Mixed, cold or dry weather'}
];
const surveyKey=r=>[r.night,r.regionId,r.method,r.organization.trim().toLowerCase()].join('|');
const programKey=r=>[r.regionId,r.method,r.organization.trim().toLowerCase()].join('|');

export function evaluationDiagnostics(issues,surveys,asOfDay){
 const archive=checkedArchive(issues,asOfDay);
 const approved=readMonitoringArchive(surveys,asOfDay);
 const issuedByDay=new Map(archive.map(issue=>[issue.issueDay,issue]));
 const observed=new Set(),matched=[],reasons={noSavedIssue:0,regionNotCovered:0,forecastUnknown:0,duplicateProgramNight:0};
 const forecastSignalTotals={strong:0,watch:0,other:0,unknown:0};
 for(const issue of archive)for(const region of issue.regions){
  const group=groupFor(region.nights[0].level);
  forecastSignalTotals[group||'unknown']++;
 }
 for(const row of approved){
  const key=surveyKey(row);
  if(observed.has(key)){reasons.duplicateProgramNight++;continue;}
  observed.add(key);
  const issue=issuedByDay.get(row.night);
  if(!issue){reasons.noSavedIssue++;continue;}
  const region=issue.regions.find(r=>r.id===row.regionId);
  if(!region){reasons.regionNotCovered++;continue;}
  const signal=groupFor(region.nights[0].level);
  if(!signal){reasons.forecastUnknown++;continue;}
  matched.push({signal,night:row.night,regionId:row.regionId,
   program:programKey(row),outcome:row.outcome,effort:row.minutes*row.observers});
 }
 const overallYears=new Set(matched.map(r=>r.night.slice(0,4)));
 const overallPrograms=new Set(matched.map(r=>r.program));
 const overallRegionNights=new Set(matched.map(r=>r.regionId+'|'+r.night));
 const matchedPositive=matched.filter(r=>r.outcome==='movement_seen').length;
 const matchedZero=matched.filter(r=>r.outcome==='none_encountered').length;
 const evidenceBySignal=groups.map(g=>{
  const subset=matched.filter(r=>r.signal===g.id);
  const movement=subset.filter(r=>r.outcome==='movement_seen').length;
  const nondetection=subset.filter(r=>r.outcome==='none_encountered').length;
  const programs=new Set(subset.map(r=>r.program)).size;
  const regionNights=new Set(subset.map(r=>r.regionId+'|'+r.night)).size;
  const years=new Set(subset.map(r=>r.night.slice(0,4))).size;
  const publish=subset.length>=MIN_GROUP_SESSIONS&&regionNights>=MIN_GROUP_REGION_NIGHTS&&
   programs>=MIN_GROUP_PROGRAMS&&movement>=MIN_OUTCOME_CASES&&nondetection>=MIN_OUTCOME_CASES;
  return {id:g.id,label:g.label,issuedRegionNights:forecastSignalTotals[g.id],
   status:publish?'descriptive_counts_available':'insufficient_or_sensitive',
   // Protect small and single-program cells: never expose outcome breakdown until
   // both cells, independent regional nights and program breadth clear thresholds.
   reviewedSessions:publish?subset.length:null,
   movement:publish?movement:null,noEncounters:publish?nondetection:null,
   programs:publish?programs:null,regionNights:publish?regionNights:null,years:publish?years:null};
 });
 const pairing={reviewedSessions:approved.length,matchedSessions:matched.length,
  observedMovementDuringMatchedSurveys:matchedPositive,
  noEncountersDuringMatchedSurveys:matchedZero,
  unmatchedSessions:approved.length-matched.length,
  missingAsIssuedForecast:reasons.noSavedIssue,
  regionWithoutForecast:reasons.regionNotCovered,
  unknownForecast:reasons.forecastUnknown,
  duplicateProgramNightExcluded:reasons.duplicateProgramNight,
  matchedDistinctRegionNights:overallRegionNights.size,
  matchedDistinctPrograms:overallPrograms.size,
  matchedSeasons:overallYears.size,
  matchedObserverHours:Number((matched.reduce((sum,r)=>sum+r.effort,0)/60).toFixed(1))};
 // These are prerequisites for a future study plan, not statistical validation.
 // Program-site IDs are NOT currently stored; observers may overlap sites. Thus
 // no site-level independence, imperfect detection or held-out status can be certified.
 const checks=[
  {id:'issued',label:'Pre-night forecast issues available',met:archive.length>0},
  {id:'both',label:'Both observed movement and no-encounter surveys paired',met:matchedPositive>0&&matchedZero>0},
  {id:'seasons',label:'At least three independently monitored seasons',met:overallYears.size>=3},
  {id:'programs',label:'Three or more separate region/program/protocol groups',met:overallPrograms.size>=3},
  {id:'spread',label:'At least 60 distinct monitored region-nights',met:overallRegionNights.size>=60},
  {id:'outcomes',label:'At least 20 paired sessions of each outcome',met:matchedPositive>=20&&matchedZero>=20},
  {id:'sites',label:'Site independence and detection design verified',met:false},
  {id:'holdout',label:'Prospective held-out year evaluated independently',met:false}
 ];
 return {schema:EVALUATION_POLICY,status:!archive.length?'awaiting_forecasts':!matched.length?'awaiting_paired_surveys':'descriptive_only',
  verifiedSkill:false,calibratedProbability:false,accuracyMetricsPublished:false,heldOutEvaluated:false,
  forecast:{issueDays:archive.length,sameNightRegionForecasts:Object.values(forecastSignalTotals).reduce((a,b)=>a+b,0),
   signals:forecastSignalTotals},
  pairing,signalEvidence:evidenceBySignal,checks,checksMet:checks.filter(c=>c.met).length,
  checksTotal:checks.length,method:'Same Michigan night, same broad region, forecast captured before 18:00 Michigan time. One program/protocol survey per region-night; multiple unrelated programs still may share habitat.',
  caveat:'These counts show evidence COVERAGE, not hits, misses, false alarms, migration probability or accuracy. Detection is imperfect; no encounters in a survey is not proof of regional absence. Opportunistic submissions are non-random and may bias any apparent association.',
  sourceReferences:[
   {name:'USGS: occupancy models and imperfect wildlife detection',url:'https://pubs.usgs.gov/publication/fs20053096'},
   {name:'USGS: design of repeated surveys with imperfect detection',url:'https://www.usgs.gov/publications/sampling-design-trade-offs-occupancy-studies-imperfect-detection-examples-and'},
   {name:'NOAA forecast verification methods',url:'https://www.swpc.noaa.gov/sites/default/files/images/u30/Forecast%20Verification%20Glossary.pdf'}
  ]};
}
