import Head from 'next/head';
import {useEffect,useMemo,useRef,useState} from 'react';
import {SITES,SOURCE_LINKS} from '../lib/lakeSmoke.mjs';
import {rankShorelineViews,compass} from '../lib/lakeSmokeWind.mjs';
import {GREAT_LAKES} from '../lib/lakeSmokeGeography.mjs';
import {historyForSite,easternDay} from '../lib/lakeSmokeArchive.mjs';
import {playableCamera,cameraFor,EMBEDDABLE_IDS,CAMERA_REVIEW_DATE} from '../lib/lakeSmokeCameras.mjs';
const BASE='https://phenology.chrisizworski.com';
const CANONICAL=BASE+'/lake-smoke';
const TITLE='Great Lakes Lake Smoke Forecast: Where & When to See Steam Fog';
const HERO_LOCAL='/lake-smoke/lake-smoke-hero.jpg';
const HERO_ORIGINAL='https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Steaming_Lake_Michigan_%2811809462446%29.jpg/1280px-Steaming_Lake_Michigan_%2811809462446%29.jpg';
const HERO_CREDIT='https://commons.wikimedia.org/wiki/File:Steaming_Lake_Michigan_(11809462446).jpg';
const DESCRIPTION='Where will lake smoke appear on the Great Lakes? Compare cold-air and warm-water conditions, an hourly NWS viewing outlook and NOAA lake temperatures and nearby buoy fallbacks at 15 shoreline locations.';
const QUESTIONS=[
  ['What is lake smoke?','Lake smoke, also called steam fog, occurs when cold air moves over warmer unfrozen lake water. Evaporation into the cold air can create wisps or columns of condensation that look like smoke.'],
  ['When is lake smoke most common on the Great Lakes?','Late fall and early winter cold-air outbreaks can create strong lake smoke conditions while water remains relatively warm and unfrozen. It can occur at other times when the temperature contrast is large enough.'],
  ['What is the best time of day to see lake smoke?','Early morning often offers dramatic lighting and lower angles of sunlight, but lake smoke can occur at any hour during a cold-air outbreak. This planner compares forecast hours from 5 to 10 a.m. local time.'],
  ['Is lake smoke the same as ordinary lake fog?','No. Lake smoke needs relatively warm water under colder air; common advection lake fog occurs when warm humid air flows across colder water.'],
  ['Does a high setup score mean I will see fog?','No. Scores only describe a simple combination of temperature contrast, wind and weather. They are not observed fog, a probability, or a forecast of visibility.'],
  ['Where do the lake-water readings come from?','The primary readings come from NOAA GLSEA satellite-analyzed pixels. If NOAA ERDDAP is unreachable, the predictor separately samples the published GLSEA full-resolution daily map at the selected offshore cell. The daily file modification timestamp indicates source publication, not a direct observation. If both satellite routes fail, a nearby same-lake NDBC buoy may be used with station and distance disclosed. A forecast is withheld when none of these sources are trustworthy.'],
  ['Why does a location show a nearby buoy instead of satellite water temperature?','NOAA GLSEA coastal pixels can be unavailable or temporarily unreachable. When that happens, the tool may use a recent NOAA NDBC water-temperature measurement from a buoy on the same lake within 55 km of the viewing location. A buoy measures water below the surface, often about 1 meter deep, and can differ from temperature near the shoreline. These proxy readings are identified by station and distance; without a trustworthy nearby observation, the location stays unavailable.'],
  ['How do ice conditions affect the lake smoke forecast?','Lake smoke requires exposed liquid water. From November through May, the tool uses NOAA GLSEA/National Ice Center local ice concentration to prevent false strong ratings. If the data are stale or missing, no score is shown. Patchy ice can limit a rating even where nearby open water remains.'],
  ['Can a shoreline webcam confirm lake smoke?','A camera can help a person check for moving wisps above exposed water, but video may be dark, unavailable or pointed toward the harbor rather than open lake. We link to original camera operators; no automated camera analysis or confirmed sightings are claimed.'],
  ['How does wind direction affect where lake smoke is visible?','A National Weather Service wind direction names the direction the wind comes from. By comparing that with an approximate bearing from the selected shore toward open lake water, the planner describes whether fog wisps may move along the shore, toward the shore, or out over the lake. These are qualitative clues, not measured fog motion or visibility guarantees.'],
  ['Are historical forecast scores proof that lake smoke happened?','No. The archive preserves what the NOAA/NWS weather-based tool predicted for the following morning, at the time the prediction was issued. Scores are not observations, probabilities or measures of how often lake smoke actually appeared. Dated, reviewed camera or field evidence is tracked separately.'],
  ['Is it safe to watch lake smoke from a pier or boat?','Cold air outbreaks can bring dangerous waves, ice and reduced visibility. Watch from designated, open shoreline areas and always follow National Weather Service marine advisories. Avoid exposed piers and boating in hazardous conditions.']
];
const dt=(value,zone='America/Detroit')=>value?new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(value)):'—';
const shortDay=(value,zone='America/Detroit')=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(value));
const fmtTemp=n=>Number.isFinite(n)?Math.round(n)+'°F':'—';
function Tone({status}){return <span className={'smoke-tone '+(status?.tone||'unknown')}>{status?.label||'Checking data'}</span>;}
function Score({value}){return <strong className='smoke-score'>{value==null?'—':value}<small>{value==null?'':' / 100'}</small></strong>;}
const staticX=lon=>(lon+92)*900/17;
const staticY=lat=>(49.8-lat)*560/8.8;
const staticPath=lake=>lake.rings.map(ring=>ring.map(([lon,lat],i)=>
  (i?'L':'M')+staticX(lon).toFixed(1)+','+staticY(lat).toFixed(1)).join(' ')+' Z').join(' ');
