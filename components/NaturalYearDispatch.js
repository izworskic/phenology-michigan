import { useState } from "react";
import dynamic from "next/dynamic";
const MichiganPhenophaseMap = dynamic(() => import("./MichiganPhenophaseMap"), {ssr:false});
import { Leaf, Flower2, Bird, Waves, CloudSun, MapPin, ArrowRight, CalendarDays, Microscope, ExternalLink, Compass, Clock3, Binoculars } from "lucide-react";

const ICONS = {plants: Flower2, birds: Bird, wildlife: Binoculars, weather: CloudSun, water: Waves};
const LABEL = {plants:"Plants",birds:"Birds",wildlife:"Wildlife",weather:"Weather",water:"Water"};
const labelDate = s => {
  if (!s) return "Date unavailable";
  return new Date(s+"T12:00:00Z").toLocaleDateString("en-US",{timeZone:"UTC",month:"short",day:"numeric"});
};
const springDate = mmdd => mmdd ? labelDate("2027-"+mmdd) : "Not supported";
const dayFromSpring = mmdd => mmdd ? Math.floor((Date.parse("2027-"+mmdd+"T12:00:00Z")-Date.parse("2027-01-01T12:00:00Z"))/86400000)+1 : null;
const percent = mmdd => Math.max(0,Math.min(100,100*(dayFromSpring(mmdd)-90)/92));
const nextMonth = day => new Date(Date.UTC(2027,0,day)).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
const plainAnchor = href => href.startsWith("#") || href.startsWith("/");
const DETAIL = {
  now: {title:"The field desk for this part of the year",description:"Recent reports and the specialist tools whose usual seasons overlap this date."},
  next: {title:"The next chapters of the natural year",description:"These are broad calendar windows, not a countdown to a verified emergence or migration."},
  regions: {title:"How differently spring is reported",description:"Two independent biological clocks, shown as historical public-reporting windows by region."},
  map: {title:"Reported phenophases around Michigan",description:"Regional evidence from existing public observation networks, gathered automatically without requesting visitor submissions."},
};

function WatchLink({row, next=false}) {
  const Icon=ICONS[row.category]||Leaf;
  return <article className="ny-watch">
    <div className="ny-watch-top">
      <span className="ny-watch-icon"><Icon size={18}/></span>
      <div className="ny-watch-copy">
        <span className="ny-watch-category">{LABEL[row.category]||"Nature"} · {next ? "Next typical window" : "Usual seasonal window"}</span>
        <h4>{row.title}</h4>
      </div>
      {next && <span className="ny-watch-start">{nextMonth(row.windowStartDoy)}</span>}
    </div>
    <p>{row.what}</p>
    <a href={row.url} className="ny-watch-link">{row.linkLabel} <ArrowRight size={15}/></a>
    <details className="ny-watch-caution">
      <summary>What this does not confirm</summary>
      <p>{row.caution} <span>Reference: {row.scope}.</span></p>
    </details>
  </article>;
}

function Report({entry}) {
  const Icon=ICONS[entry.category]||Leaf;
  return <div className="ny-report">
    <div className="ny-report-icon"><Icon size={19}/></div>
    <div className="ny-report-body">
      <div className="ny-report-name">{entry.name}</div>
      <div className="ny-report-phase">{entry.phase}</div>
    </div>
    <time dateTime={entry.date} className="ny-report-date">{labelDate(entry.date)}</time>
  </div>;
}

function HistoricalBand({name, entry, note, href}) {
  return <article className="ny-history-row">
    <div className="ny-history-head"><div><h4>{name}</h4><p>{note}</p></div><a href={href}>Deep study <ArrowRight size={14}/></a></div>
    {entry ? <>
      <div className="ny-range-wrap" aria-label={`Historical reporting window ${springDate(entry.start)} to ${springDate(entry.end)}, reporting center ${springDate(entry.center)}`}>
        <div className="ny-range-rail">
          <span className="ny-range-window" style={{left:percent(entry.start)+"%",width:Math.max(1,percent(entry.end)-percent(entry.start))+"%"}}/>
          <span className="ny-range-center" style={{left:percent(entry.center)+"%"}}/>
        </div>
        <div className="ny-range-dates"><span>Apr 1</span><span>May 1</span><span>Jun 1</span></div>
      </div>
      <p className="ny-history-explain"><strong>{springDate(entry.start)} – {springDate(entry.end)}</strong>, historical reporting center near {springDate(entry.center)} · {entry.years} qualifying years. These are not locally confirmed first events.</p>
    </> : <p className="ny-history-unavailable">Not enough independently supported reporting history for this region. No date is inferred.</p>}
  </article>;
}

