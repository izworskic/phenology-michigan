import {useEffect,useMemo,useState} from 'react';
import {Area,Bar,CartesianGrid,ComposedChart,Line,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {hourlyIngredientNotes,rankedDawnRows} from '../lib/frostOutlook.mjs';

const views=[['thermal','Temperature & dew point'],['atmosphere','Wind & clouds'],['setup','Setup index']];
const number=(n,d=0)=>Number.isFinite(n)?n.toFixed(d):'—';
const hourLabel=h=>(h%12||12)+(h>=12?' pm':' am');
const labels={temperature:'Cold air',moisture:'Available moisture',wind:'Low wind',skies:'Clearer sky'};
const maxima={temperature:29,moisture:30,wind:22,skies:19};
const chartPoint=(h)=>({...h,axisLabel:hourLabel(h.hour),score:Number.isFinite(h.score)?h.score:null,
  tempF:Number.isFinite(h.tempF)?h.tempF:null,dewF:Number.isFinite(h.dewF)?h.dewF:null,
  windMph:Number.isFinite(h.windMph)?h.windMph:null,skyPct:Number.isFinite(h.skyPct)?h.skyPct:null});
const chartFormat=(v,name)=>[number(v,1)+(name==='Air temperature'||name==='Dew point'?'°F':name==='Wind'?' mph':name==='Cloud cover'?'%':' / 100'),name];
const chartProps={fontSize:11};
export default function FrostExplorer({site,morning,locations,date,onChoose,chosen}){
  const [view,setView]=useState('thermal');
  const [pickedTime,setPickedTime]=useState(null);
  useEffect(()=>setPickedTime(null),[site?.id,morning?.date]);
  const data=useMemo(()=>(morning?.hourly||[]).map(chartPoint),[morning]);
  const rows=useMemo(()=>rankedDawnRows(locations,date),[locations,date]);
  const picked=data.find(h=>h.time===pickedTime)||data.find(h=>h.score!==null)||data[0]||null;
  const available=data.filter(h=>h.score!==null).length;
  const selectFromGraph=event=>{
    const row=event?.activePayload?.[0]?.payload;
    if(row?.time)setPickedTime(row.time);
  };
  return <section className='fx-root' id='frost-explorer' aria-label='Interactive Michigan dawn weather explorer'>
    <div className='fx-heading'><div><span className='fm-kicker'>Explore the evidence</span>
      <h2>What changes between one frosty dawn and the next?</h2>
      <p>Choose a location on the map, compare dates above, and inspect each forecast hour below. All views share the same location and morning.</p>
    </div><div className='fx-coverage'><strong>{morning?.dataCoveragePct!=null?morning.dataCoveragePct+'%':'—'}</strong>
      <span>required-hour data coverage</span><small>{available} of 6 dawn hours available · not forecast certainty</small></div></div>
    <div className='fx-chart-layout'>
      <div className='fx-chart-shell'>
        <div className='fx-chart-bar'><div><h3>{site.name} · {date||'upcoming dawn'}</h3>
          <small>Interactive NWS forecast · 4–9 a.m. local time</small></div>
          <div className='fx-chart-switch' aria-label='Chart metric' role='group'>
            {views.map(([key,label])=><button key={key} type='button' aria-pressed={view===key} className={view===key?'active':''} onClick={()=>setView(key)}>{label}</button>)}
          </div>
        </div>
        {available===0?<div className='fx-no-data'>Required forecast fields are missing for this dawn. No chart points are estimated.</div>:
        <div className='fx-chart' role='group' aria-label='Interactive dawn weather charts'>
          <ResponsiveContainer width='100%' height={284}>
            <ComposedChart data={data} margin={{top:15,right:17,left:0,bottom:8}} onMouseMove={selectFromGraph} onClick={selectFromGraph}>
              <CartesianGrid vertical={false} stroke='#dfe7e9' strokeDasharray='3 4'/>
              <XAxis dataKey='axisLabel' tick={chartProps} tickLine={false} axisLine={false}/>
              {view==='thermal'?<>
                <YAxis tick={chartProps} tickLine={false} axisLine={false} width={42} tickFormatter={v=>v+'°'} domain={['dataMin - 4','dataMax + 4']}/>
                <ReferenceLine y={32} stroke='#b56b5f' strokeDasharray='4 4' label={{value:'32°F',position:'insideTopRight',fontSize:11,fill:'#985e53'}}/>
                <Line dataKey='tempF' name='Air temperature' type='monotone' stroke='#a45137' strokeWidth={3} dot={{r:4}} connectNulls={false} isAnimationActive={false}/>
                <Line dataKey='dewF' name='Dew point' type='monotone' stroke='#287989' strokeWidth={3} dot={{r:4}} connectNulls={false} isAnimationActive={false}/>
              </>:view==='atmosphere'?<>
                <YAxis yAxisId='wind' tick={chartProps} tickLine={false} axisLine={false} width={42} tickFormatter={v=>v+' mph'} domain={[0,'auto']}/>
                <YAxis yAxisId='cloud' orientation='right' tick={chartProps} tickLine={false} axisLine={false} width={35} domain={[0,100]} tickFormatter={v=>v+'%'}/>
                <Area yAxisId='cloud' type='monotone' dataKey='skyPct' name='Cloud cover' stroke='#7188a5' fill='#dce6ef' strokeWidth={2} connectNulls={false} isAnimationActive={false}/>
                <Bar yAxisId='wind' dataKey='windMph' name='Wind' fill='#3b8b83' radius={[4,4,0,0]} maxBarSize={24} isAnimationActive={false}/>
              </>:<>
                <YAxis tick={chartProps} tickLine={false} axisLine={false} width={36} domain={[0,100]}/>
                <ReferenceLine y={75} stroke='#739b75' strokeDasharray='4 4'/>
                <ReferenceLine y={55} stroke='#b9a45e' strokeDasharray='4 4'/>
                <Area type='monotone' dataKey='score' name='Setup index' stroke='#397a73' fill='#d9ebe4' strokeWidth={3} dot={{r:4}} connectNulls={false} isAnimationActive={false}/>
              </>}
              <Tooltip formatter={chartFormat} labelFormatter={label=>'Forecast hour: '+label} contentStyle={{borderRadius:12,border:'1px solid #c8d4d5'}}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>}
        <div className='fx-hour-buttons' role='group' aria-label='Inspect an hour'>
          {data.map(h=><button key={h.time} type='button' className={picked?.time===h.time?'active':''}
            onClick={()=>setPickedTime(h.time)} aria-pressed={picked?.time===h.time}>
            <strong>{hourLabel(h.hour)}</strong><span>{h.score==null?'No data':h.score+'/100'}</span></button>)}
        </div>
        <div className='fx-chart-note'>The dashed 32°F line is an air-temperature reference, not a measured grass or branch temperature. Gaps mean missing data.</div>
      </div>
      <aside className='fx-inspector' aria-live='polite'>
        <span className='fm-kicker'>Inspect an hour</span><h3>{picked?hourLabel(picked.hour):'No hourly forecast'} · {site.name}</h3>
        <div className='fx-inspector-score'><strong>{picked?.score??'—'}</strong><span>{picked?.score!=null?'/ 100 weather fit':'Forecast incomplete'}</span></div>
        {picked?.score!=null?<><div className='fx-inspector-metrics'>
          <div><small>Air / dew point</small><strong>{number(picked.tempF)}° / {number(picked.dewF)}°</strong></div>
          <div><small>Humidity gap</small><strong>{number(picked.spreadF,1)}°F</strong></div>
          <div><small>Wind</small><strong>{number(picked.windMph,1)} mph</strong></div>
          <div><small>Clouds</small><strong>{number(picked.skyPct)}%</strong></div></div>
          <h4>What contributes to this index?</h4>
          <div className='fx-factor-list'>{Object.entries(labels).map(([key,label])=>{
            const score=picked.factors?.[key]??0;
            return <div key={key}><div><span>{label}</span><b>{score} / {maxima[key]}</b></div>
              <div className='fx-factor-track'><span style={{width:100*score/maxima[key]+'%'}}/></div></div>;
          })}</div>
          {picked.factors?.precipitationPenalty>0&&<p className='fx-penalty'>Precipitation adjustment: −{picked.factors.precipitationPenalty} points</p>}
          <ul>{hourlyIngredientNotes(picked).map((note,i)=><li key={i}>{note}</li>)}</ul>
        </>:<p>No interpolated numbers are shown when NWS fields are missing.</p>}
      </aside>
    </div>
    <div className='fx-bottom-grid'>
      <article className='fx-explainer'><span className='fm-kicker'>Morning consistency</span><h3>{morning?.sustainedHours??'—'} consecutive favorable hour{morning?.sustainedHours===1?'':'s'}</h3>
        <p>{morning?.explanation||'No complete dawn forecast.'}</p>
        <div className='fx-stats'><span>Minimum air: <b>{number(morning?.tempMinF,1)}°F</b></span><span>Mean wind: <b>{number(morning?.windMeanMph,1)} mph</b></span><span>Mean cloud: <b>{number(morning?.cloudMeanPct)}%</b></span></div>
        <p className='fx-small'>{morning?.moistureMode||'Ice crystal type is unknown.'}. These are forecast ingredients, not confirmation of hoarfrost, rime, or frozen dew.</p>
        {!!morning?.drivers?.length&&<ul>{morning.drivers.map((s,i)=><li key={i}>{s}</li>)}</ul>}
      </article>
      <article className='fx-comparison'><span className='fm-kicker'>Statewide comparison · {date||'select a dawn'}</span><h3>Where are conditions most favorable?</h3>
        <p>Select any row to move the map, charts and sunrise advice to that place.</p>
        {rows.length?<div className='fx-ranks'>{rows.map(row=><button key={row.id} type='button' aria-pressed={row.id===chosen}
          className={row.id===chosen?'active':''} onClick={()=>onChoose(row.id)}>
          <span className='fx-rank-label'>{row.name}<small>{row.sustainedHours} sustained hour{row.sustainedHours===1?'':'s'} · {row.overnightHeadline}</small></span>
          <span className='fx-rank-track'><i style={{width:(row.score??0)+'%'}}/></span>
          <strong>{row.score??'—'}</strong></button>)}</div>:<p>Statewide results unavailable; select a location using the map.</p>}
        <small className='fx-small'>Ranks reflect a date-specific suitability index, not observed frost or the likelihood of seeing it. Missing locations are unranked.</small>
      </article>
    </div>
  </section>;
}
