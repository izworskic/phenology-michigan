import Head from 'next/head';
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import {SITES,closestFrostSite} from '../lib/frostMorning.mjs';
import FrostDawnDecision from '../components/FrostDawnDecision';
import FrostVerificationHistory from '../components/FrostVerificationHistory';
import FrostCartoMap from '../components/FrostCartoMap';
import FrostFieldGuide from '../components/FrostFieldGuide';
const FrostExplorer=dynamic(()=>import('../components/FrostExplorer'),{ssr:false});
const FrostNightJourney=dynamic(()=>import('../components/FrostNightJourney'),{ssr:false});
const URL='https://phenology.chrisizworski.com/frosty-mornings';
const TITLE='Michigan Frosty Morning Predictor: Hoarfrost Forecast';
const DESCRIPTION='Explore Michigan frosty mornings with NWS weather clues, sunrise plans and an interactive field guide covering 12 forecast areas.';
const QUESTIONS=[
['What should I look for on a frosty morning?','Start with exposed grass, twig tips and fence wires. Notice whether white crystals collect on thin surfaces or in sheltered low spots. Your observations may tell a richer story than a single temperature reading.'],
['Why can frost appear when the forecast says 35°F?','The forecast describes air conditions over a region, not the temperature of a blade of grass. On calm, clear nights exposed surfaces can fall to 32°F or below even if measured air temperatures remain in the mid-30s.'],
['What is hoarfrost?','Hoarfrost grows when water vapor deposits directly as ice onto a sufficiently cold surface. It can look like delicate feathers or needles along branches, leaves and wires.'],
['How is hoarfrost different from frozen dew or rime?','Frozen dew starts as liquid droplets that later freeze. Rime grows when supercooled fog droplets freeze on contact. Appearance gives clues, but a forecast alone cannot identify which kind of ice formed.'],
['When should I arrive for frost photography?','Aim to arrive around civil dawn so you can scout a legal public viewpoint before sunrise. The suggested photo window is a lighting guide, not a prediction of when frost will melt.'],
['Will a high frost setup score guarantee white trees?','No. The experimental 0–100 index compares forecast conditions, not the chance of observed frost. Surface temperature, local moisture, wind shelter and fog can change the outcome within a short distance.'],
['Can a cold front create a frosty-looking morning?','Cold air alone does not guarantee hoarfrost. Wind and clouds may disrupt surface cooling, while a white coating formed in freezing fog may be rime. Compare the overnight pattern with what you observe.'],
['Where can I safely see frost?','Look for accessible public trails near meadows, wetlands and leafless vegetation. Confirm access, avoid private fields, respect fragile plants and check NWS alerts and local road reports before traveling.']
];
const person={'@type':'Person','@id':'https://chrisizworski.com/#person',name:'Chris Izworski',url:'https://chrisizworski.com/'};
const schema={'@context':'https://schema.org','@graph':[
  person,
  {'@type':'WebPage','@id':URL+'#page',url:URL,name:TITLE,description:DESCRIPTION,isPartOf:{'@type':'WebSite',url:'https://phenology.chrisizworski.com/'},author:{'@id':person['@id']},publisher:{'@id':person['@id']}},
  {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Frosty Morning Predictor',url:URL,description:DESCRIPTION,applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,creator:{'@id':person['@id']}},
  {'@type':'FAQPage',mainEntity:QUESTIONS.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
]};
const day=date=>date?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date+'T12:00:00Z')):'—';
const stamp=s=>s?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'}).format(new Date(s)):'Not available';
const hour=h=>h==null?'—':(h%12||12)+(h>=12?' p.m.':' a.m.');
const photoTime=(s,tz='America/Detroit')=>s?new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(new Date(s)):'—';
const tone=n=>n==null?'unknown':n>=75?'strong':n>=55?'possible':n>=30?'limited':'low';
function Score({value}){return <span className={'fm-score '+tone(value)}>{value==null?'—':value}<small>{value==null?'unavailable':' / 100'}</small></span>;}
function HourlyChart({morning}){
  if(!morning?.hourly?.length)return <div className='fm-empty'>Hourly weather inputs are unavailable.</div>;
  return <div className='fm-hours' role='list' aria-label='Dawn hourly frost-friendly conditions'>
    {morning.hourly.map(h=><div key={h.time} className='fm-hour' role='listitem'>
      <div className='fm-hour-graph' title={h.score===null?'Data unavailable':h.score+' setup index'}><div style={{height:(h.score==null?3:Math.max(h.score,3))+'%'}} className={tone(h.score)}/></div>
      <strong>{hour(h.hour)}</strong>
      <small>{h.score==null?'—':h.score}</small>
    </div>)}
  </div>;
}
export default function FrostyMornings(){
  const [chosen,setChosen]=useState('bay-city');
  const [board,setBoard]=useState(null),[boardErr,setBoardErr]=useState('');
  const [location,setLocation]=useState(null),[loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [morningIndex,setMorningIndex]=useState(0);
   const [focusDate,setFocusDate]=useState('');
  const [locating,setLocating]=useState(false),[geoError,setGeoError]=useState('');
  const [boardAttempt,setBoardAttempt]=useState(0);
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('location');if(SITES.some(s=>s.id===id))setChosen(id);},[]);
  useEffect(()=>{
    const c=new AbortController();
    setBoardErr('');setBoard(null);
    fetch('/api/frosty-mornings?mode=board',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('Regional board could not load');return r.json()})
      .then(v=>setBoard(v)).catch(e=>{if(e.name!=='AbortError')setBoardErr(e.message);});
    return ()=>c.abort();
  },[boardAttempt]);
  useEffect(()=>{
    const c=new AbortController();
    setLoading(true);setError('');setLocation(null);setMorningIndex(0);
    fetch('/api/frosty-mornings?mode=site&site='+encodeURIComponent(chosen),{signal:c.signal})
      .then(r=>{if(!r.ok)throw Error('Location forecast request failed');return r.json();})
      .then(v=>{setLocation(v.location);const idx=v.location?.mornings?.findIndex(m=>m.photo?.status!=='passed');setMorningIndex(idx>=0?idx:0);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return ()=>c.abort();
  },[chosen]);
  const choose=id=>{setChosen(id);const u=new URL(window.location.href);u.searchParams.set('location',id);window.history.replaceState(null,'',u.pathname+u.search);};
  const findNearest=()=>{
    setGeoError('');
    if(!navigator.geolocation){setGeoError('Location services are unavailable; select an area below.');return;}
    setLocating(true);
    navigator.geolocation.getCurrentPosition(pos=>{
      const nearest=closestFrostSite(pos.coords.latitude,pos.coords.longitude);
      setLocating(false);
      if(nearest)choose(nearest.id);
      else setGeoError('No nearby forecast point; select an area below.');
    },()=>{
      setLocating(false);setGeoError('Location access unavailable or declined; select an area below.');
    },{enableHighAccuracy:false,timeout:8000,maximumAge:600000});
  };
  const site=SITES.find(s=>s.id===chosen)||SITES[0];
  const mornings=location?.mornings||[];
  const availableDates=[...new Set((board?.locations||[]).flatMap(s=>(s.mornings||[]).map(m=>m.date)))].sort().slice(0,3);
   const activeDate=focusDate||availableDates[0]||mornings[0]?.date||'';
   const selectedMorning=activeDate?(mornings.find(m=>m.date===activeDate)||null):(mornings[morningIndex]||mornings[0]||null);
  const scored=(board?.locations||[]).filter(s=>s.best?.score!=null).sort((a,b)=>b.best.score-a.best.score||a.name.localeCompare(b.name));
  const photoLeaders=(board?.locations||[]).filter(s=>s.bestPhoto).sort((a,b)=>({'strong':3,'possible':2,'limited':1}[b.bestPhoto.photo.status]-{'strong':3,'possible':2,'limited':1}[a.bestPhoto.photo.status])||a.bestPhoto.date.localeCompare(b.bestPhoto.date));
  const featured=photoLeaders.length?photoLeaders:scored;
  const photo=selectedMorning?.photo;
  return <div className='fm-tool'>
    <Head><title>{TITLE} | Chris Izworski</title><meta name='description' content={DESCRIPTION}/><link rel='canonical' href={URL}/>
      <meta name='robots' content='index,follow,max-image-preview:large'/><meta property='og:type' content='website'/><meta property='og:title' content={TITLE}/>
      <meta property='og:description' content={DESCRIPTION}/><meta property='og:url' content={URL}/><meta name='twitter:card' content='summary'/>
      <link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/>
      <link rel='stylesheet' href='/frosty-mornings.css'/><link rel='stylesheet' href='/frost-explorer.css'/><link rel='stylesheet' href='/frost-night.css'/><link rel='stylesheet' href='/frost-field-guide.css'/><script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/></Head>
    <div className='fm-top'><a href='/'>MICHIGAN PHENOLOGY</a><nav aria-label='Page sections'><a href='#field-guide'>Field guide</a><a href='#forecast'>The forecast</a><a href='#frost-explorer'>Explore the data</a><a href='#overnight-journey'>Overnight cooling</a><a href='#sunrise-guide'>Sunrise plan</a><a href='#frost-verification'>Evidence history</a><a href='#places'>Michigan map</a><a href='#science'>How it works</a><a href='/lake-smoke'>Lake smoke ↗</a></nav></div>
    <header className='fm-hero'>
      <img className='fm-hero-image' src='https://commons.wikimedia.org/wiki/Special:FilePath/Frosty_morning%2C_tree_with_frost_covered_branches_%2848788814943%29.jpg?width=1400'
        alt='Reference photograph of a frost-covered tree from the U.S. Fish and Wildlife Service, not a current Michigan observation'/>
      <div className='fm-hero-shade'/>
      <div className='fm-wrap fm-hero-content'><div className='fm-eyebrow'>Michigan's living calendar · a sunrise worth noticing</div>
        <h1>Will tomorrow be a <em>frosty morning?</em></h1>
        <p>Some mornings a quiet meadow turns white before the sun reaches the treetops. Explore what the weather is telling us—and learn what to look for when you step outside.</p>
        <div className='fm-pills'><span>12 forecast locations</span><span>Live NWS weather clues</span><span>Three upcoming dawns</span><span>Interactive field guide</span></div>
      </div>
    </header>
    <main className='fm-wrap'>
      <p className='fm-image-credit'>Reference image: U.S. Fish &amp; Wildlife Service, Midwest Region (public domain), photographed in Wisconsin. Not a live frost report. <a href='https://commons.wikimedia.org/wiki/File:Frosty_morning,_tree_with_frost_covered_branches_(48788814943).jpg' target='_blank' rel='noreferrer'>Image source</a>.</p>
      <section className='fm-status' aria-label='Michigan frosty morning outlook'><div className='fm-eyebrow dark'>First, choose a morning worth exploring</div>
        <div className='fm-status-row'><div><h2>{!board&&!boardErr?'Checking forecast conditions across Michigan…':boardErr?'Regional forecasts unavailable':scored.length?'Where might the next silver morning be?':'No locations currently qualify for a reliable ranking'}</h2>
          <p>{boardErr||'Look for places where cold air, moisture and quiet skies may come together. Scores compare weather ingredients—not the chance of seeing frost.'}</p></div>
          <div className='fm-status-total'><strong>{board?scored.length:'—'} / {SITES.length}</strong><small>forecast locations with complete dawn inputs</small><small>{board?.generatedAt?'Checked '+stamp(board.generatedAt):'Waiting for source data'}</small></div></div>
        {featured.length>0&&<><p className='fm-board-heading'>{photoLeaders.length?'Mornings worth a closer look':'Available frost setups · sunrise conditions not ranked'}</p><div className='fm-top-three'>{featured.slice(0,3).map((s,i)=>{const m=s.bestPhoto||s.best;return <button key={s.id} type='button' onClick={()=>{setFocusDate(m.date);choose(s.id);document.getElementById('forecast')?.scrollIntoView({behavior:'smooth'});}}>
          <small>#{i+1} · {day(m.date)}</small><strong>{s.name}</strong><div><Score value={m.score}/><span>{m.photo?.label||m.label}</span></div><small>{m.photo?.sunriseAt?'Sunrise ~ '+photoTime(m.photo.sunriseAt,s.tz)+' · arrive ~ '+photoTime(m.photo.arriveAt,s.tz):'Sunrise unavailable'}</small></button>;})}</div></>}
        {board&&scored.length===0&&<p className='fm-empty'>No complete morning forecasts to rank. No historical averages are substituted.</p>}
        {boardErr&&<button className='fm-retry-button' type='button' onClick={()=>setBoardAttempt(n=>n+1)}>Retry NWS forecasts</button>}
      </section>
      <FrostDawnDecision morning={selectedMorning} site={site} loading={loading} error={error||location?.status==='unavailable'?error||location?.note:''} issuedAt={location?.issuedAt}/>
      <FrostFieldGuide morning={selectedMorning} site={site}/>
       <section id='places' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Choose your landscape</div><h2>Where could the morning turn silver?</h2></div>
        <p>Pick a morning, then a map point. Follow the same forecast through sunrise advice, the overnight story and hourly charts. Markers represent NWS forecast areas—not verified frost sightings.</p></div>
        <div className='fm-day-picker' role='group' aria-label='Compare Michigan forecast dates'><strong>Which sunrise are you curious about?</strong>
         {(availableDates.length?availableDates:mornings.map(m=>m.date)).map(date=><button key={date} type='button' aria-pressed={activeDate===date} onClick={()=>setFocusDate(date)}>{day(date)}</button>)}
         <small>Every map number refers to the morning you selected.</small></div>
         <div className='fm-explore'><FrostCartoMap chosen={chosen} onChoose={choose} board={board?.locations} location={location} date={activeDate}/>
          <div className='fm-place-list'><label htmlFor='fm-location'>Explore a Michigan forecast area</label>
            <button type='button' className='fm-nearest-button' disabled={locating} onClick={findNearest}>{locating?'Finding nearest weather point…':'Find nearest forecast point'}</button>
            <p className='fm-private-note'>Optional device location. Exact coordinates stay in your browser; only the selected forecast location is requested.</p>
            {geoError&&<p className='fm-nearest-error' role='status'>{geoError}</p>}
            <select id='fm-location' value={chosen} onChange={e=>choose(e.target.value)}>{SITES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className='fm-place-scroll'>{SITES.map(s=>{const row=board?.locations?.find(b=>b.id===s.id);return <button type='button' key={s.id} className={chosen===s.id?'selected':''} onClick={()=>choose(s.id)}>
              <span><strong>{s.name}</strong><small>{s.region}</small></span><span className='fm-place-number'>{row?.mornings?.find(m=>m.date===activeDate)?.score??'—'}</span></button>;})}</div>
          </div></div>
      </section>
      <section id='forecast' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Your sunrise choices</div><h2>{site.name}: three mornings to compare</h2></div>
        <p>Which morning has the best mix of moisture, gentle wind and cold air? The 0–100 index is a forecast comparison, <strong>not a probability or frost sighting</strong>.</p></div>
        {loading?<div className='fm-panel fm-empty'>Loading local NWS temperature, dew point, sky cover and wind grids…</div>:
          error?<div className='fm-panel fm-empty'>{error}</div>:
          location?.status==='unavailable'?<div className='fm-panel fm-empty'>{location.note}</div>:
          <div className='fm-forecast'>
            <div className='fm-panel'><span className='fm-kicker'>The most favorable forecast morning</span><div className='fm-big-score'><Score value={location?.best?.score}/><div><strong>{location?.best?.label||'Forecast incomplete'}</strong><small>{location?.best?day(location.best.date)+' · around '+hour(location.best.bestHour):'No complete dawn window'}</small></div></div>
              <p>{location?.best?.explanation||'No reliable morning forecast currently meets the source-completeness requirements.'}</p>
              <p className='fm-field-note'>Start with grasses and bare twigs in an accessible meadow. Did the night become still and clear? A favorable score is an invitation to look, not a promise of white branches.</p>
              <small>Forecast grid update: {stamp(location?.issuedAt)} · Source: NWS · Site context: {site.setting}</small>
            </div>
            <div className='fm-panel'><span className='fm-kicker'>Choose the date</span><h3>Which dawn tells the better story?</h3>
              <div className='fm-day-list'>{mornings.length?mornings.map((m,i)=><button type='button' key={m.date} aria-pressed={selectedMorning?.date===m.date} className={selectedMorning?.date===m.date?'active':''} onClick={()=>{setMorningIndex(i);setFocusDate(m.date);}}>
                <span><strong>{day(m.date)}</strong><small>{m.photo?.sunriseAt?'Sunrise ~ '+photoTime(m.photo.sunriseAt):'Sunrise unavailable'}</small></span>
                <span className='fm-day-track'><span className={tone(m.score)} style={{width:(m.score||0)+'%'}}/></span>
                <b>{m.score==null?'—':m.score}</b>
              </button>):<div className='fm-empty'>No upcoming complete morning windows.</div>}</div>
              <small>Select a day to carry it through the map, field guide and charts. The numbers describe forecast weather, not ice on plants.</small>
            </div>
          </div>}
        {selectedMorning&&<section id='sunrise-guide' className='fm-photo-plan' aria-label='Sunrise photography plan'>
          <div className='fm-section-heading compact'><div><div className='fm-eyebrow dark'>Meet the morning light</div><h3>{day(selectedMorning.date)} · your field outing</h3></div>
            <span className={'fm-photo-status '+(photo?.status||'unavailable')}>{photo?.label||'Weather unavailable'}</span></div>
          {photo?.sunriseAt?<><div className='fm-photo-steps'>
            <div><small>Arrive by · civil dawn</small><strong>{photoTime(photo.arriveAt,site.tz)}</strong><span>Find a safe place to watch as light changes</span></div>
            <div><small>Approximate sunrise</small><strong>{photoTime(photo.sunriseAt,site.tz)}</strong><span>Calculated for {site.name}</span></div>
            <div><small>Suggested photography window</small><strong>{photoTime(photo.windowStartAt,site.tz)}–{photoTime(photo.windowEndAt,site.tz)}</strong><span>Best-light suggestion, not a melting prediction</span></div>
          </div><div className='fm-photo-timeline' role='img' aria-label='Arrival at civil dawn, sunrise, then photography shortly after sunrise'><span>Civil dawn</span><span>Sunrise</span><span>After sunrise</span><div className='fm-photo-track'><i/><i/><i/></div></div>
          <p className='fm-photo-why'>{photo.reason}</p>
          {photo.frostSetup!=null&&<p className='fm-photo-evidence'>Nearby NWS grid hours: frost-setup index {photo.frostSetup}/100; cloud cover {photo.skyCover}%. {photo.visibilityMi!=null?'Visibility about '+photo.visibilityMi+' mi. ':'Visibility forecast unavailable. '}No verified frost observation.</p>}
          </>:<p>Sunrise calculation unavailable. No timed viewing claim is possible.</p>}
          <p className='fm-fine'>Sunrise and civil dawn are approximate sea-level calculations from NOAA solar equations. Terrain, local horizons and atmosphere may shift the visible time. Frost may disappear sooner or persist longer; the tool cannot predict melt timing.</p>
        </section>}
        {selectedMorning&&<div className='fm-panel fm-hour-panel'><div className='fm-section-heading compact'><div><span className='fm-kicker'>A six-hour close-up</span><h3>{day(selectedMorning.date)} · as sunrise approaches</h3></div><p>{selectedMorning.explanation}</p></div>
          <HourlyChart morning={selectedMorning}/>
          <div className='fm-metric-row'>{selectedMorning.hourly?.filter(h=>h.score!==null).slice(-1).map(h=><div key={h.time}>
            <div><small>Air temperature</small><strong>{Math.round(h.tempF)}°F</strong></div><div><small>Dew point</small><strong>{Math.round(h.dewF)}°F</strong></div>
            <div><small>Wind</small><strong>{Math.round(h.windMph)} mph</strong></div><div><small>Sky coverage</small><strong>{h.skyPct}%</strong></div>
          </div>)}</div>
          <p className='fm-fine'>These values come from the last complete dawn forecast hour shown. Empty hours mean the weather data did not provide an answer.</p>
        </div>}
      </section>
      <FrostNightJourney night={selectedMorning?.night} site={site} morning={selectedMorning}/>
      <FrostExplorer site={site} morning={selectedMorning} locations={board?.locations} date={activeDate} chosen={chosen} onChoose={choose}/>
      <FrostVerificationHistory siteId={site.id} siteName={site.name}/>
      <section className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Four quiet forces</div><h2>How a landscape becomes a frost garden</h2></div></div>
        <div className='fm-science-grid'>
          <article><span>01</span><h3>The thin blade of grass</h3><p>On a clear night exposed grass can cool faster than the air above it. Frost needs a surface at or below freezing, even if a nearby thermometer reads warmer.</p></article>
          <article><span>02</span><h3>Invisible water in the air</h3><p>When a surface becomes sufficiently cold, moisture may settle as dew or deposit directly as crystals of ice.</p></article>
          <article><span>03</span><h3>The sheltered hollow</h3><p>On still nights, cold air can pool in low ground. One meadow may appear silver while an exposed hillside looks bare.</p></article>
          <article><span>04</span><h3>A window to the night sky</h3><p>Clear skies help exposed surfaces shed heat. Clouds can slow that loss; the first morning light reveals any ice that formed.</p></article>
        </div>
      </section>
      <section id='science' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>The white-coat mystery</div><h2>What kind of frost did you find?</h2></div></div>
        <div className='fm-compare'><div><b>Hoarfrost · vapor becomes ice</b><p>Delicate feathers or needles can grow when vapor deposits directly onto sufficiently cold grass, branches or wires.</p></div>
          <div><b>Frozen dew · droplets freeze</b><p>Dew sometimes forms first as liquid, then freezes into tiny hard beads as temperatures fall.</p></div>
          <div><b>Rime · fog freezes on contact</b><p>In freezing fog, supercooled droplets can build an opaque white coating on exposed trees and objects.</p></div></div>
        <p className='fm-caution'><strong>A guide, not an eyewitness:</strong> This experimental index is neither an official NWS frost warning nor a percentage chance of hoarfrost. It cannot identify ice crystals, measure particular surfaces, or declare roads safe. Compare what you see with the forecast and check local alerts.</p>
      </section>
      <section className='fm-section fm-faq'><h2>Questions to take into the field</h2>{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <footer className='fm-footer'><p><b>Sources:</b> <a href='https://gml.noaa.gov/grad/solcalc/solareqns.PDF'>NOAA sunrise and twilight equations</a> · <a href='https://www.weather.gov/documentation/services-web-api'>National Weather Service forecast grids and station observations</a> · <a href='https://forecast.weather.gov/glossary.php?word=hoar+frost'>NWS hoarfrost definition</a> · <a href='https://www.weather.gov/source/zhu/ZHU_Training_Page/fog_stuff/Dew_Frost/Dew_Frost.htm'>NWS dew and frost forecasting</a> · <a href='https://www.nps.gov/subjects/policy/mp-7-interpretation-education.htm'>NPS interpretive-education principles (inspiration only)</a>.</p>
        <p><a href='/lake-smoke'>Great Lakes Lake Smoke Predictor</a> · <a href='/salamander-migration'>Salamander Migration</a> · <a href='/'>Michigan Phenology</a> · <a href='https://chrisizworski.com/tools/'>All outdoor tools</a></p>
        <p>Built by <a href='https://chrisizworski.com/chris-izworski/'>Chris Izworski</a>. © 2026 Chris Izworski. NWS forecasts update as fresh grids become available; this page does not claim actual current frost.</p>
      </footer>
    </main>
  </div>;
}
