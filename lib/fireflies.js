// Firefly tracker: conservative decision support, not an observed emergence model.
// Source: Hermann et al. (2016), doi:10.1098/rsos.160712 (southern Michigan Photinus).
// The ~800 GDD10C measurement described adult FLIGHT PEAK, not first emergence.
// Night suitability thresholds are editorial heuristics, not biologically calibrated cutoffs.
export const REGIONS = [
  {id:'detroit',name:'Detroit & Ann Arbor',place:'Southeast Michigan',lat:42.33,lon:-83.05,sid:'KDTW',shift:-5},
  {id:'kalamazoo',name:'Kalamazoo',place:'Southwest Michigan',lat:42.29,lon:-85.59,sid:'KAZO',shift:-4},
  {id:'grand-rapids',name:'Grand Rapids',place:'West Michigan',lat:42.96,lon:-85.67,sid:'KGRR',shift:-2},
  {id:'lansing',name:'Lansing',place:'Mid-Michigan',lat:42.73,lon:-84.55,sid:'KLAN',shift:0},
  {id:'saginaw-bay',name:'Saginaw Bay / Bay City',place:'Eastern Lower Peninsula',lat:43.60,lon:-83.89,sid:'KMBS',shift:2},
  {id:'traverse-city',name:'Traverse City',place:'Northwest Lower Peninsula',lat:44.76,lon:-85.62,sid:'KTVC',shift:6},
  {id:'gaylord',name:'Gaylord',place:'Northern Lower Peninsula',lat:45.03,lon:-84.67,sid:'KGLR',shift:8},
  {id:'marquette',name:'Marquette',place:'Central Upper Peninsula',lat:46.54,lon:-87.40,sid:'KSAW',shift:12},
  {id:'houghton',name:'Houghton / Keweenaw',place:'Western Upper Peninsula',lat:47.12,lon:-88.57,sid:'KCMX',shift:15}
];
const TZ='America/Detroit';
const DAY=86400000;
export function localParts(date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'})
    .formatToParts(date).filter(p=>['year','month','day','hour'].includes(p.type)).map(p=>[p.type,Number(p.value)]));
}
export function dateKey(date) {
  const p=localParts(date);
  return p.year+'-'+String(p.month).padStart(2,'0')+'-'+String(p.day).padStart(2,'0');
}
export function dayOfYear(key) {
  const p=key.split('-').map(Number);
  return Math.round((Date.UTC(p[0],p[1]-1,p[2])-Date.UTC(p[0],0,1))/DAY)+1;
}
export function seasonalWindow(region, now=new Date()) {
  const p=localParts(now), d=dayOfYear(dateKey(now));
  const leap=new Date(Date.UTC(p.year,1,29)).getUTCMonth()===1 ? 1 : 0;
  const offset=region.shift+leap;
  const start=145+offset, peakStart=170+offset, peakEnd=195+offset, end=224+offset;
  const status=d<start?'before':d<=peakEnd?'within':d<=end?'late':'after';
  const label=d<start?'Before typical season':d<peakStart?'Early display window':d<=peakEnd?'Typical peak window':d<=end?'Late display window':'Outside typical season';
  return {status,label,inSeason:d>=start&&d<=end,day:d,window:{start,peakStart,peakEnd,end},year:p.year};
}
export function parseAcisData(data) {
  if (!Array.isArray(data)) return {gddC:null,wetDays:null,precip10:null,validDays:0,days:0};
  let sum=0,valid=0,wet=0,precip=0,precipValid=0;
  for(const row of data){
    const hi=Number(row[1]),lo=Number(row[2]);
    if(row[1]!=='M' && row[2]!=='M' && Number.isFinite(hi) && Number.isFinite(lo)){
      sum+=Math.max(0,((hi+lo)/2-50)*5/9);valid++;
    }
  }
  for(const row of data.slice(-10)){
    const raw=row[3];
    if(raw==='T'){precipValid++;continue;}
    const value=Number(raw);
    if(raw!=='M' && raw!=null && raw!=='' && Number.isFinite(value)){
      precip+=value;precipValid++;if(value>=0.05)wet++;
    }
  }
  // Never imply a trustworthy annual degree-day total when major daily gaps exist.
  const complete=data.length>25 && valid/data.length>=0.95;
  return {gddC:complete?Math.round(sum):null,validDays:valid,days:data.length,precip10:precipValid>=7?+precip.toFixed(2):null,wetDays:precipValid>=7?wet:null};
}
export function development(gddC){
  if(!Number.isFinite(gddC)) return {text:'Temperature history unavailable',detail:'No defensible heat-accumulation reading. Calendar only.',pct:null};
  const pct=Math.max(0,Math.min(100,Math.round(gddC/800*100)));
  return {text:gddC<620?'Below the historical peak band':gddC<=980?'Within the broad peak reference band':'Past the historical peak reference',
    detail:'Research reference is ~800 °C degree-days above 10 °C for adult flight peaks of Photinus in southern Michigan; variation of ~180, not a first-flash threshold.',pct};
}
export function summarizeNight(hours){
  if(!hours.length)return null;
  const valid=hours.filter(x=>typeof x.temperature==='number'&&Number.isFinite(x.temperature));
  if(!valid.length)return null;
  const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
  const temp=Math.round(avg(valid.map(x=>x.temperature)));
  const windValues=hours.map(h=>Number.parseFloat(h.windSpeed)).filter(Number.isFinite);
  const wind=windValues.length?Math.round(avg(windValues)):null;
  const popValues=hours.map(h=>h.probabilityOfPrecipitation?.value).filter(Number.isFinite);
  const pop=popValues.length?Math.round(Math.max(...popValues)):null;
  const humidities=hours.map(h=>h.relativeHumidity?.value).filter(Number.isFinite);
  const humidity=humidities.length?Math.round(avg(humidities)):null;
  // A missing rain/wind value must never be treated as rain-free or calm.
  if(wind===null||pop===null)return {temp,wind,pop,humidity,score:null,label:'Incomplete forecast',reason:'Wind or precipitation forecast is missing.'};
  const factors=[];
  let score=100;
  if(temp<55){score-=75;factors.push('Too cool for much flashing');}
  else if(temp<62){score-=45;factors.push('Cool evening');}
  else if(temp<67){score-=20;factors.push('Mild evening');}
  else factors.push('Warm evening');
  if(wind>=16){score-=35;factors.push('Windy');} else if(wind>=10){score-=15;factors.push('Breezy');} else factors.push('Light wind');
  if(pop>=70){score-=50;factors.push('Rain likely');} else if(pop>=40){score-=25;factors.push('Possible showers');} else factors.push('Lower shower chance');
  const level=Math.max(0,Math.min(100,score));
  return {temp,wind,pop,humidity,score:level,label:level>=75?'Favorable':level>=45?'Mixed':'Unfavorable',reason:factors.join(' · ')};
}
export function summarizeForecast(periods,now=new Date()){
  const start=dateKey(now);
  const grouped={};
  for(const h of periods||[]){
    if(!h.startTime)continue;
    const dt=new Date(h.startTime),p=localParts(dt),key=dateKey(dt);
    // 8pm–11pm Michigan local time: practical early-evening viewing approximation.
    if(p.hour<20||p.hour>23||key<start)continue;
    (grouped[key]??=[]).push(h);
  }
  return Object.keys(grouped).sort().slice(0,7).map(date=>({date,...summarizeNight(grouped[date])})).filter(x=>x.score!==undefined);
}
export function viewingLabel(region,night,now=new Date()){
  const season=seasonalWindow(region,now);
  if(!season.inSeason)return {title:'Outside typical season',context:'This is a seasonal window, not a report of active flashing.',tone:'off'};
  if(!night||night.score==null)return {title:'Forecast unavailable',context:'Cannot assess this evening without complete weather data.',tone:'unknown'};
  return {title:night.label+' viewing weather',context:'Weather suitability only. Firefly emergence and sightings are unconfirmed.',tone:night.score>=75?'good':night.score>=45?'mixed':'poor'};
}
