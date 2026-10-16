import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/woodcock';
// Reuse the domain-scoped CARTO basemap already deployed on this same site.
const KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const BOUNDS=[[41.62,-90.3],[48.34,-82.05]];
const ATTR='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
export default function WoodcockCartoMap({selected,onSelect}) {
  const node=useRef(null),map=useRef(null),tile=useRef(null),pins=useRef(new Map()),selectRef=useRef(onSelect),selectedRef=useRef(selected);
  const [ready,setReady]=useState(false),[style,setStyle]=useState('dark_all'),[error,setError]=useState('');
  selectRef.current=onSelect;selectedRef.current=selected;
  useEffect(()=>{
    if(!ready||!node.current||map.current||!window.L)return;
    const L=window.L;let m=null;
    try {
      m=L.map(node.current,{scrollWheelZoom:false,zoomControl:false,minZoom:5,maxZoom:12,tap:false});
      map.current=m;
      L.control.zoom({position:'bottomright'}).addTo(m);
      m.fitBounds(BOUNDS,{padding:[20,20],animate:false});
      REGIONS.forEach((r,i)=>{
        const marker=L.marker([r.lat,r.lon],{keyboard:true,title:r.name,alt:r.name+' weather region'}).addTo(m);
        marker.bindTooltip(r.name,{direction:'top'});
        marker.on('click',()=>selectRef.current(r.id));
        pins.current.set(r.id,marker);
      });
      const resize=()=>m.invalidateSize({pan:false});
      const obs=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
      obs?.observe(node.current);window.addEventListener('resize',resize);
      const id=requestAnimationFrame(resize);
      return ()=>{cancelAnimationFrame(id);obs?.disconnect();window.removeEventListener('resize',resize);pins.current.clear();tile.current=null;m.remove();map.current=null;};
    }catch(e){if(m)m.remove();map.current=null;setError('Map could not initialize. Use the region buttons to explore the forecast.');}
  },[ready]);
  useEffect(()=>{
    if(!ready||!map.current||!window.L)return;
    const L=window.L;
    if(tile.current)map.current.removeLayer(tile.current);
    let errors=0,loaded=false;
    const layer=L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+style+'/{z}/{x}/{y}.png?key='+encodeURIComponent(KEY),{attribution:ATTR,maxZoom:19,keepBuffer:1});
    layer.on('tileload',()=>{loaded=true;setError('');});
    layer.on('tileerror',()=>{errors++;});
    layer.on('load',()=>{if(!loaded&&errors>0)setError('Map tiles are unavailable. The regional selector still works.');});
    layer.addTo(map.current);tile.current=layer;
    return ()=>{layer.off();};
  },[ready,style]);
  useEffect(()=>{
    if(!ready||!window.L)return;
    const L=window.L;
    REGIONS.forEach((r,i)=>{
      const marker=pins.current.get(r.id);
      if(!marker)return;
      const active=r.id===selected;
      marker.setIcon(L.divIcon({className:'woodcock-marker-shell',html:'<span class="woodcock-marker'+(active?' active':'')+'">'+(i+1)+'</span>',iconSize:[36,36],iconAnchor:[18,18]}));
      marker.setZIndexOffset(active?1000:0);
    });
  },[selected,ready]);
  const first=useRef(true);
  useEffect(()=>{
    if(!ready||!map.current)return;
    if(first.current){first.current=false;return;}
    const r=REGIONS.find(x=>x.id===selected);
    if(r)map.current.flyTo([r.lat,r.lon],Math.max(6.2,map.current.getZoom()),{duration:0.5});
  },[selected,ready]);
  return <div className="woodcock-map-wrap">
    <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError('Map library unavailable. Region buttons remain usable.')}/>
    <div className="woodcock-map-controls" role="group" aria-label="Map appearance">
      <button type="button" aria-pressed={style==='dark_all'} onClick={()=>setStyle('dark_all')}>Twilight</button>
      <button type="button" aria-pressed={style==='voyager'} onClick={()=>setStyle('voyager')}>Roads</button>
      <button type="button" onClick={()=>map.current?.fitBounds(BOUNDS,{padding:[20,20]})}>All Michigan</button>
    </div>
    <div className="woodcock-map" ref={node} aria-label="Nine selectable Michigan regional forecast points on a CARTO map" role="region"/>
    {!ready&&!error&&<div className="woodcock-map-alert">Loading Michigan map…</div>}
    {error&&<div className="woodcock-map-alert" role="status">{error}</div>}
    <div className="woodcock-map-caption">Regional weather reference points · not verified woodcock display sites</div>
  </div>;
}
