/* NOAA GLSEA/NIC location-level ice concentration guard.
 * Ice concentration is a current-day grid assessment, not a 72-hour ice forecast.
 * We fail closed in the cold season when the mapped cell is stale or missing.
 */
export const ICE_DATASET='GL_Ice_Concentration_GCS';
export const ICE_MAX_AGE_HOURS=96;

export function iceSeason(date=new Date()){
  const month=date.getUTCMonth()+1;
  return month>=11||month<=5;
}
export function parseIceGrid(json,now=new Date()){
  const names=json?.table?.columnNames, row=json?.table?.rows?.[0];
  if(!Array.isArray(names)||!Array.isArray(row))throw Error('Ice grid table missing');
  const ci=names.indexOf('ice_concentration'), ti=names.indexOf('time');
  if(ci<0||ti<0||row[ci]==null||row[ti]==null)throw Error('Ice grid cell missing');
  const percent=Number(row[ci]), time=Date.parse(row[ti]);
  if(!Number.isFinite(percent)||percent<0||percent>100||!Number.isFinite(time))throw Error('Invalid ice percentage or timestamp');
  const hours=(now.getTime()-time)/3600000;
  if(hours< -6||hours>ICE_MAX_AGE_HOURS)throw Error('Ice map is stale or dated in the future');
  return {percent:Math.round(percent*10)/10,time:new Date(time).toISOString(),source:'NOAA GLSEA + U.S. National Ice Center',scope:'Local offshore grid estimate'};
}
export function iceAssessment(ice,now=new Date()){
  if(!iceSeason(now))return {state:'not-checked',required:false,label:'Seasonal ice layer not checked',note:'Outside November–May. Ice is not being independently verified for this outlook.'};
  if(!ice||!Number.isFinite(ice.percent))return {state:'unavailable',required:true,label:'Recent ice map unavailable',note:'During ice season, we withhold lake-smoke scores until recent local ice concentration is available.'};
  if(ice.percent>=15)return {state:'blocked',required:true,label:'Ice coverage detected',note:'NOAA reports '+ice.percent+'% ice in the offshore grid cell. The open-water viewing model is withheld.'};
  if(ice.percent>0)return {state:'patchy',required:true,label:'Possible patchy ice',note:'NOAA reports '+ice.percent+'% ice in the offshore cell. Scores are conservatively capped at 45; local shoreline cover can differ.'};
  return {state:'sampled-clear',required:true,label:'No ice detected in sampled cell',note:'NOAA currently estimates 0% ice in this grid cell, not a guarantee of ice-free shoreline or future open water.'};
}
const EMPTY={windows:[],hourly:[],best:null};
export function iceAdjustedOutlook(outlook,assessment){
  if(!outlook?.windows||assessment?.state==='unavailable'||assessment?.state==='blocked')return {...EMPTY};
  if(assessment?.state!=='patchy')return outlook;
  const adjust=p=>({...p,score:Math.min(p.score,45),signal:'Limited — possible ice'});
  const hourly=outlook.hourly.map(adjust);
  const windows=outlook.windows.map(adjust);
  const best=windows.slice().sort((a,b)=>b.score-a.score||a.time.localeCompare(b.time))[0]||null;
  return {hourly,windows,best};
}
export function iceAwareStatus(outlook,water,assessment,previous){
  if(assessment.state==='unavailable')return {label:'Ice map unavailable',tone:'unknown'};
  if(assessment.state==='blocked')return {label:'Ice coverage detected',tone:'unknown'};
  if(!water||!Number.isFinite(water.c))return {label:'Water data unavailable',tone:'unknown'};
  if(!outlook?.best)return {label:'Morning forecast unavailable',tone:'unknown'};
  if(assessment.state==='patchy')return {label:'Limited — possible ice',tone:'low'};
  return previous;
}