function GreatLakesStaticMap({results,selected,onChoose}){
  const labels=[
    {name:'SUPERIOR',lat:47.75,lon:-87.6},
    {name:'MICHIGAN',lat:44.3,lon:-87.25},
    {name:'HURON',lat:45.15,lon:-82.9},
    {name:'ERIE',lat:42.2,lon:-80.8},
    {name:'ONTARIO',lat:43.55,lon:-78.1}
  ];
  return <div className='smoke-static-wrap' aria-label='Keyless geographic map of the five Great Lakes'>
    <svg className='smoke-static-geography' viewBox='0 0 900 560' preserveAspectRatio='none' role='img' aria-label='Natural Earth shorelines of Lakes Superior, Michigan, Huron, Erie and Ontario'>
      <defs><linearGradient id='smoke-map-land' x1='0' y1='0' x2='0' y2='1'><stop stopColor='#e9efe9'/><stop offset='1' stopColor='#f8f8ed'/></linearGradient></defs>
      <rect width='900' height='560' fill='url(#smoke-map-land)'/>
      {[42,44,46,48].map(lat=><line key={lat} x1='0' x2='900' y1={staticY(lat)} y2={staticY(lat)} stroke='#cbd9d3' strokeWidth='.8' strokeDasharray='3 7'/>)}
      {[-90,-87,-84,-81,-78].map(lon=><line key={lon} y1='0' y2='560' x1={staticX(lon)} x2={staticX(lon)} stroke='#cbd9d3' strokeWidth='.8' strokeDasharray='3 7'/>)}
      {GREAT_LAKES.map(lake=><path key={lake.name} d={staticPath(lake)} fill='#b5dbe8' stroke='#579caf' strokeWidth='1.6'/>)}
      {labels.map(l=><text key={l.name} x={staticX(l.lon)} y={staticY(l.lat)} className='smoke-static-label' textAnchor='middle'>{l.name}</text>)}
      <text x='30' y='35' className='smoke-static-north'>N ↑</text>
    </svg>
    <div className='smoke-static-pins'>
      {SITES.map(site=>{
        const row=results?.find(s=>s.id===site.id);
        const tone=row?.status?.tone||'unknown';
        return <button type='button' key={site.id} title={site.name+' · '+(row?.status?.label||'Checking conditions')}
          aria-label={'Select '+site.name} aria-pressed={selected===site.id}
          className='smoke-map-marker smoke-static-pin'
          style={{left:(staticX(site.lon)/900*100)+'%',top:(staticY(site.lat)/560*100)+'%'}}
          onClick={()=>onChoose(site.id)}><span className={'smoke-map-pin '+tone+(selected===site.id?' active':'')}/></button>;
      })}
    </div>
    <div className='smoke-static-credit'>Great Lakes shoreline geometry: Natural Earth (public domain)</div>
  </div>;
}
function MapPanel({results,selected,onChoose}){
  const target=useRef(null),map=useRef(null),pins=useRef({}),chooseRef=useRef(onChoose);
  const [mapMode,setMapMode]=useState('loading');
  chooseRef.current=onChoose;
  useEffect(()=>{
    let disposed=false,timeout=null,failed=false;
    const useGeographicFallback=()=>{
      if(disposed||failed)return;
      failed=true;
      clearTimeout(timeout);
      Object.values(pins.current).forEach(pin=>pin.remove?.());
      pins.current={};
      if(map.current){try{map.current.remove();}catch{}map.current=null;}
      if(target.current)target.current.innerHTML='';
      setMapMode('static');
    };
    const initialize=async ()=>{
      try{
        if(!target.current)return;
        if(!window.maplibregl){
          await new Promise((resolve,reject)=>{
            let script=document.querySelector('script[data-lake-smoke-maplibre]');
            if(script?.dataset.failed==='true')return reject(Error('Map library not available'));
            const loaded=()=>{script.removeEventListener('load',loaded);script.removeEventListener('error',error);window.maplibregl?resolve():reject(Error('No MapLibre available'));};
            const error=()=>{script.dataset.failed='true';script.removeEventListener('load',loaded);script.removeEventListener('error',error);reject(Error('Map library failed'));};
            if(!script){
              script=document.createElement('script');
              script.src='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
              script.crossOrigin='anonymous';script.dataset.lakeSmokeMaplibre='1';
              script.addEventListener('load',loaded);script.addEventListener('error',error);
              document.body.appendChild(script);
            }else{script.addEventListener('load',loaded);script.addEventListener('error',error);}
          });
        }
        if(disposed||!target.current)return;
        const ml=window.maplibregl;
        if(!ml?.supported())throw Error('WebGL unavailable');
        const instance=new ml.Map({
          container:target.current,style:'https://tiles.openfreemap.org/styles/positron',
          center:[-85.6,45.0],zoom:4.3,minZoom:3,maxZoom:17,
          attributionControl:true,renderWorldCopies:false
        });
        map.current=instance;
        instance.scrollZoom.disable();
        instance.addControl(new ml.NavigationControl({showCompass:false}),'top-left');
        SITES.forEach(site=>{
          const button=document.createElement('button');
          button.type='button';button.className='smoke-map-marker';
          button.title='Select '+site.name;
          button.setAttribute('aria-label','Select '+site.name);
          const dot=document.createElement('span');dot.className='smoke-map-pin unknown';
          button.appendChild(dot);
          const click=()=>chooseRef.current(site.id);
          button.addEventListener('click',click);
          const marker=new ml.Marker({element:button,anchor:'center'})
            .setLngLat([site.lon,site.lat])
            .setPopup(new ml.Popup({offset:17}).setText(site.name)).addTo(instance);
          pins.current[site.id]={button,dot,marker,remove:()=>button.removeEventListener('click',click)};
        });
        let loaded=false,errors=0;
        instance.on('load',()=>{
          if(disposed||failed)return;
          loaded=true;clearTimeout(timeout);
          instance.fitBounds([[-92,41.0],[-76,49.5]],{padding:30,maxZoom:5,duration:0});
          setMapMode('vector');
        });
        instance.on('error',()=>{
          if(disposed||failed)return;
          errors++;
          if((!loaded&&errors>=2)||(loaded&&errors>=5))useGeographicFallback();
        });
        timeout=setTimeout(()=>{if(!loaded)useGeographicFallback();},10500);
      }catch{useGeographicFallback();}
    };
    initialize();
    return()=>{
      disposed=true;clearTimeout(timeout);
      Object.values(pins.current).forEach(pin=>pin.remove?.());
      if(map.current){try{map.current.remove();}catch{}}
      map.current=null;pins.current={};
    };
  },[]);
  useEffect(()=>{
    if(mapMode!=='vector')return;
    SITES.forEach(site=>{
      const row=results?.find(r=>r.id===site.id),active=selected===site.id;
      const tone=row?.status?.tone||'unknown';
      const pin=pins.current[site.id];
      if(pin?.dot)pin.dot.className='smoke-map-pin '+tone+(active?' active':'');
    });
  },[results,selected,mapMode]);
  return <div className='smoke-map-wrap'>
    <div ref={target} className='smoke-map' role='application' aria-label='Interactive Great Lakes shoreline viewing locations' style={{visibility:mapMode==='vector'?'visible':'hidden'}}/>
    {mapMode!=='vector'&&<GreatLakesStaticMap results={results} selected={selected} onChoose={onChoose}/>}
    <div className='smoke-map-legend'><span><i className='strong'/> Strong setup</span><span><i className='possible'/> Possible</span><span><i className='unknown'/> Data unavailable</span></div>
    <div className='smoke-map-source'>{mapMode==='vector'?'OpenFreeMap vector map':'Keyless Great Lakes shoreline map'}</div>
  </div>;
}

