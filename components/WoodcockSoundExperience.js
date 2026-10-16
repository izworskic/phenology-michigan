import {useCallback,useEffect,useRef,useState} from 'react';
import MEDIA from '../data/woodcock-media.json';

// "Hear the Woodcock Sky Dance": three annotated stages plus one complete recorded
// performance. One <audio preload="none"> element serves every control, so only one
// recording can play. Nothing plays until a Play button is pressed. The flight
// diagram follows the playing recording's annotated timestamps (data/woodcock-media.json);
// with prefers-reduced-motion it stays still and only highlights the active stage.
export const STAGES=[
  {id:'peent',n:1,word:'Peent',title:'On the ground',source:'voice',sourceLabel:'Vocal call',
   text:'From a small opening the male gives a short, buzzy, nasal peent every few seconds, often turning between calls.',
   listen:'One flat, nasal note, then a pause of a few seconds.'},
  {id:'twitter',n:2,word:'Twitter',title:'Spiraling into the sky',source:'wings',sourceLabel:'Made by wing feathers, not the voice',
   text:'He launches and climbs in widening circles, often a few hundred feet up. Air rushing through three narrow outer wing feathers makes the twitter. It is not his voice.',
   listen:'A fast, even, mechanical twitter that builds as he climbs.'},
  {id:'chirp',n:3,word:'Chirp',title:'Descending home',source:'voice',sourceLabel:'Vocal chirps, with some wing twitter',
   text:'At the top he zigzags back down with liquid, chirping notes, lands near where he started, and soon begins peenting again.',
   listen:'Sweet, irregular chirps falling toward the ground.'}
];
const A=MEDIA.audio;
const FULL=A.full;
const ASCENT='M118 284 C150 272 196 262 200 236 C205 205 150 204 152 178 C154 146 236 148 248 124 C262 96 196 92 204 70 C214 44 296 38 330 52';
const DESCENT='M330 52 C352 62 352 80 372 92 L350 112 L392 132 L364 154 L406 176 L372 198 C340 224 296 252 236 270 C214 277 196 282 186 284';

function usePrefersReducedMotion(){
  const [reduce,setReduce]=useState(false);
  useEffect(()=>{
    if(typeof window==='undefined'||!window.matchMedia)return;
    const q=window.matchMedia('(prefers-reduced-motion: reduce)');
    const on=()=>setReduce(q.matches);on();
    q.addEventListener?q.addEventListener('change',on):q.addListener(on);
    return()=>{q.removeEventListener?q.removeEventListener('change',on):q.removeListener(on);};
  },[]);
  return reduce;
}
// Where the playing recording is in the display, from its annotations.
export function phaseAt(key,t){
  if(key==='peent')return {stage:'peent',p:0};
  if(key==='twitter')return {stage:'twitter',p:Math.min(1,t/(A.twitter.durationSec||1))};
  if(key==='chirp')return {stage:'chirp',p:Math.min(1,t/(A.chirp.durationSec||1))};
  if(key==='full'){
    const seg=FULL.segments.find(s=>t>=s.start&&t<s.end)||FULL.segments[FULL.segments.length-1];
    const p=Math.max(0,Math.min(1,(t-seg.start)/(seg.end-seg.start)));
    if(seg.stage==='gap')return {stage:'gap',p:1};
    return {stage:seg.stage,p};
  }
  return {stage:null,p:0};
}
function recentPeent(key,t){
  const list=key==='peent'?A.peent.peentOnsets:key==='full'?FULL.peentOnsets:[];
  let last=null;for(const x of list){if(x<=t)last=x;}
  return last!=null&&t-last<0.9?last:null;
}

