import {useEffect,useState} from 'react';
import {CalendarDays,BarChart3,ExternalLink,Info} from 'lucide-react';
import {REGIONS} from '../lib/trillium.mjs';
const DOMAIN_LOW=74,DOMAIN_HIGH=196;
const AXIS_TICKS=[['Mar 15',74],['Apr 1',91],['May 1',121],['Jun 1',152],['Jul 15',196]];
const place=n=>Math.min(100,Math.max(0,(n-DOMAIN_LOW)/(DOMAIN_HIGH-DOMAIN_LOW)*100));
function YearRow({year}){
 return <div className={'tri-history-year '+(!year.qualified?'insufficient':'')} role='listitem'>
 <b>{year.year}</b>
 <div className='tri-history-track' aria-label={year.qualified?'Historical flowering reports, middle 60 percent':'Insufficient observations to characterize this year'}>
 {year.qualified&&<><span className='tri-history-range' style={{left:place(year.low)+'%',width:Math.max(1,place(year.high)-place(year.low))+'%'}}/><span className='tri-history-center' style={{left:place(year.center)+'%'}}/></>}
 </div>
 <small>{year.total} reports{!year.qualified?' · low':''}</small>
 </div>;
}
function Status({live}){
 if(!live)return null;
 if(['earlier','later','typical'].includes(live.state)){
  const label=live.state==='earlier'?'Earlier reports than historical':live.state==='later'?'Later reports than historical':'Reports near historical timing';
  return <div className={'tri-history-current '+live.state}><strong>{label}</strong><span>{live.offsetDays===0?'Centered on the historical reporting midpoint':Math.abs(live.offsetDays)+' days '+(live.offsetDays<0?'earlier':'later')+' than the historical reporting midpoint'} · {live.reportCount} observations across {live.reportWeeks} weeks.</span><small>{live.note}</small></div>;
 }
 if(live.state==='off')return <div className='tri-history-current idle'><strong>Next live comparison: spring</strong><span>Archived observations remain visible during fall and winter. No current flower-timing claim.</span></div>;
 return <div className='tri-history-current idle'><strong>{live.state==='developing'?'Spring reports are still accumulating':live.state==='sparse'?'Not enough reports yet':live.state==='unavailable'?'Live comparison unavailable':'Historical comparison not available'}</strong><span>{live.note}</span></div>;
}
export default function TrilliumHistory({regionId,initialBenchmark=null,archiveRetrievedAt}){
 const [response,setResponse]=useState(null),[state,setState]=useState('loading');
 useEffect(()=>{
  if(!REGIONS.some(r=>r.id===regionId))return;
  const controller=new AbortController();
  setState('loading');setResponse(null);
  fetch('/api/trillium-history?region='+encodeURIComponent(regionId),{signal:controller.signal})
   .then(r=>{if(!r.ok)throw new Error('The archive could not be loaded');return r.json();})
   .then(data=>{if(!controller.signal.aborted){setResponse(data);setState('ready');}})
   .catch(()=>{if(!controller.signal.aborted)setState('unavailable');});
  return ()=>controller.abort();
 },[regionId]);
 const activeResponse=response?.region===regionId?response:null;
 const benchmark=activeResponse?.benchmark||initialBenchmark;
 const region=REGIONS.find(r=>r.id===regionId)||REGIONS[0];
 return <section className='tri-history-section' id='tri-history' aria-labelledby='tri-history-title'>
  <div className='tri-section-heading'><div><span className='tri-kicker'>03 / THE HISTORICAL RECORD</span>
  <h2 id='tri-history-title'>What previous springs tell us</h2>
  <p>A reporting-history benchmark for <strong>{region.name}</strong>, built from past flowering observations—not a guessed bloom percentage.</p></div></div>
  {state==='loading'&&!benchmark&&<div className='tri-history-wait'>Loading the regional flowering-history record…</div>}
  {state==='unavailable'&&!benchmark&&<div className='tri-history-wait'>The historical archive is temporarily unavailable. The regional calendar and destination guides remain available.</div>}
  {benchmark&&<div className='tri-history-layout'>
    <article className='tri-history-summary'>
      <div className='tri-kicker'>EQUAL-WEIGHT SPRING YEARS · {benchmark.firstYear}–{benchmark.lastYear}</div>
      {benchmark.state==='available'?<>
       <h3>Typical reporting window</h3>
       <div className='tri-history-big'>{benchmark.lowLabel} – {benchmark.highLabel}</div>
       <div className='tri-history-stat'><CalendarDays size={18}/> Historical reporting center near <strong>{benchmark.centerLabel}</strong></div>
       <div className='tri-history-stat'><BarChart3 size={18}/> Typical inter-year shift: <strong>±{benchmark.spread} days</strong></div>
       <p>Middle 60% of reports in an eligible season. Each year contributes equally to the regional benchmark.</p>
      </>:<>
       <h3>Not enough comparable years yet</h3>
       <p>{benchmark.reason||'The archived evidence cannot support a regional flowering timing benchmark.'}</p>
      </>}
      <div className='tri-history-count'><strong>{benchmark.eligibleYears||0}</strong><span>eligible springs</span><strong>{benchmark.excludedYears||0}</strong><span>excluded for thin coverage</span></div>
      <p className='tri-fine'>Eligibility requires at least six research-grade flowering reports spread across two or more weeks. These dates reflect observer reporting, not the first open flower or peak at a particular trail.</p>
      <Status live={activeResponse?.live}/>
    </article>
    <article className='tri-history-plot'>
      <div className='tri-history-plot-heading'><h3>Year-by-year flowering reports</h3><small>Each band = middle 60% of that spring’s reports</small></div>
      <div className='tri-history-months' aria-hidden='true'>{AXIS_TICKS.map(([label,doy],i)=><span key={label} className={i===0?'first':i===AXIS_TICKS.length-1?'last':''} style={{left:place(doy)+'%'}}>{label}</span>)}</div>
      <div role='list' className='tri-history-year-list'>{(benchmark.years||[]).filter(y=>y.total||y.year>=2022).map(y=><YearRow key={y.year} year={y}/>)}</div>
      <div className='tri-history-explain'><span><i className='tri-history-legend-range'/> Middle reporting interval</span><span><i className='tri-history-legend-center'/> Midpoint</span><span>Faint = not enough coverage</span></div>
      <p className='tri-fine'>Reports are grouped by their observation week. Calendar-week resolution and changing observer participation limit precision. Reporting density does not measure flower abundance.</p>
    </article>
  </div>}
  {benchmark&&<div className='tri-history-source'><Info size={17}/><span>{activeResponse?.liveStatus||'Archived flowering observations available; current-season comparison not yet loaded'}. Archive sampled {activeResponse?.archiveRetrievedAt?.slice(0,10)||archiveRetrievedAt||'date not available'}. <a href={activeResponse?.sourceUrl||'https://www.inaturalist.org/observations?place_id=29&taxon_name=Trillium%20grandiflorum&term_id=12&term_value_id=13'} target='_blank' rel='noopener noreferrer'>Explore source records <ExternalLink size={13}/></a>. Comparisons stay undecided until reporting coverage and timing pass the evidence gates.</span></div>}
 </section>;
}
