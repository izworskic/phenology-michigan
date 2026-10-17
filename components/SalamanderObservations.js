import {useEffect,useState} from 'react';
import {REGIONS} from '../lib/salamanders.mjs';

const LABELS={'Ambystoma maculatum':'Spotted salamander','Ambystoma laterale':'Blue-spotted salamander'};
const period=(date)=>date?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'—';
function Count({count,sampled}){return count==null?'—':(sampled?'≥ ':'')+count;}
export default function SalamanderObservations({selected}){
 const [payload,setPayload]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;fetch('/api/salamander-observations').then(r=>{if(!r.ok)throw Error('Observation evidence unavailable');return r.json();}).then(value=>{if(mounted)setPayload(value);}).catch(()=>{if(mounted)setError('The observation feed could not be retrieved. The independent weather outlook is still available.');});return()=>{mounted=false;};},[]);
 const obs=payload?.observations,reported=payload?.migration?.reports||[];
 const history=payload?.migration?.history||[],readiness=payload?.migration?.readiness;
 const progress=readiness?.sourceReviewedEvents||0;
 const active=obs?.state!=='off_season',sampled=obs?.state==='sampled';
 const regional=obs?.regions?.find(r=>r.id===selected);
 const regionName=REGIONS.find(r=>r.id===selected)?.name||'Selected Michigan region';
 const totals=obs?.statewide;
 const valid=totals?.count!=null;
 const bins=totals?.trend||[];
 const max=Math.max(1,...bins);
 const latest=payload?.generatedAt?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'}).format(new Date(payload.generatedAt)):null;
 return <section className="sala-section" id="observations">
  <div className="sala-section-title"><div><span className="sala-overline">An independent evidence layer</span><h2>What salamanders have people actually reported?</h2></div><p>We keep community-identified species sightings separate from source-reviewed migration events. Neither is a probability that a Big Night will happen.</p></div>
  <div className="sala-evidence-head"><span className="sala-evidence-label">Observation sources · Michigan · No individual locations</span><span className="sala-evidence-fresh">{latest?'Evidence checked '+latest:'Evidence feed loading'}</span></div>
  <div className="sala-evidence-grid">
   <article className="sala-evidence-main">
    <span className="sala-overline">Community-identified salamanders</span>
    <h3>{!payload&&!error?'Checking identification reports…':!active?'Spring sighting feed paused':valid?'Research-grade species observations':obs?.state==='unavailable'||obs?.state==='partial'?'Observation feed incomplete':'Few recent reports'}</h3>
    <p className="sala-evidence-context">{error||(!payload?'Checking the most recent available evidence.':!active?'Current monitoring resumes during March–May. No activity is being inferred in October or winter.':obs.message)}</p>
    <div className="sala-evidence-stats">
     <div><span>Michigan · past 21 days</span><strong><Count count={valid?totals.count:null} sampled={sampled}/></strong><small>{active?'Research-grade observations'+(sampled?' (sampled minimum)':''):'Not currently assessed'}</small></div>
     <div><span>{regionName}</span><strong><Count count={regional?.count} sampled={sampled}/></strong><small>{regional?.count!=null?'Coarse-region public reports':active?'Suppressed if fewer than 3 reports / 2 observers':'No in-season count'}</small></div>
    </div>
    {active&&valid&&bins.length===3?<div className="sala-sighting-trend">
     <div className="sala-sighting-trend-head"><b>Three-week observation history</b><span>Reports, not animals moving</span></div>
     <div className="sala-sighting-bars" role="list" aria-label="Research-grade species observations by seven-day period across Michigan">
      {['Past 7 days','8–14 days ago','15–21 days ago'].map((label,i)=><div className="sala-sighting-week" key={label} role="listitem" aria-label={label+': '+bins[i]+' observations'}>
       <strong>{bins[i]}</strong><div className="sala-sighting-bar"><i style={{height:Math.max(4,Math.round(bins[i]/max*100))+'%'}}/></div><small>{label}</small>
      </div>)}
     </div>
    </div>:<div className="sala-evidence-empty">{active?'No sufficiently supported statewide summary is available to draw a reliable observation chart.':'Historical seasons are not being presented as current migration.'}</div>}
    {valid&&active&&<div className="sala-evidence-species">{Object.entries(LABELS).map(([taxon,label])=><div key={taxon}><span>{label}</span><strong>{totals.species?.[taxon]==null?'—':(sampled?'≥ ':'')+totals.species[taxon]}</strong></div>)}</div>}
    <p className="sala-evidence-footnote">Data from <a href="https://www.inaturalist.org/pages/developers" target="_blank" rel="noreferrer">iNaturalist</a> research-grade identifications. This verifies community identification standards, not animal movement, breeding or crossing activity. Repeated photos, uneven reporting and unobserved animals can distort counts.</p>
   </article>
   <article className="sala-evidence-confirm">
    <span className="sala-overline">Higher bar · source-reviewed movement</span>
    <h3>{reported.length?'Recent source-reviewed migration reports':'No recent reviewed migration reports'}</h3>
    <p>{reported.length?'These records were manually reviewed against an institutional public source, and show only broad Michigan regions.':'The observation feed cannot certify a Big Night. Only independently reviewed public institutional reports can document movement, and older reports belong in the historical archive.'}</p>
    {reported.length?<div className="sala-reviewed-list">{reported.map((r,i)=><div key={r.sourceUrl+i}><span>{period(r.observedOn)} · {REGIONS.find(x=>x.id===r.regionId)?.name||'Michigan'}</span><strong>{r.organization}</strong><p>{r.summary}</p><a href={r.sourceUrl} target="_blank" rel="noreferrer">Institutional evidence →</a></div>)}</div>
    :<div className="sala-review-empty"><span className="sala-review-dot"/>No recent verified report · Not evidence that migration did not happen</div>}
    <div className="sala-evidence-separation"><strong>Important distinction</strong><p>A photograph of a salamander does not establish that a migration is underway. A forecast that looks promising is not an observation at all.</p></div>
   </article>
  </div>
  <div className="sala-field-workflow" id="field-reports">
   <div className="sala-field-intro">
    <div><span className="sala-overline">Help build a trustworthy spring record</span><h3>Document a migration night. Keep sensitive places protected.</h3><p>Conservation groups and field observers can submit a dated public institutional source that explicitly documents actual movement. The source enters a review queue; no submission changes the tracker automatically.</p></div>
    <a className="sala-field-submit" href="https://form.jotform.com/262884591479072" target="_blank" rel="noreferrer">Submit source evidence <span aria-hidden="true">↗</span></a>
   </div>
   <div className="sala-field-steps">
    <div><span>01 · SUBMIT</span><strong>Broad region and date</strong><p>Supply a public source link. No GPS, crossing directions, photo upload, or contact details needed.</p></div>
    <div><span>02 · REVIEW</span><strong>Human source verification</strong><p>An editor checks actual movement, independent event date, authoritative sourcing, and habitat privacy.</p></div>
    <div><span>03 · PUBLISH</span><strong>Dated evidence, not a prediction</strong><p>Approved reports enter a region-level historical archive after automated integrity tests.</p></div>
   </div>
   <div className="sala-calibration-panel">
    <div><span className="sala-overline">Long-term research quality</span><h4>Are there enough observations to validate the predictor?</h4><p>{readiness?.explanation||'Historical event coverage and monitored non-movement nights must be recorded before any claim of statistically validated migration probability.'}</p></div>
    <div className="sala-calibration-stats">
     <div><strong>{readiness?progress:'—'}</strong><span>Reviewed movement reports</span></div>
     <div><strong>{readiness?readiness.years:'—'}</strong><span>Spring seasons covered</span></div>
     <div><strong>{readiness?readiness.regions:'—'}</strong><span>Broad regions covered</span></div>
    </div>
    <p className="sala-calibration-status">{readiness?.calibrationReady?'Coverage prerequisites met; held-out model evaluation still required.':'Calibration status: evidence collection. No validated migration probabilities claimed.'}</p>
   </div>
   {history.length>0?<div className="sala-historical-reports"><h4>Source-reviewed migration archive</h4><p>These are historical dated reports, not claims about tonight.</p><div className="sala-reviewed-list">{history.map((r,i)=><div key={r.sourceUrl+i}><span>{period(r.observedOn)} {r.observedOn.slice(0,4)} · {REGIONS.find(x=>x.id===r.regionId)?.name||'Michigan'}</span><strong>{r.organization}</strong><p>{r.summary}</p><a href={r.sourceUrl} target="_blank" rel="noreferrer">View original institutional evidence →</a></div>)}</div></div>
   :<p className="sala-history-empty">Historical archive: no independently reviewed movement records yet. An empty record is not evidence that salamanders did not migrate in earlier years.</p>}
   <p className="sala-field-independence">This is an independent educational tool, not an official reporting program of the Michigan Vernal Pools Partnership or participating organizations. For formal vernal-pool research and monitoring, use the <a href="https://mivernalpools.com/" target="_blank" rel="noreferrer">Michigan Vernal Pools Partnership</a>.</p>
  </div>
  <section className="sala-monitoring-block" id="night-monitoring" aria-labelledby="sala-monitor-title">
    <div className="sala-monitoring-top"><div>
      <span className="sala-overline">A missing report is not a quiet night</span>
      <h3 id="sala-monitor-title">Measure the nights people checked.</h3>
      <p>We need both monitored movement and completed watches where no salamanders were encountered. These are specific surveys, not regional absence claims. Nothing submitted goes public without separate original-source review.</p>
    </div>
    <a className="sala-monitoring-button" href="https://form.jotform.com/262892813306057" target="_blank" rel="noreferrer">Log a completed monitoring night ↗</a>
    </div>
    <div className="sala-monitoring-dashboard">
      <div className="sala-monitor-stat"><span>Reviewed monitoring sessions</span><strong>{readiness?.monitoring?.sessions??'—'}</strong><small>Completed, source-checked surveys only</small></div>
      <div className="sala-monitor-stat positive"><span>Movement encountered</span><strong>{readiness?.monitoring?.withMovement??'—'}</strong><small>During recorded monitoring effort</small></div>
      <div className="sala-monitor-stat zero"><span>None encountered</span><strong>{readiness?.monitoring?.withNoEncounters??'—'}</strong><small>Not evidence of region-wide absence</small></div>
      <div className="sala-monitor-stat"><span>Observer-hours logged</span><strong>{readiness?.monitoring?Number((readiness.monitoring.observerMinutes/60).toFixed(1)):'—'}</strong><small>Observers × completed minutes</small></div>
    </div>
    <div className="sala-monitoring-bottom">
      <div className="sala-monitoring-method"><h4>What counts as useful monitoring?</h4><p>A completed, repeatable watch by authorized observers, with recorded duration, effort, a documented movement or zero-encounter result, and a source that the editor independently checks. A casual sighting or skipped night does not meet this standard.</p></div>
      <div className="sala-monitoring-readiness"><span className="sala-overline">Model verification status</span><strong>Collecting evidence · Not calibrated</strong><p>There is no archive of forecasts frozen before their target night and no held-out comparison across monitoring seasons. The seven-night tool remains a weather-and-thaw guide, not a validated chance of salamander migration.</p></div>
    </div>
    <p className="sala-monitoring-safety">For already-authorized monitoring only. Never enter traffic, trespass, move animals, disturb woodland pools, or publish sensitive habitat locations. This is an independent reporting initiative, not the Michigan Vernal Pools Partnership's official monitoring program.</p>
  </section>
  <div className="sala-evidence-privacy">
   <div><strong>Privacy first</strong><p>No individual observation pins, locations, crossing coordinates, photo metadata or observer identities are returned by this tool. Regional summaries hide small samples, and protected/obscured observations are not used to assign a region.</p></div>
   <div><strong>View original species research</strong><p>Explore the official Michigan <a href="https://www.inaturalist.org/observations?place_id=29&taxon_name=Ambystoma%20maculatum&quality_grade=research" target="_blank" rel="noreferrer">spotted salamander</a> and <a href="https://www.inaturalist.org/observations?place_id=29&taxon_name=Ambystoma%20laterale&quality_grade=research" target="_blank" rel="noreferrer">blue-spotted salamander</a> search pages. Please avoid sharing precise breeding locations.</p></div>
   <div><strong>Reporting coverage</strong><p>Region boundaries are broad editorial approximations, not proven habitats. Results update periodically during spring, with no external observation API calls during the off-season.</p></div>
  </div>
 </section>;
}