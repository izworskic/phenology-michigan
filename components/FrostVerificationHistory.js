import {useEffect,useState} from 'react';
const sightingUrl='https://github.com/izworskic/phenology-michigan/issues/new?template=frost-field-sighting.yml';
const dateLabel=date=>date?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'—';
const timeLabel=iso=>iso?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'numeric',minute:'2-digit',month:'short',day:'numeric'}).format(new Date(iso)):'—';
const unit=n=>Number.isFinite(n)?n.toFixed(1)+'°F':'—';
const errorLabel=x=>Number.isFinite(x)?(x>0?'+':'')+x.toFixed(1)+'°F':'—';
const typeLabel={'hoarfrost':'Photo-reviewed hoarfrost','rime':'Photo-reviewed rime','frozen-dew':'Photo-reviewed frozen dew','frost-unspecified':'Photo-reviewed frost (type uncertain)'};
function TemperatureComparison({issues}){
  const rows=issues.filter(i=>i.verification?.status==='station_weather_compared'&&Number.isFinite(i.predicted?.tempF)&&Number.isFinite(i.verification?.observed?.tempF))
    .slice(0,14).reverse();
  if(rows.length<2)return <p className='fm-verify-chart-empty'>The temperature comparison graph appears after at least two mornings have station measurements.</p>;
  const values=rows.flatMap(r=>[r.predicted.tempF,r.verification.observed.tempF]);
  const lo=Math.floor((Math.min(...values)-5)/5)*5,hi=Math.ceil((Math.max(...values)+5)/5)*5;
  const W=580,H=196,left=38,right=12,top=14,bottom=30;
  const X=i=>left+i*(W-left-right)/Math.max(1,rows.length-1);
  const Y=v=>top+(hi-v)/(hi-lo)*(H-top-bottom);
  const path=key=>rows.map((row,i)=>(i===0?'M':'L')+X(i).toFixed(1)+' '+Y(key(row)).toFixed(1)).join(' ');
  const observed=r=>r.verification.observed.tempF;
  return <div className='fm-verify-chart'><div className='fm-chart-legend'><span><i className='fm-chart-predicted'/> Forecast air temperature</span><span><i className='fm-chart-observed'/> NWS station air temperature</span></div>
    <svg viewBox={'0 0 '+W+' '+H} role='img' aria-label={'Predicted and measured dawn air temperatures for '+rows.length+' historical mornings, Fahrenheit'}>
      {[0,.25,.5,.75,1].map(t=>{const value=hi-t*(hi-lo),y=Y(value);return <g key={t}><line x1={left} y1={y} x2={W-right} y2={y} stroke='#dbe9e8' strokeDasharray='3 5'/><text x={left-7} y={y+4} textAnchor='end' fontSize='11' fill='#64848b'>{Math.round(value)}°</text></g>;})}
      <path d={path(r=>r.predicted.tempF)} stroke='#c28d37' strokeWidth='3' strokeLinejoin='round' fill='none'/>
      <path d={path(observed)} stroke='#277b83' strokeWidth='3' strokeLinejoin='round' fill='none'/>
      {rows.map((r,i)=><g key={r.date}>
        <circle cx={X(i)} cy={Y(r.predicted.tempF)} r='4' fill='#c28d37'><title>{r.date+' forecast: '+r.predicted.tempF+'°F'}</title></circle>
        <circle cx={X(i)} cy={Y(observed(r))} r='4' fill='#277b83'><title>{r.date+' station: '+observed(r)+'°F'}</title></circle>
        {(i===0||i===rows.length-1||i%Math.max(1,Math.floor(rows.length/4))===0)&&<text x={X(i)} y={H-8} fontSize='10' textAnchor='middle' fill='#637e88'>{dateLabel(r.date)}</text>}
      </g>)}
    </svg><small>Independent NWS stations can be up to 65 km from each forecast-grid reference point. These lines measure air weather, not verified frost.</small>
  </div>;
}

