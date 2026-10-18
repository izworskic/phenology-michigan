import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/salamanders.mjs';

// Same domain-restricted CARTO key used by the existing firefly and bloom trackers.
// Markers are approximate weather grid points; never breeding pools or crossing locations.
const CARTO_KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const BOUNDS=[[41.68,-90.50],[48.26,-82.12]];
function pin(L,index,level,active){
 const color={strong:'#f1bd75',watch:'#a8d6a8',guarded:'#c6b8e2',cold:'#afc4ce',dry:'#849694',unknown:'#b6c4b7',off:'#c8d1b3'}[level]||'#d1c7b4';
 return L.divIcon({className:'sala-pin-wrap',html:'<div class="sala-pin'+(active?' active':'')+'" style="--pin:'+color+'">'+index+'</div>',iconSize:[36,36],iconAnchor:[18,18]});
}
export default function SalamanderMap({selected,onSelect,rows}){
 const host=useRef(null),map=useRef(null),tiles=useRef(null),markers=useRef(new Map());
 const callback=useRef(onSelect);callback.current=onSelect;
 const [ready,setReady]=useState(false),[failure,setFailure]=useState(''),[base,setBase]=useState('voyager');
 useEffect(()=>{
  if(!ready||!window.L||!host.current||map.current)return;
  const L=window.L;
  try{
   const instance=L.map(host.current,{scrollWheelZoom:false,zoomControl:false,attributionControl:true,minZoom:5,maxZoom:12});
   map.current=instance;
   instance.fitBounds(BOUNDS,{padding:[15,15],animate:false});
   L.control.zoom({position:'bottomright'}).addTo(instance);
   REGIONS.forEach((region,i)=>{
    const marker=L.marker([region.lat,region.lon],{title:region.name,keyboard:true,icon:pin(L,i+1,'off',false)}).addTo(instance);
    marker.bindTooltip(region.name,{direction:'top'});
    marker.on('click',()=>callback.current(region.id));
    markers.current.set(region.id,marker);
   });
   const resize=()=>instance.invalidateSize({pan:false});
   const obs=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
   if(obs)obs.observe(host.current);
   const frame=requestAnimationFrame(resize);
   window.addEventListener('resize',resize);
   return ()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);obs?.disconnect();markers.current.clear();instance.remove();map.current=null;tiles.current=null;};
  }catch{setFailure('Map could not initialize. The regional selection buttons below remain available.');}
 },[ready]);
 useEffect(()=>{
  if(!map.current||!window.L)return;
  if(tiles.current)map.current.removeLayer(tiles.current);
  setFailure('');
  let errors=0,success=false;
  const layer=window.L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+base+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO_KEY),{
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:19
  });
  layer.on('tileload',()=>{success=true;setFailure('');});
  layer.on('tileerror',()=>{errors++;});
  layer.on('load',()=>{if(errors&&!success)setFailure('Map tiles unavailable. Select a forecast region using the list below.');});
  layer.addTo(map.current);tiles.current=layer;
 },[ready,base]);
 useEffect(()=>{
  if(!ready||!window.L)return;
  REGIONS.forEach((r,i)=>{
   const m=markers.current.get(r.id),row=rows?.find(x=>x.id===r.id);
   // Map matches the new Tonight board; seven-night best appears separately in the outlook strip.
   const level=row?.season==='spring'?(row?.bigNight?.source?.status==='current'?row?.tonight?.level||'unknown':'unknown'):'off';
   m?.setIcon(pin(window.L,i+1,level,r.id===selected));
   m?.setZIndexOffset(r.id===selected?1000:0);
  });
 },[ready,rows,selected]);
 useEffect(()=>{
  if(!map.current||!selected)return;
  const r=REGIONS.find(x=>x.id===selected);
  if(r)map.current.panTo([r.lat,r.lon],{animate:true,duration:.45});
 },[selected,ready]);
 return <div className="sala-map-shell">
  <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setFailure('Map library unavailable. Use the region list below.')}/>
  <div className="sala-map-toolbar"><span>Tonight’s regional weather map</span><div><button type="button" aria-pressed={base==='voyager'} onClick={()=>setBase('voyager')}>Day</button><button type="button" aria-pressed={base==='dark_all'} onClick={()=>setBase('dark_all')}>Night</button><button type="button" onClick={()=>map.current?.fitBounds(BOUNDS,{padding:[15,15]})}>Reset</button></div></div>
  <div className="sala-map-canvas" ref={host} role="region" aria-label="Interactive map with nine approximate Michigan regional weather forecast points"/>
  {!ready&&!failure&&<div className="sala-map-message">Loading map…</div>}
  {failure&&<div className="sala-map-message" role="status">{failure}</div>}
  <div className="sala-map-foot">Approximate weather locations · No vernal-pool or road-crossing coordinates</div>
 </div>;
}