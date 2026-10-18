import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {SITES} from '../lib/frostMorning.mjs';

// Public, domain-restricted CARTO basemap key shared with the working Michigan
// Bloom / Firefly / Hummingbird maps. No new service, tile proxy or paid token.
// This map visualizes weather-grid reference points, never verified frost sites.
const CARTO_KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution/" target="_blank" rel="noopener noreferrer">CARTO</a>';
const MICHIGAN_BOUNDS=[[41.63,-90.55],[48.24,-82.13]];
const tone=n=>!Number.isFinite(n)?'unknown':n>=75?'strong':n>=55?'possible':n>=30?'limited':'low';
const scoreFor=(s,board,selected,location,date)=>{
  const row=board?.find(b=>b.id===s.id);
  if(row)return row.mornings?.find(m=>m.date===date)?.score??null;
  return selected===s.id&&location?.id===s.id?location.mornings?.find(m=>m.date===date)?.score??null:null;
};
const icon=(L,score,active)=>{
  const value=Number.isFinite(score)?String(Math.round(score)):'—';
  return L.divIcon({
    className:'fm-carto-marker-container',
    html:'<span class="fm-carto-marker '+tone(score)+(active?' is-active':'')+'"><span>'+value+'</span></span>',
    iconSize:[44,44],
    iconAnchor:[22,22],
    tooltipAnchor:[0,-18],
    popupAnchor:[0,-21]
  });
};
const todayText=date=>{
  if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return 'Upcoming dawns';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
};
export default function FrostCartoMap({chosen,onChoose,board,location,date}){
  const target=useRef(null),mapRef=useRef(null),tilesRef=useRef(null);
  const markersRef=useRef(new Map()),chooseRef=useRef(onChoose),firstSelection=useRef(true);
  const [leafletReady,setLeafletReady]=useState(false);
  const [style,setStyle]=useState('voyager');
  const [tilesLoaded,setTilesLoaded]=useState(false);
  const [mapError,setMapError]=useState('');
  chooseRef.current=onChoose;
  const selectedSite=SITES.find(s=>s.id===chosen)||SITES[0];
  const selectedRow=board?.find(r=>r.id===selectedSite.id);
  const selectedResult=selectedRow||((location?.id===selectedSite.id)?location:null);
  const selectedMorning=selectedResult?.mornings?.find(m=>m.date===date);
  const currentScore=selectedMorning?.score??null;

  // Initialize once. Marker instances are preserved while scores and basemaps change.
  useEffect(()=>{
    if(!leafletReady||!target.current||mapRef.current||!window.L)return;
    const L=window.L;let map;
    try{
      map=L.map(target.current,{
        zoomControl:false,scrollWheelZoom:false,
        minZoom:5,maxZoom:13,zoomSnap:.25,tap:false,
        keyboard:true,attributionControl:true
      });
      mapRef.current=map;
      L.control.zoom({position:'bottomright'}).addTo(map);
      map.fitBounds(MICHIGAN_BOUNDS,{padding:[22,22],animate:false});
      SITES.forEach(s=>{
        const marker=L.marker([s.lat,s.lon],{
          icon:icon(L,null,s.id===chosen),keyboard:true,
          title:s.name,alt:s.name+' weather forecast point',
          riseOnHover:true,autoPanOnFocus:true
        }).addTo(map);
        marker.bindTooltip(s.name,{direction:'top',opacity:.97});
        marker.on('click',()=>chooseRef.current(s.id));
        markersRef.current.set(s.id,marker);
      });
      // Without invalidation a grid layout change can leave half the map blank.
      const resize=()=>map.invalidateSize({pan:false});
      const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
      observer?.observe(target.current);
      window.addEventListener('resize',resize);
      const frame=requestAnimationFrame(resize);
      return ()=>{
        cancelAnimationFrame(frame);
        window.removeEventListener('resize',resize);
        observer?.disconnect();
        markersRef.current.clear();
        tilesRef.current=null;
        map.remove();mapRef.current=null;
      };
    }catch{
      if(map)map.remove();
      mapRef.current=null;
      setMapError('Map controls could not initialize. Use the location list beside the map.');
    }
  },[leafletReady]);

  // CARTO Voyager and Dark Matter use the same authorized key as the other tools.
  useEffect(()=>{
    if(!leafletReady||!window.L||!mapRef.current)return;
    const L=window.L,map=mapRef.current;
    if(tilesRef.current)map.removeLayer(tilesRef.current);
    setTilesLoaded(false);setMapError('');
    const url='https://basemaps.cartocdn.com/'+(style==='dark_all'?'dark_all':'rastertiles/voyager')+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO_KEY);
    const layer=L.tileLayer(url,{
      attribution:ATTRIBUTION,maxZoom:20,minZoom:0,tileSize:256,
      detectRetina:false,updateWhenIdle:true,keepBuffer:1
    });
    let successes=0,failures=0;
    const success=()=>{successes++;setTilesLoaded(true);setMapError('');};
    const failure=()=>{failures++;};
    // Individual missing tiles should not falsely mark a working basemap as broken.
    const settled=()=>{if(successes===0&&failures>0)setMapError('CARTO basemap tiles did not load. The forecast location list remains available.');};
    layer.on('tileload',success);layer.on('tileerror',failure);layer.on('load',settled);
    layer.addTo(map);tilesRef.current=layer;
    return ()=>{layer.off('tileload',success);layer.off('tileerror',failure);layer.off('load',settled);};
  },[leafletReady,style]);

  useEffect(()=>{
    if(!leafletReady||!window.L||!mapRef.current)return;
    const L=window.L;
    SITES.forEach(s=>{
      const marker=markersRef.current.get(s.id);
      const score=scoreFor(s,board,chosen,location,date);
      marker?.setIcon(icon(L,score,chosen===s.id));
      marker?.setZIndexOffset(chosen===s.id?1100:0);
      const row=board?.find(b=>b.id===s.id)||((chosen===s.id&&location?.id===s.id)?location:null);
       const night=row?.mornings?.find(m=>m.date===date)?.night;
       const text=s.name+' · '+todayText(date)+(score!=null?' · '+score+'/100 weather setup':' · missing dawn forecast')+(night?.status==='ready'?' · '+night.headline:' · overnight evidence incomplete');
      marker?.setTooltipContent(text);
    });
  },[leafletReady,board,chosen,location,date]);

  useEffect(()=>{
    const map=mapRef.current;
    if(!leafletReady||!map)return;
    if(firstSelection.current){firstSelection.current=false;return;}
    const s=SITES.find(s=>s.id===chosen);
    if(s)map.flyTo([s.lat,s.lon],Math.max(6.6,map.getZoom()),{duration:.55});
  },[leafletReady,chosen]);

  const reset=()=>{
    const map=mapRef.current;
    if(map){map.invalidateSize({pan:false});map.fitBounds(MICHIGAN_BOUNDS,{padding:[22,22],animate:true,duration:.5});}
  };

  return <div className='fm-map fm-carto-shell' data-map-provider='carto' data-map-style={style} aria-label='Michigan frost weather forecast map'>
    <Script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js' strategy='afterInteractive'
      onReady={()=>setLeafletReady(true)}
      onError={()=>setMapError('The mapping library did not load. Use the location list beside the map.')}/>
    <div className='fm-carto-toolbar'>
      <div><strong>A field guide to Michigan mornings</strong><small>12 NWS forecast points · selected dawn: {todayText(date)}</small></div>
      <div className='fm-carto-controls'>
        <div className='fm-carto-switch' role='group' aria-label='Map basemap style'>
          <button type='button' aria-pressed={style==='voyager'} onClick={()=>setStyle('voyager')}>Terrain & roads</button>
          <button type='button' aria-pressed={style==='dark_all'} onClick={()=>setStyle('dark_all')}>Night</button>
        </div>
        <button className='fm-carto-reset' type='button' onClick={reset} disabled={!leafletReady} aria-label='Reset map to all Michigan locations'>All Michigan</button>
      </div>
    </div>
    <div className='fm-carto-frame'>
      <div ref={target} className='fm-carto-canvas' role='region'
        aria-label='Interactive Michigan CARTO map; use zoom controls, drag to pan, or select any forecast marker'/>
      {!leafletReady&&!mapError&&<div className='fm-carto-loading' role='status'>Loading the CARTO basemap…</div>}
      {mapError&&<div className='fm-carto-error' role='status'>{mapError}</div>}
      {!mapError&&!tilesLoaded&&leafletReady&&<div className='fm-carto-loading fm-carto-loading-small' role='status'>Loading map tiles…</div>}
      <div className='fm-carto-map-caption'>{todayText(date)} forecast conditions · not observed hoarfrost</div>
    </div>
    <div className='fm-carto-selected' aria-live='polite'>
      <div><small>Selected weather point</small><strong>{selectedSite.name}</strong>
        <span>{Number.isFinite(currentScore)?(selectedMorning?.label||'Weather setup')+' · '+todayText(date):'Detailed forecast available in the panel below'}</span></div>
      <div className='fm-carto-selected-right'><span className={'fm-carto-score '+tone(currentScore)}>{Number.isFinite(currentScore)?Math.round(currentScore):'—'}<small>{Number.isFinite(currentScore)?'/100':'no score'}</small></span>
        <a href='#forecast'>Read this dawn's forecast ↓</a></div>
    </div>
    <div className='fm-map-foot fm-carto-legend' aria-label='Forecast weather setup scale'>
      <span><i className='strong'/>75–100 strong</span>
      <span><i className='possible'/>55–74 possible</span>
      <span><i className='limited'/>30–54 limited</span>
      <span><i className='low'/>0–29 unfavorable</span>
      <span><i className='unknown'/>Not ranked / unavailable</span>
    </div>
    <small className='fm-carto-source'>Basemap © OpenStreetMap contributors, © CARTO (attribution visible on map). Colors reflect modeled weather, not observations or probability. Some sites receive detailed forecasts only after selection.</small>
  </div>;
}
