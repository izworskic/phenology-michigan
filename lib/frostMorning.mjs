import {summarizeDawn} from './frostOutlook.mjs';
/* Michigan frosty morning / hoarfrost viewing-weather heuristic.
 * Weather conditions are not observations, hoarfrost verification or probabilities.
 * NWS grid forecasts are 2m/area forecasts, not branch or ground surface temperatures.
 */
export const SITES=[
  ['bay-city','Bay City / Saginaw Bay',43.60,-83.89,'Great Lakes Bay','Open fields, wetland edges and sheltered public viewpoints.'],
  ['bad-axe','Bad Axe / Thumb',43.80,-83.00,'Thumb','Agricultural fields and exposed hedgerows.'],
  ['grand-rapids','Grand Rapids',42.96,-85.67,'West Michigan','Grassy parklands and sheltered riverside vegetation.'],
  ['lansing','Lansing',42.73,-84.56,'Mid-Michigan','Meadows and sheltered edges away from city heat.'],
  ['kalamazoo','Kalamazoo',42.29,-85.59,'Southwest Michigan','Rural meadows and open field edges.'],
  ['ann-arbor','Ann Arbor',42.28,-83.75,'Southeast Michigan','Fields and shaded stream-valley edges.'],
  ['traverse-city','Traverse City',44.76,-85.62,'Northwest Lower','Inland orchards, meadows and low-lying clearings.'],
  ['gaylord','Gaylord',45.03,-84.67,'Northern Lower','Frost-prone inland clearings and sheltered valleys.'],
  ['alpena','Alpena',45.06,-83.43,'Northeast Lower','Open marshy ground and forest margins.'],
  ['marquette','Marquette',46.54,-87.40,'Central UP','Protected inland fields and woodland edges.'],
  ['munising','Munising',46.41,-86.65,'Eastern UP','Sheltered inland clearings and trail-edge branches.'],
  ['ironwood','Ironwood',46.45,-90.17,'Western UP','Interior river valleys and cold-air pockets.']
].map(([id,name,lat,lon,region,setting])=>({id,name,lat,lon,region,setting,tz:'America/Detroit'}));
// The statewide CARTO board must evaluate every point shown on the map.
export const BOARD_IDS=SITES.map(site=>site.id);
export const lookup=id=>SITES.find(s=>s.id===id)||null;
export function localParts(instant,zone='America/Detroit'){
  const v=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const obj=Object.fromEntries(v.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:obj.year+'-'+obj.month+'-'+obj.day,hour:Number(obj.hour)%24};
}
function durationHours(duration){
  const m=String(duration||'').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  return m?Number(m[1]||0)*24+Number(m[2]||0)+Number(m[3]||0)/60:0;
}
export function expandGrid(property,start=new Date()){
  const result=new Map();
  const valid=Array.isArray(property?.values)?property.values:[];
  const cutoff=start.getTime()-2*3600000, end=start.getTime()+8*86400000;
  for(const item of valid){
    const [time,length]=String(item.validTime||'').split('/');
    const startMs=Date.parse(time),hours=Math.min(192,durationHours(length));
    if(!Number.isFinite(startMs)||hours<=0||item.value===null||!Number.isFinite(item.value))continue;
    for(let i=0;i<hours;i++){
      const t=startMs+i*3600000;
      if(t>=cutoff&&t<=end)result.set(new Date(t).toISOString(),item.value);
    }
  }
  return result;
}
const round=n=>Math.round(n*10)/10;
const clamped=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function scoreHour({tempF,dewF,windMph,skyPct,popPct=null}={}){
  if(![tempF,dewF,windMph,skyPct].every(Number.isFinite))return null;
  if(windMph<0||skyPct<0||skyPct>100||tempF < -65||tempF > 115)return null;
  const spread=clamped(tempF-dewF,0,80);
  let temperature=tempF<=32?29:tempF<=35?24:tempF<=37?16:tempF<=40?7:0;
  let moisture=spread<=2?30:spread<=5?24:spread<=8?14:spread<=12?6:0;
  let wind=windMph<=3?22:windMph<=6?15:windMph<=10?6:0;
  let skies=skyPct<=25?19:skyPct<=50?13:skyPct<=75?6:0;
  let penalty=Number.isFinite(popPct)?popPct>=65?18:popPct>=35?9:0:0;
  let score=clamped(Math.round(temperature+moisture+wind+skies-penalty),0,100);
  if(tempF>40)score=Math.min(10,score);
   if(dewF>tempF+3)return null; // Reject inconsistent unsaturated-grid ingredients.
  if(tempF>37)score=Math.min(40,score);
  if(windMph>14)score=Math.min(40,score);
  if(spread>12)score=Math.min(42,score);
  return {score,spreadF:round(spread),tempF:round(tempF),dewF:round(dewF),windMph:round(windMph),skyPct:Math.round(skyPct),popPct:Number.isFinite(popPct)?Math.round(popPct):null,
    factors:{temperature,moisture,wind,skies,precipitationPenalty:penalty},
     label:score>=75?'Strong frost setup':score>=55?'Possible frost setup':score>=30?'Limited setup':'Unfavorable'};
}

