/**
 * Depth engine for Foundry's first real evidence-rich experience.
 * A public DNR weekly survey is a dated MANAGEMENT-AREA count, never a
 * real-time sighting, site-specific viewing guarantee, or ice predictor.
 */
const isoDay = value => typeof value==="string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+"T12:00:00Z")) ? value : null;
const dayNumber = value => Date.parse(value+"T12:00:00Z");
const daysApart = (today,prior) => (dayNumber(today)-dayNumber(prior))/86400000;
const validCount = n => Number.isSafeInteger(n)&&n>=0&&n<=10000000;
const validLow = n => typeof n==="number"&&Number.isFinite(n)&&n>=-70&&n<=130;
export const WATERFOWL_KINDS = Object.freeze([{id:"ducks",name:"Ducks"},{id:"geese",name:"Geese"},{id:"swans",name:"Swans"}]);
export function waterfowlSeason(today) {
  const y=Number(today?.slice(0,4)),m=Number(today?.slice(5,7));
  if(!isoDay(today))return null;
  const start = m>=9?y:y-1;
  return {start:start+"-09-01",end:(start+1)+"-08-31",label:start+"–"+String(start+1).slice(2)};
}
function datedRows(rows,today,season){
  if(!Array.isArray(rows))return [];
  const seen=new Set();
  return rows.filter(([date,n])=>{
    const valid=isoDay(date)&&date>=season.start&&date<=season.end&&date<=today&&validCount(n)&&!seen.has(date);
    if(valid)seen.add(date);
    return valid;
  }).sort((a,b)=>a[0].localeCompare(b[0])).slice(-16).map(([date,count])=>({date,count}));
}
export function buildWaterfowlRead(bank,today){
  const season=waterfowlSeason(today);
  if(!season||bank?.schemaVersion!==1)return {season:season?.label||"Unknown",areas:{},available:false};
  const areas={};
  for(const id of ["nayanquing","fish-point"]){
    const entry=bank.areas?.[id]||{};
    const source=typeof entry.source==="string"&&/^https:\/\/www\.michigan\.gov\//.test(entry.source)?entry.source:null;
    const counts={};
    for(const type of WATERFOWL_KINDS){
      const series=datedRows(entry[type.id],today,season);
      const latest=series.at(-1)||null,prior=series.length>1?series.at(-2):null;
      const age=latest?daysApart(today,latest.date):null;
      counts[type.id]={
        series,latest,previous:prior,
        delta:latest&&prior&&daysApart(latest.date,prior.date)<=21?latest.count-prior.count:null,
        ageDays:age,status:!latest?"not-published":age<=14?"recent-survey":age<=45?"older-survey":"archive-only"
      };
    }
    const sp=entry.species;
    const eligible=sp&&isoDay(sp.date)&&sp.date>=season.start&&sp.date<=today &&
      ["ducks","swans","geese"].includes(sp.kind) && counts[sp.kind].series.some(r=>r.date===sp.date);
    const species=eligible?Object.entries(sp.counts||{}).filter(([name,count])=>name.length>=3&&name.length<=60&&validCount(count)&&count>0)
      .sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count})):[];
    areas[id]={id,name:id==="nayanquing"?"Nayanquing Point":"Fish Point",source,
      counts,species:species.length?{date:sp.date,kind:sp.kind,items:species}:null};
  }
  return {season:season.label,areas,available:Object.values(areas).some(a=>Object.values(a.counts).some(x=>x.latest))};
}
const dayPlus=(today,n)=>{
  const date=new Date(dayNumber(today)+n*86400000);
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null;
};
export function buildColdWeek(forecast={},today){
  if(!isoDay(today))return {days:[],below32:0,below25:0,summary:"Forecast unavailable"};
  const lows=Array.isArray(forecast.lows)?forecast.lows.slice(0,7):[];
  const days=Array.from({length:7},(_,i)=>({date:dayPlus(today,i),low:validLow(lows[i])?Math.round(lows[i]):null}));
  const available=days.filter(d=>d.low!==null);
  const below32=available.filter(d=>d.low<=32).length;
  const below25=available.filter(d=>d.low<=25).length;
  const wind=validLow(forecast.windSpeedMph)&&forecast.windSpeedMph>=0?Math.round(forecast.windSpeedMph):null;
  const sunrise=/^\d{2}:\d{2}$/.test(forecast.sunrise||"")?forecast.sunrise:null;
  const sunset=/^\d{2}:\d{2}$/.test(forecast.sunset||"")?forecast.sunset:null;
  const daylight=typeof forecast.daylightH==="number"&&forecast.daylightH>=0&&forecast.daylightH<=24?
    Math.round(forecast.daylightH*10)/10:null;
  return {days,below32,below25,availableDays:available.length,windMph:wind,sunrise,sunset,daylightH:daylight,
    summary:available.length?below32+" of "+available.length+" modeled nights at or below 32°F around Bay City. This is not a forecast of shore ice.":
      "No valid daily low forecast supplied; freezing conditions cannot be inferred."};
}
export function makeFieldBrief({waterfowl,weather,today}){
  const n=waterfowl?.areas?.nayanquing?.counts?.ducks;
  const f=waterfowl?.areas?.["fish-point"]?.counts?.ducks;
  const withValues=[["Nayanquing Point",n],["Fish Point",f]].filter(([,x])=>x?.latest);
  const best=withValues.sort((a,b)=>a[1].ageDays-b[1].ageDays)[0];
  const headline=best&&best[1].ageDays<=14?
    "The latest DNR duck survey is from "+best[0]+" ("+best[1].latest.date+").":
    "No recent DNR duck survey in this season's bank.";
  const interpretation=best&&best[1].ageDays<=14?
    "DNR counted "+best[1].latest.count.toLocaleString("en-US")+" ducks across its managed area; this does not predict the birds at any single observation point.":
    "Use the latest dated survey as history only and check agency updates before planning a wildlife stop.";
  return {headline,interpretation,weatherSummary:weather.summary,asOf:today};
}
