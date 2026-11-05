import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ChevronLeft,ChevronRight,Clock3,Info,Layers3,Map,Pause,Play,RotateCcw,Share2,ShieldCheck,History,AlertTriangle,Maximize2,Minimize2} from 'lucide-react';
import REGION_CONFIG from '../data/michigan-observation-regions.json' with {type:'json'};
import {archiveToMap,betweenCaptureDays,compareCaptures} from '../lib/phenophase-playback.mjs';
import {archiveHealth,archiveHealthLabel} from '../lib/phenophase-archive-health.mjs';

const MichiganPhenophaseMap=dynamic(()=>import('./MichiganPhenophaseMap'),{ssr:false});
const ROOT='/api/phenophase-history';
const formatDay=date=>date?new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):'No capture';
const DAY=86400000;
const countDays=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY)+1;

async function getArchive(path,signal){
 const response=await fetch(path,{signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('The historical archive could not be reached. No missing dates or field reports are being inferred.');
 return response.json();
}
function verifyIndex(obj){
 return obj?.schema==='michigan-phenophase-snapshot-index-v1'
  &&obj.interpretation?.oneSnapshotPerCollectionDay===true
  &&obj.interpretation?.visitorSubmissionsRequired===false
  &&Array.isArray(obj.years)
  &&obj.years.every(y=>Number.isInteger(y.year)&&Number.isInteger(y.snapshotDays)&&y.snapshotDays>0
                           &&/^\d{4}-\d{2}-\d{2}$/.test(y.firstSnapshot||''));
}
function verifyYear(obj,record){
 return obj?.schema==='michigan-phenophase-snapshot-archive-v1'
  &&obj.year===record.year&&Array.isArray(obj.snapshots)
  &&obj.snapshots.length===record.snapshotDays&&obj.snapshots.length>0
  &&obj.snapshots[0].asOfDate===record.firstSnapshot
  &&obj.snapshots.at(-1).asOfDate===record.lastSnapshot
  &&obj.snapshots.every(s=>s.kind==='overlapping-14-day-reporting-snapshot'&&s.regions?.length===REGION_CONFIG.regions.length)
  &&obj.snapshots.every((s,i)=>i===0||obj.snapshots[i-1].asOfDate<s.asOfDate);
}
function parseRequested(){
 if(typeof window==='undefined')return {};
 const args=new URLSearchParams(window.location.search);
 return {year:args.get('year'),date:args.get('date')};
}
function SequenceSpark({snapshots,selected,regionId}){
 if(snapshots.length<3)return null;
 const points=snapshots.map((s,i)=>({x:14+(i/(snapshots.length-1))*542,
  value:s.regions?.find(r=>r.id===regionId)?.sampledReports||0}));
 const highest=Math.max(1,...points.map(p=>p.value));
 return <div className="nytm-spark">
  <div className="nytm-spark-heading"><strong>Reporting-sample ledger</strong><span>{snapshots.length} actual captures · no interpolation</span></div>
  <svg viewBox="0 0 570 90" role="img" aria-label={`Sample count over ${snapshots.length} real archive collection days. The dots are not independent daily biological event totals.`} preserveAspectRatio="xMidYMid meet">
   <path d="M14 75 H556" stroke="#b7c7b4" strokeWidth="1"/>
   {points.map((p,i)=><circle key={snapshots[i].asOfDate} cx={p.x} cy={75-(p.value/highest)*60} r={i===selected?5.5:3.5} fill={i===selected?'#b48a48':'#538063'} stroke="#fff" strokeWidth={i===selected?2:1}/>)}
  </svg>
  <small>Each point counts reports from a heavily overlapping 15-date sample. A higher dot does not prove more species, a first emergence, or faster seasonal progression.</small>
 </div>;
}

export default function PhenophaseTimeMachine(){
 const [index,setIndex]=useState(null);
 const [year,setYear]=useState(null);
 const [archive,setArchive]=useState(null);
 const [selectedIndex,setSelectedIndex]=useState(0);
 const [region,setRegion]=useState('saginaw-bay');
 const [loadingIndex,setLoadingIndex]=useState(true);
 const [loadingYear,setLoadingYear]=useState(false);
 const [error,setError]=useState('');
 const [playing,setPlaying]=useState(false);
 const [copied,setCopied]=useState(false);
 const [focusMode,setFocusMode]=useState(false);
 const [healthNow,setHealthNow]=useState(null);
 const requested=useRef(null);
 const snapshots=archive?.snapshots||[];
 const snapshot=snapshots[selectedIndex]||null;
 const previous=selectedIndex>0?snapshots[selectedIndex-1]:null;
 const mapped=useMemo(()=>archiveToMap(snapshot),[snapshot]);
 const comparison=useMemo(()=>previous&&snapshot?compareCaptures(previous,snapshot,region):null,[previous,snapshot,region]);
 const yearRecord=index?.years?.find(x=>x.year===year)||null;
 const health=useMemo(()=>index&&healthNow?archiveHealth(index,healthNow):null,[index,healthNow]);
 const viewArgs='?view=history'+(year?'&year='+year:'')+(snapshot?'&date='+snapshot.asOfDate:'');
 const focusUrl='/'+viewArgs+'&focus=1#living-season';
 const standardUrl='/'+viewArgs+'#living-season';
 useEffect(()=>{
  setFocusMode(new URLSearchParams(window.location.search).get('focus')==='1');
  setHealthNow(new Date());
 },[]);
 useEffect(()=>{
  requested.current=parseRequested();
  const ctrl=new AbortController();
  getArchive(ROOT,ctrl.signal).then(data=>{
   if(!verifyIndex(data))throw Error('The public archive index did not pass its scientific coverage checks.');
   setIndex(data);
   const preferred=Number(requested.current?.year);
   const found=data.years.some(y=>y.year===preferred);
   setYear(found?preferred:data.years.at(-1)?.year||null);
  }).catch(err=>{if(!ctrl.signal.aborted)setError(err.message);})
  .finally(()=>{if(!ctrl.signal.aborted)setLoadingIndex(false);});
  return ()=>ctrl.abort();
 },[]);
 useEffect(()=>{
  if(!index||!year)return;
  const target=index.years.find(y=>y.year===year);
  if(!target)return;
  const ctrl=new AbortController();
  setArchive(null);setPlaying(false);setLoadingYear(true);setError('');
  getArchive(ROOT+'?year='+year,ctrl.signal).then(data=>{
   if(!verifyYear(data,target))throw Error('The annual archive is incomplete or does not agree with its dated index. No missing captures are inferred.');
   setArchive(data);
   const dated=requested.current?.date;
   const targetPos=data.snapshots.findIndex(s=>s.asOfDate===dated);
   setSelectedIndex(targetPos>=0?targetPos:data.snapshots.length-1);
   requested.current=null;
  }).catch(err=>{if(!ctrl.signal.aborted)setError(err.message);})
  .finally(()=>{if(!ctrl.signal.aborted)setLoadingYear(false);});
  return ()=>ctrl.abort();
 },[index,year]);
 useEffect(()=>{
  if(!playing||snapshots.length<2)return;
  if(selectedIndex>=snapshots.length-1){setPlaying(false);return;}
  const task=window.setTimeout(()=>setSelectedIndex(i=>Math.min(snapshots.length-1,i+1)),1450);
  return ()=>window.clearTimeout(task);
 },[playing,selectedIndex,snapshots.length]);
 function jump(next){
  setPlaying(false);
  setSelectedIndex(Math.max(0,Math.min(snapshots.length-1,next)));
  setCopied(false);
 }
 function selectYear(next){
  requested.current=null;setYear(Number(next));setCopied(false);
 }
 async function share(){
  if(!snapshot||typeof navigator==='undefined'||!navigator.clipboard)return;
  const url=new URL(window.location.href);
  url.searchParams.set('view','history');
  url.searchParams.set('year',String(year));
  url.searchParams.set('date',snapshot.asOfDate);
  url.hash='living-season';
  try{await navigator.clipboard.writeText(url.toString());setCopied(true);}catch{setCopied(false);}
 }
 const sourceStatus=snapshot?.sourceStatus;
 const nDays=yearRecord?countDays(yearRecord.firstSnapshot,yearRecord.lastSnapshot):0;
 const missed=yearRecord?.missingCollectionDaysBetweenSnapshots||0;
 const gap=previous&&snapshot?betweenCaptureDays(previous.asOfDate,snapshot.asOfDate):0;
 return <section className="nytm" aria-labelledby="nytm-title">
  <div className="nytm-hero">
   <div><span className="nytm-eyebrow"><History size={15}/> Field Archive / The Living Season</span>
    <h4 id="nytm-title">Watch Michigan's natural year unfold.</h4>
    <p>Step through real collected observation snapshots across nine Michigan regions. Every frame is an actual archived reporting sample, not a simulated season or an invented day.</p>
    <a className="nytm-focus-link" href={focusMode?standardUrl:focusUrl}>{focusMode?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {focusMode?'Return to standard site view':'Open uninterrupted field viewer'}</a>
   </div>
   <div className="nytm-ledger" aria-label="Verified archive coverage">
    <span>Archived collection days</span><strong>{index?.snapshotCount??'—'}</strong>
    <small>First recording: {index?.years?.[0]?.firstSnapshot?formatDay(index.years[0].firstSnapshot):'Not available'}</small>
   </div>
  </div>
  {loadingIndex?<p className="nytm-notice" role="status">Opening the verified annual field ledger…</p>:error&&!index?<p className="nytm-notice" role="alert">{error} The live map remains available in the “Across Michigan” view.</p>:null}
  {health&&<div className={'nytm-health nytm-health--'+health.state} role={health.state==='stale'||health.state==='overdue'?'alert':'status'}>
    {health.state==='stale'||health.state==='overdue'||health.state==='invalid'?<AlertTriangle size={17}/>:<ShieldCheck size={17}/>}
    <span><strong>{archiveHealthLabel(health)}</strong> · Last stored collection: {health.asOf?formatDay(health.asOf):'unavailable'}.
     {health.daysSince>=2?' No new capture has been recorded recently; this is not evidence that the seasonal activity stopped.':''}
     {health.missingCollectionDays>0?' '+health.missingCollectionDays+' missing capture day(s) between archived dates.':''}
     <small>Source check is based on the dated archive, not an independent live network probe. No visitor reports are required.</small></span>
   </div>}
  {index&&<div className="nytm-controls">
   <div className="nytm-topline">
    <label>Archive year <select aria-label="Archive year" value={year||''} onChange={e=>selectYear(e.target.value)}>
     {index.years.map(y=><option key={y.year} value={y.year}>{y.year} · {y.snapshotDays} capture{y.snapshotDays===1?'':'s'}</option>)}
    </select></label>
    <span className="nytm-coverage">{yearRecord?yearRecord.snapshotDays+' archived capture'+(yearRecord.snapshotDays===1?'':'s')+' within '+nDays+' calendar day'+(nDays===1?'':'s'): 'No collected year'}</span>
   </div>
   {loadingYear?<p className="nytm-notice" role="status">Loading only the days actually collected in {year}…</p>:error?<p className="nytm-notice" role="alert">{error}</p>:null}
   {archive&&snapshots.length>0&&<div className="nytm-timeline">
    <div className="nytm-timeline-heading"><div><span>COLLECTION DAY</span><strong>{formatDay(snapshot.asOfDate)}</strong></div>
     <div className="nytm-timeline-count"><b>Frame {selectedIndex+1} / {snapshots.length}</b><span>Observation window {formatDay(snapshot.windowStart)} – {formatDay(snapshot.windowEnd)}</span></div>
    </div>
    <div className="nytm-buttons" role="group" aria-label="Play recorded collection dates">
     <button type="button" aria-label="Previous recorded day" disabled={selectedIndex===0} onClick={()=>jump(selectedIndex-1)}><ChevronLeft size={20}/></button>
     <button className="nytm-play" type="button" disabled={snapshots.length<2} aria-label={playing?'Pause historical playback':'Play historical playback'} onClick={()=>{
      if(selectedIndex>=snapshots.length-1){setSelectedIndex(0);setPlaying(true);}
      else setPlaying(v=>!v);
     }}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pause':'Play'}</button>
     <button type="button" aria-label="Next recorded day" disabled={selectedIndex>=snapshots.length-1} onClick={()=>jump(selectedIndex+1)}><ChevronRight size={20}/></button>
     <button type="button" aria-label="Restart historical playback" disabled={snapshots.length<2} onClick={()=>jump(0)}><RotateCcw size={17}/></button>
    </div>
    <label className="nytm-scrub-label" htmlFor="nytm-scrubber">Browse actual captures</label>
    <input id="nytm-scrubber" aria-label="Choose a recorded observation day" type="range" min="0" max={Math.max(0,snapshots.length-1)} step="1" disabled={snapshots.length<2} value={selectedIndex} onChange={e=>jump(Number(e.target.value))}/>
    <div className="nytm-range-ends"><time>{formatDay(snapshots[0].asOfDate)}</time><time>{formatDay(snapshots.at(-1).asOfDate)}</time></div>
    {snapshots.length===1?<p className="nytm-one"><BookOpen size={17}/> The archive currently contains just one real capture. Playback becomes available automatically after a second collection day. No earlier days are fabricated.</p>:null}
    {missed>0?<p className="nytm-gap-warning"><AlertTriangle size={15}/> {missed} calendar day{missed===1?'':'s'} without recorded capture between the first and last stored dates this year. The scrubber skips them; they are not zero-activity frames.</p>:null}
    {gap>0?<p className="nytm-gap-warning"><AlertTriangle size={15}/> This frame follows a {gap}-day collection gap. No observations are interpolated across it.</p>:null}
   </div>}
  </div>}
  {archive&&snapshot&&mapped&&<div className="nytm-presentation">
   <div className="nytm-frame-note"><div><span className="nytm-kicker"><Layers3 size={14}/> Actual archived frame</span><strong>{formatDay(snapshot.asOfDate)}</strong><p>The observations below were dated within {formatDay(snapshot.windowStart)} – {formatDay(snapshot.windowEnd)}. This is what the reporting sample contained when captured.</p></div>
    <button type="button" className="nytm-share" onClick={share}><Share2 size={15}/>{copied?'Link copied':'Share this day'}</button>
   </div>
   <MichiganPhenophaseMap data={mapped} historical/>
   <div className="nytm-comparison">
    <div className="nytm-comparison-head"><div><span className="nytm-kicker">THE RECORDED FIELD LEDGER</span><h5>Reading the archive, not guessing at nature</h5></div>
     <label>Focus region <select value={region} onChange={e=>setRegion(e.target.value)}>{REGION_CONFIG.regions.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select></label></div>
    <SequenceSpark snapshots={snapshots} selected={selectedIndex} regionId={region}/>
    {comparison?<div className="nytm-comparison-values">
      <div><span>Prior sample</span><strong>{comparison.oldSampledReports}</strong><small>{formatDay(comparison.oldDate)} · overlapping 15-day window</small></div>
      <div><span>This sample</span><strong>{comparison.newSampledReports}</strong><small>{formatDay(comparison.newDate)} · overlapping 15-day window</small></div>
      <div className="nytm-comparison-comment">{comparison.newlyVisibleInSample.length?<p>In this sample, but not listed in the preceding capture: <strong>{comparison.newlyVisibleInSample.join(', ')}</strong>.</p>:<p>No biological phases newly appeared in this sampled record.</p>}
       {comparison.notVisibleInNewSample.length?<p>Not listed in this sample: {comparison.notVisibleInNewSample.join(', ')}. This does not prove that any stage ended.</p>:null}
       <p>{comparison.interpretation}</p></div>
     </div>:<p className="nytm-first-note">This is the first captured day in the selected year. There is no preceding archived snapshot to compare. The numbers shown on the map represent its 15-date sampled report window, not events occurring only on this date.</p>}
   </div>
   {sourceStatus&&(sourceStatus.iNaturalist!=='ok'||sourceStatus.iNaturalistCappedQueries>0)?<p className="nytm-source-warning"><AlertTriangle size={16}/> This archived collection had {sourceStatus.iNaturalistFailedQueries} failed iNaturalist queries and {sourceStatus.iNaturalistCappedQueries} capped queries. Coverage is incomplete; differences from other dates are especially uncertain.</p>:null}
   <details className="nytm-method"><summary><ShieldCheck size={16}/> What the Time Machine can and cannot show</summary>
     <p>Each frame preserves one overlapping 15-calendar-day sample of third-party reports. You can compare the sample contents across actual captured dates, but you cannot sum adjacent frames or interpret their differences as independent daily events, migration speed, first flowering, species abundance, or biological absence.</p>
     <p>The archive begins with its first genuine capture on November 3, 2026. Uncollected dates remain gaps. Older years are only selectable if they contain real archived frames. Report-site locations and observer identities are never made public here. This experience asks nothing from visitors.</p>
   </details>
  </div>}
 </section>;
}