function WindCompass({view}){
  if(!view||!Number.isFinite(view.lakewardDeg)||!Number.isFinite(view.driftTowardDeg))return <div className='smoke-wind-unknown'>Wind direction unavailable. No plume movement is assumed.</div>;
  // Both arrows are diagrammatic bearings, not a GPS plume track.
  const point=(angle,r)=>{
    const a=angle*Math.PI/180;
    return {x:110+Math.sin(a)*r,y:110-Math.cos(a)*r};
  };
  const water=point(view.lakewardDeg,69),drift=point(view.driftTowardDeg,70);
  return <svg className='smoke-wind-rose' viewBox='0 0 220 220' role='img' aria-label={'Illustrative compass. Open water roughly '+view.lakeward+'. Forecast drift '+compass(view.driftTowardDeg)+'.'}>
    <defs><marker id='smoke-wind-tip' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M 0 0 L 10 5 L 0 10 z' fill='#25859a'/></marker></defs>
    <circle cx='110' cy='110' r='78' fill='#e4f1f4' stroke='#cbdfe4' strokeWidth='1.5'/>
    <circle cx='110' cy='110' r='34' fill='#ffffff' stroke='#c5d6dc' strokeDasharray='4 4'/>
    <text x='110' y='22' textAnchor='middle' className='smoke-compass-cardinal'>N</text>
    <text x='198' y='115' textAnchor='middle' className='smoke-compass-cardinal'>E</text>
    <text x='110' y='212' textAnchor='middle' className='smoke-compass-cardinal'>S</text>
    <text x='23' y='115' textAnchor='middle' className='smoke-compass-cardinal'>W</text>
    <line x1='110' y1='110' x2={water.x} y2={water.y} stroke='#517d8c' strokeWidth='6' strokeLinecap='round' opacity='.55'/>
    <circle cx={water.x} cy={water.y} r='5' fill='#477d90'/>
    <line x1='110' y1='110' x2={drift.x} y2={drift.y} stroke='#25859a' strokeWidth='4' strokeLinecap='round' markerEnd='url(#smoke-wind-tip)'/>
    <circle cx='110' cy='110' r='7' fill='#193e4b' stroke='#ffffff' strokeWidth='3'/>
    <text x='110' y='130' textAnchor='middle' className='smoke-compass-shore'>Shore</text>
  </svg>;
}
function ShorelineViewing({site}){
  const best=site?.outlook?.bestView||null;
  const outlook=site?.outlook;
  const sampled=best?.viewing||outlook?.best?.viewing||null;
  return <section className='smoke-view-section' id='wind-view'>
    <div className='smoke-section-line'><div><div className='smoke-overline dark'>Different from fog formation</div><h2>Which way will the wisps drift?</h2></div><p>A directional view guide, not a live fog observation or navigation forecast.</p></div>
    <div className='smoke-view-grid'>
      <article className='smoke-wind-card'>
        <div className='smoke-wind-card-head'><div><small className='smoke-label'>Forecast shoreline drift</small><h3>{best?best.viewing.label:'No ranked viewing window'}</h3></div><WindCompass view={sampled}/></div>
        <p>{best?best.viewing.explanation:outlook?.best?'A lake-smoke setup exists, but no forecast morning hour has both adequate weather conditions and usable wind direction for a shoreline-view recommendation.':'An ice-safe water/air setup must be available before wind is ranked.'}</p>
        <div className='smoke-wind-facts'>
          <div><small>Wind from</small><strong>{best?.viewing?.windFrom||'—'}</strong></div>
          <div><small>Approx. open water</small><strong>{sampled?.lakeward||'—'}</strong></div>
          <div><small>Wisps could move</small><strong>{best?.viewing?.driftTowardDeg!=null?compass(best.viewing.driftTowardDeg):'—'}</strong></div>
        </div>
        <p className='smoke-wind-caveat'>Bearing to open water uses the mapped offshore sample point. Shoreline curves, harbors and winds over the lake may differ from the NWS shoreline forecast.</p>
      </article>
      <article className='smoke-wind-card'>
        <small className='smoke-label'>Best forecast viewing hours · 5–10 a.m.</small>
        <h3>Three-morning drift outlook</h3>
        {outlook?.viewWindows?.length?<div className='smoke-view-days'>
          {outlook.viewWindows.map(w=><div key={w.date} className='smoke-view-day'>
            <div><strong>{shortDay(w.time,site.tz)}</strong><small>{dt(w.time,site.tz)}</small></div>
            <div><span className={'smoke-drift-label '+w.viewing.status}>{w.viewing.label}</span><small>Wind from {w.viewing.windFrom} · {w.windMph} mph · setup {w.score}/100</small></div>
          </div>)}
        </div>:<div className='smoke-empty'>No direction-qualified morning is available. This may mean no strong enough lake-smoke setup, missing wind directions, very light or strong winds, or the existing winter ice gate. An unavailable view is not a poor view.</div>}
        <p className='smoke-chart-foot'>View hours require setup score at least 50 and within 15 points of that morning’s best setup. Among those hours, along-shore drift comes first, then shoreward, then lakeward. This is a qualitative photography preference, not scientifically calibrated sighting probability.</p>
      </article>
    </div>
  </section>;
}



