import {dawnDecision} from '../lib/frostMorning.mjs';
const dateLabel=d=>d?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(d+'T12:00:00Z')):'—';
const clock=iso=>iso?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'numeric',minute:'2-digit'}).format(new Date(iso)):'—';
const num=(v,suffix='')=>Number.isFinite(v)?Math.round(v)+suffix:'—';
export default function FrostDawnDecision({morning,site,loading,error,issuedAt}){
  const verdict=dawnDecision(morning);
  const photo=morning?.photo;
  const sample=photo?.forecastHours?.length?morning?.hourly?.find(h=>h.time===photo.forecastHours[0]):null;
  return <section className={'fm-dawn-decision '+verdict.level} aria-label='Quick sunrise forecast decision'>
    <div className='fm-decision-head'>
      <div><div className='fm-eyebrow dark'>Your next sunrise · weather forecast only</div>
        <h2>{site.name}: {loading?'Checking NWS weather…':error?'Forecast unavailable':verdict.headline}</h2>
        <p>{loading?'Checking air temperature, moisture, wind and sunrise visibility.':error||verdict.detail}</p></div>
      {morning?.score!=null&&<div className='fm-decision-score'><strong>{morning.score}<small>/100</small></strong><span>weather setup, not probability</span></div>}
    </div>
    {morning&&<>
      <div className='fm-decision-ingredients'>
        <div><small>Morning</small><strong>{dateLabel(morning.date)}</strong><span>{photo?.sunriseAt?'Sunrise '+clock(photo.sunriseAt):'Sunrise unavailable'}</span></div>
        <div><small>Air near sunrise</small><strong>{num(sample?.tempF,'°F')}</strong><span>Surface temperature unknown</span></div>
        <div><small>Temperature–dew gap</small><strong>{num(sample?.spreadF,'°F')}</strong><span>Smaller means more humid air</span></div>
        <div><small>Wind / clouds</small><strong>{Number.isFinite(sample?.windMph)&&Number.isFinite(sample?.skyPct)?num(sample.windMph,' mph')+' / '+num(sample.skyPct,'%'):'—'}</strong><span>Forecast wind and sky cover</span></div>
      </div>
      <div className='fm-decision-bottom'>
        <p><strong>Visibility:</strong> {photo?.visibilityMi!=null?
          'NWS grid near sunrise: '+photo.visibilityMi+' mi.'+(photo.status==='fog-watch'?' Near-freezing low visibility: check fog and icing alerts.':' Does not establish an ice-crystal sighting.'):
          'NWS visibility forecast unavailable; do not assume roads or views will be clear.'}</p>
        <div><a href='#sunrise-guide'>Photography timing ↓</a><a href='https://www.weather.gov/alerts' target='_blank' rel='noopener noreferrer'>NWS alerts ↗</a></div>
      </div>
      {morning.night&&<div className='fm-decision-overnight'>
        <strong>Overnight cooling: {morning.night.headline}</strong>
        <span>{morning.night.explanation} {morning.night.coveragePct}% of required evening-to-dawn forecast hours are complete.</span>
        <a href='#overnight-journey'>Inspect the full overnight trajectory ↓</a>
      </div>}
    </>}
    {issuedAt&&<small className='fm-decision-provenance'>Grid update: {new Date(issuedAt).toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} Eastern. An experimental weather-setup index is not a verified hoarfrost forecast.</small>}
  </section>;
}
