import {dawnDecision} from '../lib/frostMorning.mjs';
const dateLabel=d=>d?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(d+'T12:00:00Z')):'—';
const clock=(iso,tz)=>iso?new Intl.DateTimeFormat('en-US',{timeZone:tz||'America/Detroit',hour:'numeric',minute:'2-digit'}).format(new Date(iso)):'—';
const num=(v,suffix='')=>Number.isFinite(v)?Math.round(v)+suffix:'—';
export default function FrostDawnDecision({morning,site,loading,error,issuedAt}){
  const verdict=dawnDecision(morning);
  const photo=morning?.photo;
  const sample=photo?.forecastHours?.length?morning?.hourly?.find(h=>h.time===photo.forecastHours[0]):null;
  return <section className={'fm-dawn-decision '+verdict.level} aria-label='Quick sunrise forecast decision'>
    <div className='fm-decision-head'>
      <div><div className='fm-eyebrow dark'>Your sunrise at a glance · what the weather suggests</div>
        <h2>{site.name}: {loading?'Checking NWS weather…':error?'Forecast unavailable':verdict.headline}</h2>
        <p>{loading?'Reading the clues in the air: cold, moisture, wind, cloud cover and visibility.':error||verdict.detail}</p></div>
      {morning?.score!=null&&<div className='fm-decision-score'><strong>{morning.score}<small>/100</small></strong><span>weather fit, not a chance of frost</span></div>}
    </div>
    {morning&&<>
      <div className='fm-decision-ingredients'>
        <div><small>Morning</small><strong>{dateLabel(morning.date)}</strong><span>{photo?.sunriseAt?'Sunrise '+clock(photo.sunriseAt,site.tz):'Sunrise unavailable'}</span></div>
        <div><small>Forecast air near sunrise</small><strong>{num(sample?.tempF,'°F')}</strong><span>Surface temperature unknown</span></div>
        <div><small>Air–dew point gap</small><strong>{num(sample?.spreadF,'°F')}</strong><span>A small gap suggests more moisture</span></div>
        <div><small>Wind / cloud cover</small><strong>{Number.isFinite(sample?.windMph)&&Number.isFinite(sample?.skyPct)?num(sample.windMph,' mph')+' / '+num(sample.skyPct,'%'):'—'}</strong><span>Quiet air and an open sky can help surfaces cool</span></div>
      </div>
      <div className='fm-decision-bottom'>
        <p><strong>Visibility:</strong> {photo?.visibilityMi!=null?
          'NWS grid near sunrise: '+photo.visibilityMi+' mi.'+(photo.status==='fog-watch'?' Near-freezing low visibility: check fog and icing alerts.':' Visibility is an air forecast, not evidence of ice on branches.'):
          'The NWS visibility forecast is missing. Never assume a route is clear or ice-free.'}</p>
        <div><a href='#sunrise-guide'>Plan your first light ↓</a><a href='https://www.weather.gov/alerts' target='_blank' rel='noopener noreferrer'>NWS alerts ↗</a></div>
      </div>
      {morning.night&&<div className='fm-decision-overnight'>
        <strong>How the night develops: {morning.night.headline}</strong>
        <span>{morning.night.explanation} {morning.night.coveragePct}% of required evening-to-dawn forecast hours are complete.</span>
        <a href='#overnight-journey'>Explore the overnight story ↓</a>
      </div>}
    </>}
    {issuedAt&&<small className='fm-decision-provenance'>Grid update: {new Date(issuedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} Eastern. A weather-setup index invites exploration; it does not confirm hoarfrost on the ground.</small>}
  </section>;
}