function LakeSmokeCameraPlayer({camera}){
  const player=playableCamera(camera);
  const [playing,setPlaying]=useState(false);
  const [posterFailed,setPosterFailed]=useState(false);
  const [snapshotFailed,setSnapshotFailed]=useState(false);
  const [refreshCount,setRefreshCount]=useState(0);
  const [shotOn,setShotOn]=useState(false);
  useEffect(()=>{
    if(!camera?.snapshotUrl||!shotOn)return;
    const id=setInterval(()=>setRefreshCount(v=>v+1),60000);
    return()=>clearInterval(id);
  },[camera?.snapshotUrl,shotOn]);
  const snapshot=/^https:\/\//.test(camera?.snapshotUrl||'')?camera.snapshotUrl:null;
  const imageLink=snapshot?(snapshot+(snapshot.includes('?')?'&':'?')+'smokeRefresh='+refreshCount):null;
  return <div className='smoke-player-block'>
    {player?<>
      {playing?<div className='smoke-camera-player' role='group' aria-label={'Embedded operator camera — '+camera.name}>
        <iframe key={player.kind+'-'+player.id} src={player.kind==='youtube'?player.embedUrl+'&autoplay=1&mute=1':player.embedUrl} title={camera.name+' — embedded camera, supplied by '+camera.operator}
          allow='autoplay; encrypted-media; picture-in-picture; fullscreen'
          referrerPolicy='strict-origin-when-cross-origin' loading='lazy' allowFullScreen/>
      </div>:<button type='button' className='smoke-camera-start' onClick={()=>setPlaying(true)}
        aria-label={'Play embedded '+camera.name+' camera'}>
        {player.posterUrl&&!posterFailed&&<img src={player.posterUrl} alt='' loading='lazy' onError={()=>setPosterFailed(true)}/>}<span className='smoke-camera-preview-title'>{camera.view}</span>
        <span className='smoke-camera-play'><span aria-hidden='true'>▶</span> {player.kind==='youtube'?'Watch live camera':'Load operator camera'}</span>
      </button>}
      <div className='smoke-camera-player-meta'><span>{playing?'Operator player requested — stream status unverified':'Loads only on request; no background video'}</span><span>Provider may require another click or may be offline</span></div>
    </>:snapshot?<>
      <div className='smoke-camera-player'>
        {shotOn&&!snapshotFailed?<img src={imageLink} alt={'Latest operator camera still at '+camera.name} loading='lazy'
          onError={()=>setSnapshotFailed(true)}/>:<div className='smoke-camera-snapshot-empty'>{snapshotFailed?'Operator still image unavailable. Try the original source.':'A recent operator still image can be requested below.'}</div>}
      </div>
      <button type='button' className='smoke-camera-refresh' onClick={()=>{setShotOn(true);setSnapshotFailed(false);setRefreshCount(x=>x+1);}}>Refresh operator snapshot</button>
      <p className='smoke-camera-fine'>If provided by the operator, this still refreshes once per minute while displayed. Camera timestamps must be checked at source.</p>
    </>:<div className='smoke-camera-noembed'>
      <strong>No verified embeddable player at this location.</strong>
      <span>Use the operator's original page below. A still image or a frame from an unrelated camera would be misleading.</span>
    </div>}
    {camera?.url&&<a className='smoke-camera-link' href={camera.url} target='_blank' rel='noopener noreferrer'>
      {player?'Open live stream on YouTube ↗':'Open operator camera ↗'}</a>}
    {camera?.operatorPage&&<a className='smoke-camera-link secondary' href={camera.operatorPage} target='_blank' rel='noopener noreferrer'>More cameras from operator ↗</a>}
  </div>;
}

