import { useEffect, useMemo, useState } from 'react';
import { Flower2, BookOpenCheck, Thermometer, CalendarDays, AlertTriangle, CheckCircle2, MapPin, ExternalLink, ClipboardList, ChevronRight } from 'lucide-react';
import { STOPS } from '../lib/trillium.mjs';
import { LOCAL_HABITATS } from '../lib/trillium-local.mjs';
import INITIAL from '../data/trillium-site-onset-summary.json';

const INTAKE='https://github.com/izworskic/phenology-michigan/issues/new?template=trillium-repeat-visit.yml';
const NPN='https://www.usanpn.org/nn/faq';
const pretty=iso=>iso?new Date(iso+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'Not yet measured';
const diff=(a,b)=>Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z');

function EvidenceLadder({site}){
 const steps=[
  {label:'Repeat visits',yes:site.reviewedVisits>0,detail:'Same known patch, not nearby sightings'},
  {label:'First-bloom bracket',yes:site.boundedPlotYears>0,detail:'Last reviewed no → first reviewed yes'},
  {label:'Paired soil seasons',yes:site.calibration?.pairedSeasons>0,detail:'Complete on-site logger history'},
  {label:'Validated site model',yes:site.calibration?.state==='retrospectively-calibrated',detail:'Forward-held-out skill beats calendar'},
 ];
 return <ol className='tri-site-ladder' aria-label='Site evidence readiness, not a probability'>
  {steps.map((s,i)=><li key={i} className={s.yes?'ready':''}>
   <span className='tri-site-ladder-marker' aria-hidden='true'>{s.yes?<CheckCircle2 size={15}/>:i+1}</span>
   <div><b>{s.label}</b><small>{s.detail}</small></div>
  </li>)}
 </ol>;
}
function IntervalExperiment(){
 const [no,setNo]=useState('2027-04-22');
 const [yes,setYes]=useState('2027-04-25');
 const delta=diff(no,yes)/86400000,valid=Number.isInteger(delta)&&delta>0&&delta<=90;
 const tight=valid&&delta<=4;
 return <div className='tri-onset-experiment'>
  <span className='tri-kicker'>Interactive method · illustrative dates only</span>
  <h3>How close can we get to the first flower?</h3>
  <p>Change the dates to see why a checked <b>“no”</b> visit matters. Neither date below is an actual Michigan flower observation.</p>
  <div className='tri-onset-fields'>
   <label>Last confirmed <strong>NO</strong><input type='date' min='2027-03-15' max='2027-06-30' value={no} onChange={e=>setNo(e.target.value)}/></label>
   <label>First confirmed <strong>YES</strong><input type='date' min='2027-03-15' max='2027-06-30' value={yes} onChange={e=>setYes(e.target.value)}/></label>
  </div>
  {valid ? <>
    <div className='tri-onset-illustration' role='img' aria-label={'Example: onset occurred after '+pretty(no)+' and by '+pretty(yes)+'. The interval spans '+delta+' days.'}>
      <span className='tri-onset-start'>Last no</span><span className='tri-onset-line'><span>ONSET SOMEWHERE HERE</span></span><span className='tri-onset-end'>First yes</span>
    </div>
    <div className='tri-onset-result'><strong>After {pretty(no)} and by {pretty(yes)}</strong><span>{delta}-day observation interval · {tight?'Narrow enough for the proposed research gate':'Too wide for the strict calibration gate'}</span></div>
    <p className='tri-site-fine'>This is interval-censored onset evidence. The flower could have opened on any day after the last “no” and on or before the first “yes”. A 3-day interval does not establish a particular exact date.</p>
   </>:<p className='tri-onset-invalid' role='status'>Choose a first “yes” later than the last “no,” within the same 2027 spring.</p>}
 </div>;
}
const PHASE_LABEL={
 'bounded-onset':'Bounded onset interval', 'wide-interval':'Wide interval — more frequent visits needed',
 'left-censored':'First yes only — onset could be earlier',
 'no-positive-yet':'No open flowers recorded in checked visits',
 'uncertain-only':'Only uncertain visits'
};
export default function TrilliumSiteScience({onOpenStop}){
 const [data,setData]=useState(INITIAL);
 const [source,setSource]=useState('bundled');
 const [selected,setSelected]=useState('trillium-trail');
 useEffect(()=>{
  const ctl=new AbortController();
  fetch('/api/trillium-site-onset',{signal:ctl.signal})
   .then(r=>{if(!r.ok)throw Error('Read unavailable');return r.json();})
   .then(j=>{if(!ctl.signal.aborted&&j?.schema==='trillium-site-onset-v1'&&j.sites?.length===STOPS.length){setData(j);setSource('api');}})
   .catch(()=>{});
  return ()=>ctl.abort();
 },[]);
 const stop=STOPS.find(x=>x.id===selected)||STOPS[0];
 const evidence=useMemo(()=>Object.fromEntries((data?.sites||[]).map(x=>[x.siteId,x])),[data]);
 const s=evidence[stop.id]||{reviewedVisits:0,boundedPlotYears:0,monitoredPlots:0,yearsWithVisits:0,onsets:[],calibration:{state:'not-calibrated',pairedSeasons:0,rollingHoldouts:0}};
 const summary=data?.summary;
 return <section className='tri-site-science' id='tri-site-science' aria-labelledby='tri-site-science-heading'>
   <div className='tri-site-science-hero'>
    <div><span className='tri-kicker'>06 / THE FIELD RESEARCH LAB</span>
     <h2 id='tri-site-science-heading'>When did the first trillium <em>really</em> open?</h2>
     <p>We can model regional warmth. Proving the first bloom at a particular woodland is harder. This field program follows the <strong>same living plants or small patches</strong> across repeated visits, then tests whether on-site soil history improves on the calendar.</p>
     <a className='tri-site-science-cta' href={INTAKE} target='_blank' rel='noopener noreferrer'><ClipboardList size={17}/> Record a repeat field visit <ExternalLink size={14}/></a>
     <p className='tri-site-fine'>Public GitHub issue; free account required. Submissions are reviewed before being used. Never post plant GPS coordinates, personal contact details or off-trail approaches.</p>
    </div>
    <div className='tri-site-science-snapshot' aria-label='Actual site scientific coverage'>
     <div><span>Reviewed repeated visits</span><strong>{summary?.reviewedVisits||0}</strong></div>
     <div><span>Bounded patch-years</span><strong>{summary?.boundedPlotYears||0}</strong></div>
     <div><span>Calibrated preserves</span><strong>{summary?.sitesWithCalibratedModels||0} <small>/ 10</small></strong></div>
     <p>No first-bloom dates are published without repeat-visit evidence. Current weather is context, not proof.</p>
    </div>
   </div>
   <div className='tri-site-science-body'>
    <div className='tri-site-science-board'>
     <div className='tri-site-science-board-header'><div><MapPin size={17}/><b>Follow the evidence, preserve by preserve</b></div><span>Reviewed archive through {pretty(data.generatedForDate)}</span></div>
     <label className='tri-site-science-select'>Choose a documented public preserve
      <select value={selected} onChange={e=>setSelected(e.target.value)}>
       {STOPS.map(stop=><option value={stop.id} key={stop.id}>{stop.name}</option>)}
      </select>
     </label>
     <div className='tri-site-science-detail'>
      <div><span className='tri-kicker'>{stop.town} · {LOCAL_HABITATS[stop.id]?.kind||'Woodland'}</span>
       <h3>{stop.name}</h3>
       <p>{LOCAL_HABITATS[stop.id]?.note||'Forest microclimate requires direct local observations.'}</p>
       <button type='button' className='tri-site-science-link' onClick={()=>onOpenStop?.(stop.region,stop.id)}>Open public trail guide <ChevronRight size={16}/></button>
      </div>
      <EvidenceLadder site={s}/>
     </div>
     {s.onsets?.length ? <div className='tri-site-science-history'>
      <h3>Reviewed patch observations</h3>
      {s.onsets.slice(-6).reverse().map(row=><div key={row.plotId+row.year} className='tri-site-science-year'>
       <strong>{row.year} · patch {row.plotId}</strong><span>{PHASE_LABEL[row.state]||'Unclassified'}</span>
       <small>{row.state==='bounded-onset'?('After '+pretty(row.lastNo)+' and by '+pretty(row.firstYes)+' · '+row.gapDays+' days'):row.firstYes?('First reported yes: '+pretty(row.firstYes)+'; not an exact onset'):row.negativeVisits+' negative, '+row.uncertainVisits+' uncertain check(s)'}</small>
      </div>)}
     </div>:<p className='tri-site-science-absence'><BookOpenCheck size={19}/><span>No independently reviewed repeat-visit series at this preserve yet. This is an evidence gap, <strong>not</strong> evidence that trilliums are absent.</span></p>}
     <div className='tri-site-science-calibration'><Thermometer size={20}/><div><strong>{s.calibration?.state==='retrospectively-calibrated'?'Historical on-site soil model has passed validation':'On-site bloom model not yet calibrated'}</strong><p>{s.calibration?.reason||'The same patch needs repeated visits and measured soil records across multiple springs.'} {s.calibration?.pairedSeasons||0} complete qualifying soil-and-bloom years; at least eight are required for a site-specific retrospective test.</p></div></div>
    </div>
    <IntervalExperiment/>
    <div className='tri-site-science-protocol'>
     <span className='tri-kicker'>A field naturalist's protocol</span>
     <div className='tri-site-science-steps'>
      <article><span>01</span><h3>Stay with the same patch</h3><p>With the land manager's rules in mind, select one to three accessible, clearly distinguishable trilliums or small patches. Use a stable anonymous code A, B or C. Never publish exact plant locations.</p></article>
      <article><span>02</span><h3>Write down the “no” days</h3><p>As spring approaches, return every two or three days when practical. Mark open flowers <b>yes, no, or uncertain</b>; never turn an unchecked visit into “no”. Note buds and snow separately.</p></article>
      <article><span>03</span><h3>Measure, don't assume</h3><p>Optional dated soil-probe readings must include depth. A future soil-heat model requires complete daily measurements from a documented on-site logger at the same depth and patch. A regional forecast cannot substitute.</p></article>
     </div>
     <p className='tri-site-science-foot'><AlertTriangle size={17}/><span>A direct photo can establish that a flower was open on a date; it cannot, by itself, establish when the first flower opened. Public trail restrictions, privacy and plant conservation take precedence over collecting data. Protocol follows <a href={NPN} target='_blank' rel='noopener noreferrer'>USA-NPN Nature's Notebook <ExternalLink size={12}/></a>. {source==='bundled'?'The last validated archive is shown if the live archive is unavailable.':''}</span></p>
    </div>
   </div>
  </section>;
}