export default function FrostVerificationHistory({siteId,siteName}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[pending,setPending]=useState(true);
  useEffect(()=>{
    const c=new AbortController();
    setData(null);setError('');setPending(true);
    fetch('/api/frost-history?site='+encodeURIComponent(siteId),{signal:c.signal})
      .then(r=>{if(!r.ok)throw Error('The historical archive is temporarily unavailable.');return r.json();})
      .then(d=>{setData(d);setPending(false);})
      .catch(e=>{if(e.name!=='AbortError'){setError(e.message);setPending(false);}});
    return ()=>c.abort();
  },[siteId]);
  const issues=data?.forecastIssues||[];
  const compared=issues.filter(i=>i.verification?.status==='station_weather_compared');
  const sightings=data?.reviewedSightings||[];
  const recent=issues.slice(0,12);
  return <section id='frost-verification' className='fm-section fm-verify'>
    <div className='fm-section-heading'><div><div className='fm-eyebrow dark'>The evidence ledger</div><h2>Did the forecast match the morning?</h2></div>
      <p>Real forecast snapshots, actual nearby station measurements and reviewed frost photographs — kept distinct.</p></div>
    <div className='fm-verify-intro'><div><b>01 · Forecast issued</b><p>The score is saved before sunrise so the forecast cannot be rewritten after the event.</p></div>
      <div><b>02 · Station weather checked</b><p>Observed air temperature, dew point and wind are compared near sunrise. Weather alone cannot prove hoarfrost.</p></div>
      <div><b>03 · Photo evidence reviewed</b><p>An original dated frost photo can be manually classified as hoarfrost, rime, frozen dew or uncertain frost.</p></div></div>
    {pending?<p className='fm-panel fm-empty'>Reading the prospective forecast and photo archives…</p>:
      error?<p className='fm-panel fm-empty' role='status'>{error}</p>:
      <><div className='fm-verify-stats'>
        <div><small>Saved advance forecasts</small><strong>{data?.forecastsAvailable?issues.length:'—'}</strong><span>Most recent 28 records shown</span></div>
        <div><small>Compared against NWS stations</small><strong>{data?.forecastsAvailable?compared.length:'—'}</strong><span>Nearby air-weather observations</span></div>
        <div><small>Temperature forecast MAE</small><strong>{data?.tempMeanAbsoluteErrorF!=null?data.tempMeanAbsoluteErrorF.toFixed(1)+'°F':'—'}</strong><span>Only mornings with valid station pairs</span></div>
        <div><small>Photo-reviewed reports</small><strong>{data?.sightingsAvailable?sightings.length:'—'}</strong><span>Not an absence-of-frost count</span></div>
      </div>
      <div className='fm-verify-columns'>
        <article className='fm-panel'><div className='fm-section-heading compact'><div><span className='fm-kicker'>Prediction vs measurement</span><h3>{siteName} · dawn history</h3></div></div>
          {!data?.forecastsAvailable?<p className='fm-empty'>Forecast archive unavailable, so no history is asserted.</p>:
          !recent.length?<p className='fm-empty'>The prospective archive has started, but no earlier forecasts have matured yet. Historical predictions will not be fabricated.</p>:
          <><TemperatureComparison issues={compared}/>
          <div className='fm-verify-log'>{recent.map(i=>{
            const verified=i.verification?.status==='station_weather_compared',diff=i.verification?.difference;
            return <div className='fm-verify-row' key={i.siteId+'-'+i.date}>
              <div><strong>{dateLabel(i.date)}</strong><small>Forecast saved {timeLabel(i.issuedAt)}</small></div>
              <div className='fm-verify-values'><div><span>Predicted air</span><b>{unit(i.predicted?.tempF)}</b></div>
                <div><span>Station air</span><b>{verified?unit(i.verification.observed.tempF):'—'}</b></div></div>
              <div className='fm-verify-result'><strong>{verified?errorLabel(diff.tempF):'Pending'}</strong>
                <small>{verified?i.verification.stationId+' · '+i.verification.distanceKm+' km away':'Station weather not yet compared'}</small></div>
            </div>;
          })}</div></>}
          <p className='fm-fine'>These are paired air-weather readings from the forecast grid and a nearby NWS station (up to 65 km away), not surface temperatures. Differences include local geography as well as forecast error. “Pending” is not a forecast failure.</p>
        </article>
        <article className='fm-panel'><div className='fm-section-heading compact'><div><span className='fm-kicker'>Actual frost evidence</span><h3>Reviewed photographs</h3></div></div>
          {!data?.sightingsAvailable?<p className='fm-empty'>The editorial sighting archive is currently unavailable.</p>:
          sightings.length?<div className='fm-sighting-list'>{sightings.map(s=><article key={s.issueNumber}>
            <small>{dateLabel(s.date)} · Independent editorial review</small><h4>{typeLabel[s.type]||'Photo-reviewed frost'}</h4>
            <p>{s.reviewNote}</p><a href={s.evidenceUrl} target='_blank' rel='noopener noreferrer'>Open original photo evidence ↗</a>
          </article>)}</div>:<p className='fm-empty'>No photographs have been independently reviewed for this forecast area yet. This does <strong>not</strong> mean there was no frost.</p>}
          <a className='fm-report-link' href={sightingUrl} target='_blank' rel='noopener noreferrer'>Submit a dated frost photo for review ↗</a>
          <p className='fm-fine'>Submissions open as public GitHub issues and require a free GitHub account. Reports never publish as confirmed evidence automatically; the publisher verifies original imagery and hides identifying details in the public ledger. Do not include addresses or exact GPS.</p>
        </article>
      </div></>}
    <p className='fm-caution'><strong>How to read this:</strong> Weather measurements can verify a forecast's temperature, dew point and wind, but cannot establish whether ice crystals grew on a nearby branch. A photo showing rime cannot be counted as a confirmed hoarfrost event. This project will not report a “frost forecast accuracy percentage” until independent outcomes and an appropriate evaluation method exist.</p>
  </section>;
}
