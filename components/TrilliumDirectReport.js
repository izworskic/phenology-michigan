import {useState} from 'react';
import {STOPS} from '../lib/trillium.mjs';
import {Flower2,CheckCircle2,Info,ExternalLink} from 'lucide-react';
export default function TrilliumDirectReport(){
 const [siteId,setSiteId]=useState(STOPS[0].id),[link,setLink]=useState(''),[agreed,setAgreed]=useState(false);
 const [waiting,setWaiting]=useState(false),[status,setStatus]=useState(null);
 const submit=async(event)=>{
  event.preventDefault();
  if(waiting)return;
  setStatus(null);setWaiting(true);
  try{
   const r=await fetch('/api/trillium-source-report',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({siteId,observationUrl:link.trim(),accepted:agreed,website:''})});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'Automatic review is temporarily unavailable.');
   setStatus({ok:true,text:data.state==='already_received'?'This source has already been received. The original entry remains in the archive.':'The source was screened and archived automatically. The exact preserve still has not been independently confirmed.'});
   if(data.state!=='already_received')setLink('');
  }catch(e){setStatus({ok:false,text:e.message||'Could not submit this source.'});}
  finally{setWaiting(false);}
 };
 return <form id='tri-direct-report' className='tri-direct-form' onSubmit={submit}>
  <div className='tri-direct-heading'><div><strong>Submit a source-checked trillium sighting</strong>
   <p>No account needed. Paste a public iNaturalist observation; we check the species, spring date and flowering annotation against iNaturalist automatically.</p></div>
   <span>Automatic</span></div>
  <div className='tri-direct-fields'>
   <label>Which viewing destination?
    <select value={siteId} onChange={e=>setSiteId(e.target.value)} required>
      {STOPS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select></label>
   <label>Public iNaturalist observation URL
    <input value={link} type='url' inputMode='url' onChange={e=>setLink(e.target.value)}
     placeholder='https://www.inaturalist.org/observations/12345678' required maxLength={220}/></label>
  </div>
  <label className='tri-direct-consent'><input type='checkbox' checked={agreed} onChange={e=>setAgreed(e.target.checked)} required/>
   <span>I understand the source will be checked automatically, but choosing a preserve does not prove the plant was inside it. I will not include private plant coordinates or personal details.</span></label>
  <button type='submit' className='tri-direct-submit' disabled={waiting||!agreed||!link.trim()}><Flower2 size={16}/>{waiting?'Checking iNaturalist and saving…':'Check source and submit automatically'}</button>
  {status&&<div role='status' className={'tri-direct-result '+(status.ok?'success':'error')}>{status.ok?<CheckCircle2 size={17}/>:<Info size={17}/>}<span>{status.text}</span></div>}
  <p className='tri-direct-small'>Only public research-grade <i>Trillium grandiflorum</i> observations explicitly annotated as flowering pass automatic source verification. This does not certify bloom at a preserve or prove peak flowering. Dated land-manager reports can still be shared through the <a href='https://form.jotform.com/262882681844066' target='_blank' rel='noopener noreferrer'>additional evidence form <ExternalLink size={12}/></a>, which requires a separate review.</p>
 </form>;
}
