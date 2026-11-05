// Read-only monitoring of genuine daily collection coverage. A late archive
// never implies that species or phenophases were absent that day.
const chicago = new Intl.DateTimeFormat('en-US', {
  timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'
});
function localDay(now){
  const parts=Object.fromEntries(chicago.formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)
  &&Number.isFinite(Date.parse(v+'T12:00:00Z'))
  &&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function archiveHealth(index,now=new Date()){
  const local=localDay(now);
  const result={state:'unknown',today:local,asOf:null,daysSince:null,
    missingCollectionDays:0,sourceStatus:null,reason:'No validated archive index'};
  if(index?.schema!=='michigan-phenophase-snapshot-index-v1'
    ||!Array.isArray(index.years)||!index.years.length
    ||index.interpretation?.oneSnapshotPerCollectionDay!==true)return result;
  const last=index.years.at(-1);
  if(!last||!validDate(last.lastSnapshot)||!Number.isInteger(last.snapshotDays)
    ||last.snapshotDays<1)return result;
  const age=Math.round((Date.parse(local+'T12:00:00Z')-Date.parse(last.lastSnapshot+'T12:00:00Z'))/86400000);
  if(age<0||!Number.isFinite(age))return {...result,state:'invalid',reason:'Archive contains a future-dated capture'};
  const gaps=Number.isSafeInteger(last.missingCollectionDaysBetweenSnapshots)
    &&last.missingCollectionDaysBetweenSnapshots>=0?last.missingCollectionDaysBetweenSnapshots:0;
  const s=last.latestSourceStatus||{};
  const partial=s.usaNpn!=='ok'||s.iNaturalist!=='ok'
    ||(s.iNaturalistCappedQueries||0)>0||(s.iNaturalistFailedQueries||0)>0;
  return {...result,state:age>=3?'stale':age===2?'overdue':partial?'partial':'recent',
    asOf:last.lastSnapshot,daysSince:age,missingCollectionDays:gaps,
    sourceStatus:s,reason:age>=2?'No recent archive capture; absence of collected data is not absence of biological activity':
      partial?'The last captured reporting sample had incomplete source coverage':
      'A genuine archive snapshot was recorded recently'};
}
export function archiveHealthLabel(status){
  if(!status||status.state==='unknown'||status.state==='invalid')return 'Archive status unavailable';
  if(status.state==='stale')return 'Archive collection overdue';
  if(status.state==='overdue')return 'A recent collection day is missing';
  if(status.state==='partial')return 'Latest snapshot has partial source coverage';
  return 'Archive collection current';
}
