import {useEffect,useState} from 'react';
import {Thermometer,CloudSun,ShieldCheck,Info,ExternalLink} from 'lucide-react';
import {REGIONS} from '../lib/trillium.mjs';
const fmt=n=>Number.isFinite(n)?Math.round(n).toLocaleString('en-US'):'—';
function ThermalCurve({days=[]}){
 if(!days?.length)return <div className='tri-heat-empty'>Daily spring thermal curve appears when the March–June tracking period begins.</div>;
 const w=680,h=230,pad={l:43,r:15,t:18,b:33};
 const valid=days.filter(x=>Number.isFinite(x.heat));
 if(!valid.length)return null;
 const endIndex=Math.max(1,days.at(-1).dayIndex);
 const ymax=Math.max(40,Math.ceil(Math.max(...days.map(x=>Math.max(x.heat||0,x.historical||0)))*1.12/50)*50);
 const x=i=>pad.l+i/endIndex*(w-pad.l-pad.r);
 const y=v=>pad.t+(1-v/ymax)*(h-pad.t-pad.b);
 const draw=part=>part.length>1?part.map((d,i)=>(i?'L':'M')+x(d.dayIndex).toFixed(1)+','+y(d.heat).toFixed(1)).join(' '):'';
 const hist=days.filter(d=>Number.isFinite(d.historical)),observed=days.filter(d=>d.kind==='observed'),future=days.filter(d=>d.kind==='forecast');
 const baseline=hist.map((d,i)=>(i?'L':'M')+x(d.dayIndex).toFixed(1)+','+y(d.historical).toFixed(1)).join(' ');
 const actualDraw=draw(observed),forecastDraw=draw([...observed.slice(-1),...future]);
 const today=observed.at(-1);
 return <div className='tri-heat-chart'><svg viewBox={'0 0 '+w+' '+h} role='img' aria-label='Observed regional spring warmth accumulation, seven-day forecast and previous-spring normal heat accumulation' preserveAspectRatio='xMidYMid meet'>
  {[0,.5,1].map(fr=><g key={fr}><line x1={pad.l} x2={w-pad.r} y1={y(ymax*fr)} y2={y(ymax*fr)} stroke='#dbe6d9' strokeDasharray='3 5'/><text x='4' y={y(ymax*fr)+5} fontSize='11' fill='#718479'>{fmt(ymax*fr)}</text></g>)}
  <path d={baseline} stroke='#98ad9b' strokeWidth='3' fill='none' strokeLinecap='round' strokeLinejoin='round'/>
  <path d={actualDraw} stroke='#2f7551' strokeWidth='3.8' fill='none' strokeLinecap='round' strokeLinejoin='round'/>
  <path d={forecastDraw} stroke='#c17d3d' strokeWidth='3.3' strokeDasharray='7 5' fill='none' strokeLinecap='round'/>
  {today&&<><line x1={x(today.dayIndex)} x2={x(today.dayIndex)} y1={pad.t} y2={h-pad.b} stroke='#8b9e91' strokeDasharray='2 5'/><circle cx={x(today.dayIndex)} cy={y(today.heat)} r='5' fill='#2f7551' stroke='#fff' strokeWidth='2'/></>}
  {[0,.25,.5,.75,1].map(fr=><text key={fr} x={pad.l+(w-pad.l-pad.r)*fr} y={h-10} fill='#718479' textAnchor={fr===0?'start':fr===1?'end':'middle'} fontSize='11'>{(() => {const date=days[Math.min(days.length-1,Math.round(endIndex*fr))]?.date;return date?new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'';})()}</text>)}
 </svg><div className='tri-heat-legend'><span><i className='tri-heat-key current'/> Modeled warmth so far</span><span><i className='tri-heat-key future'/> Seven-day forecast</span><span><i className='tri-heat-key normal'/> Past-spring median</span></div></div>;
}
export default function TrilliumThermal({regionId,initialModels={}}){
 const [data,setData]=useState(null),[loadState,setLoadState]=useState('loading');
 useEffect(()=>{
  if(!REGIONS.some(r=>r.id===regionId))return;
  const controller=new AbortController();
  setData(null);setLoadState('loading');
  fetch('/api/trillium-thermal?region='+encodeURIComponent(regionId),{signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error('Feed unavailable');return r.json();})
   .then(p=>{if(!controller.signal.aborted){setData(p);setLoadState('ready');}})
   .catch(()=>{if(!controller.signal.aborted)setLoadState('unavailable');});
  return ()=>controller.abort();
 },[regionId]);
 const region=REGIONS.find(r=>r.id===regionId)||REGIONS[0];
 const model=data?.model||initialModels[regionId],validated=model?.state==='validated';
 const tracking=data?.state==='tracking';
 return <section className='tri-thermal-section' id='tri-thermal' aria-labelledby='tri-thermal-title'>
  <div className='tri-section-heading'><div><span className='tri-kicker'>03 / SPRING WARMTH ENGINE</span><h2 id='tri-thermal-title'>Is spring running ahead or behind?</h2><p>Follow accumulating warmth in {region.name} and how the next seven days could move it. A weather signal is not an observed trillium bloom.</p></div></div>
  <div className='tri-thermal-panels'>
   <article className='tri-thermal-insight'>
    <div className='tri-kicker'>MODELED SPRING HEAT · BASE 40°F</div>
    {tracking?<><div className='tri-thermal-large'>{fmt(data.currentHeat)} <small>heat units</small></div>
       <div className='tri-thermal-relative'><Thermometer size={18}/><strong>{data.label}</strong></div>
       <p>{data.relative==='ahead'?'The regional temperature record has accumulated more warmth than most archived springs at this date.':data.relative==='behind'?'The regional spring heat buildup is behind most archived springs at this date.':data.relative==='typical'?'The regional spring heat buildup is within the typical range of archived springs.':'The historical weather records are insufficient for a same-date comparison.'}</p>
       <div className='tri-heat-facts'><div><span>Past-spring median</span><strong>{fmt(data.historicalHeat)}</strong></div><div><span>Next {data.forecastDays} forecast days</span><strong>+{fmt(data.forecastHeatAdded)}</strong></div></div>
       {data.thermalSignal&&<div className='tri-heat-alert'><ShieldCheck size={17}/><div><b>{data.thermalSignal.kind==='forecast_crossing'?'Heat reference may be reached in the next week':'Historical reporting heat reference has been reached'}</b><span>{data.thermalSignal.date} · This is a temperature milestone, not a flower confirmation.</span></div></div>}
      </>:<><div className='tri-thermal-off'><CloudSun size={25}/><strong>{data?.label|| (loadState==='unavailable'?'Thermal feed unavailable':'Spring heat monitor standing by')}</strong></div><p>{data?.reason||'Daily modeled heat accumulation will be shown during March–June. The historic calendar and viewing guides remain available.'}</p></>}
    <p className='tri-fine'>Air temperatures at a representative regional grid point. Base 40°F is a descriptive warmth index—not a validated trillium-development threshold or a measurement of woodland soil temperature.</p>
   </article>
   <article className='tri-thermal-graph'>
    <div className='tri-thermal-graph-head'><h3>Warmth accumulation versus history</h3><span>March 1–June 30</span></div>
    {tracking?<ThermalCurve days={data.days}/>:<div className='tri-heat-empty'>The live daily curve and seven-day warmth projection appear during the spring tracking season. Historical timing remains available below.</div>}
    {model&&<div className={'tri-thermal-validation '+(validated?'validated':'limited')}><span className='tri-thermal-icon'><ShieldCheck size={18}/></span><div><b>{validated?'Backtested heat timing reference available':'Heat-based bloom date withheld'}</b>
      <p>{validated?'A leave-one-spring-out comparison beat calendar-only timing in the available seasons.':'For this region, historical temperature accumulation did not sufficiently improve on the calendar-only benchmark.'} {model.heatMae!=null?'Heat timing error: '+model.heatMae+' days versus '+model.calendarMae+' days for the calendar baseline, across '+model.eligibleYears+' eligible springs.':''}</p>
      </div></div>}
   </article>
  </div>
  <div className='tri-thermal-foot'><Info size={17}/><p>{loadState==='loading'?'Checking current conditions. ':''}The graph reflects **modeled mean air temperatures**, not plant measurements. No weather model confirms individual preserves or a bloom peak. <a href='https://open-meteo.com/en/docs/historical-weather-api' target='_blank' rel='noopener noreferrer'>ERA5 source <ExternalLink size={12}/></a> · <a href='https://open-meteo.com/en/docs' target='_blank' rel='noopener noreferrer'>Forecast source <ExternalLink size={12}/></a></p></div>
 </section>;
}
