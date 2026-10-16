import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/woodcock';
import {WOODCOCK_SITES,PIN_LABELS} from '../lib/woodcock-sites';
// Keep the existing site-authorized CARTO tile service; do not introduce a new API dependency.
const KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const BOUNDS=[[41.62,-90.3],[48.34,-82.05]];
const ATTR='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
export default function WoodcockCartoMap({selected,onSelect,selectedSite,onPickSite}) {
  const node=useRef(null),map=useRef(null),tile=useRef(null),weatherPins=useRef(new Map()),sitePins=useRef(new Map());
  const regionRef=useRef(onSelect),siteRef=useRef(onPickSite),initial=useRef(true);
  const [ready,setReady]=useState(false),[style,setStyle]=useState('dark_all'),[layer,setLayer]=useState('venues'),[error,setError]=useState('');
  regionRef.current=onSelect;siteRef.current=onPickSite;
  useEffect(()=>{
    if(!ready||!node.current||map.current||!window.L)return;
    const L=window.L;let m=null;
    try {
      m=L.map(node.current,{scrollWheelZoom:false,zoomControl:false,minZoom:5,maxZoom:12,tap:false});
      map.current=m;
      L.control.zoom({position:'bottomright'}).addTo(m);
      m.fitBounds(BOUNDS,{padding:[20,20],animate:false});
      REGIONS.forEach(r=>{
        const marker=L.marker([r.lat,r.lon],{keyboard:true,title:r.name,alt:r.name+' regional weather point'});
        marker.bindTooltip(r.name+' · regional forecast',{direction:'top'});
        marker.on('click',()=>regionRef.current?.(r.id));
        weatherPins.current.set(r.id,marker);
      });
      WOODCOCK_SITES.forEach(s=>{
        const marker=L.marker([s.lat,s.lon],{keyboard:true,title:s.name,alt:s.name+' historical woodcock walk venue'});
        marker.bindTooltip(s.name+' · historical walk venue',{direction:'top'});
        marker.on('click',()=>siteRef.current?.(s.id));
        sitePins.current.set(s.id,marker);
      });
      const resize=()=>m.invalidateSize({pan:false});
      const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
      obs?.observe(node.current);window.addEventListener('resize',resize);
      const id=requestAnimationFrame(resize);
      return ()=>{cancelAnimationFrame(id);obs?.disconnect();window.removeEventListener('resize',resize);weatherPins.current.clear();sitePins.current.clear();tile.current=null;m.remove();map.current=null;};
    }catch(e){if(m)m.remove();map.current=null;setError('Map could not initialize. The regional selector and site dossiers remain available.');}
  },[ready]);
  useEffect(()=>{
    if(!ready||!map.current||!window.L)return;
    const L=window.L;
    if(tile.current)map.current.removeLayer(tile.current);
    let errors=0,loaded=false;
    const newTile=L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+style+'/{z}/{x}/{y}.png?key='+encodeURIComponent(KEY),{attribution:ATTR,maxZoom:19,keepBuffer:1});
    newTile.on('tileload',()=>{loaded=true;setError('');});
    newTile.on('tileerror',()=>{errors++;});
    newTile.on('load',()=>{if(!loaded&&errors>0)setError('CARTO map tiles unavailable; use the locations and official-map links below.');});
    newTile.addTo(map.current);tile.current=newTile;
    return ()=>newTile.off();
  },[ready,style]);
  useEffect(()=>{
    if(!ready||!window.L||!map.current)return;
    const L=window.L;
    REGIONS.forEach((r,i)=>{
      const m=weatherPins.current.get(r.id);if(!m)return;
      const active=r.id===selected;
      m.setIcon(L.divIcon({className:'woodcock-marker-shell',html:'<span class="woodcock-marker'+(active?' active':'')+'">'+(i+1)+'</span>',iconSize:[36,36],iconAnchor:[18,18]}));
      if(layer==='weather'){if(!map.current.hasLayer(m))m.addTo(map.current);}else if(map.current.hasLayer(m))m.remove();
      m.setZIndexOffset(active?1000:0);
    });
    WOODCOCK_SITES.forEach((s,i)=>{
      const m=sitePins.current.get(s.id);if(!m)return;
      const active=s.id===selectedSite;
      m.setIcon(L.divIcon({className:'woodcock-marker-shell',html:'<span class="woodcock-venue-pin'+(active?' active':'')+'">'+(i+1)+'</span>',iconSize:[40,40],iconAnchor:[20,20]}));
      m.setZIndexOffset(active?1000:0);
      if(layer==='venues'){if(!map.current.hasLayer(m))m.addTo(map.current);}else if(map.current.hasLayer(m))m.remove();
    });
  },[ready,layer,selected,selectedSite]);
  useEffect(()=>{
    if(!ready||!map.current)return;
    if(initial.current){initial.current=false;return;}
    if(layer==='weather'){
      const r=REGIONS.find(x=>x.id===selected);
      if(r)map.current.flyTo([r.lat,r.lon],Math.max(6.2,map.current.getZoom()),{duration:.45});
    } else {
      const s=WOODCOCK_SITES.find(x=>x.id===selectedSite);
      if(s)map.current.flyTo([s.lat,s.lon],Math.max(7,map.current.getZoom()),{duration:.45});
    }
  },[selected,selectedSite,layer,ready]);
  return <div className="woodcock-map-wrap" data-layer={layer}>
    <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError('Map library unavailable. Use the researched site cards and regional buttons.')}/>
    <div className="woodcock-map-controls" role="group" aria-label="Map display and layers">
      <button type="button" aria-pressed={layer==='venues'} onClick={()=>setLayer('venues')}>Woodcock walk sites</button>
      <button type="button" aria-pressed={layer==='weather'} onClick={()=>setLayer('weather')}>Forecast regions</button>
      <button type="button" aria-pressed={style==='dark_all'} onClick={()=>setStyle('dark_all')}>Twilight</button>
      <button type="button" aria-pressed={style==='voyager'} onClick={()=>setStyle('voyager')}>Roads</button>
      <button type="button" onClick={()=>map.current?.fitBounds(BOUNDS,{padding:[20,20]})}>All MI</button>
    </div>
    <div className="woodcock-map" ref={node} aria-label="CARTO map showing either six historical woodcock walk venues or nine Michigan weather reference regions" role="region"/>
    {!ready&&!error&&<div className="woodcock-map-alert">Loading Michigan map…</div>}
    {error&&<div className="woodcock-map-alert" role="status">{error}</div>}
    <div className="woodcock-map-caption">{layer==='venues'?'SIX DOCUMENTED EVENT VENUES · MOST PINS ARE APPROXIMATE PROPERTY LOCATIONS · NO LIVE SIGHTINGS':'NINE REGIONAL WEATHER POINTS · NOT DISPLAY GROUNDS'}</div>
  </div>;
}
