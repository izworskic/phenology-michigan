import {REGIONS} from '../lib/salamanders.mjs';
const levelColor=l=>['strong','watch','guarded','cold','dry','unknown'].includes(l)?l:'unknown';
const shortDay=d=>d?new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'—';
const value=v=>typeof v==='number'?v.toLocaleString('en-US'):'—';
function Metric({label,val,detail}){return <div className="sala-action-metric"><span>{label}</span><strong>{val}</strong><small>{detail}</small></div>;}
function NightCard({night,name,compared,highlight,sourceCurrent}){
 const drivers=night?.drivers||[];
 return <article className={'sala-action-night '+levelColor(night?.level)+(highlight&&sourceCurrent?' recommended':'')}>
  <div className="sala-action-night-heading"><div><span className="sala-overline">{name} · {shortDay(night?.date)}</span><h3>{night?.label||'No dependable forecast'}</h3></div>
   <span className={'sala-action-signal '+(sourceCurrent?levelColor(night?.level):'unknown')}>{!sourceCurrent?'Recheck source':night?.level==='strong'?'Strong':night?.level==='watch'?'Possible':night?.level==='unknown'?'Unknown':'Limited'}</span>
  </div>
  <div className="sala-action-metrics">
   <Metric label="Night air" val={night?.temp!=null?night.temp+'°F':'—'} detail="Average forecast nighttime air"/>
   <Metric label="Peak rain chance" val={night?.rainChance!=null?night.rainChance+'%':'—'} detail="Highest hourly precip. probability"/>
   <Metric label="Warm rainy overlap" val={night?.warmRainHours!=null?night.warmRainHours+' hr':'—'} detail="Hours combining 40°F+ and rain signal"/>
  </div>
  <div className="sala-action-drivers" aria-label={name+' weather suitability explanation'}>
   {drivers.map(d=><div className="sala-action-driver" key={d.id}><span className={'sala-action-driver-dot '+d.state} aria-hidden="true"/><div><strong>{d.heading}</strong><p>{d.detail}</p></div></div>)}
  </div>
  <p className="sala-action-advice">{night?.advice||'Wait for a complete regional weather forecast.'}</p>
  {compared?.status!=='unavailable'&&compared&&<p className="sala-action-prior">
   <strong>{compared.status==='improved'?'↗':compared.status==='weakened'?'↘':'→'} {compared.label}</strong>
   {(compared.tempDelta!==null||compared.rainDelta!==null)&&<span>{compared.tempDelta!==null?'Avg. temp '+(compared.tempDelta>0?'+':'')+compared.tempDelta+'°F':''}{compared.tempDelta!==null&&compared.rainDelta!==null?' · ':''}{compared.rainDelta!==null?'Peak hourly precip. chance '+(compared.rainDelta>0?'+':'')+compared.rainDelta+' points':''}</span>}
  </p>}
 </article>;
}
export default function SalamanderBigNight({region,row,data,selected,onSelect,off,unavailable,loading,onRefresh,refreshing}){
 const guide=row?.bigNight;
 const ranking=data?.statewide?.regionalRanking||[];
 const ready=!off&&!unavailable&&guide?.tonight&&guide?.tomorrow;
 const updated=data?.generatedAt?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Detroit'}).format(new Date(data.generatedAt)):null;
 return <section className="sala-action" id="big-night" aria-labelledby="sala-action-title">
  <div className="sala-action-top"><div><span className="sala-overline">Your real Big Night decision · 6 p.m. – 3 a.m.</span><h2 id="sala-action-title">Tonight or tomorrow?</h2><p>See the actual warm-rain overlap, the latest regional thaw clue, and whether tomorrow's conditions look better. Weather suitability only—never a confirmed migration.</p></div>
   <div className="sala-action-choices"><label htmlFor="sala-action-region">Check a Michigan region</label><select id="sala-action-region" value={selected} onChange={e=>onSelect(e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <button type="button" onClick={onRefresh} disabled={loading||refreshing}>{refreshing?'Checking…':'Check latest available forecast ↻'}</button></div>
  </div>
  {ready?<div className="sala-action-main">
   <div className="sala-action-verdict"><div><span>48-hour comparison · {region.name}</span><strong>{guide.comparison.label}</strong><p>{guide.comparison.status==='tomorrow'?'Tonight may not be the best weather window. Check the tomorrow card before interpreting the seven-night outlook.':
    guide.comparison.status==='tonight'?'Tonight has the stronger modeled weather suitability—but thaw and actual movement still need local verification.':
    guide.comparison.status==='similar'?'The two nights are in the same weather category; look at their rain overlap and thaw details below.':
    'Weather data are incomplete for a dependable 48-hour comparison.'}</p></div>
    <div className={'sala-action-source '+(guide.source?.status==='current'?'fresh':'aging')}><strong>{guide.source?.label||'Source update not checked'}</strong><small>{guide.source?.ageHours!=null?'NWS update approximately '+guide.source.ageHours+' hours old':'NWS update time unknown'}</small></div>
   </div>
   <div className="sala-action-two">
    <NightCard night={guide.tonight} name="Tonight" compared={guide.priorIssue?.tonight} highlight={guide.bestIn48Hours==='tonight'} sourceCurrent={guide.source?.status==='current'}/>
    <NightCard night={guide.tomorrow} name="Tomorrow" compared={guide.priorIssue?.tomorrow} highlight={guide.bestIn48Hours==='tomorrow'} sourceCurrent={guide.source?.status==='current'}/>
   </div>
   <div className="sala-action-context"><div><strong>What changed since yesterday?</strong><p>{guide.priorIssue?'Compared with the original forecast archived '+guide.priorIssue.issueDay+' for these same target nights. The comparison is about forecast changes—not observed wildlife.':guide.priorComparisonUnavailableReason||'No verified prior-afternoon forecast is archived for these dates. Changes are not guessed from today’s data.'}</p></div>
    <div><strong>Where to look, safely</strong><p>Check authorized nature-center or conservation-group programs. Never enter a roadway or disclose a sensitive vernal pool or crossing location. This tool does not verify safe access.</p></div></div>
  </div>:<div className="sala-action-off"><div className="sala-action-off-icon" aria-hidden="true">☾</div><div><strong>{loading?'Checking regional forecasts…':off?'Off-season: no Big Night alert':unavailable?'Regional forecast unavailable':'Nightly assessment not available'}</strong><p>{off?'Michigan salamander weather watch returns in March. A spring rain, not a calendar date, will determine actual conditions. Explore the thaw and timing guides below.':loading?'Looking for NWS hourly rain and temperatures and the station thaw context.':'The tracker will not guess favorable nights when NWS or NOAA inputs are unavailable.'}</p></div></div>}
  {!off&&ranking.length>0&&<div className="sala-action-statewide"><div className="sala-action-statewide-title"><div><span className="sala-overline">Statewide weather snapshot · Tonight</span><h3>Where are conditions most promising?</h3></div><small>{data?.statewide?.strongTonight??0} strong · {data?.statewide?.possibleTonight??0} possible · {data?.statewide?.regionsWithCurrentSource??0} of 9 source-checked</small></div>
   <div className="sala-action-regions">{ranking.slice(0,4).map(r=><button key={r.id} type="button" className={r.id===selected?'active':''} onClick={()=>onSelect(r.id)} aria-pressed={r.id===selected}>
    <span className={'sala-action-region-dot '+levelColor(r.level)} aria-hidden="true"/><span><strong>{r.name}</strong><small>{r.label}</small></span><span className="sala-action-region-hours">{r.warmRainHours!=null?r.warmRainHours+' warm-rain hr':'Data uncertain'}</span>
   </button>)}</div>
   <details className="sala-action-more"><summary>Show all nine Michigan regions</summary><div className="sala-action-regions">{ranking.slice(4).map(r=><button key={r.id} type="button" className={r.id===selected?'active':''} onClick={()=>onSelect(r.id)} aria-pressed={r.id===selected}><span className={'sala-action-region-dot '+levelColor(r.level)} aria-hidden="true"/><span><strong>{r.name}</strong><small>{r.label}</small></span><span className="sala-action-region-hours">{r.warmRainHours!=null?r.warmRainHours+' warm-rain hr':'Data uncertain'}</span></button>)}</div></details>
   <p className="sala-action-board-note">Ranked by weather suitability and hours of warm rain, not verified migration or habitat access. Source age matters; uncertain NWS updates are not ranked as strong signals.</p>
  </div>}
  <p className="sala-action-updated">{updated?'Forecast response: '+updated+' Michigan time · ':''}Air temperature and hourly rain probability are forecasts. NOAA climate-station reports are observed but preliminary. Forest soils, vernal pools, and salamander movement are never directly measured by this tool.</p>
 </section>;
}