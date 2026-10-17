import {useMemo} from 'react';

const signalNames=[
 {id:'strong',name:'Strong weather',className:'strong'},
 {id:'watch',name:'Possible movement',className:'watch'},
 {id:'other',name:'Mixed / cold / dry',className:'other'},
 {id:'unknown',name:'Forecast unavailable',className:'unknown'}
];
const count=v=>Number.isFinite(v)?v.toLocaleString('en-US'):'—';
export default function SalamanderEvaluation({evaluation}){
 const f=evaluation?.forecast,p=evaluation?.pairing;
 const signals=f?.signals;
 const total=signalNames.reduce((n,s)=>n+(signals?.[s.id]||0),0);
 const audit=evaluation?.checks||[];
 const complete=audit.filter(x=>x.met).length;
 const flags=useMemo(()=>evaluation?.signalEvidence||[],[evaluation]);
 return <section className="sala-eval" id="forecast-evaluation" aria-labelledby="sala-eval-title">
  <div className="sala-eval-intro">
   <div><span className="sala-overline">Research-grade product development · Evidence audit</span>
    <h3 id="sala-eval-title">Can we trust the Big Night forecast?</h3>
    <p>Follow the prediction-to-observation evidence trail. This dashboard checks what was forecast before a night, which survey nights were actually monitored, and what still prevents a meaningful accuracy estimate.</p>
   </div>
   <div className="sala-eval-status"><span className="sala-eval-status-dot"/><div><strong>Skill not established</strong><small>{evaluation?.status==='descriptive_only'?'Descriptive evidence available, not forecast validation':evaluation?.status==='awaiting_paired_surveys'?'Forecasts saved · awaiting matched field surveys':'Awaiting first prospective spring forecast archive'}</small></div></div>
  </div>
  <div className="sala-eval-layout">
   <div className="sala-eval-left">
    <div className="sala-eval-panel">
     <div className="sala-eval-heading"><strong>What the model actually forecast</strong><small>Same-night, archived weather signals</small></div>
     {total>0?<div className="sala-eval-signal-bars" role="list" aria-label="Regional weather signals across archived afternoon issues">
      {signalNames.map(x=><div className="sala-eval-bar-row" key={x.id} role="listitem">
       <div className="sala-eval-bar-label"><span>{x.name}</span><strong>{count(signals?.[x.id])}</strong></div>
       <div className="sala-eval-track" aria-hidden="true"><div className={'sala-eval-bar '+x.className} style={{width:Math.max(0,((signals?.[x.id]||0)/total)*100)+'%'}}/></div>
      </div>)}
     </div>:<div className="sala-eval-pending"><strong>No issued spring history yet</strong><p>Regular forecast collection starts in March 2027. October is correctly shown as unobserved, rather than generating retrospective weather predictions.</p></div>}
     <p className="sala-eval-note">Counts reflect recorded forecast *conditions* across nine broad regions—not salamander abundance, confirmed movement, or predictive success.</p>
    </div>
    <div className="sala-eval-panel">
     <div className="sala-eval-heading"><strong>What monitoring can be matched?</strong><small>Reviewed, effort-recorded surveys only</small></div>
     <div className="sala-eval-match">
      <div><strong>{count(p?.reviewedSessions)}</strong><span>Reviewed surveys</span></div>
      <div className="sala-eval-arrow" aria-hidden="true">→</div>
      <div><strong>{count(p?.matchedSessions)}</strong><span>With same-day saved forecast</span></div>
     </div>
     <div className="sala-eval-completeness">
      <div><span>Movement seen during matched surveys</span><strong>{count(p?.observedMovementDuringMatchedSurveys)}</strong></div>
      <div><span>No encounters during matched surveys</span><strong>{count(p?.noEncountersDuringMatchedSurveys)}</strong></div>
      <div><span>No forecast saved for that survey date</span><strong>{count(p?.missingAsIssuedForecast)}</strong></div>
      <div><span>Region omitted from saved forecast</span><strong>{count(p?.regionWithoutForecast)}</strong></div>
      <div><span>Forecast condition unknown</span><strong>{count(p?.unknownForecast)}</strong></div>
     </div>
     <p className="sala-eval-note">Matched survey nights: {count(p?.matchedDistinctRegionNights)} distinct region/date combinations; {count(p?.matchedDistinctPrograms)} program/protocol groups. Multiple surveys can share habitat and are not necessarily independent.</p>
    </div>
   </div>
   <div className="sala-eval-panel sala-eval-right">
    <div className="sala-eval-heading"><strong>Conditions compared with observations</strong><small>Public disclosure requires sufficient independent evidence</small></div>
    <div className="sala-eval-condition-list">
     {flags.length?flags.map(x=><div key={x.id} className="sala-eval-condition">
      <div className="sala-eval-condition-top"><strong>{x.label}</strong><span>{count(x.issuedRegionNights)} forecasts</span></div>
      {x.status==='descriptive_counts_available'?<>
       <div className="sala-eval-compare-figures"><div><span>Movement encountered</span><strong>{x.movement}</strong></div><div><span>None encountered</span><strong>{x.noEncounters}</strong></div></div>
       <small>{x.regionNights} region-nights · {x.programs} program/protocol groups. Descriptive survey counts only.</small>
      </>:<p>Survey-outcome comparison withheld: needs at least 8 reviewed sessions, 5 distinct region-nights, 3 program/protocol groups, and at least 3 of each outcome.</p>}
     </div>):<div className="sala-eval-pending"><strong>Evidence not yet available</strong><p>The condition breakdown will be available after verified spring monitoring.</p></div>}
    </div>
    <div className="sala-eval-disclosure"><strong>Why we don't show an accuracy percentage</strong><p>An observer detecting no salamanders doesn't mean there were none in the region. Monitoring can miss animals, and reports are not necessarily a random sample. These comparisons describe collected evidence, not forecast hits, misses, false alarms, or probability.</p></div>
   </div>
  </div>
  <div className="sala-eval-readiness">
   <div className="sala-eval-readiness-intro"><span className="sala-overline">Independent verification requirements</span><h4>Before an accuracy claim can be made</h4><p>Historical archives and reviewed surveys are necessary but not sufficient. Site independence, detection bias, and a genuinely held-out future season must be evaluated separately.</p><div className="sala-eval-progress"><span>{complete} of {audit.length||8} evidence prerequisites met</span><div className="sala-eval-progress-track"><i style={{width:(complete/Math.max(audit.length,1)*100)+'%'}}/></div></div></div>
   <div className="sala-eval-gates" role="list">{audit.map(x=><div role="listitem" key={x.id}><span className={x.met?'sala-eval-gate-ready':'sala-eval-gate-pending'} aria-hidden="true">{x.met?'✓':'○'}</span><span>{x.label}</span></div>)}</div>
  </div>
  <p className="sala-eval-method">Method: The afternoon-issued forecast and completed survey must share a Michigan evening date and broad region. Small/single-program outcome groups are suppressed, and no individual observation coordinates are exposed. <a href="https://pubs.usgs.gov/publication/fs20053096" target="_blank" rel="noreferrer">USGS explains why detection is imperfect</a>.</p>
 </section>;
}