import {useEffect,useMemo,useState} from 'react';
import {Area,CartesianGrid,ComposedChart,Line,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

const views=[['thermal','Temperature & moisture'],['weather','Wind & cloud cover']];
const labelHour=(time,tz)=>new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:true}).format(new Date(time)).replace(' ','').toLowerCase();
const tickHour=(time,tz)=>new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',hour12:true}).format(new Date(time)).replace(' ','').toLowerCase();
const timeText=(time,tz)=>new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(time));
const fmt=(n,unit='')=>Number.isFinite(n)?(Math.round(n*10)/10)+unit:'—';
export default function FrostNightJourney({night,site,morning}){
  const [view,setView]=useState('thermal');
  const [window,setWindow]=useState('full');
  const [picked,setPicked]=useState('');
  useEffect(()=>{setPicked('');setWindow('full');},[site?.id,morning?.date]);
  const timezone=site?.tz||'America/Detroit';
  const rows=useMemo(()=>((night?.series||[]).filter(h=>window==='full'||h.phase==='morning')).map(h=>({
    ...h,short:tickHour(h.time,timezone),tempF:Number.isFinite(h.tempF)?h.tempF:null,
    dewF:Number.isFinite(h.dewF)?h.dewF:null,skyPct:Number.isFinite(h.skyPct)?h.skyPct:null,
    windMph:Number.isFinite(h.windMph)?h.windMph:null,
    visible:h.score!==null&&Number.isFinite(h.score)
  })),[night,window,timezone]);
  const selection=rows.find(h=>h.time===picked)||rows.find(h=>h.visible)||rows[0];
  const chartSelect=evt=>{const datum=evt?.activePayload?.[0]?.payload;if(datum?.time)setPicked(datum.time);};
  const status=night?.status==='ready';
  return <section className='fnj' id='overnight-journey' aria-label='Overnight frost-weather cooling timeline'>
    <div className='fnj-title'>
      <div><span className='fm-kicker'>From evening to sunrise</span>
        <h2>How the night sets the stage</h2>
        <p>A frosty sunrise often begins hours earlier. Trace the forecast from evening to dawn and watch for clearing skies, calming wind and cooling air. These are forecasts—not a record of what actually happened.</p>
      </div>
      <div className='fnj-coverage' aria-label='Forecast coverage'><strong>{night?.coveragePct!=null?night.coveragePct+'%':'—'}</strong>
        <small>{night?.validHours??0} / {night?.expectedHours??16} hours with enough NWS weather detail</small></div>
    </div>
    <div className={'fnj-verdict '+(status?'is-ready':'is-missing')}>
      <div><span className='fm-kicker'>What the night may be telling us</span><h3>{night?.headline||'No overnight forecast'}</h3>
      <p>{night?.explanation||'Forecast data is unavailable for this morning.'}</p></div>
      <div className='fnj-stat-row'>
        <div><small>Evening → near-dawn air</small><strong>{status?fmt(night.eveningTempF,'°')+' → '+fmt(night.predawnTempF,'°'):'—'}</strong></div>
        <div><small>Forecast cooling since evening</small><strong>{status?(night.deltaF>=0?'−':'+')+fmt(Math.abs(night.deltaF),'°F'):'—'}</strong></div>
        <div><small>Wind / clouds near dawn</small><strong>{status?fmt(night.coreWindMph,' mph')+' / '+fmt(night.coreSkyPct,'%'):'—'}</strong></div>
      </div>
    </div>
    <div className='fnj-body'>
      <div className='fnj-graph'>
        <div className='fnj-controls'>
          <div role='group' aria-label='Choose overnight weather measurements'>
            {views.map(([key,label])=><button key={key} type='button' aria-pressed={view===key}
              onClick={()=>setView(key)}>{label}</button>)}
          </div>
          <div role='group' aria-label='Focus chart time'>
            <button type='button' aria-pressed={window==='full'} onClick={()=>setWindow('full')}>Entire night</button>
            <button type='button' aria-pressed={window==='dawn'} onClick={()=>setWindow('dawn')}>Midnight to dawn</button>
          </div>
        </div>
        {rows.length?<div className='fnj-chart' role='group' aria-label='Interactive hourly weather timeline'>
          <ResponsiveContainer width='100%' height={295}>
            <ComposedChart data={rows} onClick={chartSelect} onMouseMove={chartSelect}
              margin={{top:14,bottom:6,left:0,right:view==='thermal'?17:4}}>
              <CartesianGrid strokeDasharray='3 5' stroke='#d8e5e9' vertical={false}/>
              <XAxis dataKey='short' interval='preserveStartEnd' minTickGap={20} tick={{fontSize:10,fill:'#617f89'}} tickLine={false} axisLine={false}/>
              {view==='thermal'?<>
                <YAxis width={45} tickFormatter={n=>n+'°'} tick={{fontSize:10}} tickLine={false} axisLine={false} domain={['dataMin - 4','dataMax + 4']}/>
                <ReferenceLine y={32} stroke='#ad6e59' strokeDasharray='4 4' label={{value:'32°F',position:'insideTopRight',fontSize:11,fill:'#965c49'}}/>
                <Line dataKey='tempF' name='Air temperature' type='monotone' stroke='#b66f49' strokeWidth={3} connectNulls={false} dot={{r:2}} isAnimationActive={false}/>
                <Line dataKey='dewF' name='Dew point' type='monotone' stroke='#2c8294' strokeWidth={2.5} connectNulls={false} dot={{r:2}} isAnimationActive={false}/>
              </>:<>
                <YAxis yAxisId='wind' width={45} tick={{fontSize:10}} tickFormatter={n=>n+'mph'} tickLine={false} axisLine={false} domain={[0,'auto']}/>
                <YAxis yAxisId='cloud' width={32} orientation='right' tick={{fontSize:10}} tickFormatter={n=>n+'%'} tickLine={false} axisLine={false} domain={[0,100]}/>
                <Area yAxisId='cloud' dataKey='skyPct' type='monotone' name='Sky cover' stroke='#849bb0' fill='#e2e9f1' strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
                <Line yAxisId='wind' dataKey='windMph' type='monotone' name='Wind speed' stroke='#348673' strokeWidth={3} connectNulls={false} dot={{r:2}} isAnimationActive={false}/>
              </>}
              <Tooltip labelFormatter={(_,payload)=>payload?.[0]?.payload?.time?timeText(payload[0].payload.time,timezone):''}
                formatter={(value,name)=>[fmt(value,name==='Sky cover'?'%':name==='Wind speed'?' mph':'°F'),name]}
                contentStyle={{borderRadius:10,borderColor:'#bfd0d3',fontSize:12}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>:<p className='fnj-no-data'>We do not have enough forecast hours to show how this night develops.</p>}
        <div className='fnj-hour-grid' role='group' aria-label='Select an hour for forecast details'>
          {rows.map(h=><button key={h.time} type='button' aria-pressed={selection?.time===h.time}
            onClick={()=>setPicked(h.time)} title={timeText(h.time,timezone)}>
            <span>{labelHour(h.time,timezone)}</span><strong>{h.visible?fmt(h.tempF,'°'):'—'}</strong></button>)}
        </div>
        <p className='fnj-note'>Trace the line as a forecast, not a weather diary. Blank spaces mean missing or elapsed hours. The chart does not measure grass, predict exactly when ice forms or explain the physical cause of cooling.</p>
      </div>
      <aside className='fnj-details' aria-live='polite'>
        <span className='fm-kicker'>Pick an hour and read the clues</span><h3>{selection?timeText(selection.time,timezone):'Select an hour'}</h3>
        {selection?.visible?<div className='fnj-data'>
          <div><small>Air temperature</small><strong>{fmt(selection.tempF,'°F')}</strong></div>
          <div><small>Dew point</small><strong>{fmt(selection.dewF,'°F')}</strong></div>
          <div><small>Wind speed</small><strong>{fmt(selection.windMph,' mph')}</strong></div>
          <div><small>Sky coverage</small><strong>{fmt(selection.skyPct,'%')}</strong></div>
        </div>:<p>This hour has no complete forecast. We leave it blank rather than invent what happened.</p>}
        {night?.notes?.length>0&&<><h4>Clues to notice before sunrise</h4><ul>{night.notes.map((note,i)=><li key={i}>{note}</li>)}</ul></>}
        {night?.regime==='late-improvement'&&<p className='fnj-note'>If clouds part late, an otherwise ordinary-looking night may become interesting near dawn. Whether ice develops remains a local question.</p>}
        <a href='https://www.weather.gov/arx/why_frost' rel='noopener noreferrer' target='_blank'>NWS: Why frost forms ↗</a>
      </aside>
    </div>
  </section>;
}
