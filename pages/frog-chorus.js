import Head from 'next/head';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import FrogMap from '../components/FrogMap';
import {REGIONS,SPECIES,dateKey,speciesForRegion,speciesWindow,seasonalStatus} from '../lib/frogs';

const URL='https://phenology.chrisizworski.com/frog-chorus';
const TITLE='Michigan Frog Chorus Forecast: When Will Spring Peepers Start Calling?';
const DESC='Predict the best evenings to hear spring peepers, wood frogs and other Michigan frogs. 9-region interactive map, 7-night weather outlook, seasonal calendar and real frog calls.';
const PHOTO='https://armi.usgs.gov/uploads/gallery/7v8kw3bmn6sfdtg2rjp49x5q001hzcy.jpg';
const FAQ=[
 ['When do spring peepers start calling in Michigan?','They typically start on mild spring evenings as thawed shallow wetlands become active. Southern Michigan can hear them in March and April; northern areas often follow weeks later. This tracker compares the seasonal window against local NWS forecasts and does not claim first calls without a recording.'],
 ['What temperature do frogs start calling?','Species differ. Early wood frogs and chorus frogs can call on relatively cool spring days while toads, treefrogs and bullfrogs generally favor warmer conditions. Temperatures in the forecast are a planning guide, not biological switch points.'],
 ['Do frogs call when it rains?','Many frogs become vocal during mild, wet periods, especially around breeding ponds. Heavy rain, wind or thunderstorms can make listening difficult or unsafe. The forecast considers rain and wind separately.'],
 ['What does a wood frog sound like?','A wood frog chorus sounds like ducks quacking or clucking. Compare it to the piercing peep of a spring peeper and the comb-like raspy trill of a western chorus frog in the listening guide.'],
 ['What is the best time of night to hear Michigan frogs?','A quiet evening after sunset is often productive, especially near shallow ponds. Some early spring callers also vocalize in daylight. Do not assume wetlands or parks permit entry after dark.'],
 ['Are chorus scores actual recordings or frog population counts?','No. The 0–100 index is an editorial weather-fit comparison constrained by typical seasonal windows. It is not a measured chorus, a confirmed sighting, an abundance estimate or a numerical probability.']
];
const fmt=d=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const monthDay=(day)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(2027,0,day)));
function ScoreBars({days}){
  if(!days?.length)return <div className="frog-no-forecast"><strong>No active seven-night calling forecast.</strong><p>The seasonal clock returns as Michigan wetlands approach spring. We do not assign live chorus scores in October or pretend frogs are calling.</p></div>;
  return <div className="frog-bars" role="list" aria-label="Seven-night weather opportunity index">{days.map(n=><div className="frog-bar-item" key={n.date} role="listitem">
    <b>{fmt(n.date)}</b><div className="frog-bar-track"><span style={{width:(n.bestScore??0)+'%'}} className={n.bestScore>=75?'high':n.bestScore>=45?'medium':'low'}/></div>
    <strong>{n.bestScore==null?'—':n.bestScore}</strong><small>{n.temp==null?'—':n.temp+'°F'} · {n.pop==null?'rain n/a':n.pop+'% rain'}</small>
    <span className="frog-bar-tooltip">{n.thunder?'Thunderstorm risk':n.top?.[0]?.name||'No typical calling window'}</span>
  </div>)}</div>;
}
function SpeciesCard({species,region,date,featured}){
  const window=speciesWindow(species,region,date);
  const [y]=date.split('-').map(Number);
  const note=species.note||'Seasonal range and temperatures are approximate, not an observed call.';
  const canPlay=Boolean(species.sound);
  return <article className={'frog-species '+(featured?'featured':'')} id={'frog-'+species.id}>
    <div className="frog-species-header"><div className="frog-species-title"><span className="frog-sound-icon" aria-hidden="true">♪</span><div><h3>{species.name}</h3><em>{species.scientific}</em></div></div><span className={'frog-species-status '+(species.restricted?'limited':window.active?'on':window.approaching?'soon':'off')}>{species.restricted?'Restricted range':window.active?'Seasonal window':window.approaching?'Approaching':'Seasonal guide'}</span></div>
    <div className="frog-call">{species.call}</div>
    <p className="frog-habitat">{species.habitat}</p>
    <div className="frog-species-facts"><span>Typical window <b>{monthDay(species.start+region.shift)} – {monthDay(species.end+region.shift)}</b></span><span>Preferred listening temps <b>{species.comfort[0]}–{species.comfort[1]}°F</b></span></div>
    {canPlay?<div className="frog-audio"><div>Listen to the real call <small>USGS recording</small></div><audio controls preload="none" src={species.sound} aria-label={'USGS recording of '+species.name}/></div>
      :species.guide?<a className="frog-listen-link" target="_blank" rel="noopener noreferrer" href={species.guide}>Hear species recording at USGS ↗</a>
      :<a className="frog-listen-link" target="_blank" rel="noopener noreferrer" href="https://www.michigan.gov/dnr/education/michigan-species/reptiles/frogs-and-toads">Consult Michigan DNR call guide ↗</a>}
    {species.note&&<p className="frog-species-note">{note}</p>}
  </article>;
}
export default function FrogChorus(){
  const router=useRouter();
  const [selected,setSelected]=useState('saginaw-bay');
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [filter,setFilter]=useState('all');
  useEffect(()=>{if(router.isReady&&typeof router.query.region==='string'&&REGIONS.some(r=>r.id===router.query.region))setSelected(router.query.region);},[router.isReady,router.query.region]);
  useEffect(()=>{let alive=true;fetch('/api/frogs').then(r=>{if(!r.ok)throw Error('API temporarily unavailable');return r.json();})
    .then(v=>{if(alive){setData(v);setLoading(false);}}).catch(e=>{if(alive){setError(e.message);setLoading(false);}});
    return()=>{alive=false;};},[]);
  const choose=id=>{setSelected(id);router.replace({pathname:'/frog-chorus',query:id==='saginaw-bay'?{}:{region:id}},undefined,{shallow:true,scroll:false});};
  const region=REGIONS.find(r=>r.id===selected)||REGIONS[4];
  const row=data?.regions?.find(r=>r.id===selected);
  const now=new Date(),key=dateKey(now),season=row?.season||seasonalStatus(region,now);
  const candidates=speciesForRegion(region);
  const inWindow=(row?.seasonSpecies||candidates.filter(s=>speciesWindow(s,region,key).active).map(s=>s.id));
  const featured=candidates.filter(s=>inWindow.includes(s.id));
  const next=row?.approaching||candidates.filter(s=>speciesWindow(s,region,key).approaching).map(s=>({id:s.id,name:s.name,daysUntil:speciesWindow(s,region,key).daysUntil}));
  const guideSpecies=useMemo(()=>SPECIES.filter(s=>filter==='all'||(filter==='early'&&s.start<90)||(filter==='spring'&&s.start>=90&&s.start<135)||(filter==='summer'&&s.start>=135)),[filter]);
  const updated=data?.generatedAt?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(data.generatedAt)):null;
  const outlook=row?.days||[];
  const best=[...outlook].filter(x=>x.bestScore!=null).sort((a,b)=>b.bestScore-a.bestScore)[0];
  const springWindow=candidates.filter(s=>s.earliest).map(s=>monthDay(s.start+region.shift));
  const jsonLd={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':URL+'#webpage',url:URL,name:TITLE,description:DESC,author:{'@id':'https://chrisizworski.com/#person'}},
    {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Frog Chorus Tracker',applicationCategory:'WeatherApplication',operatingSystem:'Any',url:URL,isAccessibleForFree:true,author:{'@id':'https://chrisizworski.com/#person'}},
    {'@type':'FAQPage',mainEntity:FAQ.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Michigan Phenology',item:'https://phenology.chrisizworski.com/'},{'@type':'ListItem',position:2,name:'Frog Chorus Tracker',item:URL}]}
  ]};
  return <div className="frog-page">
    <Head><title>{TITLE} | Chris Izworski</title><meta name="description" content={DESC}/><link rel="canonical" href={URL}/><meta name="robots" content="index,follow,max-image-preview:large"/>
      <meta property="og:title" content={TITLE}/><meta property="og:description" content={DESC}/><meta property="og:url" content={URL}/><meta property="og:type" content="website"/><meta name="twitter:card" content="summary"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><link rel="stylesheet" href="/frog-chorus.css"/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/></Head>
    <header className="frog-header frog-shell"><a href="/" className="frog-brand">MICHIGAN PHENOLOGY <span>/ FROG CHORUS</span></a>
      <nav aria-label="Page navigation"><a href="#forecast">Forecast</a><a href="#map">Map</a><a href="#calls">Learn the calls</a><a href="/firefly-tracker">Fireflies ↗</a></nav></header>
    <main>
      <div className="frog-hero"><div className="frog-shell frog-hero-grid">
        <div className="frog-hero-text"><span className="frog-kicker">THE LIVING CALENDAR · MICHIGAN WETLANDS</span><h1>When will the <i>frogs</i> start singing?</h1>
          <p>That first spring night when the marsh suddenly comes alive. Follow Michigan's chorus north, find a good night to listen and learn exactly who's making the noise.</p>
          <div className="frog-chip-line"><span>9 Michigan regions</span><span>7-night NWS outlook</span><span>Real frog calls</span></div>
          <a href="#forecast" className="frog-hero-cta">Explore the chorus forecast ↓</a>
        </div>
        <div className="frog-hero-media"><img src={PHOTO} alt="Northern spring peeper on a stem, photographed by the US Geological Survey" loading="eager"/><span>Spring peeper · USGS / public domain</span></div>
      </div></div>
      <div className="frog-shell">
        <section className="frog-at-a-glance" aria-label="Current seasonal snapshot">
          <div className="frog-glance-main"><div className="frog-kicker dark">SELECTED REGION</div><h2>{region.name}</h2><p>{region.place}</p></div>
          <div className="frog-glance-status"><span className="frog-kicker dark">CHORUS STATUS</span><strong>{season.active?'Within typical calling season':season.approaching?'First calls nearing':'Off-season / calendar guide'}</strong><span>{season.active?'Seasonal window, not a confirmed live chorus':season.approaching?'Monitor the first mild wet evenings':"Do not infer active calling from today's weather"}</span></div>
          <div className="frog-glance-next"><span className="frog-kicker dark">NEXT GOOD EVENING</span><strong>{best&&best.bestScore>=45?fmt(best.date):'Not currently forecast'}</strong><span>{best&&best.bestScore>=45?'Conditions index '+best.bestScore+'/100 · estimated':'Live timing resumes during spring and summer'}</span></div>
        </section>
        <section className="frog-section" id="forecast"><div className="frog-section-top"><div><span className="frog-kicker dark">THE NIGHTLY FORECAST</span><h2>Will the chorus be calling?</h2></div><p>Temperature, wind, precipitation and recent wet days inform the opportunity index. It is a forecast for <strong>listening conditions</strong>, never a claimed audio detection.</p></div>
          <div className="frog-grid">
            <div className="frog-panel"><div className="frog-panel-head"><span className="frog-kicker dark">NEXT SEVEN EVENINGS</span><span className="frog-note-tag">{loading?'Updating…':season.offSeason?'Seasonal guide':'NWS weather-driven'}</span></div>
              {loading?<div className="frog-loading">Checking regional forecast data…</div>:<ScoreBars days={outlook}/>}
              {error&&<p className="frog-api-warning">Live data unavailable: {error}. The seasonal guide is still usable.</p>}
              <p className="frog-panel-foot">100 = favorable weather for an in-season species, not a 100% chance of hearing it. No active species or incomplete weather = no numerical score. Weather can change quickly.</p>
              {best&&<div className="frog-best-night"><span>STRONGEST FORECAST NIGHT</span><strong>{fmt(best.date)} · {best.bestScore}/100</strong><p>{best.top?.[0]?.name} · {best.top?.[0]?.reason}</p></div>}
            </div>
            <div className="frog-panel frog-panel-dark"><span className="frog-kicker">LISTEN FOR THESE</span>
              <h3>{featured.length?'Frogs in their typical calling window':season.approaching?'First voices are getting close':'The marsh is quiet for now'}</h3>
              {featured.length?<div className="frog-live-species">{featured.slice(0,5).map(s=><a href={'#frog-'+s.id} key={s.id}><b>{s.name}</b><span>{s.call} ↗</span></a>)}</div>
                :<p className="frog-muted">{season.approaching?'A few earlier callers may begin on a mild, wet night.':'Michigan frog calls generally start after winter thaw and rotate through spring and summer. Listen to the recordings below and come back when the forecast window opens.'}</p>}
              {next.length>0&&<div className="frog-next-up"><small>COMING INTO SEASON</small>{next.slice(0,3).map(s=><p key={s.id}>{s.name} · roughly {s.daysUntil} days to the broad seasonal window</p>)}</div>}
              <div className="frog-dark-divider"/><p>Wood frogs and chorus frogs often lead the spring chorus. Green frogs and bullfrogs carry the sound into warm summer nights.</p>
            </div>
          </div>
        </section>
        <section className="frog-section" id="map"><div className="frog-section-top"><div><span className="frog-kicker dark">FROM DETROIT TO THE KEWEENAW</span><h2>A different chorus in every region</h2></div><p>Choose your location. The map changes seasonal timing, likely species and weather outlook. Markers represent forecast points, not actual frog sites.</p></div>
          <div className="frog-map-layout"><div className="frog-panel map-panel"><FrogMap selected={selected} onSelect={choose} rows={data?.regions}/></div>
            <div className="frog-panel frog-regions"><h3>Choose a region</h3><div className="frog-region-buttons">{REGIONS.map((r,i)=>{const item=data?.regions?.find(x=>x.id===r.id);return <button className={selected===r.id?'selected':''} aria-pressed={selected===r.id} key={r.id} onClick={()=>choose(r.id)}>
              <span className="frog-region-index">{String(i+1).padStart(2,'0')}</span><span><strong>{r.name}</strong><small>{item?.season?.status||'Regional forecast'}</small></span><span className="frog-region-arrow">↗</span></button>;})}</div>
              <p className="frog-region-foot">Regional forecasts are not wetland-level measurements. Shorelines, tree cover, pond depth and winter thaw can shift activity substantially.</p>
            </div>
          </div>
        </section>
        <section className="frog-section"><div className="frog-section-top"><div><span className="frog-kicker dark">THE CHORUS CALENDAR</span><h2>Who joins the concert—and when?</h2></div><p>Typical windows shown for {region.name}, shifted broadly for north–south climate. These are guides, not verified 2026 starts.</p></div>
          <div className="frog-timeline"><div className="frog-timeline-head"><b>SPECIES</b>{['MAR','APR','MAY','JUN','JUL','AUG'].map(m=><b key={m}>{m}</b>)}</div>
            {candidates.map(s=>{const a=Math.max(0,Math.min(100,(s.start+region.shift-59)/184*100)),b=Math.max(0,Math.min(100,(s.end+region.shift-59)/184*100));return <div className="frog-time-row" key={s.id}><a href={'#frog-'+s.id}>{s.name}</a><div className="frog-time-track"><span style={{left:a+'%',width:Math.max(1,b-a)+'%'}} className={s.earliest?'early':'later'}/></div></div>;})}
          </div><p className="frog-panel-foot">Calendar endpoints are approximate editorial seasonal windows and should not be mistaken for observed calling start or end dates. Isle Royale's boreal chorus frog is a special case, not represented by the mainland regional forecasts.</p>
        </section>
        <section className="frog-section" id="calls"><div className="frog-section-top"><div><span className="frog-kicker dark">THE MICHIGAN FROG SOUNDBOARD</span><h2>Which frog am I hearing?</h2></div><p>Learn the sound, then match it to the season and habitat. Audio samples are from USGS where available; rare species are not pinpointed on the map.</p></div>
          <div className="frog-filters" role="group" aria-label="Filter frogs by calling season">{[['all','All 13 species'],['early','First spring voices'],['spring','Late spring'],['summer','Summer callers']].map(([id,name])=><button key={id} className={filter===id?'active':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{name}</button>)}</div>
          <div className="frog-species-grid">{guideSpecies.map(s=><SpeciesCard species={s} region={region} date={key} key={s.id} featured={inWindow.includes(s.id)}/>)}</div>
          <p className="frog-panel-foot">Some taxa have restricted Michigan distributions. Fowler's toad is a species of special concern; Blanchard's cricket frog is threatened. No precise sites are provided. The DNR's official list includes both eastern and Cope's gray treefrogs, whose trills differ.</p>
        </section>
        <section className="frog-section"><div className="frog-section-top"><div><span className="frog-kicker dark">YOUR FIRST CHORUS WALK</span><h2>How to hear the show</h2></div><p>No expensive gear required. A quiet wetland edge and a few minutes of listening are enough.</p></div>
          <div className="frog-tips"><article><span>01 · WHERE</span><h3>Shallow water first</h3><p>Try pond margins, flooded woods, roadside wetland edges and vernal pools. Stay on open public paths or your own property and keep out of sensitive breeding habitat.</p></article>
            <article><span>02 · WHEN</span><h3>Start at dusk</h3><p>Choose a mild night with little wind. Wood frogs and chorus frogs may call during the day too. Early spring calls can be loud for only a few nights.</p></article>
            <article><span>03 · HOW</span><h3>Listen, don't disturb</h3><p>Stand quietly for five minutes, then compare what you hear to the samples. Never collect frogs or enter a pond to get closer. Leave breeding sites undisturbed.</p></article></div>
        </section>
        <section className="frog-section frog-faq"><div className="frog-section-top"><div><span className="frog-kicker dark">QUESTIONS PEOPLE ASK</span><h2>Michigan frog chorus FAQ</h2></div></div>{FAQ.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
        <section className="frog-sources"><span className="frog-kicker dark">HOW THIS TOOL WORKS</span><h2>Actual data. Clear limits.</h2>
          <p>Forecast temperatures, wind and precipitation come from the <a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noopener noreferrer">National Weather Service</a>. The recent rainfall and temperature context, when available, comes from <a href="https://docs.rcc-acis.org/acisws/" target="_blank" rel="noopener noreferrer">NOAA Regional Climate Center ACIS</a>. Species and recordings are based on <a href="https://www.michigan.gov/dnr/education/michigan-species/reptiles/frogs-and-toads" target="_blank" rel="noopener noreferrer">Michigan DNR</a> and the <a href="https://www.umesc.usgs.gov/terrestrial/amphibians/armi/frog_calls.html" target="_blank" rel="noopener noreferrer">USGS amphibian call library</a>.</p>
          <p><strong>What's modeled:</strong> regional calling windows and a 0–100 editorial evening-conditions index. <strong>What's not measured:</strong> microphone detections, first calls, frog abundance, water temperature, wetland water levels or calling probability. NWS forecasts update automatically, usually within 30-minute caches. A single representative station does not describe every marsh.</p>
          <p>Last refreshed: {updated||'Awaiting feed'} ET. {data?.advisory||'There is no confirmed calling observation feed.'}</p>
        </section>
      </div>
    </main>
    <footer className="frog-footer"><div className="frog-shell"><div><strong>MICHIGAN FROG CHORUS</strong><p>Part of the Michigan living calendar of natural phenomena.</p></div><div><a href="/bloom-tracker">Bloom tracker</a><a href="/firefly-tracker">Firefly forecast</a><a href="https://chrisizworski.com/chris-izworski/">Built by Chris Izworski</a></div></div></footer>
  </div>;
}