function LakeSmokeHistory({site,history,loading,error}){
  const [days,setDays]=useState(14);
  const all=historyForSite(history?.archive,site.id);
  const samples=all.slice(-days);
  const count=samples.filter(x=>x.score!=null).length;
  const biggest=samples.filter(x=>x.score!=null).sort((a,b)=>b.score-a.score)[0]||null;
  const evidenceReady=history?.evidenceStatus==='available';
  const verified=evidenceReady?(history.evidence||[]).filter(e=>e.siteId===site.id):[];
  return <section id='smoke-history' className='smoke-history' aria-label='Recorded lake smoke forecast history and independent evidence'>
    <div className='smoke-section-line'><div><div className='smoke-overline dark'>A growing historical record</div><h2>What did the forecast say?</h2></div>
      <p>Saved forecasts issued the previous day. This is an archive of predictions—not confirmed lake smoke or a retrospective reconstruction.</p></div>
    <div className='smoke-history-grid'>
      <article className='smoke-history-card'>
        <div className='smoke-history-toolbar'>
          <div><small className='smoke-label'>{site.name}</small><h3>Next-morning forecast archive</h3></div>
          <div className='smoke-history-range' role='group' aria-label='Forecast history range'>
            {[14,30,90].map(n=><button key={n} type='button' aria-pressed={days===n} onClick={()=>setDays(n)} className={days===n?'active':''}>{n} days</button>)}
          </div>
        </div>
        {loading?<div className='smoke-empty'>Checking the historical forecast archive…</div>
        :error||history?.archiveStatus==='unavailable'?<div role='status' className='smoke-empty'>Historical source temporarily unavailable. Today's NOAA/NWS forecast remains separate and unaffected.</div>
        :all.length===0?<div className='smoke-empty'><strong>No daily forecast snapshots yet.</strong><p>The archive begins accumulating once the scheduled first daily capture succeeds. The tool will not manufacture earlier dates, numbers or sighting records.</p></div>
        :<>
          <div className='smoke-history-stats'>
            <div><small>Forecast issues in view</small><strong>{samples.length}</strong></div>
            <div><small>Scored mornings</small><strong>{count}</strong></div>
            <div><small>Highest archived projection</small><strong>{biggest?biggest.score+'/100':'—'}</strong></div>
          </div>
          <div className='smoke-history-chart' role='list' aria-label={'Archived next-morning forecasts for '+site.name}>
            {samples.map(p=><div key={p.issuedDate} className='smoke-history-entry' role='listitem' title={'Forecast issued '+p.issuedDate+' for '+p.date+(p.score!=null?' · '+p.score+'/100':' · not available')}>
              <div className='smoke-history-chart-top'><span>{p.date.slice(5)}</span><strong>{p.score!=null?p.score:'—'}</strong></div>
              <div className={'smoke-history-bar '+(p.score==null?'missing':p.score>=75?'high':p.score>=50?'mid':'low')}>
                {p.score!=null&&<div style={{height:p.score+'%'}}/>}
              </div>
              <small>{p.score==null?'No data':p.drift==='alongshore'?'Along':p.drift==='shoreward'?'Toward':p.drift==='lakeward'?'Away':'Wind n/a'}</small>
            </div>)}
          </div>
          <p className='smoke-history-foot'>Dates under each bar are the forecast <strong>target mornings</strong>; each value was issued on the previous local day. A dash means the source data were unavailable—not a 0 score or absence of fog.</p>
        </>}
        <div className='smoke-history-method'><strong>What this history can show:</strong> how frequently the experimental atmospheric setup index flagged favorable conditions, when ice or missing data interrupted forecasts, and whether the tool anticipated cold-air outbreaks. It cannot establish actual lake-smoke frequency or predictive accuracy without independent observations.</div>
      </article>
      <article className='smoke-history-card smoke-evidence-card'>
        <div className='smoke-overline dark'>Evidence, not assumption</div><h3>Did anyone actually see it?</h3>
        <p>A forecast is not a sighting. Only a dated, location-specific lake-smoke record that has been manually reviewed and linked to its original source can appear here.</p>
        {loading?<div className='smoke-evidence-empty'>Checking reviewed evidence…</div>
        :!evidenceReady?<div className='smoke-evidence-empty'>Independent evidence records are temporarily unavailable. No observation claims can be made.</div>
        :verified.length?<div className='smoke-evidence-rows'>{verified.slice(-4).reverse().map(e=>{const observedDay=easternDay(e.observedAt);const advance=all.find(a=>a.date===observedDay&&Date.parse(a.issuedAt)<Date.parse(e.observedAt));return <div key={e.id} className='smoke-evidence-row'>
            <span className='smoke-evidence-confirmed'>Reviewed observation</span><strong>{dt(e.observedAt,site.tz)}</strong>
            <small>{advance?.score!=null?'Prior-day model issue: '+advance.score+'/100 (issued '+advance.issuedDate+')':'No comparable prior-day forecast score archived.'} This pairing does not establish forecast accuracy.</small>
            <a href={e.sourceUrl} target='_blank' rel='noopener noreferrer'>View original evidence ↗</a>
          </div>;})}</div>
        :<div className='smoke-evidence-empty'><strong>No reviewed lake-smoke sightings for this lookout yet.</strong><span>That does not mean lake smoke was absent. It means the tool has no reviewed evidence for this location.</span></div>}
        <div className='smoke-evidence-method'><strong>Evidence rules</strong>
          <p>Reports need a precise location, observation date/time, original photo, camera record or official source, and an independent editorial review. Generic fog reports, an unavailable webcam, and forecast scores never become confirmed sightings automatically.</p>
          <a href='https://github.com/izworskic/phenology-michigan/issues/new?template=lake-smoke-observation.yml' target='_blank' rel='noopener noreferrer'>Submit a documented observation for review ↗</a>
          <a href='#cameras'>Find the camera sources for this shoreline ↓</a>
        </div>
      </article>
    </div>
  </section>;
}