// Approximate NOAA solar-equation approach, using a -0.833° apparent sunrise
// and -6° civil twilight. Horizon, refraction and elevation vary by viewpoint.
// UTC instants + the site's IANA time zone avoid DST arithmetic.
const radians=d=>d*Math.PI/180;
const degrees=r=>r*180/Math.PI;
export function solarMorning(date,site){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(site?.lat)||!Number.isFinite(site?.lon))return null;
  const midday=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(midday.getTime())||midday.toISOString().slice(0,10)!==date)return null;
  const jan1=Date.UTC(midday.getUTCFullYear(),0,1);
  const doy=Math.floor((midday.getTime()-jan1)/86400000)+1;
  const days=(Date.UTC(midday.getUTCFullYear()+1,0,1)-jan1)/86400000;
  const gamma=2*Math.PI/days*(doy-1);
  const eqMinutes=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
  const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
  const phi=radians(site.lat);
  function solarEvent(zenith){
    const x=(Math.cos(radians(zenith))-Math.sin(phi)*Math.sin(decl))/(Math.cos(phi)*Math.cos(decl));
    if(x < -1||x > 1)return null;
    const hourAngle=degrees(Math.acos(x));
    const utcMinutes=720-4*(site.lon+hourAngle)-eqMinutes;
    return new Date(Date.UTC(midday.getUTCFullYear(),midday.getUTCMonth(),midday.getUTCDate())+Math.round(utcMinutes)*60000).toISOString();
  }
  const sunriseAt=solarEvent(90.833),civilDawnAt=solarEvent(96);
  if(!sunriseAt||!civilDawnAt)return null;
  return {sunriseAt,civilDawnAt,model:'NOAA solar-equation approximation, sea-level horizon'};
}

/* Forecast visibility is optional. Unavailable grid data must never imply clear
 * weather. Reduced visibility near freezing can indicate fog / rime hazards,
 * but does not identify observed fog or ice. */