function FlightDiagram({phase,peentAt,playing,reduce}){
  const asc=useRef(null),desc=useRef(null);
  const [lens,setLens]=useState({a:0,d:0});
  useEffect(()=>{if(asc.current&&desc.current)setLens({a:asc.current.getTotalLength(),d:desc.current.getTotalLength()});},[]);
  let bird={x:146,y:279,angle:-6};
  if(!reduce&&lens.a){
    const st=phase.stage;
    if(st==='twitter'||st==='gap'){const L=asc.current,l=lens.a*(st==='gap'?1:phase.p),pt=L.getPointAtLength(l),nx=L.getPointAtLength(Math.min(lens.a,l+2));bird={x:pt.x,y:pt.y,angle:Math.atan2(nx.y-pt.y,nx.x-pt.x)*180/Math.PI};}
    else if(st==='chirp'){const L=desc.current,l=lens.d*phase.p,pt=L.getPointAtLength(l),nx=L.getPointAtLength(Math.min(lens.d,l+2));bird={x:pt.x,y:pt.y,angle:Math.atan2(nx.y-pt.y,nx.x-pt.x)*180/Math.PI};}
  }
  const st=phase.stage;
  const ascP=st==='twitter'?phase.p:st==='gap'||st==='chirp'?1:0;
  const descP=st==='chirp'?phase.p:0;
  const showProgress=playing&&!reduce;
  return <svg className="wsx-diagram" viewBox="0 0 640 340" role="img" aria-label="Flight diagram: the woodcock peents on the ground, spirals upward with twittering wings, then zigzags down with chirps to land near where it began.">
    <defs>
      <linearGradient id="wsx-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111a31"/><stop offset=".45" stopColor="#2c3356"/><stop offset=".78" stopColor="#704a62"/><stop offset="1" stopColor="#cf8a5f"/></linearGradient>
      <radialGradient id="wsx-glow" cx=".82" cy=".95" r=".55"><stop offset="0" stopColor="#ffc98f" stopOpacity=".5"/><stop offset="1" stopColor="#ffc98f" stopOpacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="340" fill="url(#wsx-sky)"/>
    <rect width="640" height="340" fill="url(#wsx-glow)"/>
    <g fill="#fff6e3" opacity=".7">{[[60,40,1.2],[150,22,.9],[440,30,1.1],[520,70,.8],[590,24,1.3],[270,18,.8],[400,96,.7]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r}/>)}</g>
    <path d="M0 270 C40 250 60 262 80 240 C96 222 110 248 132 236 C150 226 162 250 186 252 L186 340 H0Z" fill="#0f1d23" opacity=".9"/>
    <path d="M470 258 C500 232 520 250 540 226 C560 204 584 236 606 220 C622 210 632 226 640 222 V340 H470Z" fill="#0f1d23" opacity=".9"/>
    <path d="M0 292 C120 276 220 300 340 288 C440 278 540 296 640 286 V340 H0Z" fill="#0b1619"/>
    <g stroke="#7f8a70" strokeWidth="1.4" opacity=".55">{[40,74,236,262,300,420,452,560].map((x,i)=><path key={i} d={`M${x} 300 l${(i%2?3:-3)} -16 M${x+6} 302 l${(i%2?-2:4)} -12`}/>)}</g>
    <path ref={asc} d={ASCENT} fill="none" stroke="#f3e2c2" strokeOpacity=".38" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round"/>
    <path ref={desc} d={DESCENT} fill="none" stroke="#f3e2c2" strokeOpacity=".38" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round"/>
    {lens.a>0&&<path d={ASCENT} fill="none" stroke="#f2b36f" strokeWidth="2.6" strokeLinecap="round" strokeDasharray={`${lens.a*(showProgress?ascP:st==='twitter'?1:0)} ${lens.a}`} className={'wsx-progress'+(st==='twitter'?' on':'')}/>}
    {lens.d>0&&<path d={DESCENT} fill="none" stroke="#f2b36f" strokeWidth="2.6" strokeLinecap="round" strokeDasharray={`${lens.d*(showProgress?descP:st==='chirp'?1:0)} ${lens.d}`} className={'wsx-progress'+(st==='chirp'?' on':'')}/>}
    {[[118,284,1,'peent'],[160,190,2,'twitter'],[398,150,3,'chirp']].map(([x,y,n,id])=><g key={id} className={'wsx-marker'+(st===id?' on':'')}><circle cx={x} cy={y} r="13"/><text x={x} y={y+4.5} textAnchor="middle">{n}</text></g>)}
    {st==='gap'&&<g className="wsx-gap-note"><rect x="236" y="22" width="190" height="24" rx="12"/><text x="331" y="38" textAnchor="middle">About 40 s cut by the recordist</text></g>}
    {peentAt!=null&&<circle key={peentAt} className={'wsx-peent-ring'+(reduce?' still':'')} cx="146" cy="276" r="10"/>}
    <g transform={`translate(${bird.x} ${bird.y}) rotate(${bird.angle}) scale(1.35)`} className={'wsx-bird'+(st==='twitter'||st==='chirp'||st==='gap'?' flying':'')}>
      <path d="M-11 0 C-6 -6 4 -6 8 -2 L19 0 L8 1.5 C4 5 -6 5 -11 0Z" fill="#1a2024" stroke="#f6dcb9" strokeOpacity=".75" strokeWidth=".8"/>
      <path d="M-3 -2 C-6 -12 -1 -16 4 -10 Z" fill="#1a2024" stroke="#f6dcb9" strokeOpacity=".75" strokeWidth=".8" className="wsx-wing"/>
    </g>
  </svg>;
}

