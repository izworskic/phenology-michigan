import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/frogs';

// Same domain-authorized CARTO Voyager basemap used by the live Firefly Tracker.
// Pins mark representative forecast coordinates, NOT calling detections or protected sites.
const CARTO_BASEMAP_KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const BOUNDS=[[41.68,-90.5],[48.26,-82.12]];
const ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
function markerIcon(L,i,active,tone){
  return L.divIcon({className:'frog-marker-wrap',html:'<span class="frog-pin '+tone+(active?' active':'')+'">'+i+'</span>',iconSize:[40,40],iconAnchor:[20,20],tooltipAnchor:[0,-20]});
}
function toneFor(row){
  if(!row||!row.season?.active)return 'quiet';
  if(row.current?.bestScore>=75)return 'good';
  if(row.current?.bestScore>=45)return 'watch';
  return 'quiet';
}
export default function FrogMap({selected,onSelect,rows}){
  const node=useRef(null),map=useRef(null),tiles=useRef(null),pins=useRef(new Map()),pick=useRef(onSelect),initial=useRef(true);
  const [ready,setReady]=useState(false),[style,setStyle]=useState('voyager'),[error,setError]=useState('');
  pick.current=onSelect;
  useEffect(()=>{
    if(!ready||!window.L||!node.current||map.current)return;
    const L=window.L,m=L.map(node.current,{zoomControl:false,scrollWheelZoom:false,minZoom:5,maxZoom:12,zoomSnap:.25,tap:false});
    map.current=m;
    L.control.zoom({position:'bottomright'}).addTo(m);
    m.fitBounds(BOUNDS,{padding:[18,18],animate:false});
    REGIONS.forEach((r,i)=>{
      const pin=L.marker([r.lat,r.lon],{title:r.name,keyboard:true,alt:r.name+' forecast point',icon:markerIcon(L,i+1,r.id===selected,'quiet')}).addTo(m);
      pin.bindTooltip(r.name,{direction:'top'});
      pin.on('click',()=>pick.current(r.id));
      pins.current.set(r.id,pin);
    });
    const resize=()=>m.invalidateSize({pan:false});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    observer?.observe(node.current);
    const frame=requestAnimationFrame(resize);
    window.addEventListener('resize',resize);
    return ()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);pins.current.clear();tiles.current=null;m.remove();map.current=null;};
  },[ready]);
  useEffect(()=>{
    if(!map.current||!window.L)return;
    if(tiles.current)map.current.removeLayer(tiles.current);
    setError('');
    const layer=window.L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+style+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO_BASEMAP_KEY),{attribution:ATTR,maxZoom:19,updateWhenIdle:true,keepBuffer:1});
    let count=0,fail=0;
    const ok=()=>{count++;setError('');};
    const bad=()=>{fail++;};
    const done=()=>{if(!count&&fail)setError('CARTO tiles are unavailable. Use the regional buttons below.');};
    layer.on('tileload',ok);layer.on('tileerror',bad);layer.on('load',done);
    layer.addTo(map.current);tiles.current=layer;
    return ()=>{layer.off('tileload',ok);layer.off('tileerror',bad);layer.off('load',done);};
  },[ready,style]);
  useEffect(()=>{
    if(!ready||!window.L)return;
    REGIONS.forEach((r,i)=>{
      const pin=pins.current.get(r.id),row=rows?.find(x=>x.id===r.id);
      pin?.setIcon(markerIcon(window.L,i+1,r.id===selected,toneFor(row)));
      pin?.setZIndexOffset(r.id===selected?500:0);
    });
    if(initial.current){initial.current=false;return;}
    const r=REGIONS.find(x=>x.id===selected);
    if(r&&map.current)map.current.flyTo([r.lat,r.lon],Math.max(map.current.getZoom(),6.7),{duration:.5});
  },[ready,rows,selected]);
  return <div className="frog-map-shell" data-map-provider="carto">
    <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError('Map library unavailable; the region selector below still works.')}/>
    <div className="frog-map-tools"><div><button aria-pressed={style==='voyager'} onClick={()=>setStyle('voyager')}>Day map</button><button aria-pressed={style==='dark_all'} onClick={()=>setStyle('dark_all')}>Night map</button></div>
      <button onClick={()=>map.current?.fitBounds(BOUNDS,{padding:[18,18]})}>All Michigan ↗</button>
    </div>
    <div className="frog-map" ref={node} role="region" aria-label="Map of nine representative Michigan frog forecast regions"/>
    {!ready&&!error&&<div className="frog-map-message">Loading Michigan map…</div>}
    {error&&<div className="frog-map-message" role="status">{error}</div>}
    <div className="frog-map-caption">Forecast regions only · no frog locations or confirmed audio detections</div>
  </div>;
}
