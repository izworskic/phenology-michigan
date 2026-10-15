// Michigan Ruby-throated Hummingbird arrival planning.
// Regional dates are editorial climatological WATCH WINDOWS, not first-arrival observations.
// May arrive significantly earlier/later; Journey North 2026 documented April exceptions.
export const REGIONS=[
  {id:'detroit',name:'Detroit & Ann Arbor',area:'Southeast Michigan',lat:42.33,lon:-83.05,early:'04-20',late:'05-15'},
  {id:'kalamazoo',name:'Kalamazoo & Southwest',area:'Southwest Michigan',lat:42.29,lon:-85.59,early:'04-21',late:'05-16'},
  {id:'grand-rapids',name:'Grand Rapids & West Michigan',area:'West Michigan',lat:42.96,lon:-85.67,early:'04-23',late:'05-17'},
  {id:'lansing',name:'Lansing & Mid-Michigan',area:'Central Lower Michigan',lat:42.73,lon:-84.55,early:'04-24',late:'05-17'},
  {id:'saginaw-bay',name:'Saginaw Bay & Bay City',area:'Eastern Lower Michigan',lat:43.60,lon:-83.89,early:'04-27',late:'05-20'},
  {id:'traverse-city',name:'Traverse City',area:'Northwest Lower Michigan',lat:44.76,lon:-85.62,early:'04-29',late:'05-23'},
  {id:'gaylord',name:'Gaylord & Northern Lower',area:'Northern Lower Michigan',lat:45.03,lon:-84.67,early:'05-01',late:'05-25'},
  {id:'marquette',name:'Marquette & Central U.P.',area:'Central Upper Peninsula',lat:46.54,lon:-87.40,early:'05-02',late:'05-29'},
  {id:'houghton',name:'Keweenaw & Western U.P.',area:'Western Upper Peninsula',lat:47.12,lon:-88.57,early:'05-03',late:'05-31'}
];
const DAY=86400000;
export const TZ='America/Detroit';
export const getDateKey=(when=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(when).replace(/\//g,'-');
export function doy(key){const [y,m,d]=key.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/DAY)+1;}
export function monthDay(iso){return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(iso+'T12:00:00Z'));}
export function datesFor(region,year){return {start:year+'-'+region.early,end:year+'-'+region.late,feeder:new Date(Date.parse(year+'-'+region.early+'T12:00:00Z')-10*DAY).toISOString().slice(0,10)};}
export function seasonState(region, now=new Date()){
 const key=getDateKey(now), year=Number(key.slice(0,4)), yearWindow=datesFor(region,year);
 const window=key>'2026-06-30'.replace('2026',String(year))?datesFor(region,year+1):yearWindow;
 const left=Math.round((Date.parse(window.start+'T12:00:00Z')-Date.parse(key+'T12:00:00Z'))/DAY);
 const phase=key>yearWindow.end&&key<=year+'-06-30'?'arrival_window_passed':key>year+'-06-30'?'off_season':left>28?'planning':left>10?'getting_close':left>0?'feeder_time':key<=window.end?'arrival_window':'arrival_window_passed';
 return {phase,window,daysUntilWindow:left,year:yearWindow.start.slice(0,4),isSpring:key>=year+'-03-01'&&key<=year+'-06-15',today:key};
}
export function normalizeObservation(obs,now=new Date()){
 if(!obs||obs.quality_grade!=='research'||!/^\d{4}-\d{2}-\d{2}$/.test(obs.observed_on||''))return null;
 const date=obs.observed_on,year=Number(getDateKey(now).slice(0,4));
 if(!date.startsWith(String(year)+'-')||date<year+'-03-01'||date>getDateKey(now))return null;
 const lat=Number(obs.geojson?.coordinates?.[1]??obs.location?.split(',')[0]);
 const lon=Number(obs.geojson?.coordinates?.[0]??obs.location?.split(',')[1]);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41.6||lat>48.4||lon< -91||lon> -81.5)return null;
 const d=REGIONS.map(r=>({r,km:distance(lat,lon,r.lat,r.lon)})).sort((a,b)=>a.km-b.km)[0];
 if(!d||d.km>120)return null;
 return {regionId:d.r.id,date,url:'https://www.inaturalist.org/observations/'+Number(obs.id),id:Number(obs.id)};
}
function distance(a,b,c,d){const rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad;
 const q=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(q)));}
export function groupSightings(observations,now=new Date()){
 const groups=Object.fromEntries(REGIONS.map(r=>[r.id,[]]));
 const seen=new Set();
 for(const raw of observations||[]){const o=normalizeObservation(raw,now);if(o&&!seen.has(o.id)){seen.add(o.id);groups[o.regionId].push(o);}}
 return Object.fromEntries(REGIONS.map(r=>[r.id,groups[r.id].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)]));
}
export function weatherSignal(periods,now=new Date()){
 const today=getDateKey(now);
 const forecast=(periods||[]).filter(p=>p.isDaytime&&p.startTime&&getDateKey(new Date(p.startTime))>=today).slice(0,7);
 const days=forecast.map(p=>{
   const temp=Number.isFinite(p.temperature)?p.temperature:null;
   const wind=p.windDirection||'';
   const fromSouth=/^(S|SSE|SSW|SE|SW)$/.test(wind);
   const mph=Number.parseInt(p.windSpeed,10);
   const mild=temp!==null&&temp>=55;
   return {date:getDateKey(new Date(p.startTime)),highF:temp,windFrom:wind,windMph:Number.isFinite(mph)?mph:null,mild,fromSouth,favorable:mild&&fromSouth&&(Number.isFinite(mph)?mph<=20:false)};
 });
 return {days,favorableDays:days.filter(d=>d.favorable).length,checked:days.length};
}
export function readout(region,now=new Date(),weather=null,sightings=[]){
 const season=seasonState(region,now);
 if(season.phase==='off_season')return {label:'Spring migration complete',tone:'off',message:'Next spring arrival watch begins in '+season.window.start.slice(0,4)+'. No current October arrival prediction.'};
 if(!season.isSpring)return {label:'Winter planning',tone:'off',message:'Typical spring dates are shown; fresh migration forecasts start in March.'};
 const recent=sightings.filter(s=>Math.abs((Date.parse(season.today+'T12:00:00Z')-Date.parse(s.date+'T12:00:00Z'))/DAY)<=14);
 if(recent.length)return {label:'Sightings reported nearby',tone:'seen',message:'Research-grade iNaturalist records observed within the past 14 days in this representative region. Not a complete migration census.'};
 if(season.phase==='arrival_window_passed')return {label:'Typical arrival window passed',tone:'after',message:'No recent research-grade record in the current sampled sightings feed. This is not evidence of absence.'};
 if(season.daysUntilWindow>28)return {label:'Preparing for spring',tone:'off',message:'Watch dates are calendar estimates. Migration has not been confirmed locally by this feed.'};
 if(weather?.favorableDays>0)return {label:'Migration weather watch',tone:'watch',message:weather.favorableDays+' of the next '+weather.checked+' forecast days combine mild temperatures and southerly winds. This is an exploratory weather cue, not a bird-arrival probability.'};
 return {label:season.daysUntilWindow>10?'Season getting closer':season.daysUntilWindow>0?'Feeder time':'Within typical arrival window',tone:'ready',message:'Historical window only. An absence of public sightings does not establish that hummingbirds are absent.'};
}