function Bars(){return <span className="wsx-eq" aria-hidden="true"><i/><i/><i/><i/></span>;}
function fmt(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

function Control({k,label,big,state,toggle,replay}){
  const mine=state.key===k,st=mine?state.status:'idle',a=A[k];
  const text=st==='playing'?'Pause':st==='loading'?'Loading…':st==='ended'?'Play again':st==='paused'?'Resume':label;
  return <div className={'wsx-player'+(big?' big':'')+(mine?' active':'')}>
    <button type="button" className={'wsx-play '+st} onClick={()=>toggle(k)} aria-pressed={st==='playing'} aria-label={(st==='playing'?'Pause ':'Play ')+(k==='full'?'the full sky dance recording':'the '+k+' recording')}>
      <span className={'wsx-icon '+(st==='playing'?'pause':st==='loading'?'spin':st==='ended'?'again':'play')} aria-hidden="true">{st==='ended'?'↻':''}</span>
      <span>{text}</span>{st==='playing'?<Bars/>:<span className="wsx-len">{fmt(a.durationSec)}</span>}
    </button>
    {mine&&(st==='playing'||st==='paused')&&<button type="button" className="wsx-replay" onClick={()=>replay(k)} aria-label={'Replay '+(k==='full'?'the full recording':'the '+k+' recording')+' from the start'}>↻ Replay</button>}
    {mine&&st!=='idle'&&st!=='error'&&<span className="wsx-bar" aria-hidden="true"><span style={{width:Math.min(100,state.t/a.durationSec*100)+'%'}}/></span>}
    {mine&&st==='error'&&<p className="wsx-error" role="alert">{state.error} <a href={a.src} target="_blank" rel="noopener noreferrer">Open the recording</a></p>}
  </div>;
}

export default function WoodcockSoundExperience(){
  const el=useRef(null),raf=useRef(0),cur=useRef({key:null,status:'idle',t:0,error:null});
  const [state,setRaw]=useState(cur.current);
  const reduce=usePrefersReducedMotion();
  const set=useCallback(n=>{cur.current=typeof n==='function'?n(cur.current):n;setRaw(cur.current);},[]);
  useEffect(()=>{
    const a=el.current;if(!a)return;
    const tick=()=>{set(s=>({...s,t:a.currentTime}));raf.current=requestAnimationFrame(tick);};
    const on={
      playing:()=>{set(s=>({...s,status:'playing',error:null}));cancelAnimationFrame(raf.current);raf.current=requestAnimationFrame(tick);},
      waiting:()=>set(s=>s.status==='playing'?{...s,status:'loading'}:s),
      pause:()=>{cancelAnimationFrame(raf.current);set(s=>s.status==='ended'||s.status==='error'?s:{...s,status:'paused',t:a.currentTime});},
      ended:()=>{cancelAnimationFrame(raf.current);set(s=>({...s,status:'ended',t:a.duration||s.t}));},
      error:()=>{cancelAnimationFrame(raf.current);if(cur.current.key)set(s=>({...s,status:'error',error:'This recording could not load. Check your connection and try again.'}));}
    };
    for(const [k,f] of Object.entries(on))a.addEventListener(k,f);
    return()=>{cancelAnimationFrame(raf.current);for(const [k,f] of Object.entries(on))a.removeEventListener(k,f);};
  },[set]);
  const start=useCallback((key,fromStart)=>{
    const a=el.current,src=A[key]?.src;if(!a)return;
    if(!src){set({key,status:'error',t:0,error:'No verified recording is available for this stage.'});return;}
    const same=cur.current.key===key&&a.getAttribute('src')===src;
    if(!same){a.pause();a.setAttribute('src',src);a.load();}else if(fromStart){a.currentTime=0;}
    set({key,status:'loading',t:same&&!fromStart?cur.current.t:0,error:null});
    const p=a.play();
    if(p&&p.catch)p.catch(err=>{
      if(err&&err.name==='AbortError')return;
      set({key,status:'error',t:0,error:err&&err.name==='NotAllowedError'
        ?'Playback was blocked. Tap Play again; on iPhone, make sure the silent switch is off.'
        :'This recording could not play in this browser.'});
    });
  },[set]);
  const toggle=useCallback(key=>{
    const s=cur.current,a=el.current;
    if(s.key===key&&(s.status==='playing'||s.status==='loading')){a&&a.pause();return;}
    start(key,s.key===key&&s.status==='ended');
  },[start]);
  const replay=useCallback(key=>start(key,true),[start]);
  const playing=state.status==='playing'||state.status==='loading';
  const phase=state.key&&state.status!=='idle'&&state.status!=='error'?phaseAt(state.key,state.t):{stage:null,p:0};
  const peentAt=playing?recentPeent(state.key,state.t):null;
  const activeStage=phase.stage==='gap'?'twitter':phase.stage;

  const g=MEDIA.photos.ground,f=MEDIA.photos.flight;
  return <section className="woodcock-container woodcock-section wsx" id="listen" aria-labelledby="wsx-title">
    <div className="woodcock-section-head"><div><span className="woodcock-eyebrow">HEAR IT BEFORE YOU SEE IT</span><h2 id="wsx-title">Hear the woodcock sky dance</h2></div>
      <p>Three sounds, one flight. Press play on each stage, or hear one real display from start to finish. Nothing plays until you press a button.</p></div>

    <figure className="wsx-portrait">
      <img src={g.src} srcSet={g.srcSmall+' '+g.srcSmallSize[0]+'w, '+g.src+' '+g.srcSize[0]+'w'} sizes="(max-width: 760px) 100vw, 560px" width={g.srcSize[0]} height={g.srcSize[1]} alt={g.alt} loading="lazy" decoding="async"/>
      <figcaption>
        <strong>Meet the timberdoodle</strong>
        <ul>
          <li><b>Very long, straight bill</b> for probing soft soil for earthworms.</li>
          <li><b>Eyes set high and far back</b> on the head, watching for danger while it feeds.</li>
          <li><b>Leaf-litter camouflage:</b> barred brown, gray and black; nearly invisible on the ground.</li>
          <li><b>Plump, short-legged and short-necked</b>, about the size of a robin but much chunkier.</li>
        </ul>
        <small><a href={g.sourceUrl} target="_blank" rel="noopener noreferrer">Photo: {g.credit}</a></small>
      </figcaption>
    </figure>

    <div className="wsx-stage">
      <div className="wsx-diagram-wrap">
        <FlightDiagram phase={phase} peentAt={peentAt} playing={playing} reduce={reduce}/>
        <div className="wsx-full">
          <div className="wsx-full-head"><strong>Experience the full sky dance</strong><span>One real display, recorded in March in North Carolina</span></div>
          <Control k="full" label="Play the full sky dance" big state={state} toggle={toggle} replay={replay}/>
          <div className="wsx-timeline" aria-hidden="true">{FULL.segments.map(s=><span key={s.stage+s.start} className={'wsx-seg '+s.stage+(state.key==='full'&&(phase.stage===s.stage)?' on':'')} style={{flexGrow:s.end-s.start}}/>)}
            {state.key==='full'&&state.status!=='idle'&&<i className="wsx-playhead" style={{left:Math.min(100,state.t/FULL.durationSec*100)+'%'}}/>}</div>
          <ol className="wsx-legend">{FULL.segments.map(s=><li key={s.stage+s.start} className={s.stage}><span>{fmt(s.start)}</span>{s.label}</li>)}</ol>
          <p className="wsx-note">The recordist removed about 40 seconds of silence while the bird was out of microphone range, so the gap at 0:27 is an edit, not a pause in the flight. The three stage clips are excerpts: peent from a second bird, twitter and chirps from this performance.</p>
        </div>
      </div>
      <ol className="wsx-cards">{STAGES.map(s=><li key={s.id} className={'wsx-card '+s.id+(activeStage===s.id?' on':'')} id={'wsx-'+s.id}>
        <div className="wsx-card-top"><span className="wsx-num">{s.n}</span><div><h3><span className="wsx-word">{s.word}</span> <span className="wsx-title">{s.title}</span></h3>
          <span className={'wsx-source '+s.source}>{s.sourceLabel}</span></div></div>
        <p>{s.text}</p>
        <p className="wsx-listen"><b>Listen for:</b> {s.listen}</p>
        <Control k={s.id} label={'Play '+s.word.toLowerCase()} state={state} toggle={toggle} replay={replay}/>
        <small className="wsx-credit"><a href={A[s.id].sourceUrl} target="_blank" rel="noopener noreferrer">Recording: {A[s.id].credit}</a></small>
      </li>)}</ol>
    </div>

    <div className="wsx-field" id="what-am-i-hearing">
      <h3>What am I hearing in the woods?</h3>
      <div className="wsx-field-grid">
        <div className="wsx-field-sounds">
          <p><b>A nasal “peent” from the ground.</b> Flat and buzzy, one note every few seconds from the same spot. That spot is the display ground.</p>
          <p><b>A rapid, mechanical twitter overhead.</b> Steady and even, rising and fading in waves as he circles. That is his wings, so you may hear it without any call.</p>
          <p><b>Liquid chirps coming down.</b> Irregular, sweet notes falling from the sky, then silence, then peents again from roughly the same place.</p>
          <p className="wsx-caution">Sounds alone are not proof. Common nighthawks also give a nasal “peent,” but from the air and mostly from mid-May; frogs, insects and distant birds can mislead too. The full sequence, ground peents then twitter climbing then chirps falling, repeating every few minutes, is the reliable sign.</p>
        </div>
        <div className="wsx-field-watch">
          <figure className="wsx-silhouette"><img src={f.srcSmall} width={f.srcSmallSize[0]} height={f.srcSmallSize[1]} alt={f.alt} loading="lazy" decoding="async"/>
            <figcaption>What you will actually see: a chunky, long-billed silhouette with rapid wingbeats. <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">Photo: {f.credit}</a></figcaption></figure>
          <p><b>Watch the brightest sky.</b> Face west or toward the afterglow and look up when the twitter starts; he is easiest to see as a small dark shape against it.</p>
          <p><b>Hear him but can’t see him?</b> Stay still. When the twitter stops, listen for chirps and watch the sky above the peent spot; he usually drops back within yards of where he took off. Do not walk toward the peents, shine lights on the bird or play recordings to him in the field.</p>
        </div>
      </div>
      <a className="woodcock-audio-link" href="https://www.allaboutbirds.org/guide/American_Woodcock/sounds" target="_blank" rel="noopener noreferrer">More woodcock recordings and sound guide from Cornell Lab of Ornithology ↗</a>
    </div>
    <audio ref={el} preload="none" playsInline className="wsx-engine" aria-hidden="true"/>
  </section>;
}
