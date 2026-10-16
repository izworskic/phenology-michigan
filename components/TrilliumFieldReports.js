import TrilliumDirectReport from './TrilliumDirectReport';
import {Flower2,ClipboardCheck,CalendarDays,ExternalLink,BookOpen} from 'lucide-react';
export const PUBLIC_REPORT_URL='#tri-direct-report';
const fmt=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const STAGE={BUDDING:'Buds',FLOWERING:'Open flowers',FADING:'Flowers fading',DONE:'Finished',NEAR_PEAK:'Near peak, reviewed',PEAK:'Peak, reviewed'};
export function SiteReportHistory({site,history,autoReports=[]}){
 const data=history||{reportCount:0,yearsWithEvidence:0,reports:[]};
 return <section className='tri-evidence-archive' aria-label={'Reviewed historical bloom reports for '+site.name}>
 <div className='tri-evidence-archive-head'><BookOpen size={16}/><strong>Verified report history</strong><small>{data.reportCount||0} reviewed reports · {data.yearsWithEvidence||0} years</small></div>
 {data.reportCount>0?<div className='tri-evidence-archive-reports'>
  {data.reports.slice(0,4).map((r,i)=><div key={r.issueUrl||String(i)} className='tri-evidence-history-row'>
   <div><b>{fmt(r.observedAt)}</b><small>{STAGE[r.stage]||r.stage}</small></div>
   <a href={r.sourceUrl} rel='noopener noreferrer' target='_blank'>View dated source <ExternalLink size={13}/></a>
  </div>)}
  {data.reportCount>4&&<p className='tri-evidence-archive-more'>Showing four latest reviewed records; the complete archive is accessible through the public data endpoint.</p>}
 </div>:<p>No independently reviewed, dated on-site reports yet. This is a missing evidence record, not evidence that trilliums are absent.</p>}
 {autoReports.length>0&&<div className='tri-auto-evidence'>
   <strong>Automatically checked source links — site still unverified</strong>
   <p>These reports were submitted for this preserve, but no independent preserve-boundary confirmation was established.</p>
   {autoReports.slice(0,3).map((r,i)=><div key={r.sourceUrl+i} className='tri-evidence-history-row'><div><b>{fmt(r.observedAt)}</b>
    <small>{r.checkStatus==='species_date_flowering_checked'?'Species, date and flowering annotation checked':'Public source link only — awaiting validation'}</small></div>
    <a href={r.sourceUrl} rel='noopener noreferrer' target='_blank'>Source <ExternalLink size={13}/></a></div>)}
   </div>}
 <a className='tri-evidence-submit' href={PUBLIC_REPORT_URL}><Flower2 size={15}/> Share a flowering observation <Flower2 size={13}/></a>
 </section>;
}
export default function TrilliumReportProgram({total=0,sitesWithReports=0,multiYearSites=0,autoCounts={sourceChecked:0,linkOnly:0}}){
 return <section className='tri-report-program' id='tri-report-program' aria-labelledby='tri-report-program-title'>
 <div className='tri-report-program-top'><div><span className='tri-kicker'>FIELD EVIDENCE PROGRAM / ALL TEN PRESERVES</span>
 <h3 id='tri-report-program-title'>Help establish the actual bloom dates</h3><p>Calendar dates and temperature trends can only take a prediction so far. We need dated, source-linked observations that clearly identify a specific preserve. That history will help test whether local-weather models are actually useful.</p></div>
 <a className='tri-report-program-cta' href={PUBLIC_REPORT_URL} target='_blank' rel='noopener noreferrer'>Report flowers automatically <Flower2 size={16}/></a></div>
 <TrilliumDirectReport/>
 <div className='tri-report-program-stats'><div><strong>{total}</strong><span>independently reviewed reports</span></div><div><strong>{sitesWithReports} / 10</strong><span>destinations with evidence</span></div><div><strong>{multiYearSites}</strong><span>destinations with multiple observed years</span></div></div>
 <div className='tri-automatic-stats'><ClipboardCheck size={17}/><span><b>{autoCounts.sourceChecked||0} automatically source-checked flowering reports</b> · {autoCounts.linkOnly||0} unconfirmed public source links. These are not verified preserve blooms.</span></div>
 <div className='tri-report-program-method'><span><CalendarDays size={16}/> Include the actual observation date</span><span><Flower2 size={16}/> Identify buds, open flowers or fading</span><span><ClipboardCheck size={16}/> Editor checks that the source identifies the preserve</span></div>
 <p className='tri-report-program-fine'>Public iNaturalist flowering evidence is checked and saved automatically without an account. The record becomes a source-checked, unverified-site report, never an automatic on-site confirmation. The separate evidence form accepts other source types that require review. Multiple reports do not automatically establish a peak or a calibrated prediction.</p>
 </section>;
}
