/* Forecast-vs-station weather verification, never a hoarfrost observation.
 * A NWS station thermometer records air conditions, not frost on twigs.
 * Reviewed photographs are stored and counted separately.
 */
import {SITES,lookup} from './frostMorning.mjs';
export const HISTORY_DAYS=400;
export const STATION_LIMIT_KM=65;
const n=(v)=>Number.isFinite(v)?Math.round(v*10)/10:null;
export const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
export const key=(siteId,date)=>siteId+'|'+date;
export function kmBetween(lat1,lon1,lat2,lon2){
  const rad=Math.PI/180,p1=lat1*rad,p2=lat2*rad,dp=(lat2-lat1)*rad,dl=(lon2-lon1)*rad;
  return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2)));
}
export function forecastIssue(site,morning,issuedAt){
  if(!lookup(site?.id)||!validDate(morning?.date)||!Number.isFinite(morning?.score)||!Number.isFinite(Date.parse(issuedAt)))return null;
  const sunriseAt=morning?.photo?.sunriseAt;
  if(!Number.isFinite(Date.parse(sunriseAt))||Date.parse(sunriseAt)<=Date.parse(issuedAt))return null;
  const near=morning.hourly?.filter(h=>h.score!==null&&Number.isFinite(Date.parse(h.time)))
    .sort((a,b)=>Math.abs(Date.parse(a.time)-Date.parse(sunriseAt))-Math.abs(Date.parse(b.time)-Date.parse(sunriseAt)))[0];
  if(!near||Math.abs(Date.parse(near.time)-Date.parse(sunriseAt))>100*60000)return null;
  return {siteId:site.id,date:morning.date,issuedAt,sunriseAt,
    predicted:{score:morning.score,photoStatus:morning.photo?.status||'unavailable',sampleAt:near.time,
      tempF:n(near.tempF),dewF:n(near.dewF),windMph:n(near.windMph)},
    verification:{status:'pending',reason:'Sunrise-time nearby station weather has not yet been retrieved.'}};
}
export function stationCandidates(features,site){
  if(!lookup(site?.id))return [];
  return (Array.isArray(features)?features:[]).map(f=>{
    const coords=f?.geometry?.coordinates;
    const id=f?.properties?.stationIdentifier||String(f?.id||'').split('/').pop();
    if(!Array.isArray(coords)||!Number.isFinite(coords[0])||!Number.isFinite(coords[1])||!/^[A-Z0-9]{3,7}$/i.test(id||''))return null;
    const distanceKm=n(kmBetween(site.lat,site.lon,coords[1],coords[0]));
    return {id,distanceKm};
  }).filter(a=>a&&a.distanceKm<=STATION_LIMIT_KM).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,3);
}
export function observationSample(features,sunriseAt){
  const sunrise=Date.parse(sunriseAt);
  if(!Number.isFinite(sunrise))return null;
  const possibilities=(Array.isArray(features)?features:[]).map(f=>{
    const p=f?.properties||{};
    const time=Date.parse(p.timestamp);
    if(!Number.isFinite(time)||Math.abs(time-sunrise)>90*60000)return null;
    // NWS official observations use degC, and meters/second.
    const temp=p.temperature?.value,dew=p.dewpoint?.value,wind=p.windSpeed?.value;
    if(![temp,dew,wind].every(Number.isFinite))return null;
    if(temp < -80||temp > 60||dew < -90||dew > 60||wind < 0||wind > 90)return null;
    return {at:new Date(time).toISOString(),tempF:n(temp*9/5+32),dewF:n(dew*9/5+32),windMph:n(wind*2.236936)};
  }).filter(Boolean).sort((a,b)=>Math.abs(Date.parse(a.at)-sunrise)-Math.abs(Date.parse(b.at)-sunrise));
  return possibilities[0]||null;
}
export function verifyIssue(issue,station,sample,checkedAt){
  if(!issue||!station||!sample||!Number.isFinite(Date.parse(checkedAt)))return issue;
  const predicted=issue.predicted||{};
  const diff={tempF:n(sample.tempF-predicted.tempF),dewF:n(sample.dewF-predicted.dewF),windMph:n(sample.windMph-predicted.windMph)};
  if(Object.values(diff).some(v=>v===null))return issue;
  const matches=[Math.abs(diff.tempF)<=5,Math.abs(diff.dewF)<=7,Math.abs(diff.windMph)<=5].filter(Boolean).length;
  return {...issue,verification:{status:'station_weather_compared',checkedAt,stationId:station.id,
    distanceKm:station.distanceKm,observedAt:sample.at,observed:{tempF:sample.tempF,dewF:sample.dewF,windMph:sample.windMph},
    difference:diff,weatherAgreement:matches===3?'close':matches===2?'mixed':'different',
    note:'Nearby NWS station air-weather comparison only. This neither confirms nor disproves hoarfrost at the forecast grid.'}};
}
export function pruneIssues(issues,asOf){
  const now=Date.parse(asOf),cutoff=now-HISTORY_DAYS*86400000;
  return (Array.isArray(issues)?issues:[]).filter(x=>lookup(x?.siteId)&&validDate(x?.date)&&Date.parse(x.date+'T12:00:00Z')>=cutoff)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.siteId.localeCompare(b.siteId));
}
export function siteHistory(issueData,reviewedData,siteId){
  const issues=(Array.isArray(issueData?.issues)?issueData.issues:[]).filter(i=>i.siteId===siteId)
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,28);
  const reports=(Array.isArray(reviewedData?.reports)?reviewedData.reports:[]).filter(r=>r.siteId===siteId)
    .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  const compared=issues.filter(i=>i.verification?.status==='station_weather_compared'&&Number.isFinite(i.verification?.difference?.tempF));
  const avg=(field)=>compared.length?n(compared.reduce((sum,r)=>sum+Math.abs(r.verification.difference[field]),0)/compared.length):null;
  return {siteId,forecastIssues:issues,reviewedSightings:reports,
    samples:compared.length,tempMeanAbsoluteErrorF:avg('tempF'),dewMeanAbsoluteErrorF:avg('dewF'),
    disclaimer:'Station air-weather agreement is not measured hoarfrost prediction accuracy. Reviewed sightings require original public visual evidence and human editorial review.'};
}
export function validateReviewedReport(report,previous=[]){
  if(!lookup(report?.siteId)||!validDate(report?.date))throw Error('Invalid site or date');
  if(!['hoarfrost','rime','frozen-dew','frost-unspecified'].includes(report?.type))throw Error('Invalid phenomenon');
  if(!/^https:\/\/[^\s?#]+(?:\?[^\s#]*)?$/.test(report?.evidenceUrl||'')||String(report?.evidenceUrl).length>400)throw Error('Original public HTTPS evidence link required');
  if(!Number.isInteger(report?.issueNumber)||report.issueNumber<1||previous.some(x=>x.issueNumber===report.issueNumber))throw Error('Duplicate or invalid issue');
  if(typeof report?.reviewNote!=='string'||report.reviewNote.trim().length<35||report.reviewNote.length>400)throw Error('Substantive reviewed note required');
  if(!Number.isFinite(Date.parse(report?.reviewedAt)))throw Error('Review timestamp required');
  return true;
}
