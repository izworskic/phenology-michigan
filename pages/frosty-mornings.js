import Head from 'next/head';
import {useEffect,useState} from 'react';
import {SITES} from '../lib/frostMorning.mjs';
import FrostVerificationHistory from '../components/FrostVerificationHistory';
import FrostCartoMap from '../components/FrostCartoMap';
const URL='https://phenology.chrisizworski.com/frosty-mornings';
const TITLE='Michigan Frosty Morning Predictor: Hoarfrost Forecast';
const DESCRIPTION='Will tomorrow bring a frosty morning in Michigan? Compare dawn temperatures, dew points, wind and clouds in live NWS forecasts at 12 locations.';
const QUESTIONS=[
  ['When should I arrive to photograph frost?','Arrive near civil dawn, typically about half an hour before sunrise. Photograph the frosted branches around sunrise and just afterward. The planning window does not predict precisely when ice crystals will melt.'],
  ['What is hoarfrost?','Hoarfrost is a coating of interlocking ice crystals deposited directly from water vapor onto below-freezing objects. The word hoar comes from an old word for gray or white.'],
  ['Is hoarfrost the same as a frosty morning?','Frosty morning is the familiar general phrase. Hoarfrost is a particular type of crystalline frost. Some white surfaces are instead coated with frozen dew, snow or rime from freezing fog.'],
  ['Can frost form when the forecast low is 35°F?','Yes. Grass and exposed surfaces can radiate heat to the night sky and become colder than standard thermometer-height air. This tool does not measure actual surface temperatures.'],
  ['Does a high score mean trees will be white?','No. It only describes weather favorable for frost around dawn. Hoarfrost on branches depends on local humidity, the branch temperature and exposure. Fog can also produce rime.'],
  ['What makes the best frosty morning photographs?','Look for sheltered meadow edges, leafless trees and hedgerows around sunrise. Low wind, moist air and clearing skies help. Stay on open public trails and never assume access to private farmland.'],
  ['What is the difference between hoarfrost and freezing-fog rime?','Hoarfrost grows by direct deposition of water vapor on cold surfaces. Rime grows when supercooled fog droplets freeze onto objects. The tool cannot reliably separate those outcomes without local observations.']
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
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('location');if(SITES.some(s=>s.id===id))setChosen(id);},[]);
  useEffect(()=>{
    const c=new AbortController();
    fetch('/api/frosty-mornings?mode=board',{signal:c.signal}).then(r=>{if(!r.ok)throw Error('Regional board could not load');return r.json()})
      .then(v=>setBoard(v)).catch(e=>{if(e.name!=='AbortError')setBoardErr(e.message);});
    return ()=>c.abort();
  },[]);
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
  const site=SITES.find(s=>s.id===chosen)||SITES[0];
  const mornings=location?.mornings||[];
  const selectedMorning=mornings[morningIndex]||mornings[0]||null;
  const scored=(board?.locations||[]).filter(s=>s.best?.score!=null).sort((a,b)=>b.best.score-a.best.score||a.name.localeCompare(b.name));
  const photoLeaders=(board?.locations||[]).filter(s=>s.bestPhoto).sort((a,b)=>({'strong':3,'possible':2,'limited':1}[b.bestPhoto.photo.status]-{'strong':3,'possible':2,'limited':1}[a.bestPhoto.photo.status])||a.bestPhoto.date.localeCompare(b.bestPhoto.date));
  const featured=photoLeaders.length?photoLeaders:scored;
  const photo=selectedMorning?.photo;
  return <div className='fm-tool'>
    <Head><title>{TITLE} | Chris Izworski</title><meta name='description' content={DESCRIPTION}/><link rel='canonical' href={URL}/>
      <meta name='robots' content='index,follow,max-image-preview:large'/><meta property='og:type' content='website'/><meta property='og:title' content={TITLE}/>
      <meta property='og:description' content={DESCRIPTION}/><meta property='og:url' content={URL}/><meta name='twitter:card' content='summary'/>
      <link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/>
      <link rel='stylesheet' href='/frosty-mornings.css'/><script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/></Head>
    <div className='fm-top'><a href='/'>MICHIGAN PHENOLOGY</a><nav aria-label='Page sections'><a href='#forecast'>The forecast</a><a href='#sunrise-guide'>Sunrise plan</a><a href='#frost-verification'>Evidence history</a><a href='#places'>Michigan map</a><a href='#science'>How it works</a><a href='/lake-smoke'>Lake smoke ↗</a></nav></div>
    <header className='fm-hero'>
      <img className='fm-hero-image' src='https://commons.wikimedia.org/wiki/Special:FilePath/Frosty_morning%2C_tree_with_frost_covered_branches_%2848788814943%29.jpg?width=1400'
        alt='Reference photograph of a frost-covered tree from the U.S. Fish and Wildlife Service, not a current Michigan observation'/>
      <div className='fm-hero-shade'/>
      <div className='fm-wrap fm-hero-content'><div className='fm-eyebrow'>The Michigan living calendar · October through spring and beyond</div>
        <h1>Will tomorrow be a <em>frosty morning?</em></h1>
        <p>Some mornings the fields turn silver and every twig wears ice crystals. See when Michigan weather is lining up for that fleeting sight.</p>
        <div className='fm-pills'><span>12 forecast locations</span><span>National Weather Service grids</span><span>Three upcoming dawns</span><span>Sunrise photo windows</span></div>
      </div>
    </header>
    <main className='fm-wrap'>
      <p className='fm-image-credit'>Reference image: U.S. Fish &amp; Wildlife Service, Midwest Region (public domain), photographed in Wisconsin. Not a live frost report. <a href='https://commons.wikimedia.org/wiki/File:Frosty_morning,_tree_with_frost_covered_branches_(48788814943).jpg' target='_blank' rel='noreferrer'>Image source</a>.</p>
      <section className='fm-status' aria-label='Michigan frosty morning outlook'><div className='fm-eyebrow dark'>Next early-morning outlook</div>
        <div className='fm-status-row'><div><h2>{!board&&!boardErr?'Checking forecast conditions across Michigan…':boardErr?'Regional forecasts unavailable':scored.length?'Frost-friendly weather around the state':'No locations currently qualify for a reliable ranking'}</h2>
          <p>{boardErr||'This board compares NWS forecast ingredients, not confirmed hoarfrost, live field conditions or the probability of seeing white trees.'}</p></div>
          <div className='fm-status-total'><strong>{board?scored.length:'—'} / 9</strong><small>regional forecasts with complete dawn inputs</small><small>{board?.generatedAt?'Checked '+stamp(board.generatedAt):'Waiting for source data'}</small></div></div>
        {featured.length>0&&<><p className='fm-board-heading'>{photoLeaders.length?'Best upcoming sunrise weather':'Available frost setups · sunrise conditions not ranked'}</p><div className='fm-top-three'>{featured.slice(0,3).map((s,i)=>{const m=s.bestPhoto||s.best;return <button key={s.id} type='button' onClick={()=>{choose(s.id);document.getElementById('forecast')?.scrollIntoView({behavior:'smooth'});}}>
          <small>#{i+1} · {day(m.date)}</small><strong>{s.name}</strong><div><Score value={m.score}/><span>{m.photo?.label||m.label}</span></div><small>{m.photo?.sunriseAt?'Sunrise ~ '+photoTime(m.photo.sunriseAt,s.tz)+' · arrive ~ '+photoTime(m.photo.arriveAt,s.tz):'Sunrise unavailable'}</small></button>;})}</div></>}
        {board&&scored.length===0&&<p className='fm-empty'>No complete regional forecast to rank. The site does not fill weather gaps with historical averages.</p>}
      </section>
      <section id='places' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Pick your frost lookout</div><h2>Explore Michigan's frost-friendly mornings</h2></div>
        <p>Zoom and pan the CARTO map, then tap a forecast marker to inspect its local outlook. Markers represent NWS grids, not verified frost sightings.</p></div>
        <div className='fm-explore'><FrostCartoMap chosen={chosen} onChoose={choose} board={board?.locations} location={location}/>
          <div className='fm-place-list'><label htmlFor='fm-location'>Choose a forecast location</label><select id='fm-location' value={chosen} onChange={e=>choose(e.target.value)}>{SITES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <div className='fm-place-scroll'>{SITES.map(s=>{const row=board?.locations?.find(b=>b.id===s.id);return <button type='button' key={s.id} className={chosen===s.id?'selected':''} onClick={()=>choose(s.id)}>
              <span><strong>{s.name}</strong><small>{s.region}</small></span><span className='fm-place-number'>{row?.best?.score??'—'}</span></button>;})}</div>
          </div></div>
      </section>
      <section id='forecast' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Weather fit · not a frost observation</div><h2>{site.name}: next three mornings</h2></div>
        <p>4–9 a.m. local. A 0–100 experimental setup index is <strong>not</strong> a sighting percentage.</p></div>
        {loading?<div className='fm-panel fm-empty'>Loading local NWS temperature, dew point, sky cover and wind grids…</div>:
          error?<div className='fm-panel fm-empty'>{error}</div>:
          location?.status==='unavailable'?<div className='fm-panel fm-empty'>{location.note}</div>:
          <div className='fm-forecast'>
            <div className='fm-panel'><span className='fm-kicker'>Best available setup</span><div className='fm-big-score'><Score value={location?.best?.score}/><div><strong>{location?.best?.label||'Forecast incomplete'}</strong><small>{location?.best?day(location.best.date)+' · around '+hour(location.best.bestHour):'No complete dawn window'}</small></div></div>
              <p>{location?.best?.explanation||'No reliable morning forecast currently meets the source-completeness requirements.'}</p>
              <p className='fm-field-note'>Look for sheltered grasses, leafless branches and humid low spots before and near sunrise. A favorable atmospheric setup does not guarantee tree-covering hoarfrost.</p>
              <small>Forecast grid update: {stamp(location?.issuedAt)} · Source: NWS · Site context: {site.setting}</small>
            </div>
            <div className='fm-panel'><span className='fm-kicker'>Morning comparison</span><h3>When conditions line up</h3>
              <div className='fm-day-list'>{mornings.length?mornings.map((m,i)=><button type='button' key={m.date} aria-pressed={morningIndex===i} className={morningIndex===i?'active':''} onClick={()=>setMorningIndex(i)}>
                <span><strong>{day(m.date)}</strong><small>{m.photo?.sunriseAt?'Sunrise ~ '+photoTime(m.photo.sunriseAt):'Sunrise unavailable'}</small></span>
                <span className='fm-day-track'><span className={tone(m.score)} style={{width:(m.score||0)+'%'}}/></span>
                <b>{m.score==null?'—':m.score}</b>
              </button>):<div className='fm-empty'>No upcoming complete morning windows.</div>}</div>
              <small>These are comparisons from a simple weighted weather heuristic; no measured local frost is implied.</small>
            </div>
          </div>}
        {selectedMorning&&<section id='sunrise-guide' className='fm-photo-plan' aria-label='Sunrise photography plan'>
          <div className='fm-section-heading compact'><div><div className='fm-eyebrow dark'>Before the sunlight changes the scene</div><h3>{day(selectedMorning.date)} · sunrise photo plan</h3></div>
            <span className={'fm-photo-status '+(photo?.status||'unavailable')}>{photo?.label||'Weather unavailable'}</span></div>
          {photo?.sunriseAt?<><div className='fm-photo-steps'>
            <div><small>Arrive by · civil dawn</small><strong>{photoTime(photo.arriveAt,site.tz)}</strong><span>Find your composition before sunrise</span></div>
            <div><small>Approximate sunrise</small><strong>{photoTime(photo.sunriseAt,site.tz)}</strong><span>Calculated for {site.name}</span></div>
            <div><small>Suggested photography window</small><strong>{photoTime(photo.windowStartAt,site.tz)}–{photoTime(photo.windowEndAt,site.tz)}</strong><span>Lighting guide, not a melting deadline</span></div>
          </div><div className='fm-photo-timeline' role='img' aria-label='Arrival at civil dawn, sunrise, then photography shortly after sunrise'><span>Civil dawn</span><span>Sunrise</span><span>After sunrise</span><div className='fm-photo-track'><i/><i/><i/></div></div>
          <p className='fm-photo-why'>{photo.reason}</p>
          {photo.frostSetup!=null&&<p className='fm-photo-evidence'>Nearby forecast-grid hours: frost-setup index {photo.frostSetup}/100; average cloud cover {photo.skyCover}%. No verified frost or local camera observation.</p>}
          </>:<p>Sunrise calculation unavailable. No timed viewing claim is possible.</p>}
          <p className='fm-fine'>Sunrise and civil dawn are approximate sea-level calculations from NOAA solar equations. Terrain, local horizons and atmosphere may shift the visible time. Frost may disappear sooner or persist longer; the tool cannot predict melt timing.</p>
        </section>}
        {selectedMorning&&<div className='fm-panel fm-hour-panel'><div className='fm-section-heading compact'><div><span className='fm-kicker'>The overnight ingredients</span><h3>{day(selectedMorning.date)} · dawn-hour setup</h3></div><p>{selectedMorning.explanation}</p></div>
          <HourlyChart morning={selectedMorning}/>
          <div className='fm-metric-row'>{selectedMorning.hourly?.filter(h=>h.score!==null).slice(-1).map(h=><div key={h.time}>
            <div><small>Air temperature</small><strong>{Math.round(h.tempF)}°F</strong></div><div><small>Dew point</small><strong>{Math.round(h.dewF)}°F</strong></div>
            <div><small>Wind</small><strong>{Math.round(h.windMph)} mph</strong></div><div><small>Sky coverage</small><strong>{h.skyPct}%</strong></div>
          </div>)}</div>
          <p className='fm-fine'>Weather values shown above are for the last available dawn hour, not necessarily the best hour. Missing hourly values are left blank.</p>
        </div>}
      </section>
      <FrostVerificationHistory siteId={site.id} siteName={site.name}/>
      <section className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>What the weather can tell you</div><h2>Four ingredients for a silver morning</h2></div></div>
        <div className='fm-science-grid'>
          <article><span>01</span><h3>Cold surfaces</h3><p>Frost grows on objects at or below freezing. Forecast air temperatures are a proxy; grasses and twigs can cool below measured air temperature.</p></article>
          <article><span>02</span><h3>Moist air</h3><p>When the temperature gets close to the dew point, air approaches saturation. Humidity and local moisture determine crystal growth.</p></article>
          <article><span>03</span><h3>Stillness</h3><p>Gentle winds help cold air settle in sheltered hollows and reduce turbulent mixing. A windy night may limit delicate frost formation.</p></article>
          <article><span>04</span><h3>A clearing sky</h3><p>Cloud-free overnight hours favor radiative cooling, while dawn light makes frosted branches photogenic. Fog can instead create rime.</p></article>
        </div>
      </section>
      <section id='science' className='fm-section'><div className='fm-section-heading'><div><div className='fm-eyebrow dark'>Understand the signal</div><h2>Hoarfrost, white frost, frozen dew or rime?</h2></div></div>
        <div className='fm-compare'><div><b>Hoarfrost / white frost</b><p>Crystalline ice deposited directly from water vapor on freezing surfaces. Often delicate or featherlike.</p></div>
          <div><b>Frozen dew</b><p>Liquid dew freezes after it has already formed. It can appear as small hard beads or a glaze.</p></div>
          <div><b>Rime ice</b><p>Supercooled freezing-fog droplets collide with a surface and freeze. Thick white tree coatings may be rime, not hoarfrost.</p></div></div>
        <p className='fm-caution'><strong>Forecast limitation:</strong> The score is an uncalibrated weather-suitability index, not an official NWS frost warning, not a percentage, and not an ice-crystal observation. This tool cannot identify crystal type or certify a safe road or trail. Check local weather alerts and road conditions before traveling.</p>
      </section>
      <section className='fm-section fm-faq'><h2>Frosty morning questions</h2>{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <footer className='fm-footer'><p><b>Sources:</b> <a href='https://gml.noaa.gov/grad/solcalc/solareqns.PDF'>NOAA sunrise and twilight equations</a> · <a href='https://www.weather.gov/documentation/services-web-api'>National Weather Service forecast grids and station observations</a> · <a href='https://forecast.weather.gov/glossary.php?word=hoar+frost'>NWS hoarfrost definition</a> · <a href='https://www.weather.gov/source/zhu/ZHU_Training_Page/fog_stuff/Dew_Frost/Dew_Frost.htm'>NWS dew and frost forecasting</a>.</p>
        <p><a href='/lake-smoke'>Great Lakes Lake Smoke Predictor</a> · <a href='/salamander-migration'>Salamander Migration</a> · <a href='/'>Michigan Phenology</a> · <a href='https://chrisizworski.com/tools/'>All outdoor tools</a></p>
        <p>Built by <a href='https://chrisizworski.com/chris-izworski/'>Chris Izworski</a>. © 2026 Chris Izworski. NWS forecasts update as fresh grids become available; this page does not claim actual current frost.</p>
      </footer>
    </main>
  </div>;
}
