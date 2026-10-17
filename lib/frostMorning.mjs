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
export const BOARD_IDS=['bay-city','bad-axe','grand-rapids','lansing','traverse-city','gaylord','alpena','marquette','ironwood'];
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
  let temperature=tempF<=10?15:tempF<=30?29:tempF<=34?27:tempF<=37?16:tempF<=40?7:0;
  let moisture=spread<=2?30:spread<=5?24:spread<=8?14:spread<=12?6:0;
  let wind=windMph<=3?22:windMph<=6?15:windMph<=10?6:0;
  let skies=skyPct<=25?19:skyPct<=50?13:skyPct<=75?6:0;
  let penalty=Number.isFinite(popPct)?popPct>=65?18:popPct>=35?9:0:0;
  let score=clamped(Math.round(temperature+moisture+wind+skies-penalty),0,100);
  if(tempF>40)score=Math.min(10,score);
  if(tempF>37)score=Math.min(40,score);
  if(windMph>14)score=Math.min(40,score);
  if(spread>12)score=Math.min(42,score);
  return {score,spreadF:round(spread),tempF:round(tempF),dewF:round(dewF),windMph:round(windMph),skyPct:Math.round(skyPct),popPct:Number.isFinite(popPct)?Math.round(popPct):null,
    label:score>=75?'Strong frost setup':score>=55?'Possible frost setup':score>=30?'Limited setup':'Unfavorable'};
}
export function evaluateGrid(grid,now=new Date(),site=SITES[0]){
  const keys=['temperature','dewpoint','windSpeed','skyCover','relativeHumidity','probabilityOfPrecipitation'];
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
    const point={time,hour:part.hour, ...(result||{score:null,label:'Missing forecast ingredient'}),rhPct:get('relativeHumidity')};
    if(!buckets.has(part.date))buckets.set(part.date,[]);
    buckets.get(part.date).push(point);
  }
  const mornings=[...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,4).map(([date,hourly])=>{
    const valid=hourly.filter(h=>h.score!==null);
    if(valid.length<3)return {date,score:null,label:'Forecast incomplete',bestHour:null,hourly,validHours:valid.length,
      explanation:'Fewer than three morning hours have all four essential NWS forecast inputs.'};
    const top=[...valid].sort((a,b)=>b.score-a.score||a.hour-b.hour).slice(0,3);
    const score=Math.round(top.reduce((s,h)=>s+h.score,0)/top.length);
    const best=top[0];
    const label=score>=75?'Strong frost setup':score>=55?'Possible frost setup':score>=30?'Limited setup':'Unfavorable';
    return {date,score,label,bestHour:best.hour,hourly,validHours:valid.length,
      explanation:score>=75?'Cold, moist, light-wind conditions line up around dawn. Look for frost on sheltered vegetation.':
        score>=55?'Some favorable ingredients line up; local surface cooling will decide.':
        'The available weather forecast does not show a convincing frost-friendly morning.'};
  }).slice(0,3);
  const best=mornings.filter(m=>m.score!==null).sort((a,b)=>b.score-a.score||a.date.localeCompare(b.date))[0]||null;
  return {mornings,best,coverage:mornings.filter(m=>m.score!==null).length};
}
