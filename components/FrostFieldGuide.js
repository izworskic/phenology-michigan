import {useEffect,useState} from 'react';
import {fieldFinds,guideWeather} from '../lib/frostInterpretation.mjs';

const stops=[
  {title:'Begin at the field edge',short:'What would you notice?'},
  {title:'Read the evening sky',short:'What gives frost a chance?'},
  {title:'Investigate the white coat',short:'What kind of ice might it be?'},
  {title:'Plan your first light',short:'Where should you look?'}
];
const clock=(iso,tz)=>iso?new Intl.DateTimeFormat('en-US',{timeZone:tz||'America/Detroit',hour:'numeric',minute:'2-digit'}).format(new Date(iso)):'Unavailable';
const labelDate=date=>date?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(date+'T12:00:00Z')):'Select a forecast morning';

export default function FrostFieldGuide({morning,site}){
  const [stop,setStop]=useState(0);
  const [clue,setClue]=useState('sky');
  const [find,setFind]=useState('crystals');
  useEffect(()=>{setClue('sky');},[morning?.date,site?.id]);
  const weather=guideWeather(morning);
  const selected=weather.factors.find(f=>f.id===clue)||weather.factors[0];
  const discovery=fieldFinds[find];
  const photo=morning?.photo;
  const today=labelDate(morning?.date);
  return <section className='fg-tour' id='field-guide' aria-labelledby='fg-heading'>
    <div className='fg-intro'>
      <div><span className='fm-kicker'>A field guide to Michigan's fleeting frost</span>
        <h2 id='fg-heading'>Take a closer look at a silver morning</h2>
        <p>Why does a meadow whiten while the road stays dark? The answer begins with a few quiet changes in the air. Follow four short stops, then explore the forecast for your chosen part of Michigan.</p>
      </div>
      <span className='fg-counter'>Four field stops · one changing landscape</span>
    </div>
    <div className='fg-stops' role='group' aria-label='Choose a field guide stop'>
      {stops.map((item,i)=><button key={item.title} type='button' aria-pressed={stop===i} className={stop===i?'active':''} onClick={()=>setStop(i)}>
        <b>{String(i+1).padStart(2,'0')}</b><span>{item.title}</span></button>)}
    </div>
    <div className='fg-story' aria-live='polite'>
      <div className='fg-scene'>
        <span className='fg-scene-eyebrow'>Field stop {stop+1} of 4 · {site?.name||'Michigan'}</span>
        <h3>{stops[stop].short}</h3>
        {stop===0&&<>
          <p>Picture yourself beside a meadow just before sunrise. The first light catches tiny white edges on a blade of grass. A few steps away, a sheltered path might look completely different.</p>
          <p>Grass, bare branches and fence wires can lose heat to a clear night sky. They may become colder than the air reported by a weather station. That is why a 35°F air forecast does not rule out frost on an exposed surface.</p>
          <p><strong>Your first question:</strong> Is the white coating on the most exposed surfaces, or only in a damp, sheltered hollow?</p>
        </>}
        {stop===1&&<>
          <p>Imagine the atmosphere as four clues rather than a single thermometer reading. Choose one to discover how it contributes to frost-friendly weather.</p>
          <p>These clues use the selected location's forecast near sunrise. For an explanation of how the whole night evolves, open the overnight cooling chart farther down the page.</p>
        </>}
        {stop===2&&<>
          <p>Not everything white on a winter twig is hoarfrost. The way water reaches a cold surface matters. Choose what you might have noticed and compare the possible explanations.</p>
          <p>A weather forecast cannot tell us which kind of ice you actually found. That takes careful observation of the surface and surrounding conditions.</p>
        </>}
        {stop===3&&<>
          <p>The best outing begins with a plan, not a promise. Find a legal public viewpoint with open meadows, accessible trails or sheltered vegetation. Arrive early enough to notice how light changes the scene.</p>
          <p>If you see no frost, look anyway: a clearing cloud deck, a light breeze or a cold-air pocket can help explain why one morning looks different from another.</p>
          <p><strong>Leave the scene as you found it.</strong> Keep to permitted access, avoid trampling frosted plants for a photograph and use local road reports when freezing fog is possible.</p>
        </>}
      </div>
      <div className='fg-discover'>
        {stop===0&&<>
          <span className='fm-kicker'>A quick field observation</span>
          <h4>Three places to compare</h4>
          <div className='fg-cues'>
            <div><strong>Grass tips</strong><span>Small exposed surfaces may cool quickly.</span></div>
            <div><strong>Leafless twigs</strong><span>Look for crystal shapes at the edges.</span></div>
            <div><strong>Sheltered hollows</strong><span>Cold air and moisture can collect locally.</span></div>
          </div>
          <p className='fg-fine'>The forecast does not measure surface temperature or guarantee frost at any of these places.</p>
        </>}
        {stop===1&&<>
          <span className='fm-kicker'>Near-sunrise NWS clues · {today}</span>
          <h4>Which ingredient would you investigate?</h4>
          {weather.available?<><div className='fg-options' role='group' aria-label='Choose a weather clue'>
            {weather.factors.map(f=><button type='button' key={f.id} aria-pressed={selected?.id===f.id} onClick={()=>setClue(f.id)}>{f.label}</button>)}
          </div>
          {selected&&<div className='fg-reveal'><small>{selected.condition}</small>
            <strong>{selected.value}</strong><p>{selected.explanation}</p></div>}
          <p className='fg-fine'>{weather.note}</p></>:<p className='fg-missing'>{weather.note}</p>}
        </>}
        {stop===2&&<>
          <span className='fm-kicker'>Identify by observing, not by forecasting</span>
          <h4>What does the coating resemble?</h4>
          <div className='fg-options fg-options-wrap' role='group' aria-label='Describe a field observation'>
            {Object.entries(fieldFinds).map(([key,item])=><button type='button' key={key} aria-pressed={find===key} onClick={()=>setFind(key)}>{item.label}</button>)}
          </div>
          <div className='fg-reveal'><small>What this clue may suggest</small><strong>{discovery.title}</strong>
            <p>{discovery.message}</p><p><em>{discovery.question}</em></p></div>
        </>}
        {stop===3&&<>
          <span className='fm-kicker'>Your {site?.name||'Michigan'} sunrise plan</span>
          <h4>{today}</h4>
          <div className='fg-plan'>
            <div><small>Arrive around civil dawn</small><strong>{clock(photo?.arriveAt,site?.tz)}</strong></div>
            <div><small>Approximate sunrise</small><strong>{clock(photo?.sunriseAt,site?.tz)}</strong></div>
            <div><small>Forecast viewing context</small><strong>{photo?.label||'Weather not available'}</strong></div>
          </div>
          <p className='fg-fine'>{photo?.reason||'Choose an available morning for a local sunrise assessment.'} Times describe light, not a predicted frost appearance or melting time.</p>
          <div className='fg-links'><a href='#places'>Choose another Michigan location ↓</a><a href='#sunrise-guide'>View the detailed sunrise plan ↓</a></div>
          {weather.caution&&<p className='fg-warning'>Near-freezing low visibility is in the forecast. Check <a href='https://www.weather.gov/alerts' target='_blank' rel='noopener noreferrer'>NWS alerts</a> before travel.</p>}
        </>}
      </div>
    </div>
    <div className='fg-footer'>
      <p>This is an independent interpretive guide inspired by place-based nature education, not a National Park Service publication. Its weather clues are forecasts, not sightings.</p>
      <div className='fg-actions'>
        {stop>0&&<button type='button' className='fg-back' onClick={()=>setStop(n=>Math.max(n-1,0))}>← Previous stop</button>}
        <button type='button' className='fg-next' onClick={()=>setStop(n=>(n+1)%stops.length)}>{stop===3?'Return to first stop ↺':'Continue the field walk →'}</button>
      </div>
    </div>
  </section>;
}
