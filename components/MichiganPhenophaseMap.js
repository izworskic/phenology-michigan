import {useEffect,useMemo,useRef,useState} from 'react';
import Script from 'next/script';
import {MapPin,Leaf,Flower2,Bug,Bird,ExternalLink,CalendarDays,Info,AlertCircle} from 'lucide-react';

// CARTO is already the site-wide Michigan mapping standard. This public,
// domain-restricted key is shared with FrogMap, FireflyCartoMap and Trillium.
const CARTO='cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
const ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const BOUNDS=[[41.68,-90.5],[48.26,-82.12]];
const FILTERS=[['all','All reported phases'],['plants','Plants'],['insects','Insects'],['birds','Birds']];
const ICONS={plants:Flower2,insects:Bug,birds:Bird};
const dateLabel=x=>x?new Date(x+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'}):'Date unavailable';
const pinHtml=(i,tone,selected)=>'<span class="nygeo-pin '+tone+(selected?' selected':'')+'"><b>'+i+'</b></span>';

export default function MichiganPhenophaseMap({data}){
 const node=useRef(null),leaflet=useRef(null),tile=useRef(null),points=useRef(new Map()),selection=useRef(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState('saginaw-bay'),[phaseFilter,setPhaseFilter]=useState('all');
 const [tileMode,setTileMode]=useState('voyager');
 const valid=data?.schema==='michigan-phenophase-geography-v1'&&data?.regions?.length===9;
 const regions=valid?data.regions:[];
 const active=regions.find(r=>r.id===selected)||regions[0];
 const phases=useMemo(()=>((active?.phases)||[]).filter(p=>phaseFilter==='all'||p.group===phaseFilter),[active,phaseFilter]);
 const sourceState=data?.sourceStatus;
 const archiveStale=data?.status==='stale';
 const sourcePending=!valid||sourceState?.usaNpn==='pending';
 selection.current=setSelected;
 useEffect(()=>{
  if(!ready||!window.L||!node.current||leaflet.current||!regions.length)return;
  const L=window.L,m=L.map(node.current,{zoomControl:false,scrollWheelZoom:false,minZoom:5,maxZoom:11,zoomSnap:.25,tap:false});
  leaflet.current=m;
  L.control.zoom({position:'bottomright'}).addTo(m);
  m.fitBounds(BOUNDS,{padding:[18,18],animate:false});
  // CARTO tiles sometimes fail. Keep the existing US Census derived land outline
  // as a geographic fallback; the accessible region selector always works.
  m.createPane('nygeo-land').style.zIndex='180';
  let alive=true,geo=null;
  fetch('/maps/great-lakes-context.geojson').then(x=>x.ok?x.json():Promise.reject(Error('No outline'))).then(j=>{
   if(alive)geo=L.geoJSON(j,{pane:'nygeo-land',interactive:false,
    style:()=>({color:'#6c947b',weight:1,fillColor:'#afd0b7',fillOpacity:.7})}).addTo(m);
  }).catch(()=>{});
  regions.forEach((r,i)=>{
   const hasMulti=r.phases?.some(p=>p.coverage==='multiple-reporters-or-sites');
   const tone=hasMulti?'multiple':r.phases?.length?'limited':'none';
   const icon=L.divIcon({className:'nygeo-marker-wrap',html:pinHtml(i+1,tone,r.id===selected),iconSize:[35,35],iconAnchor:[18,18]});
   const marker=L.marker([r.lat,r.lon],{icon,title:r.name,alt:r.name+' regional reference center, not an observation location',keyboard:true}).addTo(m);
   marker.bindTooltip(r.name+' · '+(hasMulti?'multiple reporting sites/observers':r.phases?.length?'limited reports':'no eligible recent reports'),{direction:'top'});
   marker.on('click',()=>selection.current(r.id));
   points.current.set(r.id,marker);
  });
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>m.invalidateSize({pan:false})):null;
  observer?.observe(node.current);
  const frame=requestAnimationFrame(()=>m.invalidateSize({pan:false}));
  return ()=>{alive=false;cancelAnimationFrame(frame);observer?.disconnect();points.current.clear();m.remove();leaflet.current=null;tile.current=null;};
 },[ready,valid]);
 useEffect(()=>{
  if(!ready||!leaflet.current||!window.L)return;
  if(tile.current)leaflet.current.removeLayer(tile.current);
  const L=window.L;
  let success=0,errors=0;
  const layer=L.tileLayer('https://basemaps.cartocdn.com/rastertiles/'+tileMode+'/{z}/{x}/{y}.png?key='+encodeURIComponent(CARTO),
   {attribution:ATTR,maxZoom:19,updateWhenIdle:true,keepBuffer:1});
  layer.on('tileload',()=>{success++;setError('');});
  layer.on('tileerror',()=>errors++);
  layer.on('load',()=>{if(errors&&!success)setError('Map tiles unavailable. Choose a region from the list below.');});
  layer.addTo(leaflet.current);tile.current=layer;
  return ()=>{layer.off();};
 },[ready,tileMode,valid]);
 useEffect(()=>{
  if(!ready||!window.L)return;
  regions.forEach((r,i)=>{
   const mark=points.current.get(r.id);
   const visible=(r.phases||[]).filter(p=>phaseFilter==='all'||p.group===phaseFilter);
   const tone=visible.some(p=>p.coverage==='multiple-reporters-or-sites')?'multiple':visible.length?'limited':'none';
   mark?.setIcon(window.L.divIcon({className:'nygeo-marker-wrap',
    html:pinHtml(i+1,tone,r.id===selected),iconSize:[35,35],iconAnchor:[18,18]}));
   mark?.setZIndexOffset(r.id===selected?400:0);
  });
 },[ready,selected,phaseFilter,regions]);
 // No programmatic geolocation and no exact field coordinates are ever requested.
 return <div className="nygeo-root">
   <div className="nygeo-intro"><div><span className="nygeo-kicker"><MapPin size={14}/> AUTOMATED MICHIGAN FIELD EVIDENCE</span>
     <h4>Where observers have reported seasonal changes</h4>
     <p>Actual dated records from established observation networks, grouped into broad Michigan regions. No visitor reporting or verification is needed here.</p>
    </div><span className="nygeo-date"><CalendarDays size={14}/> Sample through {dateLabel(data?.asOfDate)}</span></div>
   <div className="nygeo-sourcebar">
    <span><i className="nygeo-key multiple"/> Multiple reporting sites or observers</span>
    <span><i className="nygeo-key limited"/> Limited reports</span>
    <span><i className="nygeo-key none"/> No eligible sample</span>
   </div>
   {archiveStale?<div className="nygeo-source-warning" role="status"><AlertCircle size={17}/> The observation archive is older than two days. Previously reported phenophases are withheld until a fresh automatic update succeeds; the regional reference map remains available.</div>:sourcePending?<div className="nygeo-source-warning" role="status"><Info size={17}/> Automated source collection is initializing; there are no current regional claims yet. The map shows regional reference centers only.</div>:null}
   {sourceState?.iNaturalist==='partial'||sourceState?.iNaturalist==='unavailable'?<div className="nygeo-source-warning"><AlertCircle size={16}/> Some iNaturalist queries failed; missing reports are unavailable data, not absence of wildlife.</div>:null}
   <div className="nygeo-layout">
    <div className="nygeo-map-column">
     <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setError('Map library unavailable. The region selector still works.')}/>
     <div className="nygeo-map-actions" role="group" aria-label="Map display">
      <button type="button" aria-pressed={tileMode==='voyager'} onClick={()=>setTileMode('voyager')}>Day</button>
      <button type="button" aria-pressed={tileMode==='dark_all'} onClick={()=>setTileMode('dark_all')}>Night</button>
      <button type="button" onClick={()=>leaflet.current?.fitBounds(BOUNDS,{padding:[18,18]})}>All Michigan</button>
     </div>
     <div ref={node} className="nygeo-map" role="region" aria-label="Map with nine approximate Michigan regional reporting centers, not actual observation locations"/>
     {!ready&&!error&&<div className="nygeo-map-message">Preparing the Michigan regional map…</div>}
     {error&&<div className="nygeo-map-message" role="status">{error}</div>}
     <div className="nygeo-map-caption">Reference centers only · no individual field-site coordinates · pin colors indicate reporting coverage, never biological abundance</div>
    </div>
    <div className="nygeo-evidence">
     <div className="nygeo-pickers">
      <label htmlFor="nygeo-region">Michigan area</label>
      <select id="nygeo-region" value={selected} onChange={e=>setSelected(e.target.value)}>
       {regions.map((r,i)=><option value={r.id} key={r.id}>{i+1}. {r.name}</option>)}
      </select>
      <label htmlFor="nygeo-filter">Biological group</label>
      <select id="nygeo-filter" value={phaseFilter} onChange={e=>setPhaseFilter(e.target.value)}>
       {FILTERS.map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
     </div>
     <div className="nygeo-summary"><h4>{active?.name||'Regional evidence unavailable'}</h4>
      <p>Observation dates from the last 14 days · {archiveStale?'archive stale; reports withheld':sourcePending?'collection not yet complete':'sampled observational reports'}</p></div>
     {phases.length? <div className="nygeo-phases">
       {phases.map(p=>{
        const I=ICONS[p.group]||Leaf;
        return <article className="nygeo-phase" key={p.id}>
         <div className="nygeo-phase-heading"><span className="nygeo-phase-icon"><I size={17}/></span><div><h5>{p.name}</h5><small>{p.coverage==='multiple-reporters-or-sites'?'Multiple reporting sites or observers':'Limited reporting sample'} · latest {dateLabel(p.latest)}</small></div></div>
         <p className="nygeo-phase-species">{p.species.length?'Examples reported: '+p.species.map(x=>x.name).join(', '):'No named species available'}</p>
         <p className="nygeo-phase-sources">USA-NPN: {p.sourceReports['usa-npn']} submissions from {p.reportingSites} sites · iNaturalist: {p.sourceReports.inaturalist} annotated records from {p.reportingObservers} observers</p>
        </article>;
       })}</div>:<p className="nygeo-empty">{archiveStale?'The automated archive is overdue; previously reported phenophases are withheld rather than presented as current.':sourcePending?'Awaiting the first automated source refresh.':'No recent eligible reports in this sampled category and region. That does not mean the organism or stage was absent.'}</p>}
     <div className="nygeo-evidence-footer">These are submitted observations, not a complete census. Reports may arrive late and reporting effort varies widely by region.</div>
    </div>
   </div>
   <div className="nygeo-method"><Info size={16}/><p>USA-NPN records an explicit biological phase seen by a participant. iNaturalist records require research-grade identification, a matching annotation, usable public geography and an observation date. Both are filtered automatically; neither establishes a region-wide first occurrence, local abundance, or migration. No precise observation positions are shown.
    <span> <a href={data?.science?.sourceNpn||'https://data.usanpn.org/observations/'} target="_blank" rel="noreferrer">USA-NPN source <ExternalLink size={12}/></a> · <a href={data?.science?.sourceInaturalist||'https://www.inaturalist.org/observations?place_id=29'} target="_blank" rel="noreferrer">iNaturalist observations <ExternalLink size={12}/></a></span></p></div>
 </div>;
}
