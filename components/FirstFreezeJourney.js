import {useState} from "react";
import FirstFreezePulse from "./FirstFreezePulse";
import {FIRST_FREEZE_CHAPTERS,FIRST_FREEZE_SITES,firstFreezeSiteAccess} from "../lib/first-freeze.mjs";

export default function FirstFreezeJourney({evidence}) {
  const [chapterId,setChapterId]=useState(evidence?.chapterId||"first-freeze");
  const [siteId,setSiteId]=useState("bay-city");
  if (!evidence) return null;
  const chapter=FIRST_FREEZE_CHAPTERS.find(x=>x.id===chapterId)||FIRST_FREEZE_CHAPTERS[0];
  const site=FIRST_FREEZE_SITES.find(x=>x.id===siteId)||FIRST_FREEZE_SITES[0];
  const access=firstFreezeSiteAccess(site,evidence.asOf);
  const current=evidence.inSeason && chapterId===evidence.chapterId;

  // Only symbolic IDs are sent; no coordinates or visitors' private positions.
  const sendChoice=(dimension,id)=>{
    if(typeof window!=="undefined"&&typeof window.gtag==="function"){
      window.gtag("event","first_freeze_choice",{dimension,selection_id:id,experience_id:"first-freeze"});
    }
  };
  return <section className="ff" id="first-freeze" aria-labelledby="ff-title" data-foundry-pilot="first-freeze">
    <div className="ff-masthead">
      <div className="ff-mast-copy">
        <p className="ff-eyebrow">Saginaw Bay · A living field journey · Foundry pilot 01</p>
        <h2 id="ff-title">The First Freeze</h2>
        <p className="ff-deck">Start with actual DNR waterfowl surveys, explore the coming cold nights, then follow the Saginaw Bay marsh through four changing seasons and four documented viewing places.</p>
        <p className="ff-dateline">Evidence checked for <strong>{evidence.asOf}</strong> · {evidence.inSeason?"Calendar chapter shown for this season.":"Outside the October–April First Freeze season; explore the chapters as a seasonal preview."} No chapter confirms a biological event.</p>
      </div>
      <div className="ff-horizon" aria-hidden="true">
        <div className="ff-moon"/><div className="ff-reeds"><i/><i/><i/><i/><i/></div>
        <div className="ff-horizon-line"/>
        <div className="ff-ripple ff-ripple-one"/><div className="ff-ripple ff-ripple-two"/><div className="ff-ripple ff-ripple-three"/>
        <span className="ff-coordinate">43.9° N · Saginaw Bay</span>
      </div>
    </div>

    <div className="ff-body">
      <FirstFreezePulse read={evidence.pulse} evidence={evidence} />
      <div className="ff-journal-heading">
        <span className="ff-part">02 / Read the landscape</span>
        <h3>Four chapters of the water year</h3>
        <p>Pick a season to change the interpretation. The NOAA, weather and bird observations below keep their actual dates and do not change just because you choose a chapter.</p>
      </div>
      <nav aria-label="Select seasonal chapter" className="ff-chapters">
        {FIRST_FREEZE_CHAPTERS.map((c,i)=><button key={c.id} type="button" className={chapter.id===c.id?"ff-chapter is-selected":"ff-chapter"} aria-pressed={chapter.id===c.id}
          onClick={()=>{setChapterId(c.id);sendChoice("chapter",c.id);}}>
          <span className="ff-number">{String(i+1).padStart(2,"0")}</span>
          <span><strong>{c.name}</strong><small>{c.window}</small></span>
        </button>)}
      </nav>
      <div className="ff-focus">
        <div className="ff-focus-text" aria-live="polite">
          <p className="ff-overline">{current?"Typical calendar chapter, not an observed stage":evidence.inSeason?"Exploring another seasonal chapter":"Off-season seasonal preview"} · {chapter.window}</p>
          <h3>{chapter.heading}</h3>
          <p>{chapter.story}</p>
          <blockquote>{chapter.question}</blockquote>
          <p className="ff-look"><strong>In the field:</strong> {chapter.lookFor}</p>
        </div>

      </div>

      <div className="ff-journal-heading ff-location-heading">
        <span className="ff-part">03 / Choose where to watch</span>
        <h3>A shoreline with a story</h3>
        <p>These are documented viewing destinations, not locations where a particular bird has been confirmed today. Select a land manager and see the access cautions before traveling.</p>
      </div>
      <div className="ff-location-choice">
        <label htmlFor="ff-place">Public viewing destination</label>
        <select id="ff-place" value={site.id} onChange={e=>{setSiteId(e.target.value);sendChoice("viewing-site",e.target.value);}}>
          {FIRST_FREEZE_SITES.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}
        </select>
      </div>
      <div className="ff-place-story" aria-live="polite">
        <div className="ff-place-body">
          <div className="ff-overline">{site.region} · {site.authority}</div>
          <h3>{site.name}</h3>
          <p>{site.reason}</p>
          <p className="ff-habitat"><strong>Landscape:</strong> {site.habitat}</p>
          <div className="ff-field-plan"><h4>What to watch for</h4><p>{site.watchFor}</p><h4>Make a field visit useful</h4><ol>{site.fieldPlan?.map((step,i)=><li key={i}>{step}</li>)}</ol></div>
          <p className="ff-next"><strong>Your next step:</strong> {site.fieldAction}</p>
          <p className="ff-access-note">{site.caution}</p>
        </div>
        <aside className={"ff-access ff-access-"+access.kind}>
          <p className="ff-part">Access decision</p>
          <strong>{access.label}</strong>
          <p>{access.explanation}</p>
          <a href={site.closureLink||site.link} target="_blank" rel="noopener noreferrer">Check current operator notice</a>
          {site.closureLink&&<a href={site.link} target="_blank" rel="noopener noreferrer">Official trail information</a>}
        </aside>
      </div>

      <div className="ff-reports">
        <div>
          <span className="ff-part">04 / Supplementary checklists</span>
          <h3>What birders reported in Bay County</h3>
          <p>{evidence.birdsScope}</p>
          <a href={evidence.sourceLinks.birds} target="_blank" rel="noopener noreferrer">Open the original regional eBird reports</a>
        </div>
        <div className="ff-report-list">
          {evidence.birds.length? <ol>{evidence.birds.map((bird,i)=><li key={bird.name+"-"+bird.date+"-"+i}>
              <span className="ff-bird-name">{bird.name}</span>
              <time dateTime={bird.date}>{bird.date}</time>
              <small>{bird.reviewed?"Reported with eBird review flag":"Review status not confirmed"}</small>
            </li>)}</ol>:
            <p className="ff-no-report">No recent Bay County notable reports were provided. This does not mean no birds are present, and it does not mean the observation service is operating normally.</p>}
        </div>
      </div>

      <footer className="ff-foot">
        <div><strong>The interpretation ends where the evidence ends.</strong><p>Ice is an offshore grid-cell reference, forecast lows are modeled for Bay City, and bird reports are countywide. None is a safety assessment, confirmed migration wave, accessible parking claim, or a guarantee of wildlife at the chosen site.</p></div>
        <nav aria-label="Continue into the specialist engines">
          <a href="/#living-season">The natural year</a>
          <a href="https://chrisizworski.com/waterfowl-freeze-line/">Waterfowl Freeze-Line</a>
          <a href="https://chrisizworski.com/winter-eagle-watching/">Winter Eagle Watching</a>
          <a href="https://michiganbirdingreport.com/">Michigan Birding Report</a>
        </nav>
        <details className="ff-offline">
          <summary>All four seasonal chapters and land-manager references</summary>
          {FIRST_FREEZE_CHAPTERS.map(c=><div key={c.id}><h4>{c.name}: {c.heading}</h4><p>{c.story}</p></div>)}
          <ul>{FIRST_FREEZE_SITES.map(s=><li key={s.id}><a href={s.link}>{s.name} · {s.authority}</a></li>)}</ul>
        </details>
      </footer>
    </div>
  </section>;
}
