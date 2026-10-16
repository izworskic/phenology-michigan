import Head from 'next/head';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import SalamanderMap from '../components/SalamanderMap';
import {REGIONS,isSeason} from '../lib/salamanders.mjs';

const URL='https://phenology.chrisizworski.com/salamander-migration';
const TITLE='Michigan Salamander Migration Tracker | Big Night Weather Forecast';
const DESC='When will salamanders migrate in Michigan? Explore warm-rain Big Night signals, seven-night regional forecasts, spring timing, spotted and blue-spotted salamander identification, and safe viewing.';
const QUESTIONS=[
 ['When do salamanders migrate in Michigan?','Spotted and blue-spotted salamanders typically move toward vernal breeding pools in March and April in much of Michigan, and sometimes into May farther north. The actual nights depend on snowmelt, thaw and warm rain, not a fixed date.'],
 ['What temperature triggers salamander migration?','Warm, rainy nights with air temperatures around or above 40°F are often associated with spring migrations. This is a broad field guideline, not a guarantee or a precisely calibrated Michigan threshold.'],
 ['What is a salamander Big Night?','Big Night is an informal term for a spring rain event during which many salamanders and other amphibians move from upland habitat toward breeding pools. Migration may happen over multiple nights, and a single weather forecast cannot confirm that a Big Night occurred.'],
 ['Does rain guarantee that salamanders will cross?','No. Thawed ground, snow cover, rainfall duration, breeding-pool water, habitat, species timing and recent previous migrations also matter. This tracker only estimates regional weather fit.'],
 ['Where can I see salamander migration in Michigan?','Look for educational programs run by established nature centers and conservation organizations rather than searching for or publicizing individual vernal pools. Marquette is known for conservation-minded road closures at Presque Isle; always verify current local access and follow closure signs.'],
 ['Is it safe to pick up salamanders?','Avoid unnecessary handling, never collect or relocate wildlife without proper permission, do not enter roads at night, and keep pets away. Chemicals such as sunscreen and insect repellent can harm amphibians through their skin.'],
 ['Are these maps showing actual salamander locations?','No. Each marker is a representative regional weather location. Forecast ratings are not sightings, animal density estimates, verified crossing sites or specific vernal-pool locations.']
];
const tone=l=>['strong','watch','guarded','cold','dry','unknown'].includes(l)?l:'off';
const dateFmt=s=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',weekday:'short',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const monthWindow=(r)=>r.window;
function Stamp({level,children}){return <span className={'sala-stamp '+tone(level)}>{children}</span>;}
function WeatherStrip({row,off,unavailable,loading}){
 return <section className="sala-section" id="forecast">
  <div className="sala-section-title"><div><span className="sala-overline">07-night outlook</span><h2>Which nights have the right conditions?</h2></div><p>Warmth and rainfall must overlap after dark. These bars describe predicted weather fit, not a probability of migration.</p></div>
  {!off&&row?.nights?.length?<div className="sala-night-grid">
   {row.nights.map((n,i)=><div className={'sala-night '+tone(n.level)} key={n.date}>
    <div className="sala-night-top"><span>{i===0?'Tonight':dateFmt(n.date)}</span><span className="sala-night-symbol">{n.level==='strong'?'●':n.level==='watch'?'◐':'○'}</span></div>
    <div className="sala-night-visual"><span style={{height:(n.level==='strong'?100:n.level==='watch'?71:n.level==='guarded'?43:n.level==='dry'?19:n.level==='cold'?14:8)+'%'}}/></div>
    <strong>{n.temp==null?'—':n.temp+'°F'}</strong><small>{n.rainChance==null?'Rain n/a':n.rainChance+'% rain'}</small>
    <span className="sala-night-caption">{n.label}</span>
   </div>)}
  </div>:<div className="sala-empty"><strong>{loading?'Loading spring forecast…':off?'Forecast returns in spring':'Forecast currently unavailable'}</strong><p>{off?'We do not issue October–winter migration warnings. Explore spring timing and learn the signals so you are ready for the thaw.':unavailable?'The National Weather Service forecast is temporarily unavailable. No migration assessment is being invented.':'Actual weather readings are missing, so the app will not invent a migration outlook.'}</p></div>}
  {!off&&row?.nights?.length>0&&<div className="sala-forecast-explain"><Stamp level={row?.best?.level||'off'}>{row?.best?'Best watch: '+dateFmt(row.best.date):'No favorable rain window found'}</Stamp><p>{row?.best?.details||'This seven-night forecast does not currently contain a sustained warm-rain signal. Conditions can change quickly.'}</p></div>}
 </section>;
}
function SpringCalendar(){
 return <div className="sala-calendar">
  {[['March','Southern Lower Michigan watch begins'],['April','Much of the state · strongest seasonal watch'],['May','Northern and U.P. late-season possibilities']].map(([m,c],i)=><div key={m}><span className="sala-calendar-num">0{i+3}</span><strong>{m}</strong><small>{c}</small></div>)}
 </div>;
}
export default function SalamanderMigration(){
 const router=useRouter(),[selected,setSelected]=useState('saginaw-bay'),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{if(router.isReady&&typeof router.query.region==='string'&&REGIONS.some(r=>r.id===router.query.region))setSelected(router.query.region);},[router.isReady,router.query.region]);
 useEffect(()=>{let alive=true;fetch('/api/salamanders').then(r=>{if(!r.ok)throw Error('Forecast service unavailable');return r.json();}).then(v=>{if(alive){setData(v);setLoading(false);}}).catch(()=>{if(alive){setError('Unable to load the regional weather service.');setLoading(false);}});return()=>{alive=false;};},[]);
 const choose=id=>{setSelected(id);router.replace({pathname:'/salamander-migration',query:id==='saginaw-bay'?{}:{region:id}},undefined,{shallow:true,scroll:false});};
 const region=REGIONS.find(r=>r.id===selected)||REGIONS[4];
 const row=data?.regions?.find(r=>r.id===selected)||null;
 const off=data?data.status==='off_season':!isSeason();
 const unavailable=data?.status==='forecast_unavailable'||row?.season==='unavailable'||!!error;
 const regionRows=useMemo(()=>REGIONS.map(r=>data?.regions?.find(x=>x.id===r.id)||r),[data]);
 const best=row?.best,tonight=row?.tonight;
 const headline=off?'The forest is waiting for spring':unavailable?'Weather outlook unavailable':best?.level==='strong'?'Warm-rain window ahead':best?.level==='watch'?'Possible movement ahead':'Watching for the first warm rain';
 const status=off?'Outside spring migration season':unavailable?'Forecast not available':best?.label||'No strong migration signal in seven nights';
 const updated=data?.generatedAt?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Detroit'}).format(new Date(data.generatedAt)):null;
 const structured={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':URL+'#webpage',url:URL,name:TITLE,description:DESC,author:{'@id':'https://chrisizworski.com/#person'},isPartOf:{'@id':'https://phenology.chrisizworski.com/#website'}},
  {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Salamander Migration Tracker',url:URL,applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,creator:{'@id':'https://chrisizworski.com/#person'}},
  {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Michigan Phenology',item:'https://phenology.chrisizworski.com/'},{'@type':'ListItem',position:2,name:'Salamander Migration',item:URL}]},
  {'@type':'FAQPage',mainEntity:QUESTIONS.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 ]};
 return <div className="sala">
  <Head><title>{TITLE} | Chris Izworski</title><meta name="description" content={DESC}/><link rel="canonical" href={URL}/><meta name="robots" content="index,follow,max-image-preview:large"/><meta property="og:type" content="website"/><meta property="og:title" content={TITLE}/><meta property="og:description" content={DESC}/><meta property="og:url" content={URL}/><meta name="twitter:card" content="summary"/><link rel="stylesheet" href="/salamander-migration.css"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured)}}/></Head>
  <header className="sala-top"><div className="sala-wrap sala-top-inner"><a href="/">MICHIGAN PHENOLOGY <span>/ SALAMANDERS</span></a><nav aria-label="Tool navigation"><a href="#forecast">7 nights</a><a href="#regions">Regional map</a><a href="#field-guide">Field guide</a><a href="/firefly-tracker">Fireflies</a></nav></div></header>
  <main>
   <section className="sala-hero"><div className="sala-wrap sala-hero-layout">
    <div><div className="sala-overline"><span className="sala-live-dot"/> Michigan's living calendar · Spring after dark</div><h1>When will the salamanders move?</h1><p className="sala-lead">A quiet forest. A warm spring rain. Then hundreds of hidden amphibians may make their way toward woodland pools. Find the nights when the weather starts to line up.</p><div className="sala-pills"><span>9 forecast regions</span><span>7-night rain & temperature</span><span>Conservation-first</span></div></div>
    <aside className="sala-hero-card"><span className="sala-overline">Your region · {region.name}</span><div className="sala-hero-status">{headline}</div><Stamp level={off?'off':best?.level||'unknown'}>{status}</Stamp><p>{off?'Migration generally returns with the first suitable spring thaws and rains. No current activity is implied.':best?'Next notable window: '+dateFmt(best.date)+'. '+best.details:'A suitable night needs sustained warm rain and locally thawed ground.'}</p><div className="sala-hero-meter"><span>Spring watch</span><span>{off?'Paused until spring':unavailable?'Data unavailable':'Forecast updated '+(updated||'recently')}</span></div></aside>
   </div></section>
   <div className="sala-wrap">
    <div className="sala-trust"><strong>Forecast, not sightings.</strong> Temperature and rain likelihood are NWS forecasts for regional points. Soil thaw, breeding-pool conditions, actual movement and road crossings are unconfirmed.</div>
    <section className="sala-section sala-location" id="regions"><div className="sala-section-title"><div><span className="sala-overline">Where spring is waking</span><h2>Explore Michigan's nine watch regions</h2></div><p>Select a marker or region. This map intentionally excludes individual vernal pools, animal locations, and road-crossing sites.</p></div>
     <div className="sala-layout"><div className="sala-map-panel"><SalamanderMap selected={selected} onSelect={choose} rows={data?.regions}/><div className="sala-legend"><span><i className="strong"/>Strong weather</span><span><i className="watch"/>Possible</span><span><i className="off"/>Unfavorable / off-season</span></div></div>
     <div className="sala-current">
      <div className="sala-overline">Regional weather readout</div><h3>{region.name}</h3><p>{region.place} · Typical broad timing: {monthWindow(region).toLowerCase()}.</p>
      <div className="sala-readouts"><div><span>Tonight's air temp</span><strong>{!off&&tonight?.temp!=null?tonight.temp+'°F':'—'}</strong></div><div><span>Highest rain chance</span><strong>{!off&&tonight?.rainChance!=null?tonight.rainChance+'%':'—'}</strong></div><div><span>Warm / rainy hours</span><strong>{!off&&tonight?.warmRainHours!=null?String(tonight.warmRainHours):'—'}</strong></div></div>
      <div className="sala-thaw"><span className="sala-overline">Ground-thaw uncertainty</span><strong>{row?.thaw?.label||'Not assessed in the off-season'}</strong><p>{row?.thaw?.detail||'Ground thaw is not directly reported by the National Weather Service forecast and must be locally checked.'}</p></div>
      <h4>Pick another region</h4><div className="sala-region-picker">{REGIONS.map((r,i)=>{const b=regionRows[i]?.best;return <button type="button" key={r.id} className={selected===r.id?'selected':''} aria-pressed={selected===r.id} onClick={()=>choose(r.id)}><span>{r.name}</span><small>{off?'Spring planning':b?.level==='strong'?'Strong signal':b?.level==='watch'?'Possible':'No strong signal'}</small></button>;})}</div>
     </div></div>
    </section>
    <WeatherStrip row={row} off={off} unavailable={unavailable} loading={loading}/>
    <section className="sala-section" id="timing"><div className="sala-section-title"><div><span className="sala-overline">The spring migration clock</span><h2>Why the first rainy night matters</h2></div><p>These are broad Michigan seasonal windows, not a prediction that migration has started.</p></div>
     <SpringCalendar/><div className="sala-reasons">
      <div><span className="sala-reason-num">01</span><h3>Air above roughly 40°F</h3><p>Several hours of mild nighttime air are a common ingredient in spring amphibian movement.</p></div>
      <div><span className="sala-reason-num">02</span><h3>Rain after sunset</h3><p>Moist conditions protect sensitive skin. A few scattered drops are not the same as sustained warm rain.</p></div>
      <div><span className="sala-reason-num">03</span><h3>Thaw and temporary pools</h3><p>Snowmelt and unfrozen ground matter. Nearby forests and vernal pools can differ greatly from regional weather grids.</p></div>
     </div>
    </section>
    <section className="sala-section" id="field-guide"><div className="sala-section-title"><div><span className="sala-overline">Meet the nocturnal travelers</span><h2>Two Michigan salamanders to know</h2></div><p>These mole salamanders spend much of the year hidden underground. A spring migration can be one of the few times people notice them.</p></div>
     <div className="sala-species">
      <article><img loading="lazy" alt="Spotted salamander with yellow spots along a dark body" src="https://commons.wikimedia.org/wiki/Special:FilePath/Spotted_Salamander_(14882862316).jpg?width=900"/><div><span className="sala-overline">Ambystoma maculatum</span><h3>Spotted salamander</h3><p>Distinctive rows of round yellow spots on a dark body. Often breeds in temporary woodland pools following spring rains.</p><small>Photo: Evan H. C. Grant / USGS · Public domain (<a href="https://commons.wikimedia.org/wiki/File:Spotted_Salamander_(14882862316).jpg" target="_blank" rel="noreferrer">source</a>)</small></div></article>
      <article><img loading="lazy" alt="Blue-spotted salamander with pale blue spots on a dark body" src="https://commons.wikimedia.org/wiki/Special:FilePath/Blue-spotted_Salamander.jpg?width=900"/><div><span className="sala-overline">Ambystoma laterale</span><h3>Blue-spotted salamander</h3><p>Smaller, with flecks and patches of blue on dark skin. Particularly famous for its spring migration in Marquette.</p><small>Photo: Evan S. Grimes / USGS · Public domain (<a href="https://commons.wikimedia.org/wiki/File:Blue-spotted_Salamander.jpg" target="_blank" rel="noreferrer">source</a>)</small></div></article>
     </div>
    </section>
    <section className="sala-section"><div className="sala-marq"><div><span className="sala-overline">Michigan conservation spotlight</span><h2>Marquette's salamander crossing</h2><p>At Presque Isle Park, the city has used seasonal nighttime closures on part of Peter White Drive to help blue-spotted salamanders migrate. Closure boundaries and dates can change: check the city’s official notices before visiting.</p><p><strong>Observe, don't chase.</strong> Respect gates, stay off closed roads unless clearly permitted, and never enter traffic to move an animal. Participate through organized conservation programs.</p><a href="https://marquettemi.gov/psa/extension-of-presque-isle-park-road-closure/" target="_blank" rel="noreferrer">Read an official Marquette closure notice →</a></div><div className="sala-marq-symbol" aria-hidden="true"><span>MARQUETTE</span><strong>SPRING<br/>NIGHTS</strong><i>WETLANDS · WILDLIFE · SAFE PASSAGE</i></div></div></section>
    <section className="sala-section"><div className="sala-section-title"><div><span className="sala-overline">Understand the signal</span><h2>What this predictor can and cannot know</h2></div></div>
     <div className="sala-method"><div><strong>Inputs</strong><p>NWS hourly air temperature, precipitation likelihood and rain/snow wording. Nine regions are refreshed approximately every 30 minutes during March–May.</p></div><div><strong>Decision rule</strong><p>At least three hours with air above 40°F, a rain forecast and at least 55% forecast precipitation likelihood can create a strong weather signal, unless snow is also expected. These are editorial rules, not validated migration probabilities.</p></div><div><strong>Not verified</strong><p>Ground thaw, local wetland water, migrations already completed, species actually present, confirmed sightings, and road safety. A strong weather signal is never called a confirmed Big Night.</p></div></div>
    </section>
    <section className="sala-section" id="faq"><div className="sala-section-title"><div><span className="sala-overline">Field questions</span><h2>Michigan salamander migration FAQ</h2></div></div><div className="sala-faq">{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
    <footer className="sala-footer"><p>Sources: <a href="https://www.michigan.gov/dnr/education/michigan-species/reptiles/lizards" target="_blank" rel="noreferrer">Michigan DNR</a> · <a href="https://michigannature.wordpress.com/2026/03/27/march-of-the-amphibians-springtime-salamander-migration-is-officially-underway/" target="_blank" rel="noreferrer">Michigan Nature Association</a> · <a href="https://extension.unh.edu/blog/2026/03/what-big-night-spring-how-can-you-help-amphibians-during-time" target="_blank" rel="noreferrer">UNH Extension</a> · <a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noreferrer">National Weather Service forecast</a>.</p><p>Built by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> · <a href="/">Michigan Phenology</a></p></footer>
   </div>
  </main>
 </div>;
}