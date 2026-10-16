import {useEffect,useState} from 'react';
import {REGIONS} from '../lib/salamanders.mjs';

const LABELS={'Ambystoma maculatum':'Spotted salamander','Ambystoma laterale':'Blue-spotted salamander'};
const period=(date)=>date?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'—';
function Count({count,sampled}){return count==null?'—':(sampled?'≥ ':'')+count;}
export default function SalamanderObservations({selected}){
 const [payload,setPayload]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let mounted=true;fetch('/api/salamander-observations').then(r=>{if(!r.ok)throw Error('Observation evidence unavailable');return r.json();}).then(value=>{if(mounted)setPayload(value);}).catch(()=>{if(mounted)setError('The observation feed could not be retrieved. The independent weather outlook is still available.');});return()=>{mounted=false;};},[]);
 const obs=payload?.observations,reported=payload?.migration?.reports||[];
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
    <h3>{reported.length?'Institutional migration reports':'No reviewed migration report yet'}</h3>
    <p>{reported.length?'These records were manually reviewed against an institutional public source, and show only broad Michigan regions.':'The observation feed cannot certify a Big Night. This independent category will show movement only when an authoritative public report has been reviewed.'}</p>
    {reported.length?<div className="sala-reviewed-list">{reported.map((r,i)=><div key={r.sourceUrl+i}><span>{period(r.observedOn)} · {REGIONS.find(x=>x.id===r.regionId)?.name||'Michigan'}</span><strong>{r.organization}</strong><p>{r.summary}</p><a href={r.sourceUrl} target="_blank" rel="noreferrer">Institutional evidence →</a></div>)}</div>
    :<div className="sala-review-empty"><span className="sala-review-dot"/>Review ledger empty · Not a claim that no migration occurred</div>}
    <div className="sala-evidence-separation"><strong>Important distinction</strong><p>A photograph of a salamander does not establish that a migration is underway. A forecast that looks promising is not an observation at all.</p></div>
   </article>
  </div>
  <div className="sala-evidence-privacy">
   <div><strong>Privacy first</strong><p>No individual observation pins, locations, crossing coordinates, photo metadata or observer identities are returned by this tool. Regional summaries hide small samples, and protected/obscured observations are not used to assign a region.</p></div>
   <div><strong>View original species research</strong><p>Explore the official Michigan <a href="https://www.inaturalist.org/observations?place_id=29&taxon_name=Ambystoma%20maculatum&quality_grade=research" target="_blank" rel="noreferrer">spotted salamander</a> and <a href="https://www.inaturalist.org/observations?place_id=29&taxon_name=Ambystoma%20laterale&quality_grade=research" target="_blank" rel="noreferrer">blue-spotted salamander</a> search pages. Please avoid sharing precise breeding locations.</p></div>
   <div><strong>Reporting coverage</strong><p>Region boundaries are broad editorial approximations, not proven habitats. Results update periodically during spring, with no external observation API calls during the off-season.</p></div>
  </div>
 </section>;
}