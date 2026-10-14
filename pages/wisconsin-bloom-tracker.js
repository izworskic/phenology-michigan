import Head from 'next/head';
import Script from 'next/script';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, MapPin, Flower2, RefreshCcw, ExternalLink, ArrowRight, ShieldCheck} from 'lucide-react';
import WISCONSIN from '../data/wisconsin-bloom.json';

const SITE = 'https://phenology.chrisizworski.com';
const URL = SITE + '/wisconsin-bloom-tracker';
const OBSERVATION_MAX_AGE_MS = 5 * 86400000;
const TILE = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const REGION_NAMES = ['all', 'Door Peninsula', 'Madison and South Central', 'Milwaukee and Southeast', 'Driftless Southwest'];
const FLOWER_NAMES = [['all','All flowers'],['orchards','Orchard blossoms'],['gardens','Botanical gardens'],['lavender','Lavender'],['sunflowers','Sunflower fields']];
const FAQ = WISCONSIN.faqs.map(([question,answer])=>({question,answer}));
function d(month,day,year){return new Date(year,month-1,day,12,0,0).getTime();}
function localWisconsinDay(now) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const get = key => Number(parts.find(p=>p.type===key)?.value || 0);
  return {year:get('year'),month:get('month'),day:get('day')};
}
function seasonState(stop, now) {
  const day=localWisconsinDay(now),today=d(day.month,day.day,day.year),start=d(stop.start[0],stop.start[1],day.year),end=d(stop.end[0],stop.end[1],day.year);
  if(today>=start && today<=end)return {label:'Within typical season',kind:'window',detail:'Seasonal planning only; the bloom itself is not verified'};
  if(today<start && start-today<=28*86400000)return {label:'Season approaching',kind:'soon',detail:'Watch the operator for the first dated field report'};
  if(today>end)return {label:'Usual window passed',kind:'passed',detail:'Do not infer lingering blossoms without a dated observation'};
  return {label:'Outside typical season',kind:'outside',detail:'Future planning, not a live flowering claim'};
}
function verifiedObservation(stop, notes, now) {
  const valid = (notes || []).filter(item => {
    if(item.destinationId !== stop.id || !item.stage || !item.observedAt || !item.sourceUrl || !item.sourceName)return false;
    if(!['BUDDING','BUILDING','NEAR_PEAK','PEAK','FADING','DONE'].includes(item.stage))return false;
    if(![stop.sourceUrl,...(stop.links||[]).map(link=>link[1])].includes(item.sourceUrl))return false;
    const time=Date.parse(item.observedAt),age=now.getTime()-time;
    return Number.isFinite(time)&&age>=0&&age<=OBSERVATION_MAX_AGE_MS;
  });
  return valid.sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))[0]||null;
}
function practicalVerdict(stop, observation, phase) {
  if(observation?.stage==='PEAK'||observation?.stage==='NEAR_PEAK')return {kind:'confirmed',label:'Recent evidence: worth checking today',explain:'Dated observation supports bloom, but verify admission and weather before departure.'};
  if(observation?.stage==='BUILDING'||observation?.stage==='BUDDING')return {kind:'watch',label:'Building: verify before departure',explain:'Dated evidence is early; a peak visit may need more time.'};
  if(observation?.stage==='FADING'||observation?.stage==='DONE')return {kind:'passed',label:'Bloom fading or finished',explain:'A dated source reports past-prime conditions.'};
  return {kind:'uncertain',label:'No verified bloom call',explain:phase.detail};
}
function anchor(id){return 'wi-' + id;}
function FormatDate({iso}){
  return new Date(iso).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'America/Chicago'});
}
function WisconsinMap({destinations,activeId,onSelect}) {
  const elementRef=useRef(null),mapRef=useRef(null),layerRef=useRef(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!ready||!elementRef.current||mapRef.current||typeof window==='undefined'||!window.L)return;
    const L=window.L;
    const map=L.map(elementRef.current,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true});
    L.tileLayer(TILE,{maxZoom:18,attribution:'© OpenStreetMap contributors · © CARTO'}).addTo(map);
    map.setView([44.1,-89.4],7);
    mapRef.current=map;
    layerRef.current=L.layerGroup().addTo(map);
    requestAnimationFrame(()=>map.invalidateSize());
    return ()=>{
      if(mapRef.current){mapRef.current.remove();mapRef.current=null;layerRef.current=null;}
    };
  },[ready]);
  useEffect(()=>{
    const L=typeof window!=='undefined' ? window.L : null,map=mapRef.current,layer=layerRef.current;
    if(!map||!layer||!L)return;
    layer.clearLayers();
    const bounds=[];
    destinations.forEach(stop=>{
      const selected=activeId===stop.id;
      const marker=L.circleMarker([stop.lat,stop.lon],{radius:selected?11:8,weight:3,color:'#ffffff',fillColor:selected?'#bb4260':'#526f5c',fillOpacity:1});
      marker.bindTooltip(stop.name,{direction:'top',opacity:0.97});
      marker.on('click',()=>onSelect(stop.id));
      marker.addTo(layer);
      bounds.push([stop.lat,stop.lon]);
    });
    if(bounds.length)map.fitBounds(bounds,{padding:[25,25],maxZoom:8});
  },[destinations,activeId,onSelect,ready]);
  return <div className="wi-map-wrap">
    <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)}/>
    <div ref={elementRef} id="wisconsin-flower-map" className="wi-map-canvas" role="region" aria-label="Interactive map of Wisconsin flower destinations"/>
    {!ready&&<div className="wi-map-loading">Loading the Wisconsin destination map. The complete destination list remains available below.</div>}
    <div className="wi-map-legend"><span className="wi-map-dot"/> Destination, not verified bloom <small>Tap a marker to open its guide · two fingers to move on mobile</small></div>
  </div>;
}
function WisconsinStop({stop,now,observations,index}){
  const phase=seasonState(stop,now), observation=verifiedObservation(stop,observations,now),verdict=practicalVerdict(stop,observation,phase);
  return <article className="wi-stop" id={anchor(stop.id)}>
    <div className="wi-stop-top">
      <div><span className="wi-kicker">{String(index+1).padStart(2,'0')} · {stop.region} · {stop.kind}</span><h3>{stop.name}</h3></div>
      <span className={'wi-phase wi-'+phase.kind}>{phase.label}</span>
    </div>
    <p className="wi-stop-intro">{stop.experience}</p>
    <div className="wi-timing"><div><small>Usual planning window</small><strong>{stop.window}</strong></div><div><small>Current bloom evidence</small><strong>{observation?<><span className="wi-stage">{observation.stage.replaceAll('_',' ').toLowerCase()}</span> · <FormatDate iso={observation.observedAt}/></>:'No recent verified report'}</strong></div></div>
    <div className={'wi-verdict wi-'+verdict.kind}><ShieldCheck size={17}/><div><strong>{verdict.label}</strong><span>{verdict.explain}</span></div></div>
    <p><b>What to look for:</b> {stop.lookFor}</p>
    <p><b>Make the visit work:</b> {stop.plan}</p>
    <details className="wi-logistics"><summary>Tickets, hours, parking and crowds</summary><div className="wi-logistics-grid">{[['Tickets & fees',stop.tickets],['Hours & season',stop.hours],['Parking & arrival',stop.parking],['Crowds & timing',stop.crowds]].map(([label,copy])=><div key={label}><b>{label}</b><p>{copy}</p></div>)}</div></details>
    <div className="wi-links"><a href={stop.sourceUrl} target="_blank" rel="noopener noreferrer">Official bloom / visitor source <ExternalLink size={13}/></a><a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(stop.address)} target="_blank" rel="noopener noreferrer">Directions <MapPin size={13}/></a>{stop.guide&&<a className="wi-link-strong" href={'/wisconsin-bloom-tracker/'+stop.id}>Read full destination guide <ArrowRight size={13}/></a>}</div>
    {observation&&<p className="wi-source-citation">Current observation from <a href={observation.sourceUrl} target="_blank" rel="noopener noreferrer">{observation.sourceName}</a> · observed <FormatDate iso={observation.observedAt}/>. Not a statewide prediction.</p>}
  </article>;
}
export default function WisconsinBloomTracker(){
  const [filters,setFilters]=useState({flower:'all',region:'all'}),[selected,setSelected]=useState(null),[now]=useState(()=>new Date()),[observations,setObservations]=useState([]),[loading,setLoading]=useState(false),[checkedAt,setCheckedAt]=useState(null);
  const update=async()=>{
    setLoading(true);
    try{const response=await fetch('/api/wisconsin-bloom',{cache:'no-store'});if(!response.ok)throw Error('Update unavailable');const data=await response.json();setObservations(Array.isArray(data.observations)?data.observations:[]);setCheckedAt(new Date().toISOString());}catch{setCheckedAt(null);}finally{setLoading(false);}
  };
  useEffect(()=>{update();},[]);
  const visible=useMemo(()=>WISCONSIN.destinations.filter(d=>(filters.flower==='all'||filters.flower===d.category)&&(filters.region==='all'||filters.region===d.region)),[filters]);
  const onSelect=id=>{setSelected(id);document.getElementById(anchor(id))?.scrollIntoView({behavior:'smooth',block:'start'});};
  const anyVerified=WISCONSIN.destinations.some(stop=>verifiedObservation(stop,observations,now));
  const latestSources=observations.filter(x=>x.observedAt&&now.getTime()-Date.parse(x.observedAt)<=7*86400000);
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'WebApplication','@id':URL+'#app',name:'Wisconsin Bloom Tracker 2027',url:URL,description:'Wisconsin cherry blossoms, lilacs, lavender and sunflower trip planning with official source links and no unsourced peak claims.',applicationCategory:'TravelApplication',operatingSystem:'Any',isAccessibleForFree:true,author:{'@id':'https://chrisizworski.com/#person'}},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Phenology',item:SITE+'/'},{'@type':'ListItem',position:2,name:'Wisconsin Bloom Tracker',item:URL}]},
    {'@type':'FAQPage',mainEntity:FAQ.map(x=>({'@type':'Question',name:x.question,acceptedAnswer:{'@type':'Answer',text:x.answer}}))}
  ]};
  return <>
    <Head>
      <title>Wisconsin Bloom Tracker 2027: Cherry Blossoms, Lilacs & Flower Map | Chris Izworski</title>
      <meta name="description" content="When do Wisconsin cherry blossoms, lilacs, lavender and sunflower fields bloom? Explore 9 places, an interactive map, typical timing, tickets, parking and official observations."/>
      <link rel="canonical" href={URL}/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <meta name="robots" content="index,follow,max-image-preview:large"/>
      <meta name="author" content="Chris Izworski"/>
      <meta property="og:type" content="website"/><meta property="og:url" content={URL}/><meta property="og:site_name" content="Great Lakes Phenology"/>
      <meta property="og:title" content="Wisconsin Bloom Tracker 2027 — When to See Flowers"/>
      <meta property="og:description" content="Nine Wisconsin bloom experiences with map, source checks, tickets, parking and seasonal planning."/>
      <meta name="twitter:card" content="summary"/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    </Head>
    <main className="wisconsin-bloom">
      <nav className="wi-top" aria-label="Bloom trackers"><a href="/">Phenology</a><span>/</span><a href="/bloom-tracker">Michigan Bloom Tracker</a><span>/</span><strong>Wisconsin</strong></nav>
      <section className="wi-hero">
        <div className="wi-kicker"><Flower2 size={14}/> 2027 Wisconsin flower-season field guide</div>
        <h1>Which Wisconsin flowers are worth the drive?</h1>
        <p className="wi-lead">The cherry orchards of Door County. Madison’s spring lilacs and crabapples. Island lavender and summer sunflower fields. Nine real places, mapped with the right season, the right visitor rules, and a direct path to the people who know what is flowering.</p>
        <div className="wi-hero-actions"><a href="#wi-map" className="wi-main-action">Explore the flower map <ArrowRight size={15}/></a><a href="#wi-destinations">Compare all 9 experiences</a></div>
        <div className="wi-hero-bottom"><span className="wi-neutral-dot"/> <strong>{anyVerified?'Some locations have recent evidence':'No current verified peak claim'}</strong><span> · {now.toLocaleDateString('en-US',{timeZone:'America/Chicago',month:'long',day:'numeric',year:'numeric'})} · Typical windows are not observations</span></div>
      </section>
      <section className="wi-decision" aria-label="Seasonal decision">
        <div><span className="wi-kicker">The trip decision</span><h2>What would make a flower drive worthwhile?</h2><p>For a long drive, a calendar is not enough. Look for a recent plant-specific report, publicly accessible viewing, and an opening schedule that matches your day. This page never turns a historical bloom report into a claim about today.</p></div>
        <div className="wi-decision-rules"><div><strong>01 · Choose a flower</strong><span>Cherry, lilac, lavender, garden or sunflower</span></div><div><strong>02 · Compare timing</strong><span>Typical window is a planning guide, not a prediction</span></div><div><strong>03 · Verify the source</strong><span>A dated report plus tickets and travel access before leaving</span></div></div>
      </section>
      <section className="wi-map-section" id="wi-map">
        <div className="wi-heading"><span className="wi-kicker">Explore Wisconsin</span><h2>Find a bloom near your route</h2><p>Zoom and select the actual destination. The map marks locations, not flowering intensity.</p></div>
        <div className="wi-filter" aria-label="Wisconsin bloom filters">
          <div><span>Flower experience</span><div className="wi-pills">{FLOWER_NAMES.map(([value,label])=><button type="button" className={filters.flower===value?'active':''} aria-pressed={filters.flower===value} onClick={()=>setFilters(old=>({...old,flower:value}))} key={value}>{label}</button>)}</div></div>
          <div><span>Region</span><div className="wi-pills">{REGION_NAMES.map(value=><button type="button" className={filters.region===value?'active':''} aria-pressed={filters.region===value} onClick={()=>setFilters(old=>({...old,region:value}))} key={value}>{value==='all'?'All Wisconsin':value}</button>)}</div></div>
          <div className="wi-result-count">{visible.length} matching destinations <button type="button" onClick={()=>setFilters({flower:'all',region:'all'})}>Clear filters</button></div>
        </div>
        {visible.length?<WisconsinMap destinations={visible} activeId={selected} onSelect={onSelect}/>:<div className="wi-empty">No destinations match both filters. Select another region or show all flowers.</div>}
      </section>
      <section className="wi-destinations" id="wi-destinations">
        <div className="wi-heading"><span className="wi-kicker">Destination field guides</span><h2>Compare the places before you go</h2><p>Each destination has a genuine visitor plan and source links. All bloom labels default to unknown until a dated observation is available.</p></div>
        <div className="wi-stop-list">{visible.map((stop,index)=><WisconsinStop stop={stop} index={index} key={stop.id} now={now} observations={observations}/>)}</div>
      </section>
      <section className="wi-notes" id="wi-notes"><div className="wi-heading"><span className="wi-kicker">Dated Wisconsin bloom notes · April–September</span><h2>What changed this week?</h2><p>Only attributable, time-stamped bloom-stage evidence enters the current notes. Opening dates, archived photos and typical season windows are never a substitute.</p></div>
        {latestSources.length?<ul>{latestSources.map(note=><li key={note.destinationId+note.observedAt}><strong>{WISCONSIN.destinations.find(d=>d.id===note.destinationId)?.name}</strong> · {note.stage} on <FormatDate iso={note.observedAt}/> · <a href={note.sourceUrl}>Source</a></li>)}</ul>:<div className="wi-empty"><strong>No recent verified Wisconsin field notes.</strong> The available 2026 Arboretum reports are archived seasonal evidence, not current 2027 conditions. We will only show a present bloom state when the current dated source is available.</div>}
        <div className="wi-source-bar"><div><b>Evidence feed</b><span>{checkedAt?'Latest stored observation feed checked. No unsupported bloom-stage inference.':'No evidence-feed response confirmed yet.'}</span></div><button type="button" onClick={update} disabled={loading}><RefreshCcw size={14}/>{loading?'Checking':'Check for source notes'}</button></div>
        <p className="wi-small">For an immediate decision, open the original <a href="https://www.doorcounty.com/experience/cherries/">Door County cherry-stage report</a> or <a href="https://arboretum.wisc.edu/news/arboretum-news/whats-in-bloom/">UW Arboretum dated bloom bulletin</a>. The evidence feed currently requires reviewed observations; pressing refresh does not crawl those sites live.</p>
      </section>
      <section className="wi-faq"><div className="wi-heading"><span className="wi-kicker">Wisconsin bloom questions</span><h2>When does Wisconsin bloom?</h2></div>{FAQ.map(({question,answer})=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <section className="wi-more"><div><span className="wi-kicker">The Great Lakes bloom network</span><h2>Two states. Separate seasonal truth.</h2><p>Michigan’s 19-stop tracker retains its own data pipeline and bloom map. Wisconsin has its own source registry and observation rules. A peak in Door County must never change Traverse City’s bloom status.</p></div><a href="/bloom-tracker">Explore Michigan’s 19 flower destinations <ArrowUpRight size={16}/></a></section>
      <footer className="wi-footer"><span>Wisconsin Bloom Tracker · Seasonal planning and sourced field reports · Not affiliated with venue operators</span><a href="https://chrisizworski.com/chris-izworski/">Built by Chris Izworski</a></footer>
    </main>
  </>;
}
