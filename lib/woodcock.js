// Michigan woodcock sky-dance planner. Not a sighting feed or calibrated probability model.
// USFWS survey protocols supply listening-time and weather-exclusion rules.
// Region windows below are broad editorial planning ranges, NOT official survey dates.
export const ZONE = 'America/Detroit';
export const REGIONS = [
  {id:'detroit',name:'Detroit & Ann Arbor',area:'Southeast Michigan',lat:42.33,lon:-83.05,window:['03-10','05-15'],peak:['04-01','04-30']},
  {id:'kalamazoo',name:'Kalamazoo & Battle Creek',area:'Southwest Michigan',lat:42.29,lon:-85.59,window:['03-10','05-15'],peak:['04-01','04-30']},
  {id:'grand-rapids',name:'Grand Rapids',area:'West Michigan',lat:42.96,lon:-85.67,window:['03-15','05-20'],peak:['04-05','05-05']},
  {id:'lansing',name:'Lansing & Jackson',area:'Central Michigan',lat:42.73,lon:-84.55,window:['03-15','05-20'],peak:['04-05','05-05']},
  {id:'saginaw-bay',name:'Saginaw Bay & Bay City',area:'East-central Michigan',lat:43.60,lon:-83.89,window:['03-20','05-25'],peak:['04-10','05-10']},
  {id:'traverse-city',name:'Traverse City',area:'Northwest Lower Peninsula',lat:44.76,lon:-85.62,window:['03-25','05-31'],peak:['04-15','05-15']},
  {id:'gaylord',name:'Gaylord & Alpena',area:'Northern Lower Peninsula',lat:45.03,lon:-84.67,window:['03-25','05-31'],peak:['04-15','05-15']},
  {id:'marquette',name:'Marquette',area:'Central Upper Peninsula',lat:46.54,lon:-87.40,window:['04-01','06-10'],peak:['04-20','05-25']},
  {id:'keweenaw',name:'Houghton & Keweenaw',area:'Western Upper Peninsula',lat:47.12,lon:-88.57,window:['04-05','06-15'],peak:['04-25','05-31']}
];
const rad = n => n*Math.PI/180;
const deg = n => n*180/Math.PI;
const norm = n => ((n%360)+360)%360;
const padded = n => String(n).padStart(2,'0');
export function michiganDate(date) {
  const p = new Intl.DateTimeFormat('en-US',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const pick = t => p.find(x=>x.type===t)?.value;
  return pick('year')+'-'+pick('month')+'-'+pick('day');
}
export function upcomingDates(now, count=7) {
  const date=michiganDate(now),start=Date.parse(date+'T12:00:00Z');
  return Array.from({length:count},(_,i)=>new Date(start+i*86400000).toISOString().slice(0,10));
}
export function windowFor(region,date) {
  const md=date.slice(5),inSeason=md>=region.window[0]&&md<=region.window[1],peak=md>=region.peak[0]&&md<=region.peak[1];
  return {inSeason,peak,phase:!inSeason?'Outside planning season':peak?'Core spring window':'Shoulder season',start:region.window[0],end:region.window[1]};
}
export function nextSpring(region,now) {
  const year=Number(michiganDate(now).slice(0,4)),md=michiganDate(now).slice(5);
  const targetYear=md>region.window[1]?year+1:year;
  return {year:targetYear,opens:targetYear+'-'+region.window[0],closes:targetYear+'-'+region.window[1]};
}
// NOAA sunrise/sunset algorithm, altitude -0.833 degrees, mean atmospheric refraction.
// Returns the astronomical estimate (not a station observation).
export function sunsetUtc(date,lat,lon) {
  const [year,month,day]=date.split('-').map(Number);
  const n=Math.round((Date.UTC(year,month-1,day)-Date.UTC(year,0,1))/86400000)+1;
  const t=n+(18-lon/15)/24;
  const M=0.9856*t-3.289;
  const L=norm(M+1.916*Math.sin(rad(M))+0.020*Math.sin(rad(2*M))+282.634);
  let RA=norm(deg(Math.atan(0.91764*Math.tan(rad(L)))));
  RA+=Math.floor(L/90)*90-Math.floor(RA/90)*90; RA/=15;
  const sinDec=0.39782*Math.sin(rad(L)),cosDec=Math.cos(Math.asin(sinDec));
  const cosH=(Math.cos(rad(90.833))-sinDec*Math.sin(rad(lat)))/(cosDec*Math.cos(rad(lat)));
  if(cosH>1||cosH< -1)return null;
  const H=deg(Math.acos(cosH))/15;
  const T=H+RA-0.06571*t-6.622;
  let UT=((T-lon/15)%24+24)%24;
  // Michigan sunset near 00:00 UTC falls on the *following* UTC date in EDT.
  if(lon<0&&UT< -lon/15)UT+=24;
  return new Date(Date.UTC(year,month-1,day)+Math.round(UT*3600000));
}
export function timeLocal(date) {
  if(!date)return 'Unavailable';
  return new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit',hour12:true}).format(date);
}
export function findCloudCover(values,time) {
  if(!Array.isArray(values))return null;
  for(const cell of values) {
    const parts=String(cell.validTime||'').split('/');
    const start=Date.parse(parts[0]);
    const duration=parts[1]?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
    const hours=duration?Number(duration[1]||0):1,minutes=duration?Number(duration[2]||0):0;
    const length=(hours*60+minutes)*60000;
    if(Number.isFinite(start)&&time.getTime()>=start&&time.getTime()<start+(length||3600000)&&Number.isFinite(cell.value))return Math.round(cell.value);
  }
  return null;
}
export function periodAt(periods,time) {
  return (periods||[]).find(p=>{
    const start=Date.parse(p.startTime||''),end=Date.parse(p.endTime||'');
    return Number.isFinite(start)&&time.getTime()>=start&&time.getTime()<(Number.isFinite(end)?end:start+3600000);
  })||null;
}
export function windMph(raw) {
  if(typeof raw!=='string')return null;
  if(/^calm$/i.test(raw.trim()))return 0;
  const numbers=[...raw.matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
  if(!numbers.length)return null;
  const value=Math.max(...numbers);
  return /km\/h/i.test(raw)?Math.round(value*0.621371):Math.round(value);
}
export function weatherFit(temp,wind,pop,phrase='') {
  if(!Number.isFinite(temp)||!Number.isFinite(wind)||!Number.isFinite(pop))
    return {score:null,label:'Forecast incomplete',tone:'unknown',reasons:['Temperature, wind or precipitation information is missing.']};
  const reasons=[];
  if(temp<40)return {score:0,label:'Avoid for survey-style listening',tone:'poor',reasons:['Below the 40°F USFWS minimum for reliable singing-ground surveys.']};
  let score=temp>=50?95:temp>=45?83:68;
  reasons.push(temp>=50?'Mild evening':temp>=45?'Cool but above 40°F':'Near the 40°F minimum');
  if(wind>=19){score-=48;reasons.push('Strong wind makes listening difficult');}
  else if(wind>=13){score-=26;reasons.push('Breezy; calls may be hard to hear');}
  else if(wind>=8){score-=12;reasons.push('Some breeze');}
  else reasons.push('Light wind');
  if(/thunder|heavy rain|snow/i.test(phrase)){score-=53;reasons.push('Storm or heavy precipitation forecast');}
  else if(pop>=70){score-=40;reasons.push('Precipitation likely');}
  else if(pop>=40){score-=19;reasons.push('Showers possible');}
  else reasons.push('Lower precipitation chance');
  score=Math.min(100,Math.max(0,score));
  return {score,label:score>=75?'Promising listening weather':score>=45?'Mixed conditions':'Poor listening weather',tone:score>=75?'good':score>=45?'mixed':'poor',reasons};
}
export function nightFor(region,date,periods,cloudValues,now) {
  const season=windowFor(region,date),sunset=sunsetUtc(date,region.lat,region.lon);
  if(!sunset)return {date,season,score:null,label:'Sunset unavailable',tone:'unknown'};
  const provisional=new Date(sunset.getTime()+22*60000);
  const clouds=findCloudCover(cloudValues,provisional);
  const offset=clouds!=null&&clouds>75?15:22;
  const listen=new Date(sunset.getTime()+offset*60000),end=new Date(listen.getTime()+40*60000);
  const base={date,season,sunset:sunset.toISOString(),start:listen.toISOString(),end:end.toISOString(),sunsetLabel:timeLocal(sunset),startLabel:timeLocal(listen),endLabel:timeLocal(end),clouds,cloudRule:clouds==null?'22-minute default (sky-cover data unavailable)':clouds>75?'15 minutes (more than 75% overcast)':'22 minutes (75% or less overcast)',passed:end.getTime()<now.getTime()};
  if(!season.inSeason)return {...base,score:null,label:'Outside planning season',tone:'off',reasons:['Seasonal timing only; weather cannot establish birds are displaying.']};
  const p=periodAt(periods,listen);
  if(!p)return {...base,score:null,label:'Forecast unavailable',tone:'unknown',reasons:['No NWS hourly forecast for the listening window.']};
  const temp=Number.isFinite(p.temperature)?Math.round(p.temperature):null,wind=windMph(p.windSpeed);
  const pop=Number.isFinite(p.probabilityOfPrecipitation?.value)?Math.round(p.probabilityOfPrecipitation.value):null;
  return {...base,temp,wind,pop,description:p.shortForecast||'',...weatherFit(temp,wind,pop,p.shortForecast||'')};
}
export function regionalResult(region,now,periods=[],cloudValues=[],forecastUpdated=null) {
  const dates=upcomingDates(now),nights=dates.map(date=>nightFor(region,date,periods,cloudValues,now));
  const remaining=nights.filter(n=>!n.passed&&Number.isFinite(n.score)).sort((a,b)=>b.score-a.score);
  const inSeason=windowFor(region,dates[0]).inSeason;
  return {...region,season:windowFor(region,dates[0]),spring:nextSpring(region,now),nights,best:remaining[0]||null,forecastUpdated,weatherAvailable:Boolean(periods?.length),status:inSeason?'Seasonal watch':'Off season'};
}
