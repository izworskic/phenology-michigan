/* Overnight NWS forecast analysis: 6 p.m. on the preceding date through
 * 9 a.m. on the requested dawn. Never identifies surface frost, observations,
 * physical cooling cause, or a calibrated frost probability.
 */
const d = value => new Date(value+'T12:00:00Z');
export const shiftDate = (date,n) => {
  const value=d(date);
  if(!Number.isFinite(value.getTime()))return null;
  value.setUTCDate(value.getUTCDate()+n);
  return value.toISOString().slice(0,10);
};
const formatters=new Map();
export function partsAt(time,tz='America/Detroit'){
  if(!formatters.has(tz))formatters.set(tz,new Intl.DateTimeFormat('en-US',{
    timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'
  }));
  const parts=Object.fromEntries(formatters.get(tz).formatToParts(new Date(time))
    .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {date:parts.year+'-'+parts.month+'-'+parts.day,hour:Number(parts.hour)%24};
}
export function dateForNightHour(date,hour){
  return hour>=18?shiftDate(date,1):hour<=9?date:null;
}
export function nightSlots(date,tz='America/Detroit'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!shiftDate(date,0))return [];
  const previous=shiftDate(date,-1);
  const start=Date.parse(previous+'T00:00:00Z')-12*3600000;
  const stop=Date.parse(date+'T00:00:00Z')+36*3600000;
  const slots=[];
  for(let t=start;t<=stop;t+=3600000){
    const p=partsAt(t,tz);
    if((p.date===previous&&p.hour>=18)||(p.date===date&&p.hour<=9)){
      slots.push({time:new Date(t).toISOString(),hour:p.hour,phase:p.date===previous?'evening':'morning'});
    }
  }
  return slots;
}
const round=x=>Math.round(x*10)/10;
const mean=(array,key)=>array.length?array.reduce((s,h)=>s+h[key],0)/array.length:null;
const complete=h=>h&&Number.isFinite(h.tempF)&&Number.isFinite(h.dewF)&&
  Number.isFinite(h.windMph)&&Number.isFinite(h.skyPct)&&h.score!==null&&Number.isFinite(h.score);
const validGroup=(items,lo,hi)=>items.filter(h=>complete(h)&&h.hour>=lo&&h.hour<=hi);
export function assessOvernight(hours,date,tz='America/Detroit'){
  const slots=nightSlots(date,tz);
  const byTime=new Map((Array.isArray(hours)?hours:[]).map(h=>[h.time,h]));
  const series=slots.map(slot=>({...slot,...(byTime.get(slot.time)||{score:null})}));
  const valid=series.filter(complete);
  const expectedHours=slots.length;
  const coveragePct=expectedHours?Math.round(valid.length/expectedHours*100):0;
  const early=validGroup(series.filter(h=>h.phase==='evening'),18,21);
  const middle=series.filter(h=>complete(h)&&(h.phase==='evening'&&h.hour>=22||h.phase==='morning'&&h.hour<=3));
  const predawn=validGroup(series.filter(h=>h.phase==='morning'),4,8);
  const full=coveragePct>=70&&early.length>=2&&middle.length>=3&&predawn.length>=3;
  const unavailable={status:'incomplete',regime:'unavailable',headline:'Overnight evidence incomplete',
    explanation:'Not enough evening, overnight and pre-dawn NWS forecast hours to assess cooling. No past weather is reconstructed.',
    series,expectedHours,validHours:valid.length,coveragePct,deltaF:null,
    eveningTempF:null,predawnTempF:null,coreWindMph:null,coreSkyPct:null,
    predawnSpreadF:null,notes:[]};
  if(!full)return unavailable;
  const earlyTemp=mean(early,'tempF'),predawnTemp=mean(predawn,'tempF');
  const deltaF=round(earlyTemp-predawnTemp);
  const core=[...middle,...predawn];
  const coreWindMph=round(mean(core,'windMph'));
  const coreSkyPct=Math.round(mean(core,'skyPct'));
  const predawnSpreadF=round(mean(predawn.map(h=>({...h,spreadF:Math.max(0,h.tempF-h.dewF)})),'spreadF'));
  const before=series.filter(h=>complete(h)&&(h.phase==='evening'&&h.hour>=20||h.phase==='morning'&&h.hour<=2));
  const late=validGroup(series.filter(h=>h.phase==='morning'),3,7);
  const earlyWind=mean(before,'windMph');
  const earlySky=mean(before,'skyPct');
  const lateWind=mean(late,'windMph');
  const lateSky=mean(late,'skyPct');
  const easing=earlySky!==null&&lateSky!==null&&earlyWind!==null&&lateWind!==null&&
    (earlySky-lateSky>=30||earlyWind-lateWind>=4)&&lateWind<=6&&lateSky<=45;
  const cold=predawnTemp<=37, moisture=predawnSpreadF<=7;
  const lowWind=coreWindMph<=6, clearer=coreSkyPct<=45;
  let regime='mixed',headline='Mixed overnight cooling ingredients',
    explanation='A few cooling ingredients align, but the overnight pattern is not consistently favorable.';
  if(predawnTemp>40){
    regime='too-warm';headline='Overnight temperatures remain relatively warm';
    explanation='The forecast remains warmer than a typical frost-weather setup near dawn. Sheltered surfaces may still differ.';
  }else if(easing&&cold&&moisture){
    regime='late-improvement';headline='Clearing or calming late in the night';
    explanation='Wind or clouds ease ahead of dawn, improving potential surface cooling; the favorable window may be brief.';
  }else if(lowWind&&clearer&&cold&&moisture&&(deltaF>=2||earlyTemp<=35)){
    regime='radiational-support';headline='Sustained radiational-cooling ingredients';
    explanation='Clearer skies, weak winds and moisture align with a cold pre-dawn forecast. The temperature trend is consistent with cooling, not proof of its cause.';
  }else if(cold&&(coreWindMph>=9||coreSkyPct>=70)){
    regime='cold-without-radiational-signal';headline='Cold air, but an unfavorable overnight pattern';
    explanation='The forecast is cold at dawn, but wind or clouds limit a classic radiational-frost setup. Temperature decline alone cannot establish why cooling occurs.';
  }else if(!moisture){
    regime='dry';headline='Cold air may be too dry for conspicuous frost';
    explanation='The forecast shows a relatively large temperature–dew-point gap before dawn, limiting moisture for visible crystal growth.';
  }
  const notes=[];
  if(deltaF>=3)notes.push('Forecast air cools '+round(deltaF)+'°F between early evening and pre-dawn; this does not measure ground cooling.');
  else if(deltaF<0)notes.push('Pre-dawn forecast air is warmer than early evening; conditions do not show sustained overnight air cooling.');
  else notes.push('Limited air-temperature decline; a cold initial air mass may already be in place.');
  if(coreWindMph>=8)notes.push('Elevated overnight winds may disrupt surface-layer cooling.');
  if(coreSkyPct>=65)notes.push('Cloud cover may reduce radiative heat loss.');
  if(predawnSpreadF>7)notes.push('A larger dawn dew-point gap limits available moisture.');
  if(coveragePct<100)notes.push('Some forecast hours are missing; no values have been interpolated.');
  return {status:'ready',regime,headline,explanation,series,expectedHours,validHours:valid.length,
    coveragePct,deltaF,eveningTempF:round(earlyTemp),predawnTempF:round(predawnTemp),
    coreWindMph,coreSkyPct,predawnSpreadF,notes};
}
