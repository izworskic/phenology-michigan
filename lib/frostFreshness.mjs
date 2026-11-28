// Cache allowance: 30 minutes fresh + 15 minutes stale revalidation.
const MIN=60000,HOUR=60*MIN;
export function frostTimeCurrent(value,maxAge,now=Date.now(),future=MIN){
 const time=typeof value==='string'?Date.parse(value):NaN;
 return Number.isFinite(time)&&time>=now-maxAge&&time<=now+future;
}
export function frostSiteCurrent(site,now=Date.now()){
 if(!site||typeof site.id!=='string')return false;
 if(site.status==='unavailable')return true;
 return frostTimeCurrent(site.issuedAt,24*HOUR,now,HOUR);
}
export function admitFrostSite(site,now=Date.now()){
 if(frostSiteCurrent(site,now)&&site.status!=='unavailable')return site;
 if(!site||typeof site.id!=='string')throw Error('Invalid forecast location');
 return {...site,status:'unavailable',mornings:[],best:null,bestPhoto:null,coverage:0,issuedAt:null,note:'Current NWS forecast evidence is unavailable or expired. No weather setup is inferred.'};
}
export function admitFrostPacket(packet,mode,now=Date.now(),expected){
 if(!frostTimeCurrent(packet?.generatedAt,45*MIN,now))throw Error('Current forecast unavailable: expired or unverified forecast packet');
 if(mode==='board'){
  if(!Array.isArray(packet.locations))throw Error('Regional forecast unavailable');
  const locations=packet.locations.map(site=>admitFrostSite(site,now));
  return {...packet,locations,usable:locations.filter(s=>s.best).length};
 }
 if(packet?.location?.id!==expected)throw Error('Forecast location unavailable: response did not match selected location');
 return {...packet,location:admitFrostSite(packet.location,now)};
}