export function visibilityMiles(value,uom){
  if(!Number.isFinite(value)||value<0)return null;
  const unit=String(uom||'').toLowerCase();
  let miles=null;
  if(/(?:^|:)m$|meter/.test(unit))miles=value/1609.344;
  else if(/km/.test(unit))miles=value/1.609344;
  else if(/mi$|mile/.test(unit))miles=value;
  if(!Number.isFinite(miles)||miles>500)return null;
  return Math.round(miles*10)/10;
}
export function closestFrostSite(lat,lon,sites=SITES){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!Array.isArray(sites)||!sites.length)return null;
  const rad=Math.PI/180;
  const dist=s=>{
    const a=Math.sin((s.lat-lat)*rad/2)**2+
      Math.cos(lat*rad)*Math.cos(s.lat*rad)*Math.sin((s.lon-lon)*rad/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(a)));
  };
  const nearest=[...sites].filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)).sort((a,b)=>dist(a)-dist(b))[0]||null;
  // Michigan-focused tool: do not silently select an irrelevant grid from another state.
  return nearest&&dist(nearest)<=250?nearest:null;
}
export function dawnDecision(morning){
  if(!morning||morning.score===null||!Number.isFinite(morning.score))return {level:'unavailable',headline:'Forecast incomplete',detail:'Not enough weather data to recommend a morning.'};
  const photo=morning.photo||{};
  if(photo.status==='passed')return {level:'past',headline:'Sunrise viewing window has passed',detail:'Review another upcoming morning; the weather may have changed.'};
  if(photo.status==='fog-watch')return {level:'caution',headline:'Low-visibility caution near dawn',
    detail:'Forecast visibility is reduced near freezing. Fog or rime may be possible, and travel can be hazardous. Check NWS alerts and local visibility.'};
  if(photo.status==='unavailable')return {level:'unavailable',headline:'Dawn weather incomplete',detail:'Forecast inputs near sunrise are missing; do not treat the score as a trip recommendation.'};
  if(photo.status==='strong')return {level:'promising',headline:'Promising frost-weather setup',detail:'Cold, moisture and calm conditions line up near sunrise. Consider scouting a nearby public viewpoint; ice crystals are not guaranteed.'};
  if(photo.status==='possible')return {level:'possible',headline:'Worth watching',detail:'Some ingredients line up for frost, but local surface cooling and actual moisture will decide. Recheck before setting out.'};
  if(photo.status==='limited')return {level:'limited',headline:'Mixed conditions',detail:'A few ingredients help, but this is not a compelling long-distance frost photography trip.'};
  return {level:'low',headline:'Weak morning for a frost trip',detail:'The available sunrise forecast does not support a special early-morning outing for hoarfrost.'};
}

export function sunrisePhotoWindow(date,site,hourly,now=new Date()){
  const sun=solarMorning(date,site);
  if(!sun)return {status:'unavailable',label:'Sunrise unavailable',reason:'The solar calculation is not available for this date and location.'};
  const sunrise=Date.parse(sun.sunriseAt);
  const windowStartAt=new Date(sunrise-10*60000).toISOString();
  const windowEndAt=new Date(sunrise+35*60000).toISOString();
  const common={...sun,arriveAt:sun.civilDawnAt,windowStartAt,windowEndAt,
    note:'Arrival and photography times are planning guidance, not measured frost onset or melting times.'};
  if(sunrise+35*60000<now.getTime()){
    return {...common,status:'passed',label:'Sunrise window passed',reason:'The suggested dawn photography period is already over at this site.'};
  }
  const valid=(Array.isArray(hourly)?hourly:[]).filter(h=>h.score!==null&&Number.isFinite(Date.parse(h.time)));
  const before=valid.filter(h=>Date.parse(h.time)<=sunrise&&sunrise-Date.parse(h.time)<=90*60000).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time))[0];
  const after=valid.filter(h=>Date.parse(h.time)>=sunrise&&Date.parse(h.time)-sunrise<=90*60000).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time))[0];
  if(!before||!after||before.time===after.time){
    return {...common,status:'unavailable',label:'Sunrise weather incomplete',
      reason:'A complete NWS hourly forecast is needed on both sides of sunrise. No dawn-viewing rating has been invented.'};
  }
  const frostSetup=Math.round((before.score+after.score)/2);
  const skyCover=Math.round((before.skyPct+after.skyPct)/2);
  const precipitation=Math.max(before.popPct??0,after.popPct??0);
  const visibilitySamples=[before.visibilityMi,after.visibilityMi].filter(Number.isFinite);
  const visibilityMi=visibilitySamples.length?Math.min(...visibilitySamples):null;
  const fogWatch=visibilityMi!==null&&visibilityMi<=1&&Math.min(before.tempF,after.tempF)<=36;
  const turningWarmer=after.tempF>37||after.score<before.score-25;
  let status='low',label='Limited sunrise setup';
  if(frostSetup>=75&&skyCover<=40&&precipitation<35&&!turningWarmer){status='strong';label='Promising sunrise setup';}
  else if(frostSetup>=55&&skyCover<=65&&precipitation<65&&!turningWarmer){status='possible';label='Possible sunrise setup';}
  else if(frostSetup>=40&&skyCover<=75&&precipitation<65){status='limited';label='Mixed sunrise conditions';}
  if(fogWatch){status='fog-watch';label='Low-visibility caution';}
  const reason=status==='fog-watch'?'Near-freezing air and forecast visibility of a mile or less raise possible fog/rime concerns. Check NWS advisories and road conditions; this is not a confirmed freezing-fog observation.':
    status==='strong'?'Good frost-friendly weather overlaps sunrise, with relatively open sky for dawn light.':
    status==='possible'?'Some frost-friendly weather and daylight overlap; surface conditions remain uncertain.':
    turningWarmer?'Conditions are warming or deteriorating near sunrise; frost could be brief or absent.':
    'Forecast moisture, temperature, cloud or wind limits this dawn photography setup.';
  return {...common,status,label,reason,frostSetup,skyCover,precipitation,visibilityMi,
    forecastHours:[before.time,after.time],weatherType:'Hourly NWS forecast grid, not observed hoarfrost'};
}

