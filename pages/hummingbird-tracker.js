import Head from 'next/head';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import {Bird,Flower2,Wind,CalendarDays,MapPin,ArrowRight,CheckCircle2,AlertCircle,CloudSun,Info} from 'lucide-react';
import HummingbirdMap from '../components/HummingbirdMap';
import {REGIONS,seasonState,datesFor,monthDay,readout} from '../lib/hummingbirds';

const URL='https://phenology.chrisizworski.com/hummingbird-tracker';
const TITLE='Michigan Hummingbird Arrival Tracker 2027: Migration Map & Feeder Dates';
const DESCRIPTION='When do hummingbirds return to Michigan? Explore nine regional arrival windows, when to put feeders out, a CARTO migration map, NWS spring weather clues and clearly labeled iNaturalist sightings.';
const FAQ=[
 ['When do hummingbirds arrive in Michigan?','Ruby-throated hummingbirds begin returning to Michigan in spring. Early sightings can occur during April, while many residents notice arrivals in late April or May. Northern Lower Michigan and the Upper Peninsula generally lag southern Michigan. These are broad timing patterns; individual years vary.'],
 ['When should I put my hummingbird feeder out in Michigan?','Put a clean feeder outside roughly ten days before your region’s early watch date. This tool gives a region-specific planning date, not a guarantee of when the first bird arrives. There is no need to wait for the first reported sighting.'],
 ['When do hummingbirds arrive in Bay City and Saginaw Bay?','The Saginaw Bay planning watch window on this site is approximately late April through mid-to-late May. An unusually early bird can precede that range; look at current weather and research-grade reports when spring arrives.'],
 ['What hummingbirds live in Michigan?','The Ruby-throated Hummingbird is Michigan’s only regularly occurring hummingbird. Other species appear very rarely, and a one-off sighting of another species does not reflect the usual Ruby-throated migration.'],
 ['Does warm weather mean hummingbirds are arriving tomorrow?','No. Mild weather and winds from the south can be useful clues for migration movement, but they cannot predict an individual bird’s arrival in a particular yard. The weather indicator is an editorial screening cue, not a calibrated probability.'],
 ['Can I leave feeders out in fall?','Yes. Migrating hummingbirds may use feeders in fall. Keeping a feeder clean and available does not prevent hummingbirds from migrating; day length and other factors shape their departures. The map’s primary spring watch is not an autumn departure forecast.'],
 ['What is the safe hummingbird nectar recipe?','Mix one part refined white table sugar with four parts water, allow it to cool, and never add red dye. Change nectar and thoroughly clean feeders every other day, or more frequently when needed, following Smithsonian National Zoo guidance.'],
 ['Are the map markers confirmed hummingbird sightings?','No. Numbered markers are approximate regional forecast centers. Actual public community observations appear separately with dates and links when an observation feed is available. Lack of reports never means there are no hummingbirds.']
];
const SOURCES=[
 ['Journey North · migration reports','https://journeynorth.org/projects/hummingbird'],
 ['Journey North · migration maps','https://maps.journeynorth.org/'],
 ['MSU Extension · Michigan species and timing','https://ask.extension.org/kb/faq.php?id=820761'],
 ['iNaturalist · Michigan hummingbird observations','https://www.inaturalist.org/observations?place_id=29&taxon_name=Archilochus%20colubris'],
 ['National Weather Service · forecast API','https://www.weather.gov/documentation/services-web-api'],
 ['Smithsonian National Zoo · nectar and cleaning','https://www.nationalzoo.si.edu/migratory-birds/hummingbird-nectar-recipe']
];
const asDate=key=>key?monthDay(key):'—';
const toneName=t=>t==='seen'?'seen':t==='watch'?'watch':t==='ready'?'ready':t==='after'?'after':'off';
function Status({tone,children}){return <span className={'hum-status '+toneName(tone)}>{children}</span>;}
function MiniIcon({icon:Icon}){return <span className="hum-feature-icon"><Icon size={17} strokeWidth={1.8}/></span>;}
export default function HummingbirdTracker(){
 const router=useRouter();
 const [selected,setSelected]=useState('saginaw-bay');
 const [data,setData]=useState(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{if(router.isReady&&typeof router.query.region==='string'&&REGIONS.some(r=>r.id===router.query.region))setSelected(router.query.region);},[router.isReady,router.query.region]);
 useEffect(()=>{
  let active=true;
  fetch('/api/hummingbirds').then(r=>{if(!r.ok)throw Error('The live API could not be reached');return r.json();})
   .then(j=>{if(active){setData(j);setLoading(false);}})
   .catch(e=>{if(active){setError(e.message);setLoading(false);}});
  return ()=>{active=false;};
 },[]);
 const choose=id=>{
  setSelected(id);
  router.replace({pathname:'/hummingbird-tracker',query:id==='saginaw-bay'?{}:{region:id}},undefined,{shallow:true,scroll:false});
 };
 const region=REGIONS.find(r=>r.id===selected)||REGIONS[4];
 const actual=data?.regions?.find(r=>r.id===selected);
 const season=actual?.season||seasonState(region);
 const window=season.window;
 const signal=actual?.signal||readout(region);
 const year=window.start.slice(0,4);
 const off=season.phase==='off_season'||season.phase==='planning';
 const updated=data?.generatedAt?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.generatedAt)):null;
 const dates=useMemo(()=>REGIONS.map((r,i)=>{const s=data?.regions?.[i]?.season||seasonState(r);return {...r,window:s.window,signal:data?.regions?.[i]?.signal||readout(r)};}),[data]);
 const plotYear=year;
 const origin=Date.parse(plotYear+'-04-01T12:00:00Z');
 const position=day=>Math.max(0,Math.min(100,((Date.parse(day+'T12:00:00Z')-origin)/86400000)/65*100));
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':URL+'#webpage',url:URL,name:TITLE,description:DESCRIPTION,author:{'@id':'https://chrisizworski.com/#person'},isPartOf:{'@id':'https://phenology.chrisizworski.com/#website'}},
  {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Hummingbird Arrival Tracker',url:URL,description:DESCRIPTION,applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,creator:{'@id':'https://chrisizworski.com/#person'}},
  {'@type':'FAQPage',mainEntity:FAQ.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Michigan Phenology',item:'https://phenology.chrisizworski.com/'},{'@type':'ListItem',position:2,name:'Hummingbird Tracker',item:URL}]}
 ]};
 return <div className="hum-tool">
  <Head>
   <title>{TITLE} | Chris Izworski</title><meta name="description" content={DESCRIPTION}/><link rel="canonical" href={URL}/>
   <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/>
   <meta property="og:type" content="website"/><meta property="og:url" content={URL}/><meta property="og:title" content={TITLE}/><meta property="og:description" content={DESCRIPTION}/>
   <meta name="twitter:card" content="summary"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><link rel="stylesheet" href="/hummingbird-tracker.css"/>
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  </Head>
  <header className="hum-top hum-wrap"><a className="hum-brand" href="/">MICHIGAN <span>PHENOLOGY</span></a><nav aria-label="Tracker navigation"><a href="#map">Migration map</a><a href="#regional-timeline">Arrival timeline</a><a href="#feeder-guide">Feeder guide</a><a href="/firefly-tracker">Fireflies ↗</a></nav></header>
  <main>
   <section className="hum-hero">
    <div className="hum-wrap hum-hero-content">
     <div className="hum-hero-main"><div className="hum-overline"><span className="hum-live-dot"/> MICHIGAN'S LIVING NATURE CALENDAR <span className="hum-sep">/</span> SPRING MIGRATION</div>
      <h1>When will the<br/><em>hummingbirds</em> arrive?</h1>
      <p className="hum-subtitle">Track spring's smallest travelers as they work north through Michigan. A local arrival window, current migration conditions, and the right day to hang your feeder.</p>
      <div className="hum-select-wrap"><label htmlFor="hum-region">YOUR MICHIGAN REGION</label><select id="hum-region" value={selected} onChange={e=>choose(e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div className="hum-chips"><span><MapPin size={14}/> 9 Michigan regions</span><span><CloudSun size={14}/> NWS weather signals</span><span><Bird size={14}/> Observations linked</span></div>
     </div>
     <div className="hum-arrival-card">
      <div className="hum-arrival-top"><span>YOUR SPRING ARRIVAL WATCH</span><Status tone={signal.tone}>{signal.label}</Status></div>
      <div className="hum-card-region">{region.name}</div>
      <div className="hum-card-dates">{asDate(window.start)} <span>–</span> {asDate(window.end)}</div>
      <p className="hum-card-copy">Estimated seasonal watch window · {year}</p>
      <div className="hum-card-divider"/>
      <div className="hum-feeder-date"><MiniIcon icon={CalendarDays}/><div><small>PUT YOUR FEEDER OUT BY</small><b>{asDate(window.feeder)}, {year}</b></div></div>
      <p className="hum-card-explain">{signal.message}</p>
      {off&&<p className="hum-off-note">Off-season planning only. No current arrival sightings are claimed.</p>}
     </div>
    </div>
    <div className="hum-hero-edge"/>
   </section>
   <div className="hum-wrap">
    <section className="hum-summary" aria-label="Tracker snapshot">
     <div><span>SPECIES</span><b>Ruby-throated</b><small>Michigan's regular hummingbird</small></div>
     <div><span>REGION</span><b>{region.name}</b><small>Forecast center · not bird location</small></div>
     <div><span>SEASON</span><b>{year} spring</b><small>{off?'Next arrival season':'Weather & observations watch'}</small></div>
     <div><span>SOURCE HEALTH</span><b>{loading?'Checking…':error?'Seasonal only':data?.observationStatus==='available'?'Sightings sampled':data?.observationStatus==='off_season'?'Off-season': 'Reports unavailable'}</b><small>{updated?'Checked '+updated+' ET':'Regional calendar always available'}</small></div>
    </section>
    <section className="hum-section" id="map">
     <div className="hum-section-head"><div><span className="hum-kicker">01 / MIGRATION MAP</span><h2>Follow the arrival watch north</h2></div><p>Choose a region to see its spring watch dates, weather signals and community reports. The map shows representative locations—not a live flock, predicted flyway or density heatmap.</p></div>
     <div className="hum-map-grid">
      <div className="hum-panel map-main"><HummingbirdMap selected={selected} onSelect={choose} regions={data?.regions}/><div className="hum-map-legend"><span><i className="legend-ready"/>Watch window</span><span><i className="legend-seen"/>Recent reports</span><span><i className="legend-off"/>Seasonal/off-season</span></div></div>
      <aside className="hum-panel hum-map-aside">
       <div className="hum-aside-eyebrow">REGIONAL MIGRATION DESK</div><h3>{region.name}</h3><Status tone={signal.tone}>{signal.label}</Status>
       <p>{signal.message}</p>
       <div className="hum-datum"><span>Arrival watch</span><strong>{asDate(window.start)}–{asDate(window.end)}</strong></div>
       <div className="hum-datum"><span>Feeder ready</span><strong>{asDate(window.feeder)}</strong></div>
       <div className="hum-datum"><span>Weather cue</span><strong>{actual?.weather?.favorableDays!=null?actual.weather.favorableDays+' favorable days in outlook':season.isSpring?'Forecast unavailable':'Returns in spring'}</strong></div>
       <div className="hum-datum"><span>Research-grade records</span><strong>{actual?.sightings?.length?actual.sightings.length+' in sampled feed':data?.observationStatus==='available'?'None in sampled feed':'Not currently available'}</strong></div>
       <p className="hum-disclosure">Weather cues are not arrival probabilities. Missing or unreported observations never mean birds are absent. Region markers are not feeder sites.</p>
       <div className="hum-region-buttons" aria-label="Select Michigan region">{REGIONS.map((r,i)=><button key={r.id} aria-pressed={r.id===selected} onClick={()=>choose(r.id)}><span>{i+1}</span>{r.name}</button>)}</div>
      </aside>
     </div>
    </section>
    <section className="hum-section" id="regional-timeline">
     <div className="hum-section-head"><div><span className="hum-kicker">02 / NORTHWARD PROGRESSION</span><h2>Not one Michigan arrival date</h2></div><p>Approximate seasonal planning bands show the usual south-to-north progression. They are <b>not</b> 2027 sighting observations, statistical arrival percentiles, or guarantees.</p></div>
     <div className="hum-panel hum-timeline">
      <div className="hum-timeline-head"><span>SELECT A REGION TO EXPLORE</span><div><span>APR</span><span>MAY</span><span>JUN</span></div></div>
      {dates.map(r=><button className={'hum-time-row '+(r.id===selected?'on':'')} key={r.id} onClick={()=>choose(r.id)}>
       <span className="hum-time-label">{r.name}</span><span className="hum-time-rail"><span className="hum-time-band" style={{left:position(r.window.start)+'%',width:(position(r.window.end)-position(r.window.start))+'%'}}/></span><span className="hum-time-date">{asDate(r.window.start)}</span>
      </button>)}
      <p className="hum-smallprint">Illustrative regional watch bands informed by Michigan migration guidance; use linked Journey North data for actual historical sighting records. Earlier outliers are possible.</p>
     </div>
    </section>
    <section className="hum-section" id="signals"><div className="hum-section-head"><div><span className="hum-kicker">03 / CONDITIONS + EVIDENCE</span><h2>What is happening now?</h2></div><p>Two separate signals: favorable spring migration weather and publicly reported birds. A warm southerly day cannot establish a local arrival.</p></div>
     <div className="hum-two-col">
      <article className="hum-panel hum-signal-panel"><div className="hum-cardheading"><MiniIcon icon={Wind}/><h3>7-day movement-weather watch</h3></div>
       {actual?.weather?.days?.length?<><p>{actual.weather.favorableDays} of {actual.weather.checked} upcoming daytime forecasts meet our exploratory mild + southerly-wind screen.</p>
        <div className="hum-forecast">{actual.weather.days.map(d=><div key={d.date}><b>{new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z'))}</b><strong>{d.highF==null?'—':d.highF+'°'}</strong><span>{d.windFrom||'—'}</span><i className={d.favorable?'yes':'no'}/></div>)}</div>
        <p className="hum-smallprint">Screen: daytime high at least 55°F, wind from S/SSE/SSW/SE/SW, and forecast wind not above 20 mph. These are <b>site-defined clues</b>, not validated hummingbird arrival thresholds.</p></>
       :<div className="hum-empty-state"><CloudSun size={34}/><b>{off?'Migration weather monitoring returns in spring':'Regional forecast not available'}</b><p>{off?'Our forecast window opens as birds begin their northward approach. No invented October migration scores.':'The NWS forecast did not return usable data. The calendar remains available.'}</p></div>}
      </article>
      <article className="hum-panel hum-signal-panel"><div className="hum-cardheading"><MiniIcon icon={Bird}/><h3>Reported hummingbirds</h3></div>
       {actual?.sightings?.length?<><p>Recent Michigan research-grade iNaturalist submissions matched to the nearest regional center. Tap a record to inspect its source.</p><div className="hum-observations">{actual.sightings.map(s=><a href={s.url} key={s.id} target="_blank" rel="noopener noreferrer"><CheckCircle2 size={17}/>Observed {asDate(s.date)} <ArrowRight size={15}/></a>)}</div></>
       :<div className="hum-empty-state"><Info size={34}/><b>{data?.observationStatus==='off_season'?'Spring observation watch paused':data?.observationStatus==='unavailable'?'Observation feed unavailable':'No observations in the sampled feed'}</b><p>There is no evidence here of a confirmed regional arrival. This does not mean birds have not arrived.</p></div>}
       <p className="hum-smallprint">iNaturalist is community-contributed and identification quality can change. Limited to the 200 most recently observed research-grade Michigan records in the season; this sample may miss earlier arrivals. We never call these the state's first observations.</p>
       <a className="hum-textlink" target="_blank" rel="noopener noreferrer" href="https://maps.journeynorth.org/">Explore Journey North's migration map ↗</a>
      </article>
     </div>
    </section>
    <section className="hum-section" id="feeder-guide"><div className="hum-section-head"><div><span className="hum-kicker">04 / MAKE YOUR YARD READY</span><h2>The feeder goes out before the first bird</h2></div><p>Your local feeder-ready date is approximately ten days before the start of the region's migration watch band.</p></div>
     <div className="hum-guide">
      <div className="hum-guide-lead"><div className="hum-guide-overline">YOUR NEXT FEEDER DAY</div><strong>{asDate(window.feeder)} <span>{year}</span></strong><p>for {region.name}</p><a href="https://www.nationalzoo.si.edu/migratory-birds/hummingbird-nectar-recipe" target="_blank" rel="noopener noreferrer">Smithsonian feeder instructions ↗</a></div>
      <div className="hum-guide-step"><span>01</span><MiniIcon icon={Flower2}/><h3>Mix it safely</h3><p>One part refined white table sugar to four parts water. Dissolve completely and let cool. No red food coloring, honey or artificial sweeteners.</p></div>
      <div className="hum-guide-step"><span>02</span><MiniIcon icon={CheckCircle2}/><h3>Keep it clean</h3><p>Replace nectar and thoroughly clean the feeder every other day, following Smithsonian guidance. More frequent care can be needed in warm conditions.</p></div>
      <div className="hum-guide-step"><span>03</span><MiniIcon icon={Bird}/><h3>Provide natural food</h3><p>Include native flowering plants and insect-friendly habitat. Ruby-throated hummingbirds rely on small arthropods as well as nectar.</p></div>
     </div>
    </section>
    <section className="hum-section" id="faq"><div className="hum-section-head"><div><span className="hum-kicker">05 / QUESTIONS PEOPLE ASK</span><h2>Michigan hummingbird arrival FAQ</h2></div></div><div className="hum-faq">{FAQ.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
    <section className="hum-section hum-method"><span className="hum-kicker">DATA, SCIENCE & LIMITATIONS</span><h2>What this tracker knows—and what it doesn't</h2><p>The regional bands are editorial migration watch windows informed by Michigan Extension and Journey North context, <b>not</b> observational distributions calculated from a complete longitudinal data set. The National Weather Service spring forecast supplies daytime air temperature and wind direction; the displayed movement-weather screen is a planning heuristic. iNaturalist public research-grade observations may offer independent evidence, but the API sample is capped and biased by reporting effort. Coordinates only assign reports to an approximate region—no private feeder addresses or false route lines are shown. When a source is missing or out of season, the site shows that honestly rather than filling gaps with invented sightings or probabilities.</p><ul>{SOURCES.map(([label,url])=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a></li>)}</ul></section>
   </div>
  </main>
  <footer className="hum-footer"><div className="hum-wrap">Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> · <a href="/">Michigan Phenology</a> · <a href="/bloom-tracker">Bloom Tracker</a> · <a href="/firefly-tracker">Firefly Tracker</a>. Independent educational tracker, not a NOAA or Cornell product.</div></footer>
 </div>;
}
