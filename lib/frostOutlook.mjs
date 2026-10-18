/* Exploratory, non-probabilistic NWS frost-weather diagnostics.
 * Important: station-height forecast grids cannot identify ice on vegetation.
 */
const WEIGHTS={4:0.55,5:0.9,6:1.15,7:1.4,8:1.25,9:0.7};
const round=value=>Math.round(value*10)/10;
export function summarizeDawn(hourly){
  const hours=Array.isArray(hourly)?hourly:[];
  const valid=hours.filter(h=>Number.isFinite(h.score)&&Number.isFinite(h.tempF)&&Number.isFinite(h.dewF)&&Number.isFinite(h.windMph)&&Number.isFinite(h.skyPct));
  const dataCoveragePct=Math.round(100*valid.length/6);
  if(valid.length<3)return {score:null,validHours:valid.length,dataCoveragePct,sustainedHours:0,
    explanation:'Fewer than three dawn forecast hours contain all four required NWS fields.',drivers:[]};
  // Include every complete 4–9 a.m. hour; avoid selecting only the three best.
  // Weight the hours around local sunrise slightly more, but never invent missing hours.
  const weightSum=valid.reduce((total,h)=>total+(WEIGHTS[h.hour]||1),0);
  const score=Math.round(valid.reduce((total,h)=>total+h.score*(WEIGHTS[h.hour]||1),0)/weightSum);
  const tempMinF=round(Math.min(...valid.map(h=>h.tempF)));
  const dewMinF=round(Math.min(...valid.map(h=>h.dewF)));
  const spreadMinF=round(Math.min(...valid.map(h=>h.spreadF)));
  const windMeanMph=round(valid.reduce((n,h)=>n+h.windMph,0)/valid.length);
  const cloudMeanPct=Math.round(valid.reduce((n,h)=>n+h.skyPct,0)/valid.length);
  const best=[...valid].sort((a,b)=>b.score-a.score||a.hour-b.hour)[0];
  let sustainedHours=0,streak=0,previousHour=null;
  for(const h of [...valid].sort((a,b)=>a.hour-b.hour)){
    streak=h.score>=55?(previousHour!==null&&h.hour===previousHour+1?streak+1:1):0;
    sustainedHours=Math.max(sustainedHours,streak);previousHour=h.hour;
  }
  const drivers=[];
  if(tempMinF>37)drivers.push('Forecast air remains relatively warm; exposed surfaces may still cool below air temperature.');
  if(spreadMinF>8)drivers.push('Large temperature–dew-point gap limits available moisture.');
  if(windMeanMph>8)drivers.push('Breezy conditions can mix away the cold, humid layer near the surface.');
  if(cloudMeanPct>65)drivers.push('Extensive cloud cover may inhibit nighttime radiative cooling.');
  const precipitation=valid.map(h=>h.popPct).filter(Number.isFinite);
  if(precipitation.length&&Math.max(...precipitation)>=50)drivers.push('Precipitation risk makes a delicate, clear-sky frost scene less compelling.');
  if(valid.length<6)drivers.push('Some dawn hours are unscored; the index represents only available hours.');
  if(!drivers.length)drivers.push('Cold air, small dew-point spread, calm wind and clearer sky overlap for several hours.');
  // This describes ingredient *compatibility*, never claims a frost type occurred.
  const crystalIngredients=valid.some(h=>h.dewF<=31&&h.tempF<=35&&h.spreadF<=5&&h.windMph<=6);
  const moistureMode=crystalIngredients?'Hoarfrost ingredients present':valid.some(h=>h.dewF>32&&h.tempF<=37)?
    'Surface frost or frozen dew possible':'Crystal type cannot be inferred';
  const explanation=score>=75?'Several pre-sunrise hours have a favorable cold, moist, calm-weather combination.':
    score>=55?'Some dawn hours align, but surface cooling and local exposure remain decisive.':
    score>=30?'Conditions are mixed across the morning, limiting a dependable frost outing.':
    'The available forecast does not favor a sustained, calm, moist frost setup.';
  return {score,validHours:valid.length,dataCoveragePct,sustainedHours,tempMinF,dewMinF,
    spreadMinF,windMeanMph,cloudMeanPct,bestHour:best.hour,drivers,moistureMode,explanation};
}
export function rankedDawnRows(locations,date){
  if(!Array.isArray(locations)||!date)return [];
  return locations.map(location=>{
    const morning=location.mornings?.find(m=>m.date===date)||null;
    return {id:location.id,name:location.name,region:location.region,date,score:morning?.score??null,
      status:morning?.photo?.status||'unavailable',coverage:morning?.dataCoveragePct??0,
      sustainedHours:morning?.sustainedHours??0,photo:morning?.photo||null,
      overnightHeadline:morning?.night?.headline||'Overnight evidence unavailable',
      overnightStatus:morning?.night?.status||'incomplete'};
  }).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.name.localeCompare(b.name));
}
export function hourlyIngredientNotes(hour){
  if(!hour||!Number.isFinite(hour.score))return ['Required NWS weather fields unavailable.'];
  const notes=[];
  if(hour.tempF<=32)notes.push('Air below freezing helps, but does not confirm frost on a surface.');
  else if(hour.tempF<=37)notes.push('Exposed grass or glass could radiate below freezing despite above-freezing air.');
  else notes.push('Air remains warmer than a typical frost setup.');
  if(hour.spreadF<=3)notes.push('Small temperature–dew-point gap: moisture is readily available.');
  else if(hour.spreadF>=9)notes.push('Air is relatively dry; frost deposition becomes less favorable.');
  if(hour.windMph>=8)notes.push('Wind may prevent a very cold, still surface layer from forming.');
  if(hour.skyPct>=70)notes.push('Cloud cover may slow radiative cooling.');
  if(hour.visibilityMi!==null&&hour.visibilityMi!==undefined&&hour.visibilityMi<=1&&hour.tempF<=36)
    notes.push('Low forecast visibility near freezing: check fog/road conditions and NWS alerts.');
  else if(hour.visibilityMi===null||hour.visibilityMi===undefined)
    notes.push('Visibility guidance unavailable; clear travel conditions are not assumed.');
  return notes;
}
