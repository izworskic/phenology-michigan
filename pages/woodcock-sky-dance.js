import Head from 'next/head';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,Cloud,CloudRain,Clock,Compass,Feather,MapPin,Wind,Volume2,CalendarDays,Info,CheckCircle2} from 'lucide-react';
import WoodcockCartoMap from '../components/WoodcockCartoMap';
import WoodcockViewingFinder from '../components/WoodcockViewingFinder';
import {WoodcockAudioProvider,SkyDanceStage,StageCards,SoundQuiz,WoodcockFieldGuide} from '../components/WoodcockSoundExperience';
import {WOODCOCK_SITES,distanceMiles} from '../lib/woodcock-sites';
import {REGIONS} from '../lib/woodcock';

const URL='https://phenology.chrisizworski.com/woodcock-sky-dance';
const TITLE='Michigan Woodcock Sky Dance Forecast 2027 | When & Where to Watch';
const DESCRIPTION='When does the American woodcock sky dance happen in Michigan? See sunset-based peent listening times, spring timing by region, a 7-night weather outlook, and where to look.';
const FAQ=[
  ['When do woodcocks perform their sky dance in Michigan?','Primarily in spring, often beginning as thaw and northbound migration progress in March or April. Displays can continue into May and later in northern areas. Local arrival and habitat matter more than any single statewide date.'],
  ['What time does the American woodcock sky dance start?','USFWS singing-ground surveys start about 22 minutes after sunset with 75% or less cloud cover, or 15 minutes after sunset when more than 75% overcast. Arrive before sunset and listen through twilight. The display may begin earlier or last longer.'],
  ['What does a woodcock sound like?','Listen for a buzzy, nasal peent repeated from the ground. A male then spirals upward, making twittering wing sounds, and descends with melodic chirps. Press play on the sky dance at the top of this page, try the Name that sound ear test, or use Cornell’s recordings to learn them before you go.'],
  ['What weather is best for a woodcock sky dance?','For listening, prefer evenings at or above 40°F with light wind and little precipitation. The U.S. Fish and Wildlife Service avoids surveys below 40°F, in strong wind or heavy precipitation. Weather suitability is not a guarantee that birds are present.'],
  ['Where can I see woodcocks in Michigan?','Scout small grassy openings next to damp young woods, alders, aspen, shrubs or forest edges. Use official DNR state game area maps to identify permitted public access. A weather region marker on this page is not a known display location.'],
  ['Can I watch a woodcock sky dance in October?','A fall courtship forecast would be misleading. This page treats autumn and winter as off season and shows broad upcoming spring planning windows, not a fabricated live activity score.']
];
const LD={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':URL+'#webpage',url:URL,name:TITLE,description:DESCRIPTION,inLanguage:'en-US',author:{'@id':'https://chrisizworski.com/#person'}},
  {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Woodcock Sky Dance Forecast',applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,url:URL,description:DESCRIPTION,author:{'@id':'https://chrisizworski.com/#person'}},
  {'@type':'FAQPage','@id':URL+'#faq',mainEntity:FAQ.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Michigan Phenology',item:'https://phenology.chrisizworski.com/'},{'@type':'ListItem',position:2,name:'Woodcock Sky Dance',item:URL}]}
]};
const monthName=md=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date('2027-'+md+'T12:00:00Z'));
const formatDate=date=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
const fmtYearDate=date=>date?formatDate(date):'—';
const JUMP=[['listen','Sky dance'],['forecast','Forecast'],['seven-nights','7 nights'],['map','Map & places'],['name-that-sound','Ear test'],['field-guide','Field guide'],['faq','FAQ']];
// Sticky in-page navigation; highlights the section on screen.
function JumpNav(){
  const [active,setActive]=useState('listen');
  useEffect(()=>{
    if(typeof IntersectionObserver==='undefined')return;
    const seen=new Map();
    const io=new IntersectionObserver(es=>{for(const e of es)seen.set(e.target.id,e.isIntersecting?e.boundingClientRect.top:null);
      const vis=JUMP.map(([id])=>id).filter(id=>seen.get(id)!=null);if(vis.length)setActive(vis[0]);},{rootMargin:'-80px 0px -55% 0px'});
    JUMP.forEach(([id])=>{const el=document.getElementById(id);if(el)io.observe(el);});
    return()=>io.disconnect();
  },[]);
  return <nav className="wsx-jump" aria-label="On this page"><div className="woodcock-container">{JUMP.map(([id,label])=><a key={id} href={'#'+id} className={active===id?'on':''} aria-current={active===id?'location':undefined}>{label}</a>)}</div></nav>;
}
// The forecast's answer, surfaced at the top of the page.
function ForecastTeaser({loading,offSeason,region,best,selectedNight,hasWeather,opening}){
  const night=best||selectedNight;
  let k,main,sub;
  if(loading){k='YOUR FORECAST';main='Checking '+region.name+'…';sub='Sunset timing and NWS evening weather';}
  else if(offSeason){k='OFF SEASON · '+region.name.toUpperCase();main='Next spring, from about '+opening;sub='Typical window '+monthName(region.window[0])+' – '+monthName(region.window[1])+'. Learn the sounds now.';}
  else if(night&&hasWeather){k='BEST EVENING · '+region.name.toUpperCase();main=formatDate(night.date)+(night.startLabel?' · listen from '+night.startLabel:'');sub=(night.label||'')+(night.score!=null?' · weather fit '+night.score+'/100':'');}
  else{k='YOUR FORECAST · '+region.name.toUpperCase();main=night?.startLabel?'Listen from '+night.startLabel:'Sunset listening window';sub='Seven-night weather outlook below';}
  return <a className="wsx-teaser" href="#forecast"><span className="wsx-teaser-k"><CalendarDays size={14}/> {k}</span><strong>{main}</strong><small>{sub}</small><span className="wsx-teaser-go">Plan your evening ↓</span></a>;
}
function Rating({tone,children}){return <span className={'woodcock-status '+(tone||'unknown')}>{children}</span>;}
function NightChart({nights,choice,onSelect,best}){
  return <div className="woodcock-night-grid" role="list" aria-label="Seven evening weather-fit comparison">
    {nights.map(n=><button type="button" role="listitem" key={n.date} className={'woodcock-night '+(choice?.date===n.date?'selected ':'')+(n.tone||'unknown')} aria-pressed={choice?.date===n.date} onClick={()=>onSelect(n.date)}>
      <strong>{formatDate(n.date).split(',')[0]}</strong><span>{formatDate(n.date).split(',').slice(1).join(',').trim()}</span>
      <div className="woodcock-bar-track"><div style={{height:(n.score==null?4:Math.max(4,n.score))+'%'}}/></div>
      <b>{n.score==null?'—':n.score}<small>{n.score==null?'':' / 100'}</small></b>
      <span className="woodcock-night-temp">{n.temp==null?'Forecast n/a':n.temp+'°F'}</span>
      {n.date===best?.date&&<em>BEST WINDOW</em>}
      {n.passed&&<span className="woodcock-night-past">Passed</span>}
    </button>)}
  </div>;
}
export default function WoodcockPage(){
  const [selection,setSelection]=useState('saginaw-bay');
  const [selectedSite,setSelectedSite]=useState('lame-duck');
  const setForecastRegion=id=>{setSelection(id);const next=REGIONS.find(r=>r.id===id);if(next){const nearest=[...WOODCOCK_SITES].sort((a,b)=>distanceMiles(next,a)-distanceMiles(next,b))[0];if(nearest)setSelectedSite(nearest.id);}};
  const chooseSite=id=>{const site=WOODCOCK_SITES.find(s=>s.id===id);if(site){setSelectedSite(id);setSelection(site.regionId);}};
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(true);
  const [requestError,setRequestError]=useState('');
  const [picked,setPicked]=useState(null);
  const region=REGIONS.find(r=>r.id===selection)||REGIONS[4];
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setResult(null);setPicked(null);setRequestError('');
    fetch('/api/woodcock?region='+encodeURIComponent(selection),{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Forecast API unavailable');return r.json();})
      .then(data=>{setResult(data);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setRequestError('Regional forecast could not be retrieved. The spring calendar and field guide below remain available.');setLoading(false);}});
    return ()=>controller.abort();
  },[selection]);
  const current=result?.region;
  const nights=current?.nights||[];
  const selectedNight=useMemo(()=>nights.find(n=>n.date===picked)||nights.find(n=>!n.passed&&n.season?.inSeason)||nights[0]||null,[nights,picked]);
  const spring=current?.spring;
  const offSeason=current?.season?.inSeason===false;
  const hasWeather=nights.some(n=>Number.isFinite(n.score));
  const opening=spring?.opens?fmtYearDate(spring.opens):monthName(region.window[0]);
  return <WoodcockAudioProvider><div className="woodcock-tool">
    <Head>
      <title>{TITLE}</title><meta name="description" content={DESCRIPTION}/><link rel="canonical" href={URL}/>
      <meta property="og:type" content="website"/><meta property="og:title" content={TITLE}/><meta property="og:description" content={DESCRIPTION}/><meta property="og:url" content={URL}/>
      <meta name="twitter:card" content="summary"/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(LD)}}/>
      <link rel="stylesheet" href="/woodcock.css"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    </Head>
    <header className="woodcock-nav woodcock-container">
      <a className="woodcock-mark" href="/">MICHIGAN <span>PHENOLOGY</span></a>
      <nav aria-label="Related tools"><a href="/hummingbird-tracker">Hummingbirds</a><a href="/firefly-tracker">Fireflies</a><a href="/bloom-tracker">Bloom Tracker</a></nav>
    </header>
    <main>
      <section className="woodcock-hero" id="listen" aria-labelledby="woodcock-title">
        <div className="woodcock-container woodcock-hero-grid">
          <div className="woodcock-intro">
            <div className="woodcock-kicker"><Feather size={16}/> GREAT LAKES · SPRING FIELD GUIDE</div>
            <h1 id="woodcock-title">When the woods <i>begin to dance.</i></h1>
            <p className="woodcock-subtitle">Michigan Woodcock Sky Dance Forecast</p>
            <p className="woodcock-description">Hear the timberdoodle’s <em>peent</em>, twittering climb and chirping fall, then find the spring evening, the twilight moment and the edge of the woods to hear it yourself.</p>
            <ForecastTeaser loading={loading} offSeason={offSeason} region={region} best={current?.best} selectedNight={selectedNight} hasWeather={hasWeather} opening={opening}/>
            <div className="woodcock-hero-tags"><span><Clock size={15}/> Sunset-timed</span><span><Wind size={15}/> NWS evening weather</span><span><Compass size={15}/> Nine Michigan regions</span><span><Volume2 size={15}/> Real recordings</span></div><a className="woodcock-hero-location-link" href="#woodcock-access-atlas">Explore six documented viewing areas <ArrowUpRight size={16}/></a>
          </div>
          <SkyDanceStage/>
        </div>
        <div className="woodcock-container wsx-hero-cards"><StageCards/></div>
      </section>
      <JumpNav/>
      <section className="woodcock-container woodcock-decision" id="forecast">
        <div className="woodcock-section-head"><div><span className="woodcock-eyebrow">YOUR EVENING PLAN</span><h2>When should you go?</h2></div><p>Choose a Michigan region. The tool measures conditions for listening, not the probability of a woodcock sighting.</p></div>
        <div className="woodcock-select-row">
          <label htmlFor="woodcock-region">Forecast region</label>
          <select id="woodcock-region" value={selection} onChange={e=>setForecastRegion(e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <span className="woodcock-data-status">{loading?'Checking seasonal outlook…':result?'Forecast checked '+new Date(result.generatedAt).toLocaleDateString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric'}):'Historical seasonal guidance'}</span>
        </div>
        <div className="woodcock-answer-grid">
          <article className="woodcock-primary-card">
            <div className="woodcock-card-kicker"><CalendarDays size={16}/>{offSeason?'OUTSIDE SPRING DISPLAY SEASON':'SUNSET LISTENING WINDOW'}</div>
            <div className="woodcock-main-answer">{loading?'Checking season…':offSeason?'Next spring':selectedNight?.startLabel||'Weather pending'}</div>
            <h3>{offSeason?('Typical spring window: '+monthName(region.window[0])+' – '+monthName(region.window[1])):selectedNight?fmtYearDate(selectedNight.date)+' · '+selectedNight.startLabel+' to '+selectedNight.endLabel:'Your evening forecast'}</h3>
            <p>{offSeason?'Woodcock sky dance watching is a spring activity. No October display claim or invented weather score. For '+region.name+', start scouting as the ground thaws around '+opening+'.':selectedNight?'Arrive at sunset ('+selectedNight.sunsetLabel+'); begin listening '+selectedNight.cloudRule+'. Remain quietly at the edge of the opening for 30–40 minutes.':'The sunset window appears when the regional outlook is ready.'}</p>
            {offSeason?<Rating tone="off">Seasonal planning · no live sky dance claim</Rating>:<Rating tone={selectedNight?.tone}>{selectedNight?.label||'Awaiting evening weather'}</Rating>}
            {result?.forecastError&&<p className="woodcock-attention" role="status">{result.forecastError}</p>}
            {requestError&&<p className="woodcock-attention" role="status">{requestError}</p>}
          </article>
          <div className="woodcock-conditions">
            <div className="woodcock-mini-card"><span><Clock size={17}/> Sunset</span><strong>{selectedNight&&!offSeason?selectedNight.sunsetLabel:'Spring dusk'}</strong><small>Calculated for {region.name}</small></div>
            <div className="woodcock-mini-card"><span><Wind size={17}/> Wind</span><strong>{!offSeason&&selectedNight?.wind!=null?selectedNight.wind+' mph':'—'}</strong><small>{offSeason?'Off-season forecast not generated':'Near listening time · NWS'}</small></div>
            <div className="woodcock-mini-card"><span><CloudRain size={17}/> Rain chance</span><strong>{!offSeason&&selectedNight?.pop!=null?selectedNight.pop+'%':'—'}</strong><small>{offSeason?'Returns in spring':'NWS hourly precipitation chance'}</small></div>
            <div className="woodcock-mini-card"><span><Cloud size={17}/> Sky cover</span><strong>{!offSeason&&selectedNight?.clouds!=null?selectedNight.clouds+'%':'—'}</strong><small>USFWS 15/22-minute timing rule</small></div>
          </div>
        </div>
        <div className="woodcock-method-note"><Info size={16}/><span>USFWS survey rule: do not conduct listening surveys below <strong>40°F</strong>, in strong wind or heavy precipitation. Our index is a planning heuristic, not a species observation. Sunset times are regional astronomical estimates.</span></div>
      </section>
      <section className="woodcock-container woodcock-section" id="seven-nights">
        <div className="woodcock-section-head"><div><span className="woodcock-eyebrow">THE SEVEN-EVENING OUTLOOK</span><h2>Find the quieter, milder night.</h2></div><p>Compare the evening temperature, wind and rain around the actual dusk window — not arbitrary 8–11 p.m. conditions.</p></div>
        {loading?<div className="woodcock-empty">Preparing seven-night regional calendar…</div>:
          offSeason?<div className="woodcock-offseason">
            <div><span className="woodcock-offseason-mark">SPRING SEASON</span><h3>Forecasting will resume when spring approaches.</h3><p>For {region.name}, our broad planning window is {monthName(region.window[0])} to {monthName(region.window[1])}. Those dates are a field-planning guide, not the USFWS survey schedule or a confirmed bird arrival.</p></div>
            <div className="woodcock-season-months"><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span></div>
          </div>:
          hasWeather?<div className="woodcock-chart-panel">
            <NightChart nights={nights} choice={selectedNight} onSelect={setPicked} best={current?.best}/>
            <div className="woodcock-night-detail">
              <div><Rating tone={selectedNight?.tone}>{selectedNight?.label||'Unknown'}</Rating><h3>{selectedNight?fmtYearDate(selectedNight.date):'Select a night'}</h3><p>{selectedNight?.reasons?.join(' · ')||'No complete weather information.'}</p></div>
              <div className="woodcock-detail-stats"><span><strong>{selectedNight?.startLabel||'—'}</strong> Begin listening</span><span><strong>{selectedNight?.temp!=null?selectedNight.temp+'°F':'—'}</strong> Air temp</span><span><strong>{selectedNight?.score!=null?selectedNight.score+'/100':'—'}</strong> Weather fit</span></div>
            </div>
            <p className="woodcock-chart-caution">Scores compare <strong>listening conditions only</strong>. They cannot establish presence, abundance, actual flight activity, or a statistical sighting probability. NWS forecasts may change.</p>
          </div>:<div className="woodcock-empty">The seven-evening NWS forecast is currently incomplete. The sunset timing and field guide remain available; no substitute weather scores are shown.</div>}
      </section>
      <section className="woodcock-container woodcock-section" id="map">
        <div className="woodcock-section-head"><div><span className="woodcock-eyebrow">EXPLORE MICHIGAN</span><h2>Find the woods where people watched.</h2></div><p>Switch between six documented historical walk venues and nine regional weather points. Venue pins show an approach or approximate property point, never the birds’ exact display ground.</p></div>
        <div className="woodcock-map-layout">
          <WoodcockCartoMap selected={selection} onSelect={setForecastRegion} selectedSite={selectedSite} onPickSite={chooseSite}/>
          <div className="woodcock-region-sidebar">
            <div className="woodcock-sidebar-heading">REGIONAL SPRING WINDOWS <small>Approximate, habitat-dependent</small></div>
            {REGIONS.map((r,i)=><button type="button" className={'woodcock-region-choice '+(selection===r.id?'active':'')} key={r.id} aria-pressed={selection===r.id} onClick={()=>setForecastRegion(r.id)}>
              <span className="woodcock-region-index">{String(i+1).padStart(2,'0')}</span>
              <span><strong>{r.name}</strong><small>{monthName(r.window[0])} – {monthName(r.window[1])}</small></span>
              <span className="woodcock-region-arrow">↗</span>
            </button>)}
          </div>
        </div>
        <WoodcockViewingFinder regionId={selection} selectedSite={selectedSite} onPickSite={chooseSite}/>
      </section>
      <section className="woodcock-container woodcock-section wsx-quiz-section"><SoundQuiz/></section>
      <WoodcockFieldGuide>
        <div className="wsx-where-grid">
          <div id="where"><h3>Where to stand: openings beside young woods</h3>
            <ol className="wsx-habitat">
              <li><b>Small grassy clearings.</b> Old fields, two-track openings, utility corridors or lightly vegetated gaps. Look along the edge, not the middle of a huge bare farm field.</li>
              <li><b>Young, damp forest edges.</b> Nearby alder, poplar, aspen and other early-growth shrubs, with moist soils that support earthworms.</li>
              <li><b>Dark, quiet access.</b> Scout parking and legal access during daylight. Keep to approved roads or trails, observe from the perimeter and avoid bright lights.</li>
            </ol></div>
          <div id="how-to"><h3>Make your evening count</h3>
            <ul className="woodcock-fieldgrid">
              <li><CheckCircle2 size={18}/><span>Arrive 15–20 minutes <strong>before sunset</strong>. Check the trail and exit while it is light.</span></li>
              <li><CheckCircle2 size={18}/><span>Stand or sit on the eastern side of a clearing when possible, so birds silhouette against the western sky.</span></li>
              <li><CheckCircle2 size={18}/><span>Bring a light for safe departure; keep it off the birds and nesting areas.</span></li>
              <li><CheckCircle2 size={18}/><span>Avoid playback, flash photography and approaching a peenting male. Remain outside the display ground.</span></li>
            </ul></div>
        </div>
      </WoodcockFieldGuide>
      <section className="woodcock-container woodcock-section woodcock-faq" id="faq"><span className="woodcock-eyebrow">QUESTIONS FROM THE FIELD</span><h2>Woodcock sky dance FAQ</h2>{FAQ.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <section className="woodcock-container woodcock-sources"><h2>Sources & forecast integrity</h2><p>Woodcock calls, courtship habitat and observation guidance are from the USFWS, Michigan DNR, Audubon and Cornell. Forecast weather comes from the National Weather Service. The season ranges and 0–100 weather-fit index are this tool’s explicitly non-validated planning heuristics. No real-time woodcock observation feed is connected.</p>
        <div><a href="https://migbirdapps.fws.gov/woodcock/survey_instructions.htm" target="_blank" rel="noopener noreferrer">USFWS survey timing and weather rules ↗</a><a href="https://www.dnr.state.mi.us/publications/pdfs/huntingwildlifehabitat/landowners_guide/Resource_Dir/Acrobat/Woodcock.PDF" target="_blank" rel="noopener noreferrer">Michigan DNR woodcock habitat guidance ↗</a><a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noopener noreferrer">NWS forecast API ↗</a><a href="https://www.audubon.org/magazine/do-yourself-favor-spring-go-see-american-woodcocks-sky-dance" target="_blank" rel="noopener noreferrer">Audubon viewing guide ↗</a></div>
      </section>
    </main>
    <footer className="woodcock-footer woodcock-container"><span>Field guide by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> · Michigan Phenology</span><span>Plan thoughtfully. Keep singing grounds undisturbed.</span></footer>
  </div></WoodcockAudioProvider>;
}
