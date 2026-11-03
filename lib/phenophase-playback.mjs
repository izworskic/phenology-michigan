import REGION_CONFIG from '../data/michigan-observation-regions.json' with {type:'json'};

const REGION_BY_ID=new Map(REGION_CONFIG.regions.map(region=>[region.id,region]));
const PHASE_BY_ID=new Map(REGION_CONFIG.phenophases.map(phase=>[phase.id,phase]));
const NPN='https://data.usanpn.org/observations/';
const INAT='https://www.inaturalist.org/observations?place_id=29';

export function archiveToMap(snapshot){
 if(!snapshot||snapshot.kind!=='overlapping-14-day-reporting-snapshot'||!Array.isArray(snapshot.regions))return null;
 if(snapshot.regions.length!==REGION_CONFIG.regions.length)return null;
 const regions=snapshot.regions.map((row,i)=>{
  const meta=REGION_CONFIG.regions[i];
  if(!meta||row.id!==meta.id||!Array.isArray(row.phases))return null;
  const phases=row.phases.map(phase=>{
   const definition=PHASE_BY_ID.get(phase.id);
   if(!definition||!phase.reports)return null;
   return {id:phase.id,name:definition.name,group:definition.group,
    latest:phase.latest,coverage:phase.coverage,sourceReports:phase.reports,
    reportingSites:phase.reportingSites,reportingObservers:phase.reportingObservers,
    uniqueReportingDays:phase.uniqueReportingDays,species:phase.species};
  });
  if(phases.includes(null))return null;
  return {id:row.id,name:meta.name,lat:meta.lat,lon:meta.lon,phases,
   sampledReportCount:row.sampledReports,
   unavailableInatPhases:row.unavailableInatPhases,
   hasMultipleReportingSites:phases.some(p=>p.coverage==='multiple-reporters-or-sites')};
 });
 if(regions.includes(null))return null;
 return {schema:'michigan-phenophase-geography-v1',status:'historical',
  asOfDate:snapshot.asOfDate,windowStart:snapshot.windowStart,windowEnd:snapshot.windowEnd,
  sourceStatus:snapshot.sourceStatus,regions,
  science:{sourceNpn:NPN,sourceInaturalist:INAT,noSubmissionRequired:true}};
}
export function capturedDates(archive){
 if(!archive||!Array.isArray(archive.snapshots))return [];
 return archive.snapshots.map(s=>s.asOfDate);
}
const utcTime=day=>Date.parse(day+'T12:00:00Z');
export function betweenCaptureDays(first,second){
 if(!first||!second)return null;
 const difference=Math.round((utcTime(second)-utcTime(first))/86400000);
 return Number.isFinite(difference)&&difference>0?difference-1:null;
}

export function regionCapture(snapshot,regionId){
 const source=snapshot?.regions?.find(x=>x.id===regionId);
 if(!source)return null;
 const phaseIds=new Set(source.phases.map(p=>p.id));
 return {id:regionId,siteSamples:source.sampledReports,
  presentPhaseIds:phaseIds,
  multipleReportingPhases:source.phases.filter(p=>p.coverage==='multiple-reporters-or-sites').length,
  phaseCount:phaseIds.size,
  missingQueries:source.unavailableInatPhases.length,
  phaseDescriptions:source.phases.map(p=>PHASE_BY_ID.get(p.id)?.name||p.id)};
}

export function compareCaptures(previous,current,regionId){
 const before=regionCapture(previous,regionId),after=regionCapture(current,regionId);
 if(!before||!after)return null;
 const added=[...after.presentPhaseIds].filter(id=>!before.presentPhaseIds.has(id));
 const noLonger=[...before.presentPhaseIds].filter(id=>!after.presentPhaseIds.has(id));
 return {
  oldDate:previous.asOfDate,newDate:current.asOfDate,
  missingDays:betweenCaptureDays(previous.asOfDate,current.asOfDate),
  oldSampledReports:before.siteSamples,newSampledReports:after.siteSamples,
  oldPhaseCount:before.phaseCount,newPhaseCount:after.phaseCount,
  newlyVisibleInSample:added.map(id=>PHASE_BY_ID.get(id)?.name||id),
  notVisibleInNewSample:noLonger.map(id=>PHASE_BY_ID.get(id)?.name||id),
  interpretation:'Different overlapping 15-calendar-day reporting samples. A count change is not a count of new events; a newly visible phase is not first emergence or arrival.'
 };
}

export function phaseRecordsForRegion(snapshot,regionId){
 const r=snapshot?.regions?.find(x=>x.id===regionId);
 return r?.phases||[];
}
