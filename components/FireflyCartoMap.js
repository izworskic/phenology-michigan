import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {REGIONS} from '../lib/fireflies';

// Reuses the same public, domain-restricted CARTO basemap key as the Michigan Bloom Tracker.
// Neither the basemap nor these nine weather stations is a firefly sightings layer.
const CARTO_BASEMAP_KEY='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const MICHIGAN_BOUNDS=[[41.68,-90.50],[48.26,-82.12]];
const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const statusTone=(row)=>{
  // Off season is deliberately neutral. Nothing implies currently observed fireflies.
  if(!row?.season?.inSeason)return 'off';
  const tone=row.current?.tone;
  return tone==='good'||tone==='mixed'||tone==='poor'?tone:'unknown';
};
const mapIcon=(L,index,tone,active)=>L.divIcon({
  className:'firefly-pin-container',
  html:'<span class="firefly-carto-pin '+tone+(active?' selected':'')+'"><span class="firefly-pin-number">'+index+'</span></span>',
  iconSize:[42,46],
  iconAnchor:[21,23],
  tooltipAnchor:[0,-19],
  popupAnchor:[0,-19]
});

export default function FireflyCartoMap({selected,onSelect,results}){
  const mapDiv=useRef(null);
  const mapRef=useRef(null);
  const baseRef=useRef(null);
  const markersRef=useRef(new Map());
  const onSelectRef=useRef(onSelect);
  const selectedRef=useRef(selected);
  const [leafletReady,setLeafletReady]=useState(false);
  const [style,setStyle]=useState('dark_all');
  const [mapError,setMapError]=useState('');
  const [tilesLoaded,setTilesLoaded]=useState(false);
  onSelectRef.current=onSelect;
  selectedRef.current=selected;

  useEffect(()=>{
    if(!leafletReady||!mapDiv.current||mapRef.current||!window.L)return;
    const L=window.L;
    let map;
    try {
      map=L.map(mapDiv.current,{
        zoomControl:false,scrollWheelZoom:false,doubleClickZoom:true,
        minZoom:5,maxZoom:12,zoomSnap:0.25,preferCanvas:false,
        tap:false,attributionControl:true
      });
      mapRef.current=map;
      L.control.zoom({position:'bottomright'}).addTo(map);
      map.fitBounds(MICHIGAN_BOUNDS,{padding:[22,22],animate:false});
      REGIONS.forEach((r,i)=>{
        const marker=L.marker([r.lat,r.lon],{
          icon:mapIcon(L,i+1,'off',selectedRef.current===r.id),
          title:r.name,
          alt:r.name+' forecast region',
          keyboard:true,
          riseOnHover:true,
          autoPanOnFocus:true
        }).addTo(map);
        marker.bindTooltip(r.name,{direction:'top',opacity:.96});
        marker.on('click',()=>onSelectRef.current(r.id));
        markersRef.current.set(r.id,marker);
      });
      // Leaflet occasionally measures a zero-width map before responsive grids finish.
      const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>map.invalidateSize({pan:false})):null;
      if(observer)observer.observe(mapDiv.current);
      const resize=()=>map.invalidateSize({pan:false});
      window.addEventListener('resize',resize);
      const frame=requestAnimationFrame(resize);
      return ()=>{
        cancelAnimationFrame(frame);
        window.removeEventListener('resize',resize);
        observer?.disconnect();
        markersRef.current.clear();
        baseRef.current=null;
        map.remove();
        mapRef.current=null;
      };
    }catch(e){
      if(map){map.remove();mapRef.current=null;}
      setMapError('Map controls could not initialize. Region buttons below still work.');
    }
  },[leafletReady]);

  useEffect(()=>{
    if(!leafletReady||!window.L||!mapRef.current)return;
    const L=window.L, map=mapRef.current;
    if(baseRef.current)map.removeLayer(baseRef.current);
    setTilesLoaded(false);setMapError('');
    // The same authorized CARTO tile service used by the Bloom Tracker.
    // No tile source fallback that conceals a CARTO failure.
    const tiles=L.tileLayer(
      'https://basemaps.cartocdn.com/rastertiles/'+style+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO_BASEMAP_KEY),
      {maxZoom:20,minZoom:0,tileSize:256,detectRetina:false,attribution:ATTRIBUTION,
       updateWhenIdle:true,keepBuffer:1}
    );
    let errors=0,loaded=false;
    const success=()=>{loaded=true;setTilesLoaded(true);setMapError('');};
    const failure=()=>{errors++;};
    // Do not show a false-negative banner when a handful of tiles fail but others render.
    // Leaflet's layer 'load' event means all requested tiles have completed (success or error).
    const settled=()=>{if(!loaded&&errors>0)setMapError('CARTO map tiles are not loading. The regional forecast buttons still work.');};
    tiles.on('tileload',success);
    tiles.on('tileerror',failure);
    tiles.on('load',settled);
    tiles.addTo(map);
    baseRef.current=tiles;
    // Ensure region pins appear above the basemap.
    return ()=>{tiles.off('tileload',success);tiles.off('tileerror',failure);tiles.off('load',settled);};
  },[leafletReady,style]);

  useEffect(()=>{
    if(!leafletReady||!window.L||!mapRef.current)return;
    const L=window.L;
    REGIONS.forEach((region,i)=>{
      const marker=markersRef.current.get(region.id);
      const reading=results?.find(r=>r.id===region.id);
      marker?.setIcon(mapIcon(L,i+1,statusTone(reading),selected===region.id));
      marker?.setZIndexOffset(selected===region.id?1000:0);
    });
  },[leafletReady,results,selected]);

  const didInitializeSelection=useRef(false);
  useEffect(()=>{
    if(!leafletReady||!mapRef.current)return;
    if(!didInitializeSelection.current){didInitializeSelection.current=true;return;}
    const point=REGIONS.find(x=>x.id===selected);
    if(point)mapRef.current.flyTo([point.lat,point.lon],Math.max(mapRef.current.getZoom(),6.7),{duration:0.6});
  },[leafletReady,selected]);

  const reset=()=>{
    if(mapRef.current){
      mapRef.current.invalidateSize({pan:false});
      mapRef.current.fitBounds(MICHIGAN_BOUNDS,{padding:[22,22],animate:true,duration:.55});
    }
  };

  return <div className="firefly-map-shell" data-map-provider="carto" data-map-style={style}>
    <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setLeafletReady(true)} onError={()=>setMapError('Leaflet could not load. Select a forecast region from the buttons below.')}/>
    <div className="firefly-map-toolbar" role="group" aria-label="Map display settings">
      <div className="firefly-map-modes">
        <button type="button" aria-pressed={style==='voyager'} onClick={()=>setStyle('voyager')}>Street</button>
        <button type="button" aria-pressed={style==='dark_all'} onClick={()=>setStyle('dark_all')}>Night</button>
      </div>
      <button type="button" className="firefly-map-reset" onClick={reset} aria-label="Show all Michigan regions">All Michigan <span aria-hidden="true">↗</span></button>
    </div>
    <div ref={mapDiv} className="firefly-carto-map" aria-label="Interactive CARTO map of nine Michigan weather forecast regions" role="region"/>
    {!leafletReady&&!mapError&&<div className="firefly-map-loading" role="status">Loading the CARTO map…</div>}
    {mapError&&<div className="firefly-map-error" role="status">{mapError}</div>}
    <div className="firefly-map-bottom-label">REGIONAL WEATHER POINTS · NOT CONFIRMED FIREFLY SIGHTINGS</div>
  </div>;
}
