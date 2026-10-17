/* Fallback for NOAA GLSEA disruptions: observed near-water temperatures from NDBC.
 * Never invent a site temperature: require a near buoy known to represent the
 * same lake, validated timestamp, and explicit distance/provenance metadata.
 *
 * Station coordinates/lake identities checked against NOAA NDBC station pages.
 * These are IN-WATER temperatures (usually ~1 m depth), NOT GLSEA surface pixels.
 */
export const NDBC_LATEST_URL='https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt';
export const MAX_BUOY_KM=55;
export const MAX_BUOY_AGE_HOURS=18;
export const BUOY_STATIONS=Object.freeze({
  '45026':{lake:'Michigan',name:'South Lake Michigan / St. Joseph buoy'},
  '45029':{lake:'Michigan',name:'Holland / Grand Haven buoy'},
  '45183':{lake:'Michigan',name:'Sleeping Bear Dunes buoy'},
  '45194':{lake:'Huron',name:'Mackinac Straits buoy'},
  '45149':{lake:'Huron',name:'Southern Lake Huron buoy'},
  '45165':{lake:'Erie',name:'Western Lake Erie buoy'},
  '45135':{lake:'Ontario',name:'Prince Edward Point buoy'},
  '45012':{lake:'Ontario',name:'Lake Ontario buoy'}
});
export function kmBetween(latA,lonA,latB,lonB){
  const toRad=n=>n*Math.PI/180;
  const dlat=toRad(latB-latA),dlon=toRad(lonB-lonA);
  const a=Math.sin(dlat/2)**2+Math.cos(toRad(latA))*Math.cos(toRad(latB))*Math.sin(dlon/2)**2;
  return 12742*Math.asin(Math.min(1,Math.sqrt(a)));
}
function validObservation(parts,now){
  if(parts.length<22)return null;
  const station=BUOY_STATIONS[parts[0]];
  if(!station)return null;
  const [lat,lon]=[Number(parts[1]),Number(parts[2])];
  if(!Number.isFinite(lat)||lat<39||lat>49||!Number.isFinite(lon)||lon> -75||lon< -90)return null;
  if(!/^\d{4}$/.test(parts[3]))return null;
  const [yy,mo,dd,hh,mm]=parts.slice(3,8).map(Number);
  if(![yy,mo,dd,hh,mm].every(Number.isInteger))return null;
  const time=Date.UTC(yy,mo-1,dd,hh,mm);
  if(new Date(time).getUTCFullYear()!==yy||new Date(time).getUTCMonth()!==mo-1||new Date(time).getUTCDate()!==dd)return null;
  const age=(now.getTime()-time)/3600000;
  if(age< -0.5||age>MAX_BUOY_AGE_HOURS)return null;
  const value=parts[18];
  if(value==='MM'||!/^[-+]?\d+(?:\.\d+)?$/.test(value))return null;
  const c=Number(value);
  if(!Number.isFinite(c)||c<=0.5||c>35)return null;
  return {id:parts[0],lake:station.lake,name:station.name,lat,lon,c,time:new Date(time).toISOString()};
}
export function parseNdbcLatest(text,now=new Date()){
  if(typeof text!=='string'||!text.startsWith('#STN'))throw Error('NDBC station table malformed');
  const rows=text.split(/\r?\n/);
  // Check column order: we must never confuse air temperature with WTMP.
  const header=rows[0].replace(/^#/, '').trim().split(/\s+/);
  if(header[0]!=='STN'||header[18]!=='WTMP'||header[17]!=='ATMP'||header[1]!=='LAT'||header[2]!=='LON')throw Error('NDBC columns changed; refuse to parse');
  const map=new Map();
  for(const line of rows.slice(2)){
    if(!line||line.startsWith('#'))continue;
    const value=validObservation(line.trim().split(/\s+/),now);
    if(value&&(!map.has(value.id)||value.time>map.get(value.id).time))map.set(value.id,value);
  }
  return [...map.values()];
}
export function buoyForSite(site,observations){
  if(!Array.isArray(observations))return null;
  const sorted=observations.filter(o=>o.lake===site.lake).map(o=>({...o,distanceKm:kmBetween(site.lat,site.lon,o.lat,o.lon)}))
    .filter(o=>o.distanceKm<=MAX_BUOY_KM)
    .sort((a,b)=>a.distanceKm-b.distanceKm);
  const best=sorted[0];
  if(!best)return null;
  return {
    c:Math.round(best.c*10)/10,time:best.time,
    kind:'NDBC in-water buoy observation',
    scope:'Nearby buoy '+Math.round(best.distanceKm)+' km from this lookout; NOT a shoreline or satellite surface reading. Temperatures can differ locally.',
    source:'NOAA National Data Buoy Center',
    sourceUrl:'https://www.ndbc.noaa.gov/station_page.php?station='+best.id,
    stationId:best.id,distanceKm:Math.round(best.distanceKm),
    isProxy:true
  };
}
