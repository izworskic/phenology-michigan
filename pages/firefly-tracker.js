import Head from 'next/head';
import {useEffect,useState} from 'react';
import FireflyCartoMap from '../components/FireflyCartoMap';
import {useRouter} from 'next/router';
import {REGIONS,seasonalWindow,development,viewingLabel} from '../lib/fireflies';

const URL='https://phenology.chrisizworski.com/firefly-tracker';
const PAGE_TITLE='Michigan Firefly Tracker: Emergence Timing & 7-Night Viewing Forecast';
const DESCRIPTION='When do lightning bugs appear in Michigan? Explore regional firefly-season timing, a 7-night NWS weather outlook, historical degree-day context and where to watch.';
const REFERENCES=[
  ['Michigan firefly phenology study (Hermann et al., 2016)','https://doi.org/10.1098/rsos.160712'],
  ['Xerces Society: About Fireflies','https://xerces.org/endangered-species/fireflies/about'],
  ['Firefly Atlas: Survey Tips','https://www.fireflyatlas.org/firefly-survey-tips'],
  ['National Weather Service Forecast API','https://www.weather.gov/documentation/services-web-api'],
  ['NOAA Regional Climate Center: ACIS climate data','https://docs.rcc-acis.org/acisws/'],
];
const QUESTIONS=[
  ['When do fireflies first come out in Michigan?','Flashing fireflies generally become noticeable in late spring or early summer. Southern Lower Michigan usually starts sooner than the Northern Lower and Upper Peninsula. Weather and species can shift the window by weeks. These are planning windows, not confirmed local first-sighting dates.'],
  ['When is the best time to see fireflies in Michigan?','June and July are typically productive. Find a dark, quiet field edge or damp meadow and begin watching around sunset, continuing into early darkness. Species differ: some flash near sunset, others later. Check the 7-night weather outlook for warm, low-wind evenings.'],
  ['Do rain and warm nights bring out fireflies?','Adult activity is affected by air temperature, and wet spring conditions can affect development and prey. Heavy rain while you are out, strong wind, and cool evening temperatures may make viewing less rewarding. Rainfall extremes may delay adult activity peaks. A good weather night is not proof that fireflies have emerged.'],
  ['Can the 800 degree-day threshold predict their first appearance?','No. A 12-year study in southern Michigan linked adult flight peaks in Photinus fireflies to approximately 800 Celsius growing degree-days above a 10°C base, with substantial variation. It was not a first-emergence trigger and is not validated for every Michigan species or region. This site treats the measurement only as a broad historical reference.'],
  ['Where should I look for lightning bugs?','Look for low-disturbance grassy edges, meadows, wetland margins and leafy yards away from bright artificial light. Arrive while it is still light enough to safely check paths, property boundaries and access rules. Do not assume parks are open after dusk.'],
  ['Are tonight’s ratings confirmed firefly sightings?','No. The bars compare National Weather Service evening temperature, wind and forecast precipitation using a site-defined planning heuristic. They do not count fireflies, establish actual emergence, measure abundance or guarantee a sighting.'],
];
const fmt=(date)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date+'T12:00:00Z'));
function Badge({tone,children}){return <span className={'firefly-status '+(tone||'off')}>{children}</span>;}
function NightPanel({row,loading}){
  const nights=row?.nights||[];
  return <section className='firefly-section' id='seven-night'>
    <div className='firefly-section-head'>
      <div><div className='firefly-eyebrow'>Evening conditions</div><h2>Best nights in the next seven days</h2></div>
      <p>A practical 8–11 p.m. temperature, wind and precipitation outlook. Scores are weather-fit heuristics, not the chance of seeing fireflies.</p>
    </div>
    {loading?<div className='firefly-panel'><div className='firefly-loading'/><p>Checking National Weather Service outlooks…</p></div>
    :nights.length?<div className='firefly-panel'>
      <div className='firefly-night-grid' role='list' aria-label='Forecasted viewing weather for seven evenings'>
        {nights.map(n=><div className={'firefly-night '+(n.score>=75?'good':n.score<45?'poor':'')} key={n.date} role='listitem'>
          <b>{fmt(n.date).split(',')[0]}</b><small>{fmt(n.date).split(',').slice(1).join(',').trim()}</small>
          <div className='night-score'><div style={{height:((n.score==null?0:n.score)*.92+5)+'%'}}/></div>
          <strong>{n.score==null?'—':n.score+'/100'}</strong>
          <small>{n.label||'Unavailable'}</small><small>{n.temp!=null?n.temp+'°F':'—'} · {n.pop!=null?n.pop+'% rain':'rain n/a'}</small>
        </div>)}
      </div>
      <p className='firefly-context'>The rating uses an editorial rule favoring mild-to-warm, calm, drier evening conditions. It is not a scientific emergence predictor. Humidity and recent wet days are context, not an invented flash-probability percentage. Individual species flash at different times.</p>
    </div>
    :<div className='firefly-panel'><Badge tone='off'>{row?.season?.inSeason?'Forecast unavailable':'Outside the viewing season'}</Badge><h3 style={{marginTop:15}}>{row?.season?.inSeason?'Waiting for a reliable NWS forecast':'The evening outlook returns in spring'}</h3><p>{row?.season?.inSeason?'No seven-night forecast is available for this region. We are not replacing missing observations with fictional weather.':'It is outside Michigan’s typical flashing-firefly season. Weather alone cannot create a reliable October firefly forecast. This board will update automatically as summer approaches.'}</p></div>}
    <div className='firefly-subgrid'>
      <div className='firefly-panel'>
        <div className='firefly-micro'>How to read the signals</div><h3 style={{marginTop:11}}>Good weather ≠ confirmed emergence</h3>
        <p>An actual viewing night requires adult fireflies to be present locally. Warmth and rainfall influence development, but nearby habitat, light pollution, species and observer effort also matter. No firefly population count or verified sightings are being claimed here.</p>
      </div>
      <div className='firefly-panel'>
        <div className='firefly-micro'>What changes with new data</div><h3 style={{marginTop:11}}>Weather updates as forecasts change</h3>
        <p>Regional hourly National Weather Service forecasts drive the night-to-night bars during season. NOAA Regional Climate Center daily records support the broader development context. Forecast data are cached for 30 minutes and may briefly serve a previous snapshot while an update runs.</p>
      </div>
    </div>
  </section>;
}
export default function FireflyTracker(){
  const router=useRouter();
  const [selected,setSelected]=useState('saginaw-bay');
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  useEffect(()=>{if(router.isReady&&typeof router.query.region==='string'&&REGIONS.some(r=>r.id===router.query.region))setSelected(router.query.region);},[router.isReady,router.query.region]);
  useEffect(()=>{
    let alive=true;
    fetch('/api/fireflies').then(r=>{if(!r.ok)throw Error('Regional forecast is temporarily unavailable');return r.json();})
      .then(json=>{if(alive){setData(json);setLoading(false);}})
      .catch(err=>{if(alive){setError(err.message);setLoading(false);}});
    return ()=>{alive=false;};
  },[]);
  const choose=id=>{
    setSelected(id);
    router.replace({pathname:'/firefly-tracker',query:id==='saginaw-bay'?{}:{region:id}},undefined,{shallow:true,scroll:false});
  };
  const region=REGIONS.find(r=>r.id===selected)||REGIONS[4];
  const row=data?.regions?.find(r=>r.id===selected);
  const season=row?.season||seasonalWindow(region);
  const current=row?.current||viewingLabel(region,null);
  const dev=row?.development||development(null);
  const night=row?.nights?.[0]||null;
  const off=!season.inSeason;
  const nextYear=new Date().getFullYear()+(season.status==='after'?1:0);
  const seasonWindowText=region.lat>=46?'Mid-June–early August':region.lat>=44.5?'Early June–late July':'Late May–July';
  const updated=data?.generatedAt?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'}).format(new Date(data.generatedAt)):null;
  const schema={
    '@context':'https://schema.org','@graph':[
      {'@type':'WebPage','@id':URL+'#webpage',url:URL,name:PAGE_TITLE,description:DESCRIPTION,isPartOf:{'@id':'https://phenology.chrisizworski.com/#website'},author:{'@id':'https://chrisizworski.com/#person'}},
      {'@type':'WebApplication','@id':URL+'#app',name:'Michigan Firefly Tracker',url:URL,description:DESCRIPTION,applicationCategory:'WeatherApplication',operatingSystem:'Any',isAccessibleForFree:true,author:{'@id':'https://chrisizworski.com/#person'},creator:{'@id':'https://chrisizworski.com/#person'}},
      {'@type':'FAQPage',mainEntity:QUESTIONS.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
      {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Michigan Phenology',item:'https://phenology.chrisizworski.com/'},{'@type':'ListItem',position:2,name:'Firefly Tracker',item:URL}]}
    ]
  };
  return <div className='firefly-tool'>
    <Head>
      <title>{PAGE_TITLE} | Chris Izworski</title><meta name='description' content={DESCRIPTION}/><link rel='canonical' href={URL}/>
      <meta name='robots' content='index,follow,max-image-preview:large,max-snippet:-1'/>
      <meta property='og:type' content='website'/><meta property='og:title' content={PAGE_TITLE}/><meta property='og:description' content={DESCRIPTION}/><meta property='og:url' content={URL}/>
      <meta name='twitter:card' content='summary'/><link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'/><link rel='stylesheet' href='/firefly-tracker.css'/>
      <script type='application/ld+json' dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
    </Head>
    <header className='firefly-shell firefly-top'>
      <a href='/'>MICHIGAN PHENOLOGY <span style={{color:'#a1c786'}}> / FIREFLIES</span></a>
      <nav className='firefly-nav' aria-label='Site navigation'><a href='#regions'>Regions</a><a href='#seven-night'>7-night outlook</a><a href='#field-guide'>Field guide</a><a href='/bloom-tracker'>Bloom tracker</a></nav>
    </header>
    <main>
      <div className='firefly-hero'><div className='firefly-sparks' aria-hidden='true'/>
        <div className='firefly-shell firefly-hero-grid'>
          <div>
            <div className='firefly-eyebrow'>Michigan's living calendar · Summer light</div>
            <h1>When will the fireflies glow?</h1>
            <p className='firefly-dek'>A Michigan firefly emergence and evening-viewing tracker. Follow the season north, compare regional conditions, and find the kind of night worth stepping outside for.</p>
            <div className='firefly-season-strip'><span className='firefly-chip light'>9 Michigan forecast regions</span><span className='firefly-chip'>NWS evening forecast</span><span className='firefly-chip'>Michigan field research</span></div>
          </div>
          <aside className='firefly-hero-card'>
            <div className='firefly-micro'>{region.name} · Seasonal status</div>
            <div className='firefly-big'>{off?(season.status==='before'?'Not active yet':'Season has passed'):current.title}</div>
            <p className='firefly-note'>{off?'Typical viewing window: '+seasonWindowText+'. The outlook does not manufacture sightings during autumn or winter.':current.context}</p>
            <div className='firefly-divider'/>
            <Badge tone={current.tone}>{off?'Off-season planning':(night?.label||'Seasonal watch')}</Badge>
            <p className='firefly-note' style={{marginTop:13}}>{off?'Plan for '+nextYear+' and watch regional conditions change next spring.':'Weather signals are not verified firefly observations.'}</p>
          </aside>
        </div>
      </div>
      <div className='firefly-shell'>
        <section id='regions' className='firefly-section'>
          <div className='firefly-section-head'><div><div className='firefly-eyebrow'>One state · Different timing</div><h2>Explore the Michigan firefly map</h2></div><p>Select a region to change the status, degree-day context and evening forecast. Map points are representative weather locations—not proven viewing sites.</p></div>
          <div className='firefly-desk'>
            <div className='firefly-panel'>
              <FireflyCartoMap selected={selected} onSelect={choose} results={data?.regions}/>
              <div className='firefly-key'><span><i/>Select any numbered weather region</span><span>CARTO basemap · zoom and pan</span><span>Not an emergence or firefly density heatmap</span></div>
              <div className='firefly-region-list' role='group' aria-label='Regional locations'>
                {REGIONS.map((r,i)=>{const item=data?.regions?.find(z=>z.id===r.id);return <button key={r.id} className='firefly-region' aria-pressed={selected===r.id} onClick={()=>choose(r.id)}>
                  <span><strong>{i+1}. {r.name}</strong><small>{item?.season?.label||seasonalWindow(r).label}</small></span><span className='region-dot'/></button>;})}
              </div>
            </div>
            <div className='firefly-panel'>
              <div className='firefly-micro'>Selected forecast location</div>
              <h2 style={{margin:'10px 0 12px'}}>{region.name}</h2>
              <p>{region.place} · {seasonWindowText} is a broad seasonal planning window, not a verified emergence date.</p>
              <div style={{margin:'20px 0'}}><Badge tone={current.tone}>{off?season.label:current.title}</Badge></div>
              {loading&&<div className='firefly-loading'/>}
              {error&&<p role='status' style={{color:'#e2b1a0'}}>Live feed unavailable: {error}. Seasonal information remains available.</p>}
              <div className='firefly-readout'>
                <div className='firefly-reading'><span>Evening temp</span><strong>{!off&&night?.temp!=null?night.temp+'°':'—'}</strong></div>
                <div className='firefly-reading'><span>Wind</span><strong>{!off&&night?.wind!=null?night.wind+' mph':'—'}</strong></div>
                <div className='firefly-reading'><span>Rain chance</span><strong>{!off&&night?.pop!=null?night.pop+'%':'—'}</strong></div>
              </div>
              <p style={{marginTop:13}}>Weather outlook applies to the earliest available evening, not necessarily the current hour. Blank values mean no applicable forecast, not zero.</p>
              <div className='firefly-divider'/>
              <div className='firefly-micro'>Michigan-grown research · Heat accumulation</div>
              <h3 style={{marginTop:10}}>{row?.gddC!=null?row.gddC+' °C-days':'No current degree-day total'}</h3>
              <p>{row?.gddC!=null?dev.text:off?'Heat tracking resumes during firefly season.':'ACIS temperature history not available for this location.'}</p>
              {dev.pct!=null&&<div className='firefly-progress' role='progressbar' aria-valuenow={dev.pct} aria-valuemin={0} aria-valuemax={100} aria-label='Progress to historical adult flight peak reference'><span style={{width:dev.pct+'%'}}/></div>}
              <p style={{marginTop:11}}>The southern Michigan research found an adult-flight peak near <strong style={{color:'#d9efb3'}}>800 °C degree-days (base 10 °C)</strong>, varying by roughly 180. This is not an emergence threshold or a validated north-Michigan forecast.</p>
              {row?.precip10!=null&&<p style={{marginTop:13}}>Last 10 days precipitation: <strong>{row.precip10} in</strong>. Rainfall extremes can shift seasonal timing; the site does not translate this into an unsupported forecast date.</p>}
              <div className='firefly-divider'/>
              <div className='firefly-micro'>Data integrity</div>
              <p>{data?.observationMessage||'No verified local sightings are claimed.'}</p>
              {updated&&<p style={{marginTop:9}}>Last checked: {updated} ET. {off?'Off-season baseline only.':'Weather sources: NWS; annual heat records: ACIS when available.'}</p>}
              {row?.weatherError&&season.inSeason&&<p style={{marginTop:9}}>{row.weatherError}</p>}
              {row?.heatError&&season.inSeason&&<p style={{marginTop:9}}>{row.heatError}</p>}
            </div>
          </div>
        </section>
        <NightPanel row={row||{season}} loading={loading&&!off}/>
        <section className='firefly-section'>
          <div className='firefly-section-head'><div><div className='firefly-eyebrow'>Year after year</div><h2>Michigan’s firefly season, south to north</h2></div><p>These are broad calendar guides. Exact first flights and strongest displays change with species, location, spring temperature and rainfall.</p></div>
          <div className='firefly-season-steps'>
            {[['Late May','Watch the south','Southern Lower Michigan may begin to see early flashes.'],['June','Display season opens','Favorable conditions spread through much of Lower Michigan.'],['Late June–July','Prime summer evenings','Common observation period across much of Michigan.'],['August','Northern and late displays','Some species and northern areas continue later; timing varies.']].map(([when,label,copy])=><div className='firefly-step' key={when}><b>{when}</b><span style={{color:'#d6ead1',fontWeight:700}}>{label}</span><span>{copy}</span></div>)}
          </div>
          <p className='firefly-context'>The timing line is climatological guidance, not an observed 2026 emergence wave or a claim that Michigan species behave identically. The Firefly Atlas notes that many flashing species are active for only two to four weeks.</p>
        </section>
        <section className='firefly-section' id='field-guide'>
          <div className='firefly-section-head'><div><div className='firefly-eyebrow'>Find the light</div><h2>Your best firefly-watching evening</h2></div><p>Simple, low-impact field tactics matter at least as much as the forecast.</p></div>
          <div className='firefly-how'>
            <article><div className='no'>01 / THE PLACE</div><h3>Dark field edges</h3><p>Look for an undisturbed meadow edge, shaded yard or wetland margin with vegetation. Minimize porch and landscape lighting; avoid crushing vegetation or entering restricted habitat.</p></article>
            <article><div className='no'>02 / THE TIME</div><h3>Sunset to darkness</h3><p>Arrive just before sunset and allow time for your eyes to adjust. Flashing schedules vary by species; some begin before sunset, others after full darkness. Explore safely with a companion.</p></article>
            <article><div className='no'>03 / THE WEATHER</div><h3>Warm, calm, not pouring</h3><p>Check the 7-night forecast, avoid thunderstorms, and expect cooler windy evenings to be less productive. A recent wet spell may support habitat, but showers during your visit can obstruct viewing.</p></article>
          </div>
          <p className='firefly-context'>Want to contribute observations? Use the <a href='https://www.fireflyatlas.org/get-involved/how-to-participate' target='_blank' rel='noopener noreferrer'>Firefly Atlas survey process</a> or <a href='https://www.inaturalist.org/' target='_blank' rel='noopener noreferrer'>iNaturalist</a>. Community sightings are valuable but need species and observation checks before being represented as confirmed flashing activity.</p>
        </section>
        <section className='firefly-section'>
          <div className='firefly-section-head'><div><div className='firefly-eyebrow'>Common questions</div><h2>Fireflies in Michigan: the essentials</h2></div></div>
          <div className='firefly-faq'>{QUESTIONS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>
        <section className='firefly-section' style={{borderBottom:0,paddingBottom:15}}>
          <div className='firefly-eyebrow'>How this works</div><h2 style={{marginTop:10}}>Sources, limitations and methodology</h2>
          <p className='firefly-context' style={{maxWidth:850}}>Season timing is a regional editorial climatology, not direct measured emergence. In May–August, the site requests NWS hourly forecasts for nine representative Michigan locations and, where available, daily air temperatures and precipitation from ACIS stations. A clearly labeled site-defined weather-fit score describes likely comfort and conditions for viewing; it is <strong>not</strong> calibrated to firefly abundance or sightings. Heat accumulation uses observed daily temperature means above a 10 °C base; the published 800 °C-day value is for adult flight peaks of Photinus at southern Michigan research sites. Missing inputs remain missing, and no sightings or precise emergence dates are fabricated.</p>
          <ul className='firefly-sources'>{REFERENCES.map(([label,url])=><li key={url}><a href={url} target='_blank' rel='noopener noreferrer'>{label}</a></li>)}</ul>
        </section>
      </div>
    </main>
    <footer className='firefly-shell firefly-foot'>Built by <a href='https://chrisizworski.com/chris-izworski/'>Chris Izworski</a> · <a href='/'>Michigan Phenology</a> · <a href='/bloom-tracker'>Michigan Bloom Tracker</a>. Interpretive nature forecast; not an official NOAA product.</footer>
  </div>;
}
