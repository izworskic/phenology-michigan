import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/hummingbirds';
const CARTO_KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88'; // Same public domain-restricted key as Bloom Tracker
const BOUNDS=[[41.7,-90.35],[48.25,-82.1]];
const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const icon=(L,index,tone,active)=>L.divIcon({
 className:'hum-pin-wrap',
 html:'<div class="hum-pin '+(tone||'off')+(active?' active':'')+'"><span>'+index+'</span></div>',
 iconSize:[38,44],iconAnchor:[19,22],tooltipAnchor:[0,-18]
});
export default function HummingbirdMap({selected,onSelect,regions}){
 const el=useRef(null),map=useRef(null),base=useRef(null),pins=useRef(new Map()),handler=useRef(onSelect);
 const [ready,setReady]=useState(false),[mode,setMode]=useState('voyager'),[error,setError]=useState('');
 handler.current=onSelect;
 useEffect(()=>{
  if(!ready||!window.L||!el.current||map.current)return;
  const L=window.L;
  let m;
  try{
   m=L.map(el.current,{scrollWheelZoom:false,zoomControl:false,minZoom:5,maxZoom:12,zoomSnap:.25});
   map.current=m;
   L.control.zoom({position:'bottomright'}).addTo(m);
   m.fitBounds(BOUNDS,{padding:[22,22],animate:false});
   REGIONS.forEach((r,i)=>{
    const marker=L.marker([r.lat,r.lon],{icon:icon(L,i+1,'off',r.id===selected),keyboard:true,title:r.name,alt:r.name+' approximate weather location'}).addTo(m);
    marker.bindTooltip(r.name,{direction:'top'});
    marker.on('click',()=>handler.current(r.id));
    pins.current.set(r.id,marker);
   });
   const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>m.invalidateSize({pan:false})):null;
   observer?.observe(el.current);
   const later=setTimeout(()=>m.invalidateSize({pan:false}),180);
   return ()=>{clearTimeout(later);observer?.disconnect();pins.current.clear();m.remove();map.current=null;base.current=null;};
  }catch(_e){m?.remove();map.current=null;setError('Map could not initialize. Use the region selector instead.');}
 },[ready]);
 useEffect(()=>{
  if(!ready||!map.current||!window.L)return;
  if(base.current)map.current.removeLayer(base.current);
  const layer=window.L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+mode+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO_KEY),{attribution:ATTRIBUTION,maxZoom:20,updateWhenIdle:true,keepBuffer:1});
  let hasLoaded=false,errors=0;
  layer.on('tileload',()=>{hasLoaded=true;setError('');});
  layer.on('tileerror',()=>errors++);
  layer.on('load',()=>{if(errors&&!hasLoaded)setError('Map tiles could not load; region buttons remain available.');});
  layer.addTo(map.current);base.current=layer;
 },[ready,mode]);
 useEffect(()=>{
  if(!ready||!window.L)return;
  REGIONS.forEach((r,i)=>{
   const marker=pins.current.get(r.id),row=regions?.find(x=>x.id===r.id);
   marker?.setIcon(icon(window.L,i+1,row?.signal?.tone||'off',selected===r.id));
   marker?.setZIndexOffset(r.id===selected?1000:0);
  });
 },[ready,regions,selected]);
 const reset=()=>map.current?.fitBounds(BOUNDS,{padding:[22,22],animate:true});
 return <div className="hum-mapbox">
  <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError('Map library unavailable. Use the region selector.')}/>
  <div className="hum-mapcontrols"><div className="hum-maptypes"><button aria-pressed={mode==='voyager'} onClick={()=>setMode('voyager')}>Street</button><button aria-pressed={mode==='dark_all'} onClick={()=>setMode('dark_all')}>Night</button></div><button onClick={reset}>All Michigan ↗</button></div>
  <div ref={el} className="hum-mapcanvas" role="region" aria-label="Interactive CARTO map of nine Michigan regional hummingbird arrival forecast centers"/>
  {!ready&&!error&&<p className="hum-mapfeedback">Loading Michigan map…</p>}
  {error&&<p className="hum-mapfeedback" role="status">{error}</p>}
  <div className="hum-mapcaption">REGIONAL FORECAST CENTERS · NOT INDIVIDUAL BIRD LOCATIONS</div>
 </div>;
}