function MorningChart({site}){
  const windows=site?.outlook?.windows||[];
  return <div className='smoke-chart'>
    {windows.length?windows.map(w=><div className='smoke-chart-day' key={w.date}>
      <div className='smoke-chart-label'><strong>{shortDay(w.time,site.tz)}</strong><span>{new Intl.DateTimeFormat('en-US',{timeZone:site.tz,hour:'numeric'}).format(new Date(w.time))} local</span></div>
      <div className='smoke-chart-track'><div style={{width:w.score+'%'}} className={'smoke-chart-fill '+(w.score>=75?'strong':w.score>=50?'possible':'low')}/></div>
      <div className='smoke-chart-number'>{w.score}<small>/100</small></div>
      <div className='smoke-chart-note'>{w.spreadC>0?'+':''}{w.spreadC}°C water–air · {w.windMph} mph wind · {w.viewing?.windFrom?'from '+w.viewing.windFrom:'direction unavailable'}</div>
    </div>):<div className='smoke-empty'>The morning outlook will appear when both recent local water temperature and hourly weather forecasts are available. No estimated scores are shown without those sources.</div>}
    <p className='smoke-chart-foot'>Highest-scoring forecast hour between 5–10 a.m. each morning; no claim of observed fog. This index is experimental and is not a probability. A nearby-buoy value is an explicitly labelled proxy rather than a local satellite pixel.</p>
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
  const [ranking,setRanking]=useState('views');
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [history,setHistory]=useState(null),[historyLoading,setHistoryLoading]=useState(true),[historyError,setHistoryError]=useState(false);
  useEffect(()=>{
    const fromUrl=new URLSearchParams(window.location.search).get('location');
    if(SITES.some(x=>x.id===fromUrl))setSelected(fromUrl);
    const controller=new AbortController();
    fetch('/api/lake-smoke',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('The forecast service is temporarily unavailable');return r.json();})
      .then(json=>{setData(json);setLoading(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setLoading(false);}});
    return()=>controller.abort();
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/lake-smoke-history',{signal:controller.signal}).then(res=>{if(!res.ok)throw Error('Historical archive unavailable');return res.json();})
      .then(body=>{setHistory(body);setHistoryLoading(false);})
      .catch(err=>{if(err.name!=='AbortError'){setHistoryError(true);setHistoryLoading(false);}});
    return()=>controller.abort();
  },[]);
  const choose=id=>{
    setSelected(id);
    const url=new URL(window.location.href);
    url.searchParams.set('location',id);
    window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  };
  const chooseCamera=id=>{
    choose(id);
    window.requestAnimationFrame(()=>document.getElementById('cameras')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  const locations=data?.locations||SITES.map(site=>({...site,status:{label:'Awaiting data',tone:'unknown'},outlook:{windows:[],hourly:[],best:null}}));
  const picked=locations.find(site=>site.id===selected)||locations[0];
  // Cameras do not depend on the slower NOAA/NWS forecast API loading.
  const selectedCamera=picked?.camera||cameraFor(picked?.id);
  const best=picked?.outlook?.best;
  const top=useMemo(()=>locations.filter(x=>x.outlook?.best&&x.outlook.best.score>=30).sort((a,b)=>b.outlook.best.score-a.outlook.best.score).slice(0,3),[locations]);
  const viewTop=useMemo(()=>rankShorelineViews(locations).slice(0,3),[locations]);
  const rankedBy=ranking==='views'&&viewTop.length>0?'views':'setup';
  const featured=rankedBy==='views'?viewTop:top;
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
      <meta name='twitter:card' content='summary_large_image'/><meta property='og:image' content={BASE+HERO_LOCAL}/><meta property='og:image:alt' content='Actual lake smoke rising from Lake Michigan during a January cold outbreak'/><meta name='twitter:image' content={BASE+HERO_LOCAL}/><link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'/><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/><link rel='stylesheet' href='/lake-smoke.css'/>
      <script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/></Head>
    <header className='smoke-header smoke-wrap'><a className='smoke-brand' href='/'>MICHIGAN PHENOLOGY <span> / GREAT LAKES</span></a><nav aria-label='Lake smoke navigation'><a href='#places'>Locations</a><a href='#forecast'>Forecast</a><a href='#wind-view'>Wind direction</a><a href='#smoke-history'>History</a><a href='#cameras'>Cameras</a><a href='#science'>How it works</a></nav></header>
    <main>
      <section className='smoke-hero' aria-label='An actual photograph of lake smoke over Lake Michigan'>
        <img className='smoke-hero-photo' src={HERO_LOCAL} alt='Real steam fog drifting above Lake Michigan during the January 2014 cold outbreak in Chicago' width='1280' height='960' decoding='async' fetchPriority='high' onError={event=>{
          if(!event.currentTarget.dataset.fallback){
            event.currentTarget.dataset.fallback='commons';
            event.currentTarget.src=HERO_ORIGINAL;
          }else{event.currentTarget.style.display='none';}
        }}/>
        <div className='smoke-hero-scrim' aria-hidden='true'/>
        <div className='smoke-wrap smoke-hero-content'><div className='smoke-overline'>A living calendar of Great Lakes weather</div><h1>Where will the lakes <em>smoke?</em></h1><p>Cold air. Relatively warm water. A fleeting morning when the Great Lakes appear to breathe. Find the most promising conditions and know when to look.</p>
          <div className='smoke-hero-pills'><span>15 shoreline locations</span><span>NOAA lake temperatures</span><span>Verified nearby buoy fallback</span><span>NWS hourly forecasts</span><span>Seasonal ice screening</span><span>Shoreline wind direction</span><span>Daily forecast archive</span></div>
        </div>
        <div className='smoke-hero-photo-credit'><span>Actual lake smoke over Lake Michigan, January 2014 — <a href={HERO_CREDIT} target='_blank' rel='noopener noreferrer'>Edward Stojakovic / Wikimedia Commons</a>, <a href='https://creativecommons.org/licenses/by/2.0/' target='_blank' rel='noopener noreferrer'>CC BY 2.0</a> · Cropped for layout</span></div>
      </section>
      <div className='smoke-wrap'>
        <section className='smoke-status-strip' aria-label='Current forecast status'>
          <div><small>Lake smoke outlook</small><h2>{loading?'Checking lake and air temperatures…':error?'Forecast connection unavailable':anyForecast?(top.length?'Current cold-air setup outlook':'Few lake smoke conditions in the forecast'):'Local water readings unavailable'}</h2><p>{loading?'Gathering NOAA and NWS conditions across five Great Lakes.':error?error:anyForecast?'Compare the strongest upcoming morning setups below. A strong setup is not a confirmed sighting.':'There are currently no reliable combined water-and-air forecasts to rank. The map and viewing guide remain available.'}</p></div>
          <div className='smoke-updated'><span>{data?.activeLocations??'—'} / {SITES.length}</span><small>sites with usable data</small>{data&&<small>{Math.max(0,(data.glseaBackedLocations||0)-(data.dailyGridBackedLocations||0))} ERDDAP · {data.dailyGridBackedLocations||0} NOAA daily grid · {data.buoyBackedLocations||0} buoys</small>}<small>{data?.generatedAt?'Updated '+dt(data.generatedAt):'Live update pending'}</small></div>
        </section>
        {(featured.length>0||!loading)&&<section className='smoke-top' aria-label='Top forecast and shoreline viewing locations'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Plan your shoreline visit</div><h2>{rankedBy==='views'?'Best shoreline viewing setups':'Strongest lake-smoke setups'}</h2></div><p>{rankedBy==='views'?'Ranked by approximate wind drift and qualifying atmospheric setup. An across-shore drift is often easier to watch from land.':'Ranked only by water/air contrast, forecast wind speed and existing ice safeguards.'}</p></div>
          <div className='smoke-rank-tabs' role='group' aria-label='Choose ranking focus'><button type='button' aria-pressed={ranking==='views'} className={ranking==='views'?'active':''} onClick={()=>setRanking('views')}>Best shoreline views</button><button type='button' aria-pressed={ranking==='setup'} className={ranking==='setup'?'active':''} onClick={()=>setRanking('setup')}>Strongest fog setup</button></div>
          {ranking==='views'&&viewTop.length===0&&!loading&&<p className='smoke-rank-note'>No direction-qualified shoreline viewing forecast is available. Showing the underlying atmospheric setups instead; wind direction has not been guessed.</p>}
          {featured.length>0?<div className='smoke-top-grid'>{featured.map((s,i)=>{
            const window=rankedBy==='views'?s.outlook.bestView:s.outlook.best;
            return <button key={s.id} type='button' className='smoke-top-card' onClick={()=>{choose(s.id);document.getElementById('forecast')?.scrollIntoView({behavior:'smooth'});}}>
              <span className='smoke-top-kicker'>#{i+1} · Lake {s.lake}</span><strong>{s.name}</strong>{cameraFor(s.id)&&<span className='smoke-top-camera-hint'>{playableCamera(cameraFor(s.id))?'Camera player available · See below':'Camera source available · See below'}</span>}
              <div><Score value={window.score}/>{rankedBy==='views'?<span className={'smoke-drift-label '+window.viewing.status}>{window.viewing.label}</span>:<Tone status={s.status}/>}</div>
              <small>{shortDay(window.time,s.tz)} · {window.viewing?.windFrom?'wind from '+window.viewing.windFrom+' · ':''}{window.spreadC>0?'+':''}{window.spreadC}°C water–air</small>
            </button>})}</div>:<div className='smoke-empty'>No qualifying location has enough current data for a credible forecast ranking.</div>}
          <p className='smoke-rank-foot'>The shoreline-view ranking does not change the 0–100 lake-smoke setup index. Neither ranking verifies actual fog, visibility, nor safe access.</p>
        </section>}
        <section id='places' className='smoke-explore'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Explore the shore</div><h2>Choose a place to watch</h2></div><p>Click a map marker or select a shoreline below. Each score requires a recent offshore water-temperature grid cell and an hourly forecast. During ice season it also requires a recent local ice analysis.</p></div>
          <div className='smoke-explore-grid'>
            <MapPanel results={locations} selected={selected} onChoose={choose}/>
            <div className='smoke-sidebar'><div className='smoke-sidebar-heading'><h3>15 Great Lakes lookouts</h3><label htmlFor='lake-filter'>Filter by lake</label><select id='lake-filter' value={filter} onChange={e=>setFilter(e.target.value)}>{['All lakes','Superior','Michigan','Huron','Erie','Ontario'].map(x=><option key={x}>{x}</option>)}</select></div>
              <div className='smoke-location-list'>{filtered.map(s=><button type='button' className={'smoke-location '+(selected===s.id?'selected':'')} key={s.id} onClick={()=>choose(s.id)} aria-pressed={selected===s.id}><span><strong>{s.name}</strong><small>Lake {s.lake} · {s.status?.label}{s.outlook?.bestView?' · '+s.outlook.bestView.viewing.label:''}</small>{cameraFor(s.id)&&<small className='smoke-list-cam-flag'>{playableCamera(cameraFor(s.id))?'◉ Camera player':'◉ Camera link'}</small>}</span><span className='smoke-location-score'>{s.outlook?.best?.score??'—'}</span></button>)}</div>
            </div>
          </div>
        </section>
        <section id='forecast' className='smoke-detail'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Your selected shoreline · Lake {picked.lake}</div><h2>{picked.name}</h2></div><Tone status={picked.status}/></div>
          <div className='smoke-detail-grid'>
            <article className='smoke-panel'><small className='smoke-label'>Best upcoming morning</small><div className='smoke-result'><Score value={best?.score}/><span>{best?shortDay(best.time,picked.tz):'Awaiting trustworthy inputs'}<small>{best?dt(best.time,picked.tz):'No viewing prediction available'}</small></span></div>
              <p>{best?best.signal+' conditions in the selected morning forecast window. This is a planning index, not a fog probability.':'A lake smoke outlook requires recent NOAA lake-water temperatures, an NWS hourly forecast and, during November–May, recent local ice concentration.'}</p>
              <div className='smoke-metrics'><div><small>Lake surface</small><strong>{picked.water?fmtTemp(picked.outlook?.best?.waterF??picked.water.c*9/5+32):'—'}</strong></div><div><small>Forecast air</small><strong>{fmtTemp(best?.airF??picked.airForecastF)}</strong></div><div><small>Water warmer by</small><strong>{best?best.spreadC+'°C':'—'}</strong></div><div><small>Wind at best hour</small><strong>{best?best.windMph+' mph':'—'}</strong></div></div>
              {best&&<p className='smoke-small'>Weather setup at {dt(best.time,picked.tz)}; {best.viewing?.windFrom?'forecast wind from '+best.viewing.windFrom+' ('+best.viewing.label+')':'forecast wind direction unavailable'}. A better visual-drift hour may be shown below.</p>}
              {picked.water&&<p className={'smoke-small '+(picked.water.isProxy?'smoke-buoy-note':picked.water.fromDailyGrid?'smoke-daily-source':'')}>Water source: <strong>{picked.water.kind}</strong> · {picked.water.fromDailyGrid?'file last modified':picked.water.isProxy?'buoy measured':'analyzed'} {dt(picked.water.time,picked.tz)}. {picked.water.scope||'Offshore grid estimate, not a shoreline thermometer.'}{picked.water.sourceUrl&&<span> <a href={picked.water.sourceUrl} target='_blank' rel='noopener noreferrer'>{picked.water.isProxy?'NOAA buoy '+picked.water.stationId:'NOAA daily grid source'} ↗</a></span>}</p>}
              <div className='smoke-ice-readout' aria-label='NOAA ice coverage check'>
                <div><small>Open-water check</small><strong>{picked.iceCheck?.label||'Waiting for ice status'}</strong></div>
                {picked.ice&&<div className='smoke-ice-value'>{picked.ice.percent}% <small>ice at sampled offshore cell</small></div>}
              </div>
              <p className='smoke-small smoke-ice-note'>{picked.iceCheck?.note||'Ice concentration is assessed separately during the cold season.'}{picked.ice?.time?' Ice map: '+dt(picked.ice.time,picked.tz)+'.':''}</p>
              {picked.unavailable?.ice&&<p className='smoke-warning'>{picked.unavailable.ice}</p>}
              {picked.unavailable?.water&&<p className='smoke-warning'>{picked.unavailable.water} {picked.airForecastF!=null?'NWS air forecast is available but cannot produce a lake-smoke index without water temperature.':''}</p>}
              {picked.unavailable?.weather&&<p className='smoke-warning'>{picked.unavailable.weather}</p>}
              <p className='smoke-view-note'><strong>Viewing area:</strong> {picked.view}. Check opening hours, shoreline conditions and access before leaving.</p>
            </article>
            <article className='smoke-panel'><div className='smoke-overline dark'>Next 72 hours</div><h3>Morning-by-morning comparison</h3><MorningChart site={picked}/><SpreadGraph site={picked}/></article>
          </div>
        </section>
        <section id='cameras' className='smoke-cameras' aria-label='Shoreline camera verification'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Before you make the drive</div><h2>Watch the shoreline camera</h2></div><p>{EMBEDDABLE_IDS.length} operator-published embedded players across the Great Lakes. Select a shoreline below. These are links to live services, not independently verified live pictures.</p></div>
          <div className='smoke-camera-picks' role='group' aria-label='Choose an embedded shoreline camera'>
            {EMBEDDABLE_IDS.map(id=>{
              const site=SITES.find(x=>x.id===id),cam=cameraFor(id);
              return <button key={id} type='button' className={'smoke-camera-pick '+(id===picked.id?'selected':'')}
                aria-pressed={id===picked.id} onClick={()=>chooseCamera(id)}>
                <span className='smoke-camera-pick-lake'>Lake {site.lake}</span>
                <strong>{site.name}</strong>
                <small>{cam?.view}</small>
              </button>;
            })}
          </div>
          <div className='smoke-cameras-grid'>
            <div className='smoke-camera-card'>
              <div className='smoke-camera-kicker'>Selected location · {picked.name} · Camera sources reviewed {CAMERA_REVIEW_DATE}</div>
              {selectedCamera?<><h3>{selectedCamera.name}</h3><p><strong>Camera operator:</strong> {selectedCamera.operator}</p><p><strong>View:</strong> {selectedCamera.view}</p><LakeSmokeCameraPlayer key={picked.id} camera={selectedCamera}/>
                {selectedCamera.note&&<p className='smoke-camera-notice'>{selectedCamera.note}</p>}
                <p className='smoke-camera-fine'>These camera sources are operator-published, but the tool does not check whether video is playing today. Some cameras show sheltered harbors or a river, not open-lake visibility. Video is not copied, recorded or automatically analyzed.</p></>
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
        <ShorelineViewing site={picked}/>
        <LakeSmokeHistory site={picked} history={history} loading={historyLoading} error={historyError}/>
        <section id='science' className='smoke-science'>
          <div className='smoke-section-line'><div><div className='smoke-overline dark'>Why the lakes seem to breathe</div><h2>How lake smoke forms</h2></div><p>This is steam fog, not wildfire smoke and not the same setup as typical warm-air-over-cold-water fog.</p></div>
          <div className='smoke-science-grid'><div className='smoke-science-card'><span>01</span><h3>Lake stays relatively warm</h3><p>Great Lakes water loses heat slowly. When a cold front arrives, open water can be much warmer than the air above it.</p></div><div className='smoke-science-card'><span>02</span><h3>Cold air draws moisture</h3><p>Water evaporates into the colder air. Close to the surface, that moisture condenses into wisps of visible steam fog.</p></div><div className='smoke-science-card'><span>03</span><h3>Wind shapes the spectacle</h3><p>A light breeze helps move cold air across the water. Stronger wind can mix and disperse the fog, while shore geography adds uncertainty.</p></div></div>
          <div className='smoke-caution'><strong>Safety before photography.</strong> Lake smoke can coincide with cold outbreaks, waves, ice and rapidly changing visibility. Do not use this viewing index for boating or navigation. Check <a href='https://www.weather.gov/marine/' target='_blank' rel='noreferrer'>NWS marine forecasts</a> and local advisories.</div>
        </section>
        <section className='smoke-faq'><h2>Lake smoke questions</h2>{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
        <footer className='smoke-footer'><div><strong>Methods & data</strong><p>A transparent, experimental planning heuristic. Scores are not observed sightings or probabilities. NOAA GLSEA analyzed temperatures can be smoothed or missing under clouds; coastal readings are approximations. The engine refuses to score when water or hourly weather is missing or stale, and in November–May when local ice data are missing. NWS wind directions are interpreted as where the air comes from, and the open-water bearing is approximated from the original onshore/offshore coordinate pair. Nearby NDBC buoy fallback water temperatures are in-water measurements, not satellite surface measurements, and may not match the selected shore. The qualitative shoreline viewing rank is separate from the atmospheric score and requires known direction and appropriate wind speed. A grid cell showing ice limits or blocks scores; the sampled condition may differ at the shoreline and may change over the 72-hour forecast. Daily next-morning forecast issues are archived as predictions when issued; an independently reviewed source is required to claim any actual sighting.</p><div className='smoke-sources'>{SOURCE_LINKS.map(s=><a key={s.url} href={s.url} target='_blank' rel='noreferrer'>{s.name} ↗</a>)}</div></div><p>Built by <a href='https://chrisizworski.com/chris-izworski/'>Chris Izworski</a> · <a href='/'>Michigan Phenology</a> · <a href='/bloom-tracker'>Michigan Bloom Tracker</a></p></footer>
      </div>
    </main>
  </div>;
}
