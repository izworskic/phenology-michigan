// Destination-scale conditions, NOT site-specific bloom forecasts.
// Exposure labels summarize the referenced preserve habitat; a point pin and
// forecast grid cannot reveal slope, canopy, soil or actual trail snow.
export const LOCAL_HABITATS={
 'warren-dunes':{kind:'Dune woodland',note:'Wooded natural area near Lake Michigan; wind exposure varies between forest and dunes.'},
 'warren-woods':{kind:'Beech–maple woodland',note:'Old-growth inland forest; shade and understory can differ from open-air forecasts.'},
 'trillium-ravine':{kind:'Sheltered ravine',note:'Wooded ravine; slopes, aspect and sheltered pockets may differ from the nearby weather grid.'},
 'nan-weston':{kind:'Floodplain woodland',note:'Forested river bottom and surrounding woodland; local wet ground and shade can matter.'},
 'trillium-trail':{kind:'Wooded hillside',note:'Forest and stream hillsides; changes in slope and aspect are not resolved by the forecast.'},
 'hoffmaster':{kind:'Coastal dune woodland',note:'Wooded dune landscape along Lake Michigan; lake winds and protected woods may differ.'},
 'portage-point':{kind:'Back-dune woodland',note:'Lake Michigan-influenced back-dune forest; nearshore and sheltered woods can differ.'},
 'hoogland':{kind:'Lakeshore hardwood forest',note:'Beech–maple woodland along M-119 near Lake Michigan; small microclimates remain unresolved.'},
 'woollam':{kind:'Rocky coastal woodland',note:'Shoreline-influenced rocky terrain with sensitive woodland; snow and exposure vary along trails.'},
 'echo-lake':{kind:'Rocky upland forest',note:'Rocky upland forest and steeper terrain; snow may remain in shaded or sheltered pockets.'}
};
export const COMPARE_THRESHOLD_F=2;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(Date.parse(s+'T12:00:00Z')).toISOString().slice(0,10)===s;
const finiteOrNull=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
const round1=n=>Math.round(n*10)/10;
export function batchForecastUrl(stops,regions){
 const points=[...stops,...regions];
 if(!points.length||points.some(p=>!Number.isFinite(p.lat)||!Number.isFinite(p.lon)))throw Error('Invalid weather grid locations');
 const params=new URLSearchParams({
  latitude:points.map(p=>p.lat).join(','),longitude:points.map(p=>p.lon).join(','),
  daily:'temperature_2m_mean,temperature_2m_min,temperature_2m_max,snowfall_sum',
  current:'snow_depth',temperature_unit:'fahrenheit',timezone:'America/Detroit',
  forecast_days:'7'
 });
 return 'https://api.open-meteo.com/v1/forecast?'+params.toString();
}
export function parseGridPoint(raw,nowDate){
 const daily=raw?.daily,keys=['time','temperature_2m_mean','temperature_2m_min','temperature_2m_max','snowfall_sum'];
 if(!daily||keys.some(k=>!Array.isArray(daily[k])||daily[k].length!==7))return null;
 if(!validDate(nowDate)||daily.time[0]!==nowDate||new Set(daily.time).size!==7)return null;
 const dates=[];
 for(let i=0;i<7;i++){
  const day=daily.time[i],mean=finiteOrNull(daily.temperature_2m_mean[i]),min=finiteOrNull(daily.temperature_2m_min[i]),max=finiteOrNull(daily.temperature_2m_max[i]),snowfall=finiteOrNull(daily.snowfall_sum[i]);
  if(!validDate(day)||mean===null||min===null||max===null||mean< -50||mean>130||min>max||mean<min-2||mean>max+2)return null;
  if(i>0&&Date.parse(day+'T12:00:00Z')-Date.parse(dates[i-1].date+'T12:00:00Z')!==86400000)return null;
  dates.push({date:day,meanF:round1(mean),minF:round1(min),maxF:round1(max),snowfallCm:snowfall!==null&&snowfall>=0?round1(snowfall):null});
 }
 const today=raw?.current;
 const snowM=finiteOrNull(today?.snow_depth);
 const snowDepthCm=snowM!==null&&snowM>=0&&snowM<5&&typeof today.time==='string'&&today.time.slice(0,10)===nowDate?round1(snowM*100):null;
 const totalSnowfall=dates.every(d=>d.snowfallCm!==null)?round1(dates.reduce((n,d)=>n+d.snowfallCm,0)):null;
 return {days:dates,mean7F:round1(dates.reduce((n,d)=>n+d.meanF,0)/7),freezingNights:dates.filter(d=>d.minF<=32).length,
   mildDays:dates.filter(d=>d.maxF>=60).length,snowfall7Cm:totalSnowfall,snowDepthCm,
   snowDepthTime:snowDepthCm===null?null:today.time,modelElevationM:finiteOrNull(raw.elevation)};
}
export function assessDestination(stop,site,regional,nowDate){
 const habitat=LOCAL_HABITATS[stop.id]||{kind:'Woodland',note:'Actual canopy, slope and snow vary by trail.'};
 const base={siteId:stop.id,habitat,source:'Open-Meteo forecast grid, not an on-site observation'};
 if(!site)return {...base,state:'unavailable',label:'Local conditions unavailable',note:'No valid complete seven-day site forecast. Do not infer snow or bloom.',compare:null};
 const delta=regional?round1(site.mean7F-regional.mean7F):null;
 const compare=delta===null?null:delta>=COMPARE_THRESHOLD_F?'warmer':delta<=-COMPARE_THRESHOLD_F?'cooler':'similar';
 const snow=site.snowDepthCm===null?{state:'unknown',label:'Modeled snow cover unavailable'}:
  site.snowDepthCm>=2?{state:'modeled_snow',label:'Model suggests snow on the ground'}:{state:'little_modeled_snow',label:'Model suggests little or no snow'};
 return {...base,state:'available',label:compare==='warmer'?'Grid warmer than regional reference':compare==='cooler'?'Grid cooler than regional reference':compare==='similar'?'Grid near regional temperatures':'Local grid forecast available',
  note:'A difference between forecast grid points is not proof of a lake effect, delayed bloom or trail conditions.',
  temperatureDeltaF:delta,compare,mean7F:site.mean7F,regionalMean7F:regional?.mean7F??null,
  freezingNights:site.freezingNights,mildDays:site.mildDays,snow,snowDepthCm:site.snowDepthCm,
  snowDepthTime:site.snowDepthTime,snowfall7Cm:site.snowfall7Cm,days:site.days};
}
export function buildLocalOutlook(stops,regions,batch,nowDate){
 const points=[...stops,...regions];
 if(!Array.isArray(batch)||batch.length!==points.length)throw Error('Incomplete multi-location forecast; do not map mismatched locations');
 const parsed=batch.map(raw=>parseGridPoint(raw,nowDate));
 const byRegion=new Map(regions.map((r,i)=>[r.id,parsed[stops.length+i]]));
 return stops.map((site,i)=>assessDestination(site,parsed[i],byRegion.get(site.region),nowDate));
}
