import {CloudSun,MapPin,Info,Snowflake,ArrowUpRight} from 'lucide-react';
import {LOCAL_HABITATS} from '../lib/trillium-local.mjs';
const labelDelta=v=>v>0?'+'+v.toFixed(1)+'°F':v.toFixed(1)+'°F';
export function LocalWeatherNote({stop,conditions,active}){
 const habitat=LOCAL_HABITATS[stop.id],site=conditions?.[stop.id];
 return <div className='tri-local-note'>
  <div className='tri-local-label'><CloudSun size={16}/><b>Near-site conditions</b><span>{habitat?.kind||'Woodland'}</span></div>
  {active&&site?.state==='available'?<>
   <div className='tri-local-statline'>
    <strong>{site.mean7F.toFixed(1)}°F <small>7-day avg</small></strong>
    <span>{site.temperatureDeltaF===null?'No region comparison':labelDelta(site.temperatureDeltaF)+' vs regional grid'}</span>
    <span>{site.freezingNights} freezing nights</span>
   </div>
   <p>{site.snow?.label||'Snow cover unavailable'}{site.snowDepthCm!==null&&site.snowDepthCm!==undefined?' · modeled '+site.snowDepthCm+' cm':''}. {site.snowfall7Cm!==null&&site.snowfall7Cm!==undefined?'Forecast snowfall: '+site.snowfall7Cm+' cm.':''}</p>
  </>:<p>{active?'Local forecast not currently available.':'Spring weather comparisons resume in March.'} {habitat?.note}</p>}
  {active&&site?.state==='available'&&<p className='tri-local-disclaimer'>Approximate destination grid, not trailhead measurements or a bloom confirmation. {habitat?.note}</p>}
 </div>;
}
export default function TrilliumLocalConditions({visibleSites=[],conditions={},state='loading',onSelect}){
 const active=state==='available'||state==='unavailable';
 const measured=visibleSites.map(s=>({stop:s,site:conditions[s.id],habitat:LOCAL_HABITATS[s.id]}));
 const valid=measured.filter(x=>x.site?.state==='available');
 const min=Math.min(...valid.map(x=>x.site.mean7F),35),max=Math.max(...valid.map(x=>x.site.mean7F),60);
 const spread=Math.max(3,max-min);
 return <section className='tri-local-section' id='tri-local' aria-labelledby='tri-local-heading'>
   <div className='tri-section-heading'><div><span className='tri-kicker'>LOCAL CONDITIONS / TEN DESTINATIONS</span><h2 id='tri-local-heading'>Not every woodland warms at the same pace</h2>
    <p>Compare forecast-grid temperatures, modeled snow and each site's landscape before deciding which trail to explore. A warmer forecast is not a flowering report.</p></div></div>
   <div className='tri-local-board'>
    <div className='tri-local-head'><div><CloudSun size={19}/><strong>{state==='off'?'Spring comparison standing by':state==='loading'?'Checking destination weather':state==='available'?'Destination-specific forecast comparison':'Local weather data unavailable'}</strong></div>
     <span>{state==='available'?valid.length+' of '+visibleSites.length+' local grids usable':state==='off'?'Available March–June':'No inferred bloom rankings'}</span></div>
    {state==='off'?<p className='tri-local-off'>Spring weather monitoring will resume March 1. Explore the habitat notes below; they describe a landscape, not an active weather reading.</p>:state!=='available'?<p className='tri-local-off'>Temperature and snow-cover comparisons are unavailable or loading. Public trail links, history and flowering evidence remain available.</p>:null}
    <div className='tri-local-list'>
     {measured.map(({stop,site,habitat})=><button key={stop.id} className='tri-local-row' type='button' onClick={()=>onSelect(stop.region,stop.id)} aria-label={'Open destination guide for '+stop.name}>
       <div className='tri-local-identity'><b>{stop.name}</b><small>{habitat?.kind||'Woodland'} · {stop.town}</small></div>
       {active&&site?.state==='available'?<div className='tri-local-bar-block'><div className='tri-local-bar-bg'><span style={{left:Math.min(94,Math.max(0,(site.mean7F-min)/spread*88))+'%'}}/></div><small>7-day mean {site.mean7F.toFixed(1)}°F</small></div>:<div className='tri-local-bar-empty'>Seasonal weather only</div>}
       <div className='tri-local-delta'>{active&&site?.state==='available'?<>
         <b>{site.temperatureDeltaF===null?'—':labelDelta(site.temperatureDeltaF)}</b>
         <small>vs region grid</small>
        </>:<><b>—</b><small>no live comparison</small></>}
       </div>
       <div className='tri-local-snow'><Snowflake size={15}/><span>{site?.state==='available'?site.snow?.state==='modeled_snow'?'Snow modeled':site.snow?.state==='little_modeled_snow'?'Little snow modeled':'Snow unknown':state==='off'?'Off season':'Not available'}</span></div>
       <ArrowUpRight className='tri-local-go' size={16}/>
      </button>)}
    </div>
    <div className='tri-local-foot'><Info size={16}/><span>Each row uses an approximate destination forecast point. The temperature difference compares seven-day mean air temperatures with the same region's representative grid point; it does not isolate lake influence or measure shaded forest-floor conditions. Modeled snow depth cannot confirm bare trails.</span></div>
   </div>
 </section>;
}
