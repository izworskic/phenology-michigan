import Head from 'next/head';
import {useEffect,useMemo,useRef,useState} from 'react';
import {SITES,SOURCE_LINKS} from '../lib/lakeSmoke.mjs';
const BASE='https://phenology.chrisizworski.com';
const CANONICAL=BASE+'/lake-smoke';
const TITLE='Great Lakes Lake Smoke Forecast: Where & When to See Steam Fog';
const DESCRIPTION='Where will lake smoke appear on the Great Lakes? Compare cold-air and warm-water conditions, an hourly NWS viewing outlook and NOAA lake temperatures at 15 shoreline locations.';
const QUESTIONS=[
  ['What is lake smoke?','Lake smoke, also called steam fog, occurs when cold air moves over warmer unfrozen lake water. Evaporation into the cold air can create wisps or columns of condensation that look like smoke.'],
  ['When is lake smoke most common on the Great Lakes?','Late fall and early winter cold-air outbreaks can create strong lake smoke conditions while water remains relatively warm and unfrozen. It can occur at other times when the temperature contrast is large enough.'],
  ['What is the best time of day to see lake smoke?','Early morning often offers dramatic lighting and lower angles of sunlight, but lake smoke can occur at any hour during a cold-air outbreak. This planner compares forecast hours from 5 to 10 a.m. local time.'],
  ['Is lake smoke the same as ordinary lake fog?','No. Lake smoke needs relatively warm water under colder air; common advection lake fog occurs when warm humid air flows across colder water.'],
  ['Does a high setup score mean I will see fog?','No. Scores only describe a simple combination of temperature contrast, wind and weather. They are not observed fog, a probability, or a forecast of visibility.'],
  ['How do ice conditions affect the lake smoke forecast?','Lake smoke requires exposed liquid water. From November through May, the tool uses NOAA GLSEA/National Ice Center local ice concentration to prevent false strong ratings. If the data are stale or missing, no score is shown. Patchy ice can limit a rating even where nearby open water remains.'],
  ['Can a shoreline webcam confirm lake smoke?','A camera can help a person check for moving wisps above exposed water, but video may be dark, unavailable or pointed toward the harbor rather than open lake. We link to original camera operators; no automated camera analysis or confirmed sightings are claimed.'],
  ['Is it safe to watch lake smoke from a pier or boat?','Cold air outbreaks can bring dangerous waves, ice and reduced visibility. Watch from designated, open shoreline areas and always follow National Weather Service marine advisories. Avoid exposed piers and boating in hazardous conditions.']
];
const dt=(value,zone='America/Detroit')=>value?new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value)):'—';
const shortDay=(value,zone='America/Detroit')=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(value));
const fmtTemp=n=>Number.isFinite(n)?Math.round(n)+'°F':'—';
function Tone({status}){return <span className={'smoke-tone '+(status?.tone||'unknown')}>{status?.label||'Checking data'}</span>;}
function Score({value}){return <strong className='smoke-score'>{value==null?'—':value}<small>{value==null?'':' / 100'}</small></strong>;}
function MapPanel({results,selected,onChoose}){
  const target=useRef(null),map=useRef(null),markers=useRef({}),onChooseRef=useRef(onChoose);
  const [ready,setReady]=useState(false),[mapError,setMapError]=useState(false);
  onChooseRef.current=onChoose;
  useEffect(()=>{
    let canceled=false;
    const initialize=()=>{
      if(canceled||!target.current||!window.L||map.current)return;
      const L=window.L;
      const instance=L.map(target.current,{scrollWheelZoom:false,zoomControl:true}).setView([45.0,-85.7],5);
      let tile=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18,attribution:'&copy; OpenStreetMap &copy; CARTO'});
      let triedFallback=false;
      tile.on('tileerror',()=>{
        if(triedFallback)return;
        triedFallback=true;
        instance.removeLayer(tile);
        tile=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'});
        tile.on('tileerror',()=>setMapError(true));
        tile.addTo(instance);
      });
      tile.addTo(instance);
      const pins={};
      SITES.forEach(site=>{
        const pin=L.marker([site.lat,site.lon],{title:site.name}).addTo(instance);
        pin.on('click',()=>onChooseRef.current(site.id));
        pins[site.id]=pin;
      });
      map.current=instance;
      markers.current=pins;
      setReady(true);
      setTimeout(()=>{if(!canceled&&map.current)map.current.invalidateSize();},200);
    };
    if(window.L){initialize();}
    else{
      const old=document.querySelector('script[data-lake-smoke-leaflet]');
      if(old){old.addEventListener('load',initialize);}
      else{
        const script=document.createElement('script');
        script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin='anonymous';
        script.dataset.lakeSmokeLeaflet='1';
        script.onload=initialize;
        script.onerror=()=>setMapError(true);
        document.body.appendChild(script);
      }
    }
    return()=>{canceled=true;if(map.current){map.current.remove();map.current=null;markers.current={};}};
  },[]);
  useEffect(()=>{
    if(!ready||!window.L||!map.current)return;
    SITES.forEach(site=>{
      const row=results?.find(r=>r.id===site.id), active=selected===site.id;
      const tone=row?.status?.tone||'unknown';
      const icon=window.L.divIcon({className:'smoke-map-marker',html:'<span class="smoke-map-pin '+tone+(active?' active':'')+'"></span>',iconSize:[28,28],iconAnchor:[14,14]});
      markers.current[site.id]?.setIcon(icon);
      markers.current[site.id]?.bindTooltip(site.name,{direction:'top',offset:[0,-10]});
    });
  },[results,selected,ready]);
  return <div className='smoke-map-wrap'>
    <div ref={target} className='smoke-map' role='application' aria-label='Interactive Great Lakes shoreline viewing locations'/>
    {!ready&&!mapError&&<div className='smoke-map-loading'>Preparing the Great Lakes map…</div>}
    {mapError&&<div className='smoke-map-error'>Basemap temporarily unavailable. Select a place in the location list.</div>}
    <div className='smoke-map-legend'><span><i className='strong'/> Strong setup</span><span><i className='possible'/> Possible</span><span><i className='unknown'/> Data unavailable</span></div>
  </div>;
}
function MorningChart({site}){
  const windows=site?.outlook?.windows||[];
  return <div className='smoke-chart'>
    {windows.length?windows.map(w=><div className='smoke-chart-day' key={w.date}>
      <div className='smoke-chart-label'><strong>{shortDay(w.time,site.tz)}</strong><span>{new Intl.DateTimeFormat('en-US',{timeZone:site.tz,hour:'numeric'}).format(new Date(w.time))} local</span></div>
      <div className='smoke-chart-track'><div style={{width:w.score+'%'}} className={'smoke-chart-fill '+(w.score>=75?'strong':w.score>=50?'possible':'low')}/></div>
      <div className='smoke-chart-number'>{w.score}<small>/100</small></div>
      <div className='smoke-chart-note'>{w.spreadC>0?'+':''}{w.spreadC}°C water–air · {w.windMph} mph wind</div>
    </div>):<div className='smoke-empty'>The morning outlook will appear when both recent local water temperature and hourly weather forecasts are available. No estimated scores are shown without those sources.</div>}
    <p className='smoke-chart-foot'>Highest-scoring forecast hour between 5–10 a.m. each morning; no claim of observed fog. This index is experimental and is not a probability.</p>
  </div>;
}
function SpreadGraph({site}){
  const hours=site?.outlook?.hourly?.slice(0,24)||[];
  if(!hours.length)return null;
  return <div className='smoke-hour-panel'>
    <div className='smoke-hour-head'><h3>How the temperature gap changes</h3><p>Positive values mean the lake is warmer than the forecast air.</p></div>
    <div className='smoke-hour-bars' role='img' aria-label='Hourly lake-water minus air temperature gap, morning hours only'>
      {hours.map(h=><div key={h.time} className='smoke-hour-col' title={dt(h.time,site.tz)+': '+h.spreadC+' Celsius degrees'}>
        <div className={'smoke-hour-line '+(h.spreadC>=7?'strong':'')} style={{height:Math.max(4,Math.min(100,Math.max(0,h.spreadC)*6))+'%'}}/>
        <small>{h.hour}</small>
      </div>)}
    </div>
    <div className='smoke-hour-axis'>Local hour · 5–10 a.m. on upcoming mornings</div>
  </div>;
}
export default function LakeSmoke(){
  const [selected,setSelected]=useState('saginaw-bay');
  const [filter,setFilter]=useState('All lakes');
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    const fromUrl=new URLSearchParams(window.location.search).get('location');
    if(SITES.some(x=>x.id===fromUrl))setSelected(fromUrl);
    const controller=new AbortController();
    fetch('/api/lake-smoke',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('The forecast service is temporarily unavailable');return r.json();})
      .then(json=>{setData(json);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return()=>controller.abort();
  },[]);
  const choose=id=>{
    setSelected(id);
    const url=new URL(window.location.href);
    url.searchParams.set('location',id);
    window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  };
  const locations=data?.locations||SITES.map(site=>({...site,status:{label:'Awaiting data',tone:'unknown'},outlook:{windows:[],hourly:[],best:null}}));
  const picked=locations.find(site=>site.id===selected)||locations[0];
  const best=picked?.outlook?.best;
  const top=useMemo(()=>locations.filter(x=>x.outlook?.best&&x.outlook.best.score>=30).sort((a,b)=>b.outlook.best.score-a.outlook.best.score).slice(0,3),[locations]);
  const filtered=locations.filter(x=>filter==='All lakes'||x.lake===filter);
  const anyForecast=data&&data.activeLocations>0;
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':CANONICAL+'#webpage',url:CANONICAL,name:TITLE,description:DESCRIPTION,author:{'@id':'https://chrisizworski.com/#person'}},
    {'@type':'WebApplication','@id':CANONICAL+'#app',name:'Great Lakes Lake Smoke Predictor',url:CANONICAL,description:DESCRIPTION,applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,creator:{'@id':'https://chrisizworski.com/#person'}},
    {'@type':'FAQPage',mainEntity:QUESTIONS.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
  ]};
  return <div className='smoke-tool'>
    <Head><title>{TITLE} | Chris Izworski</title><meta name='description' content={DESCRIPTION}/><link rel='canonical' href={CANONICAL}/><meta name='robots' content='index,follow,max-image-preview:large'/>
      <meta property='og:type' content='website'/><meta property='og:title' content={TITLE}/><meta property='og:description' content={DESCRIPTION}/><meta property='og:url' content={CANONICAL}/>
      <meta name='twitter:card' content='summary'/><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/><link rel='stylesheet' href='/lake-smoke.css'/>
      <script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/></Head>
    <header className='smoke-header smoke-wrap'><a className='smoke-brand' href='/'>MICHIGAN PHENOLOGY <span> / GREAT LAKES</span></a><nav aria-label='Lake smoke navigation'><a href='#places'>Locations</a><a href='#forecast'>Forecast</a><a href='#cameras'>Cameras</a><a href='#science'>How it works</a></nav></header>
    <main>
      <section className='smoke-hero'><div className='smoke-hero-art' aria-hidden='true'><div className='smoke-sun'/><div className='smoke-horizon'/><div className='smoke-mist one'/><div className='smoke-mist two'/><div className='smoke-mist three'/></div>
        <div className='smoke-wrap smoke-hero-content'><div className='smoke-overline'>A living calendar of Great Lakes weather</div><h1>Where will the lakes <em>smoke?</em></h1><p>Cold air. Relatively warm water. A fleeting morning when the Great Lakes appear to breathe. Find the most promising conditions and know when to look.</p>
          <div className='smoke-hero-pills'><span>15 shoreline locations</span><span>NOAA lake temperatures</span><span>NWS hourly forecasts</span><span>Seasonal ice screening</span></div>
        </div>
      </section>
      <div className='smoke-wrap'>
        <section className='smoke-status-strip' aria-label='Current forecast status'>
          <div><small>Lake smoke outlook</small><h2>{loading?'Checking lake and air temperatures…':error?'Forecast connection unavailable':anyForecast?(top.length?'Current cold-air setup outlook':'Few lake smoke conditions in the forecast'):'Local water readings unavailable'}</h2><p>{loading?'Gathering NOAA and NWS conditions across five Great Lakes.':error?error:anyForecast?'Compare the strongest upcoming morning setups below. A strong setup is not a confirmed sighting.':'There are currently no reliable combined water-and-air forecasts to rank. The map and viewing guide remain available.'}</p></div>
          <div className='smoke-updated'><span>{data?.activeLocations??'—'} / {SITES.length}</span><small>sites with comparable data</small><small>{data?.generatedAt?'Updated '+dt(data.generatedAt):'Live update pending'}</small></div>
        </section>
        {top.length>0&&<section className='smoke-top' aria-label='Top forecast locations'><div className='smoke-section-line'><h2>Best upcoming morning setups</h2><p>Ranked by temperature contrast and forecast wind, not reported visibility.</p></div><div className='smoke-top-grid'>{top.map((s,i)=><button key={s.id} type='button' className='smoke-top-card' onClick={()=>{choose(s.id);document.getElementById('forecast')?.scrollIntoView({behavior:'smooth'});}}><span className='smoke-top-kicker'>#{i+1} · Lake {s.lake}</span><strong>{s.name}</strong><div><Score value={s.outlook.best.score}/><Tone status={s.status}/></div><small>{shortDay(s.outlook.best.time,s.tz)} · {s.outlook.best.spreadC>0?'+':''}{s.outlook.best.spreadC}°C water–air gap {s.iceCheck?.state==='patchy'?'· possible ice':''}</small></button>)}</div></section>}
        <section id='places' className='smoke-explore'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Explore the shore</div><h2>Choose a place to watch</h2></div><p>Click a map marker or select a shoreline below. Each score requires a recent offshore water-temperature grid cell and an hourly forecast. During ice season it also requires a recent local ice analysis.</p></div>
          <div className='smoke-explore-grid'>
            <MapPanel results={locations} selected={selected} onChoose={choose}/>
            <div className='smoke-sidebar'><div className='smoke-sidebar-heading'><h3>15 Great Lakes lookouts</h3><label htmlFor='lake-filter'>Filter by lake</label><select id='lake-filter' value={filter} onChange={e=>setFilter(e.target.value)}>{['All lakes','Superior','Michigan','Huron','Erie','Ontario'].map(x=><option key={x}>{x}</option>)}</select></div>
              <div className='smoke-location-list'>{filtered.map(s=><button type='button' className={'smoke-location '+(selected===s.id?'selected':'')} key={s.id} onClick={()=>choose(s.id)} aria-pressed={selected===s.id}><span><strong>{s.name}</strong><small>Lake {s.lake} · {s.status?.label}</small></span><span className='smoke-location-score'>{s.outlook?.best?.score??'—'}</span></button>)}</div>
            </div>
          </div>
        </section>
        <section id='forecast' className='smoke-detail'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Your selected shoreline · Lake {picked.lake}</div><h2>{picked.name}</h2></div><Tone status={picked.status}/></div>
          <div className='smoke-detail-grid'>
            <article className='smoke-panel'><small className='smoke-label'>Best upcoming morning</small><div className='smoke-result'><Score value={best?.score}/><span>{best?shortDay(best.time,picked.tz):'Awaiting trustworthy inputs'}<small>{best?dt(best.time,picked.tz):'No viewing prediction available'}</small></span></div>
              <p>{best?best.signal+' conditions in the selected morning forecast window. This is a planning index, not a fog probability.':'A lake smoke outlook requires recent NOAA lake-water temperatures, an NWS hourly forecast and, during November–May, recent local ice concentration.'}</p>
              <div className='smoke-metrics'><div><small>Lake surface</small><strong>{picked.water?fmtTemp(picked.outlook?.best?.waterF??picked.water.c*9/5+32):'—'}</strong></div><div><small>Forecast air</small><strong>{fmtTemp(best?.airF)}</strong></div><div><small>Water warmer by</small><strong>{best?best.spreadC+'°C':'—'}</strong></div><div><small>Wind at best hour</small><strong>{best?best.windMph+' mph':'—'}</strong></div></div>
              {picked.water&&<p className='smoke-small'>Water: {picked.water.kind}, analyzed {dt(picked.water.time,picked.tz)}. Offshore grid estimate, not a shoreline thermometer.</p>}
              <div className='smoke-ice-readout' aria-label='NOAA ice coverage check'>
                <div><small>Open-water check</small><strong>{picked.iceCheck?.label||'Waiting for ice status'}</strong></div>
                {picked.ice&&<div className='smoke-ice-value'>{picked.ice.percent}% <small>ice at sampled offshore cell</small></div>}
              </div>
              <p className='smoke-small smoke-ice-note'>{picked.iceCheck?.note||'Ice concentration is assessed separately during the cold season.'}{picked.ice?.time?' Ice map: '+dt(picked.ice.time,picked.tz)+'.':''}</p>
              {picked.unavailable?.ice&&<p className='smoke-warning'>{picked.unavailable.ice}</p>}
              {picked.unavailable?.water&&<p className='smoke-warning'>{picked.unavailable.water}</p>}
              {picked.unavailable?.weather&&<p className='smoke-warning'>{picked.unavailable.weather}</p>}
              <p className='smoke-view-note'><strong>Viewing area:</strong> {picked.view}. Check opening hours, shoreline conditions and access before leaving.</p>
            </article>
            <article className='smoke-panel'><div className='smoke-overline dark'>Next 72 hours</div><h3>Morning-by-morning comparison</h3><MorningChart site={picked}/><SpreadGraph site={picked}/></article>
          </div>
        </section>
        <section id='cameras' className='smoke-cameras' aria-label='Shoreline camera verification'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Before you make the drive</div><h2>Check a real shoreline view</h2></div><p>Camera sources are independently operated. They may be dark, seasonal, offline, or aimed away from open water.</p></div>
          <div className='smoke-cameras-grid'>
            <div className='smoke-camera-card'>
              <div className='smoke-camera-kicker'>Selected location · {picked.name}</div>
              {picked.camera?<><h3>{picked.camera.name}</h3><p><strong>Camera operator:</strong> {picked.camera.operator}</p><p><strong>View:</strong> {picked.camera.view}</p>
                {picked.camera.note&&<p className='smoke-camera-notice'>{picked.camera.note}</p>}
                <a className='smoke-camera-link' href={picked.camera.url} target='_blank' rel='noopener noreferrer'>Open operator camera ↗</a>
                <p className='smoke-camera-fine'>Opens the camera operator’s website. This tool does not ingest, reproduce or automatically interpret live camera footage.</p></>
              :<><h3>No verified camera at this spot</h3><p>We could not confirm a public shoreline-facing camera from an original operator for this lookout. Avoid relying on unrelated city or traffic cameras as evidence of lake smoke.</p>
                <a className='smoke-camera-link secondary' href='https://www.michigan.org/webcams' target='_blank' rel='noopener noreferrer'>Explore Michigan webcams ↗</a></>}
            </div>
            <div className='smoke-camera-howto'><h3>What to look for on the camera</h3><ol>
              <li><strong>Wisps rising from water:</strong> shallow, curling plumes over exposed open water, rather than a uniform cloud deck.</li>
              <li><strong>Wind and direction:</strong> does the steam drift or shear toward the shore? Compare with the forecast.</li>
              <li><strong>Image timestamp:</strong> a frozen webcam frame from yesterday cannot verify today’s conditions.</li>
            </ol><p>A plausible camera view remains a visual clue, <strong>not a confirmed scientific observation</strong>. Check current marine advisories before going.</p></div>
          </div>
        </section>
        <section id='science' className='smoke-science'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Why the lakes seem to breathe</div><h2>How lake smoke forms</h2></div><p>This is steam fog, not wildfire smoke and not the same setup as typical warm-air-over-cold-water fog.</p></div>
          <div className='smoke-science-grid'><div className='smoke-science-card'><span>01</span><h3>Lake stays relatively warm</h3><p>Great Lakes water loses heat slowly. When a cold front arrives, open water can be much warmer than the air above it.</p></div><div className='smoke-science-card'><span>02</span><h3>Cold air draws moisture</h3><p>Water evaporates into the colder air. Close to the surface, that moisture condenses into wisps of visible steam fog.</p></div><div className='smoke-science-card'><span>03</span><h3>Wind shapes the spectacle</h3><p>A light breeze helps move cold air across the water. Stronger wind can mix and disperse the fog, while shore geography adds uncertainty.</p></div></div>
          <div className='smoke-caution'><strong>Safety before photography.</strong> Lake smoke can coincide with cold outbreaks, waves, ice and rapidly changing visibility. Do not use this viewing index for boating or navigation. Check <a href='https://www.weather.gov/marine/' target='_blank' rel='noreferrer'>NWS marine forecasts</a> and local advisories.</div>
        </section>
        <section className='smoke-faq'><h2>Lake smoke questions</h2>{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
        <footer className='smoke-footer'><div><strong>Methods & data</strong><p>A transparent, experimental planning heuristic. Scores are not observed sightings or probabilities. NOAA GLSEA analyzed temperatures can be smoothed or missing under clouds; coastal readings are approximations. The engine refuses to score when water or hourly weather is missing or stale, and in November–May when local ice data are missing. A grid cell showing ice limits or blocks scores; the sampled condition may differ at the shoreline and may change over the 72-hour forecast.</p><div className='smoke-sources'>{SOURCE_LINKS.map(s=><a key={s.url} href={s.url} target='_blank' rel='noreferrer'>{s.name} ↗</a>)}</div></div><p>Built by <a href='https://chrisizworski.com/chris-izworski/'>Chris Izworski</a> · <a href='/'>Michigan Phenology</a> · <a href='/bloom-tracker'>Michigan Bloom Tracker</a></p></footer>
      </div>
    </main>
  </div>;
}