export default function NaturalYearDispatch({read,geography}) {
  const [view,setView]=useState("now");
  const [region,setRegion]=useState("saginaw-bay");
  if (!read) return <section className="ny-dispatch ny-fallback" aria-label="Natural year guide">
    <div className="ny-upper"><span className="ny-eyebrow">The field dispatch</span><h2>Explore the living natural year</h2>
      <p>Recent report synthesis is temporarily unavailable. The specialist trackers remain accessible; none of these links confirms an event today.</p>
    </div>
    <nav className="ny-fallback-links" aria-label="Specialist phenology tools">
      <a href="/michigan-trillium">Trillium</a><a href="/hummingbird-tracker">Hummingbirds</a><a href="/frog-chorus">Frog chorus</a><a href="/firefly-tracker">Fireflies</a>
    </nav>
  </section>;
  const chosen=read.historicalRegions.find(r=>r.id===region)||read.historicalRegions[0];
  const current=read.active.slice(0,4);
  const future=read.upcoming.slice(0,5);
  const recent=read.reports.slice(0,4);
  return <section className="ny-dispatch" id="living-season" aria-labelledby="ny-dispatch-heading">
    <div className="ny-upper">
      <div className="ny-heading">
        <span className="ny-eyebrow"><Compass size={16}/> Natural-year dispatch / Michigan</span>
        <h2 id="ny-dispatch-heading">Follow the season as it changes.</h2>
        <p>A dated observer's notebook, the next natural events to watch, and a path into the deeper scientific trackers already on this site.</p>
      </div>
      <div className="ny-dateline">
        <span className="ny-dateline-label"><CalendarDays size={14}/> Analysis through</span>
        <strong>{labelDate(read.asOfDate)}</strong>
        <small>Reports are Michigan-wide, not Bay City confirmations</small>
      </div>
    </div>
    <div className="ny-control" role="group" aria-label="Choose the natural-year lens">
      {[["now","Right now"],["map","Across Michigan"],["next","Next on the calendar"],["regions","Compare regions"]].map(([id,label])=>
        <button key={id} type="button" className={view===id?"is-active":""} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}
    </div>
    <div className="ny-inner">
      <div className="ny-view-heading"><h3>{DETAIL[view].title}</h3><p>{DETAIL[view].description}</p></div>
      {view==="map" && <MichiganPhenophaseMap data={geography} />}
      {view==="now" && <div className="ny-columns">
        <article className="ny-notebook">
          <div className="ny-section-title"><Leaf size={19}/><h4>What observers actually reported</h4></div>
          <p className="ny-scope">USA-NPN Nature's Notebook · Michigan statewide query · recent dated phenophases</p>
          {recent.length ? <>
            <div className="ny-reports">{recent.map((o,i)=><Report entry={o} key={o.name+o.phase+o.date+i}/>)}</div>
            {read.reports.length>4 && <details className="ny-more"><summary>Two more statewide reports</summary>{read.reports.slice(4).map((o,i)=><Report entry={o} key={o.name+o.date+i}/>)}</details>}
          </> : <p className="ny-empty">{read.reportsState==="archive-only" ? "The observation feed is older than our freshness limit. No reports are presented as current." : "No recent statewide phenophase reports passed the date and quality checks. That is not evidence of species absence."}</p>}
          <div className="ny-notebook-footer">
            <a href="https://www.usanpn.org/data" target="_blank" rel="noreferrer">Explore the source network <ExternalLink size={12}/></a>
            <small>Reports do not prove migration, regional abundance, or presence in your town.</small>
          </div>
        </article>
        <div className="ny-watches"><div className="ny-section-title"><Clock3 size={19}/><h4>What deserves a closer look</h4></div>
          <p className="ny-scope">Usual calendar windows. Open the specialist for condition-specific evidence.</p>
          {current.length?current.map(w=><WatchLink row={w} key={w.id}/>):<p className="ny-empty">No featured specialist window overlaps this date. Explore the full annual calendar below.</p>}
        </div>
      </div>}
      {view==="next" && <div className="ny-next-grid">
        {future.length?future.map(w=><WatchLink row={w} key={w.id} next/>):<p className="ny-empty">Upcoming seasonal windows are unavailable. The ordinary annual calendar remains below.</p>}
        <div className="ny-next-note"><CalendarDays size={19}/><p>The listed dates are rough annual entry points. A spring frost, an unusually warm week, or changing conditions may shift actual events. Check each specialist tracker rather than using these dates as a forecast.</p></div>
      </div>}
      {view==="regions" && <div className="ny-regional">
        <div className="ny-region-picker"><MapPin size={18}/><label htmlFor="ny-regions">Historical report region</label>
          <select id="ny-regions" value={chosen.id} onChange={e=>setRegion(e.target.value)}>
            {read.historicalRegions.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}
          </select>
        </div>
        <p className="ny-region-scope">{chosen.scopeNote}. These two reporting histories are not interchangeable with the Saginaw Bay weather readings above.</p>
        <div className="ny-history-grid">
          <HistoricalBand name="Large-flowered trillium" entry={chosen.trillium} note={"Flowering-annotated public reports · "+chosen.trilliumSampleRegion} href="/michigan-trillium"/>
          <HistoricalBand name="Ruby-throated hummingbird" entry={chosen.hummingbird} note={"First public spring reports"+(chosen.birdSampleRegion?" · "+chosen.birdSampleRegion:"")} href="/hummingbird-tracker"/>
        </div>
        <div className="ny-region-fine"><Microscope size={17}/><div>These windows come from the independently tested historical species archives, not a local first-flower or first-bird prediction. Where history is insufficient, the date is withheld.<p><a href="/michigan-trillium#tri-site-science">Help build real first-flower records at monitored preserves <ArrowRight size={13}/></a></p></div></div>
      </div>}
      <details className="ny-method">
        <summary>How this dispatch distinguishes evidence</summary>
        <p><strong>Reported:</strong> a dated phenophase submitted somewhere in Michigan, not a Bay City sighting. <strong>Window:</strong> a broad seasonal calendar period, not an observation. <strong>Historical:</strong> the central weeks of prior public reports; not a prediction for an individual preserve or feeder.</p>
        <p>Each specialist tracker retains responsibility for its own current weather, source freshness, and independently checked visitor decision. This overview never averages unrelated species into one early/late clock.</p>
      </details>
    </div>
  </section>;
}
