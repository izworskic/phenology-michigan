import {STOPS} from '../../lib/trillium.mjs';
import {commitCandidate} from '../../lib/trillium-github-archive.mjs';
export const config={api:{bodyParser:{sizeLimit:'2kb'}}};
async function lookup(id){
 const control=new AbortController();const timeout=setTimeout(()=>control.abort(),7000);
 try{
  const r=await fetch('https://api.inaturalist.org/v1/observations/'+id,{signal:control.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Source unavailable');
  return (await r.json())?.results?.[0];
 }finally{clearTimeout(timeout);}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST only'});
 if(req.headers.origin!=='https://phenology.chrisizworski.com')return res.status(403).json({error:'Please use the report form.'});
 const p=req.body||{},stop=STOPS.find(x=>x.id===p.siteId);
 let u;try{u=new URL(p.observationUrl);}catch{}
 const id=u?.hostname==='www.inaturalist.org'||u?.hostname==='inaturalist.org'
  ?u.pathname.match(/^\/observations\/([1-9][0-9]{3,12})\/?$/)?.[1]:null;
 if(!stop||!id||u.protocol!=='https:'||p.accepted!==true||p.website)return res.status(400).json({error:'Select a preserve, agree to the privacy notice, and supply a public iNaturalist observation URL.'});
 let o;try{o=await lookup(id);}catch{return res.status(503).json({error:'iNaturalist is temporarily unavailable.'});}
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const g=x=>now.find(v=>v.type===x).value;
 const today=g('year')+'-'+g('month')+'-'+g('day');
 const date=o?.observed_on;
 const hasFlowers=o?.annotations?.some(x=>x.controlled_attribute_id===12&&x.controlled_value_id===13);
 const hasState=o?.place_ids?.includes(29);
 if(!o||String(o.id)!==id||o.quality_grade!=='research'||o.taxon?.name!=='Trillium grandiflorum'
  ||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<'2019-03-01'||date>today
  ||date.slice(5)<'03-01'||date.slice(5)>'07-15'||!hasFlowers||!hasState)
  return res.status(422).json({error:'This link is not a verified Michigan research-grade white-trillium flowering observation.'});
 const record={submissionID:'8'+id.padStart(16,'0'),siteId:stop.id,observedAt:date,stage:'FLOWERING',
  sourceUrl:'https://www.inaturalist.org/observations/'+id,sourceKind:'inaturalist',
  evidenceStatus:'unverified_site',checkStatus:'species_date_flowering_checked'};
 try{
  const state=await commitCandidate(record);
  return res.status(200).json({state:state==='duplicate'?'already_received':'recorded',
   note:'Flowering source checked automatically; the selected preserve has not been independently verified.'});
 }catch{
  return res.status(503).json({error:'Could not save the report; please try again.'});
 }
}