export function evaluateGrid(grid,now=new Date(),site=SITES[0]){
  const keys=['temperature','dewpoint','windSpeed','skyCover','relativeHumidity','probabilityOfPrecipitation','visibility'];
  const series=Object.fromEntries(keys.map(key=>[key,expandGrid(grid?.[key],now)]));
  const tempUnit=String(grid?.temperature?.uom||'');
  const dewUnit=String(grid?.dewpoint?.uom||'');
  const windUnit=String(grid?.windSpeed?.uom||'');
  const cToF=value=>round(value*9/5+32);
  const tempAsF=value=>/degF|fahrenheit/i.test(tempUnit)?value:cToF(value);
  const dewAsF=value=>/degF|fahrenheit/i.test(dewUnit)?value:cToF(value);
  const windAsMph=value=>/mi_h-1|mph/i.test(windUnit)?value:round(value*0.621371);
  const utcKeys=[...series.temperature.keys()].sort();
  const currentLocal=localParts(now,site.tz);
  const buckets=new Map();
  for(const time of utcKeys){
    const instant=new Date(time),part=localParts(instant,site.tz);
    if(instant.getTime()<now.getTime()-45*60000||part.date<currentLocal.date||part.hour<4||part.hour>9)continue;
    const get=key=>series[key].has(time)?series[key].get(time):null;
    const temp=get('temperature'),dew=get('dewpoint'),wind=get('windSpeed'),sky=get('skyCover');
    const result=scoreHour({tempF:temp===null?null:tempAsF(temp),dewF:dew===null?null:dewAsF(dew),
      windMph:wind===null?null:windAsMph(wind),skyPct:sky,popPct:get('probabilityOfPrecipitation')});
    const point={time,hour:part.hour, ...(result||{score:null,label:'Missing forecast ingredient'}),rhPct:get('relativeHumidity'),
      visibilityMi:visibilityMiles(get('visibility'),grid?.visibility?.uom)};
    if(!buckets.has(part.date))buckets.set(part.date,[]);
    buckets.get(part.date).push(point);
  }
  const mornings=[...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,4).map(([date,hourly])=>{
    const summary=summarizeDawn(hourly);
    const score=summary.score;
    const label=score===null?'Forecast incomplete':score>=75?'Strong frost setup':score>=55?'Possible frost setup':score>=30?'Limited setup':'Unfavorable';
    return {date,photo:sunrisePhotoWindow(date,site,hourly,now),...summary,label,hourly};
  }).slice(0,3);
  const best=mornings.filter(m=>m.score!==null).sort((a,b)=>b.score-a.score||a.date.localeCompare(b.date))[0]||null;
  const bestPhoto=mornings.filter(m=>['strong','possible','limited'].includes(m.photo?.status))
    .sort((a,b)=>({'strong':3,'possible':2,'limited':1}[b.photo.status]-{'strong':3,'possible':2,'limited':1}[a.photo.status])||a.date.localeCompare(b.date))[0]||null;
  return {mornings,best,bestPhoto,coverage:mornings.filter(m=>m.score!==null).length};
}
