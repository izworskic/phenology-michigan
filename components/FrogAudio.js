import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import MEDIA from '../data/frog-media.json';

// One audio element for the whole page. Every Play control (forecast, soundboard,
// comparisons) goes through this controller, so only one frog can ever play.
// Nothing plays until a person presses Play: play() is called inside the click
// handler, which is what iOS Safari and Android Chrome require.
const Ctx=createContext(null);
const IDLE={id:null,status:'idle',progress:0,error:null};

export function frogMedia(id){return MEDIA.species[id]||null;}

export function FrogAudioProvider({children}){
  const el=useRef(null),current=useRef(IDLE);
  const [state,setRaw]=useState(IDLE);
  const set=useCallback(next=>{current.current=typeof next==='function'?next(current.current):next;setRaw(current.current);},[]);
  useEffect(()=>{
    const a=el.current;if(!a)return;
    const on={
      playing:()=>set(s=>({...s,status:'playing',error:null})),
      waiting:()=>set(s=>s.status==='playing'?{...s,status:'loading'}:s),
      pause:()=>set(s=>s.status==='ended'||s.status==='error'?s:{...s,status:'paused'}),
      ended:()=>set(s=>({...s,status:'ended',progress:1})),
      timeupdate:()=>set(s=>({...s,progress:a.duration?Math.min(1,a.currentTime/a.duration):0})),
      error:()=>{if(current.current.id)set(s=>({...s,status:'error',error:'This recording could not load. Check your connection and try again.'}));}
    };
    for(const [k,f] of Object.entries(on))a.addEventListener(k,f);
    return()=>{for(const [k,f] of Object.entries(on))a.removeEventListener(k,f);};
  },[set]);
  const start=useCallback((id,fromStart)=>{
    const a=el.current,media=frogMedia(id);
    if(!a)return;
    if(!media?.audio?.src){set({id,status:'error',progress:0,error:'No verified recording is available for this species.'});return;}
    const same=current.current.id===id&&a.getAttribute('src')===media.audio.src;
    if(!same){a.pause();a.setAttribute('src',media.audio.src);a.load();}
    else if(fromStart){a.currentTime=0;}
    set({id,status:'loading',progress:same&&!fromStart?current.current.progress:0,error:null});
    const p=a.play();
    if(p&&p.catch)p.catch(err=>{
      if(err&&err.name==='AbortError')return; // superseded by another Play press
      set({id,status:'error',progress:0,error:err&&err.name==='NotAllowedError'
        ?'Your browser blocked playback. Tap Play again; on iPhone, check that the ring/silent switch is not muting sound.'
        :'This recording could not play in this browser.'});
    });
  },[set]);
  const toggle=useCallback(id=>{
    const s=current.current,a=el.current;
    if(s.id===id&&(s.status==='playing'||s.status==='loading')){a&&a.pause();return;}
    start(id,s.id===id&&s.status==='ended');
  },[start]);
  const replay=useCallback(id=>start(id,true),[start]);
  const stop=useCallback(()=>{const a=el.current;if(a){a.pause();}set(IDLE);},[set]);
  return <Ctx.Provider value={{state,toggle,replay,stop}}>
    {children}
    <audio ref={el} preload="none" playsInline className="frog-audio-engine" aria-hidden="true"/>
  </Ctx.Provider>;
}

export function useFrogAudio(){
  const v=useContext(Ctx);
  if(!v)throw new Error('useFrogAudio must be used inside FrogAudioProvider');
  return v;
}

function Bars(){return <span className="frog-eq" aria-hidden="true"><i/><i/><i/><i/></span>;}
function Icon({status}){
  if(status==='playing')return <span className="frog-play-icon pause" aria-hidden="true"/>;
  if(status==='loading')return <span className="frog-play-icon spin" aria-hidden="true"/>;
  if(status==='ended')return <span className="frog-play-icon replay" aria-hidden="true">↻</span>;
  return <span className="frog-play-icon play" aria-hidden="true"/>;
}

/* The Play/Pause control. size: 'lg' on species cards, 'sm' in compact lists. */
export function FrogPlayButton({id,name,size='lg',label}){
  const {state,toggle,replay}=useFrogAudio();
  const media=frogMedia(id);
  const mine=state.id===id,status=mine?state.status:'idle';
  if(!media?.audio?.src)return <p className="frog-play-missing">No verified recording to play.</p>;
  const text=status==='playing'?'Pause':status==='loading'?'Loading…':status==='ended'?'Play again':status==='paused'?'Resume':(label||'Play frog call');
  const secs=Math.round(media.audio.durationSec);
  return <div className={'frog-player '+size+(mine?' active':'')+(status==='error'?' has-error':'')}>
    <button type="button" className={'frog-play '+status} onClick={()=>toggle(id)} aria-pressed={status==='playing'}
      aria-label={(status==='playing'?'Pause ':'Play ')+name+' call'}>
      <Icon status={status}/><span className="frog-play-text">{text}</span>
      {status==='playing'?<Bars/>:size==='lg'&&status==='idle'?<span className="frog-play-len">{secs}s</span>:null}
    </button>
    {mine&&(status==='playing'||status==='paused')&&<button type="button" className="frog-replay" onClick={()=>replay(id)} aria-label={'Replay '+name+' call from the start'}>↻ Replay</button>}
    {mine&&status!=='idle'&&status!=='error'&&<span className="frog-progress" aria-hidden="true"><span style={{width:Math.round(state.progress*100)+'%'}}/></span>}
    {mine&&status==='error'&&<p className="frog-play-error" role="alert">{state.error} <a href={media.audio.src} target="_blank" rel="noopener noreferrer">Open the recording</a></p>}
  </div>;
}

export function MediaCredit({id,kind}){
  const m=frogMedia(id);if(!m)return null;
  const p=m.photo,a=m.audio;
  const short=x=>x.license==='public-domain'?'USGS, public domain':x.credit;
  if(kind==='photo')return p?<a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">Photo: {short(p)}</a>:null;
  return a?<a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">Call: {short(a)}</a>:null;
}
