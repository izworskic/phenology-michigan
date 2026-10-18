// Public operational health derived ONLY from as-issued Git history, not guessed run statuses.
// Missing days stay missing; a late job must never reconstruct a pre-night forecast.
import {checkedArchive} from './salamander-forecast-archive.mjs';
import {localDate,shiftDate} from './salamanders.mjs';
export const ARCHIVE_OPERATIONAL_START='2027-03-01';
const cutoffHour=18;
export function michiganHour(now){
 return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).find(x=>x.type==='hour')?.value);
}
const springDay=d=>d.slice(5)>='03-01'&&d.slice(5)<='05-31';
export function archiveHealth(rows,now=new Date()){
 if(!Number.isFinite(new Date(now).getTime()))throw Error('Valid as-of instant required');
 const date=localDate(now),hour=michiganHour(now),spring=springDay(date);
 const archive=checkedArchive(rows,date);
 const days=new Set(archive.map(x=>x.issueDay));
 const cutoff=date<ARCHIVE_OPERATIONAL_START?null:date;
 let expected=0,recorded=0;
 const gaps=[];
 if(cutoff){
  for(let d=ARCHIVE_OPERATIONAL_START;d<=cutoff;d=shiftDate(d,1)){
   if(!springDay(d))continue;
   // Today is pending until the local 6 p.m. evening deadline, never a missed day earlier.
   if(d===date&&hour<cutoffHour)continue;
   expected++;
   if(days.has(d))recorded++;else gaps.push(d);
  }
 }
 const todayRecorded=days.has(date),todayDue=spring&&date>=ARCHIVE_OPERATIONAL_START;
 const recent=archive.slice(-1)[0]||null;
 const verifiedRegionCounts=archive.reduce((n,x)=>n+x.regions.length,0);
 const partialDays=archive.filter(x=>x.coverage?.partial).length;
 const total=archive.length;
 const staleSourceDays=archive.filter(x=>x.upstream?.status==='thaw_data_limited').length;
 const unknownSourceDays=archive.filter(x=>!x.upstream||x.upstream.status==='unknown').length;
 let state='off_season';
 if(todayDue)state=todayRecorded?'captured_today':hour>=18?'missed_today':hour>=12?'capture_window_open':'before_capture_window';
 const observedGapCount=gaps.length;
 return {state,season:spring?'spring':'off_season',date,localHour:hour,
  firstEligibleDate:ARCHIVE_OPERATIONAL_START,expectedCompletedDays:expected,
  recordedCompletedDays:recorded,missedCompletedDays:observedGapCount,
  recentMissingDates:gaps.slice(-12),gapsOmittedFromList:Math.max(0,observedGapCount-12),
  todayRecorded,todayDue,lastCapturedDate:recent?.issueDay||null,
  archivedIssueDays:total,partialRegionDays:partialDays,archivedRegionForecasts:verifiedRegionCounts,
  staleUpstreamIssues:staleSourceDays,unverifiedUpstreamIssues:unknownSourceDays,
  archiveCoveragePercent:expected>0?Math.round(recorded/expected*100):null,
  alertActive:state==='missed_today'||(spring&&observedGapCount>0),
  retryPolicy:'Two scheduled capture attempts in Michigan afternoon during March–May. A failed or skipped night is never backfilled.',
  message:state==='off_season'?'Archive capture is paused outside March–May. Historical gaps remain in the record.':
   state==='captured_today'?'Today’s before-night forecast has been archived; later retries do not overwrite it.':
   state==='missed_today'?'No valid forecast was archived before the 6 p.m. Michigan deadline. This day will remain a documented gap.':
   state==='before_capture_window'?'Spring archive capture opens during the Michigan afternoon. No missing-issue alert is due yet.':
   'Today’s spring forecast capture is pending; automatic attempts run before the evening migration window.'};
}
// Exit status decision for the evening watchdog, separate from user-facing off-season status.
export function watchdogStatus(rows,now=new Date()){
 const h=archiveHealth(rows,now);
 return {alert:h.state==='missed_today',issueDay:h.date,state:h.state,missedDays:h.missedCompletedDays};
}
