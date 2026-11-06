import {useState} from "react";
import {WATERFOWL_KINDS} from "../lib/first-freeze-depth.mjs";

const fmt=n=>Number.isFinite(n)?n.toLocaleString("en-US"):"–";
const showDate=d=>d?new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(d+"T12:00:00Z")):"Unknown";
function Trend({series}){
 if(series.length<2)return <p className="ffp-muted">Insufficient dated survey points for a seasonal trend.</p>;
 const max=Math.max(1,...series.map(x=>x.count));
 const coords=series.map((r,i)=>[18+i*664/(series.length-1),155-125*(r.count/max)]);
 const line=coords.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
 const fill=line+" L"+coords.at(-1)[0].toFixed(1)+",161 L18,161 Z";
 return <div className="ffp-trend">
  <svg viewBox="0 0 700 190" role="img" aria-label="Dated DNR management-area survey trend shown below in an accessible table">
   <line x1="18" y1="162" x2="682" y2="162" stroke="#698986" strokeWidth="1"/>
   <line x1="18" y1="100" x2="682" y2="100" stroke="#3b5a5c" strokeDasharray="4 5"/>
   <path d={fill} fill="#5f9887" fillOpacity=".20"/>
   <path d={line} fill="none" stroke="#efd6a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
   {coords.map(([x,y],i)=><circle key={series[i].date} cx={x} cy={y} r={i===coords.length-1?6:3.5}
     fill={i===coords.length-1?"#f1d18f":"#98b8aa"} stroke="#153742" strokeWidth="1.5"><title>{showDate(series[i].date)}: {fmt(series[i].count)} counted</title></circle>)}
   <text x="18" y="182" fill="#c6d7d4" fontSize="14">{showDate(series[0].date)}</text>
   <text x="682" y="182" fill="#c6d7d4" fontSize="14" textAnchor="end">{showDate(series.at(-1).date)}</text>
  </svg>
 </div>;
}
function SurveyDetail({area,kind}){
 const measure=area?.counts?.[kind]||{series:[],latest:null,status:"not-published"};
 const latest=measure.latest;
 const isRecent=measure.status==="recent-survey";
 return <div className="ffp-survey-content" aria-live="polite">
   <div className="ffp-survey-head">
     <div className="ffp-latest">
      <p className="ffp-kicker">{latest?"Michigan DNR · weekly field count":"No current-season record"}</p>
      <div className="ffp-num">{latest?fmt(latest.count):"No count"}</div>
      <p className="ffp-survey-caption">{latest?WATERFOWL_KINDS.find(x=>x.id===kind)?.name:"Count not yet published"} · {latest?showDate(latest.date):"–"} · {latest?measure.ageDays+" days ago":"No dated survey"}</p>
     </div>
     <div className={"ffp-source-state ffp-source-"+measure.status}>
      <strong>{measure.status==="recent-survey"?"Recent area survey":measure.status==="older-survey"?"Older survey":measure.status==="archive-only"?"Historical survey":"Unavailable"}</strong>
      <p>These are counts within a managed wildlife area. They are not live locations, single-spot sightings, a population census or predictions for a visit.</p>
     </div>
   </div>
   {measure.delta!==null&&isRecent&&
    <p className="ffp-delta">{measure.delta>0?"+":""}{fmt(measure.delta)} compared with the previous {kind} count on {showDate(measure.previous.date)}. Weekly counts vary with weather, management and survey conditions; this is not a migration-rate estimate.</p>}
   <Trend series={measure.series}/>
   <details className="ffp-count-table">
     <summary>View all {kind} counts and dates ({measure.series.length})</summary>
     <div className="ffp-table-wrap">
      <table><thead><tr><th scope="col">Week ending</th><th scope="col">DNR count</th></tr></thead>
       <tbody>{measure.series.map(r=><tr key={r.date}><th scope="row">{r.date}</th><td>{fmt(r.count)}</td></tr>)}</tbody>
      </table>
     </div>
   </details>
   {area?.species&&area.species.kind===kind&&
    <div className="ffp-species">
      <h4>Which species were counted?</h4>
      <p>DNR's {showDate(area.species.date)} {kind} breakdown. Species counts refer to this managed area and survey date.</p>
      <ol>{area.species.items.map(s=><li key={s.name}><span>{s.name}</span><strong>{fmt(s.count)}</strong></li>)}</ol>
    </div>}
   {area?.source&&<a className="ffp-dnr-link" href={area.source} target="_blank" rel="noopener noreferrer">Read the original DNR {area.name} count tables</a>}
 </div>;
}
function ColdClock({weather}){
 if(!weather)return null;
 return <section className="ffp-clock" aria-label="Seven-day weather context">
  <div className="ffp-section-head"><div><p className="ffp-kicker">02 / The cold clock</p><h3>Seven nights ahead at Bay City</h3></div>
   <p>{weather.availableDays?weather.below32+" of "+weather.availableDays+" forecast nights at or below freezing.":"Daily forecasts not available."} This does not predict ice on Saginaw Bay.</p>
  </div>
  <ol className="ffp-week">
   {weather.days.map(d=><li key={d.date} className={d.low!==null&&d.low<=32?"ffp-freezing":""}>
    <time dateTime={d.date}>{showDate(d.date)}</time>
    <strong>{d.low===null?"–":d.low+"°"}</strong>
    <small>{d.low===null?"No reading":d.low<=32?"Freeze-range low":"Above 32°F"}</small>
   </li>)}
  </ol>
  <div className="ffp-weather-notes">
   {weather.sunrise&&weather.sunset&&<p><strong>Light window:</strong> {weather.sunrise} sunrise · {weather.sunset} sunset (Bay City, local time). Plan wildlife viewing within the site operator's permitted hours.</p>}
   {weather.windMph!==null&&<p><strong>Modeled wind now:</strong> ~{weather.windMph} mph at Bay City. Shoreline exposure may differ substantially.</p>}
   <p><a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">Forecast methodology</a> · Cold air is not a lake-ice observation.</p>
  </div>
 </section>;
}
export default function FirstFreezePulse({read,evidence}){
 const [areaId,setAreaId]=useState("nayanquing");
 const [kind,setKind]=useState("ducks");
 if(!read)return null;
 const area=read.waterfowl?.areas?.[areaId];
 const iceAvailable=evidence?.ice?.kind==="recent-reference";
 const surfaceAvailable=evidence?.surface?.kind==="recent-reference";
 return <section className="ffp" aria-labelledby="ffp-title">
  <div className="ffp-title">
    <div><p className="ffp-kicker">01 / The documented migration</p><h3 id="ffp-title">What is actually moving through the marsh?</h3>
      <p>Start with weekly counts collected by Michigan DNR staff, rather than a weather proxy for bird migration. The surveys tell us what was counted in an entire management area on a date, not what is visible from the viewing platform today.</p></div>
    <div className="ffp-season">Field season <strong>{read.waterfowl?.season||"Unknown"}</strong></div>
  </div>
  <div className="ffp-choices">
    <fieldset><legend>Compare wildlife area</legend>
     <button type="button" onClick={()=>setAreaId("nayanquing")} aria-pressed={areaId==="nayanquing"}>Nayanquing Point</button>
     <button type="button" onClick={()=>setAreaId("fish-point")} aria-pressed={areaId==="fish-point"}>Fish Point</button>
    </fieldset>
    <fieldset><legend>Survey category</legend>
     {WATERFOWL_KINDS.map(k=><button key={k.id} type="button" onClick={()=>setKind(k.id)} aria-pressed={kind===k.id}>{k.name}</button>)}
    </fieldset>
  </div>
  <SurveyDetail area={area} kind={kind}/>
  <p className="ffp-comparison-note">Don't add Fish Point and Nayanquing counts together or compare different survey dates as if they were taken simultaneously. Both areas are managed waterfowl habitats with hunting restrictions.</p>
  <ColdClock weather={read.weather}/>
  <details className="ffp-lake-details">
   <summary>What about water temperature and ice?</summary>
   <div className="ffp-lake-body">
    {iceAvailable?<p><strong>Offshore ice grid:</strong> {evidence.ice.text}, dated {evidence.ice.date}. This represents one modeled/analyzed offshore NOAA grid cell, not coverage of the bay or safe ice.</p>:
     <p><strong>Ice:</strong> No recent usable point value is available from the NOAA source in this feed. The seasonal ice product may not yet cover this period; a missing reading is not a measured 0% and says nothing about ice on the marsh.</p>}
    {surfaceAvailable?<p><strong>Offshore surface reference:</strong> {evidence.surface.text}, dated {evidence.surface.date}. Not a shoreline thermometer.</p>:
     <p><strong>Surface temperature:</strong> This offshore NOAA sample is currently missing or too old to use as a present reading. We do not substitute air temperature for water temperature.</p>}
    <p><a href="https://coastwatch.glerl.noaa.gov/satellite-data-products/great-lakes-surface-environmental-analysis-glsea/" target="_blank" rel="noopener noreferrer">Inspect NOAA's daily GLSEA lake analysis</a> and <a href="https://usicecenter.gov/Products/GreatLakesHome" target="_blank" rel="noopener noreferrer">National Ice Center seasonal charts</a>. Neither establishes pedestrian ice safety.</p>
   </div>
  </details>
 </section>;
}
