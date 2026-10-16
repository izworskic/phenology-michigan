import {timingSafeEqual} from 'node:crypto';
import {parseInbound,candidateFromWebhook,verifyCandidate,safeCandidateArchive} from '../../lib/trillium-auto-intake.mjs';
export const config={api:{bodyParser:false}};
const REPO='izworskic/phenology-michigan',PATH='data/trillium-automatic-reports.json';
function sameSecret(candidate,known){
 if(typeof candidate!=='string'||typeof known!=='string'||!known||candidate.length>200)return false;
 const a=Buffer.from(candidate),b=Buffer.from(known);
 return a.length===b.length&&timingSafeEqual(a,b);
}
async function jsonUrl(url,init={}){
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),9500);
 try{
  const r=await fetch(url,{...init,signal:c.signal});
  let body;try{body=await r.json();}catch{body=null;}
  return {ok:r.ok,status:r.status,data:body};
 }finally{clearTimeout(timeout);}
}
async function commitCandidate(candidate){
 const token=process.env.GH_TOKEN;
 if(!token)throw Error('Missing repository write credential');
 const endpoint='https://api.github.com/repos/'+REPO+'/contents/'+PATH;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'trillium-automatic-source-review'};
 for(let attempt=0;attempt<4;attempt++){
  const old=await jsonUrl(endpoint+'?ref=main',{headers});
  if(!old.ok||!old.data?.sha||!old.data?.content)throw Error('Cannot read archive: '+old.status);
  const archive=JSON.parse(Buffer.from(old.data.content.replace(/\s/g,''),'base64').toString('utf8'));
  const rows=safeCandidateArchive(archive);
  if(rows.some(r=>String(r.submissionID)===candidate.submissionID))return 'duplicate';
  // Bounded public archive; never publicly store unreviewed freeform text or visitor identity.
  if(rows.length>=250)throw Error('Public candidate archive full; request maintenance');
  const recent=rows.filter(r=>r.receivedAt?.slice(0,10)===new Date().toISOString().slice(0,10));
  if(recent.length>=30)throw Error('Daily automatic intake safety cap reached');
  const row={...candidate,receivedAt:new Date().toISOString()};
  const next={...archive,records:[...rows,row]};
  const result=await jsonUrl(endpoint,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify({message:'Auto-screen trillium source evidence ('+candidate.siteId+')',
     content:Buffer.from(JSON.stringify(next,null,2)+'\n').toString('base64'),sha:old.data.sha,branch:'main'})});
  if(result.ok)return 'stored';
  if(result.status===409||result.status===422)continue;
  throw Error('Repository archive update failed: '+result.status);
 }
 throw Error('Concurrent archive update conflict');
}
async function readBody(req){
 const chunks=[];let n=0;
 for await(const chunk of req){n+=chunk.length;if(n>65000)throw Error('Payload too large');chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.status(200).json({service:'Trillium automatic evidence intake',status:process.env.TRILLIUM_WEBHOOK_SECRET&&process.env.GH_TOKEN?'configured':'setup_required',
  policy:'Source links are screened automatically, but on-site flowering remains unverified until independent preserve boundary evidence exists.'});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Unsupported method'});}
 const secret=Array.isArray(req.query?.key)?'':req.query?.key;
 if(!sameSecret(secret,process.env.TRILLIUM_WEBHOOK_SECRET))return res.status(401).json({error:'Unauthorized'});
 if(!process.env.GH_TOKEN)return res.status(503).json({error:'Automatic intake storage unavailable'});
 let received;
 try{received=parseInbound(await readBody(req),String(req.headers['content-type']||''));}
 catch{return res.status(400).json({error:'Invalid Jotform submission payload'});}
 const candidate=candidateFromWebhook(received,new Date());
 if(!candidate)return res.status(202).json({state:'rejected',reason:'Missing valid public source, known preserve, date or flower stage. No public bloom claim.'});
 let checked;
 try{checked=await verifyCandidate(candidate);}
 catch{return res.status(503).json({error:'Evidence source unavailable, please retry'});}
 if(!checked)return res.status(202).json({state:'unverified',reason:'Submitted observation did not pass date/species/flower checks.'});
 try{
  const state=await commitCandidate(checked);
  return res.status(200).json({state,classification:checked.checkStatus,siteStatus:'not_verified'});
 }catch{
  // Never say a candidate was saved if durable persistence failed. Webhook can retry.
  return res.status(503).json({error:'Unable to persist screened evidence for automatic review'});
 }
}
