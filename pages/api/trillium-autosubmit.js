import {timingSafeEqual} from 'node:crypto';
import {parseInbound,candidateFromWebhook,verifyCandidate} from '../../lib/trillium-auto-intake.mjs';
import {commitCandidate} from '../../lib/trillium-github-archive.mjs';
export const config={api:{bodyParser:false}};
function sameSecret(candidate,known){
 if(typeof candidate!=='string'||typeof known!=='string'||!known||candidate.length>200)return false;
 const a=Buffer.from(candidate),b=Buffer.from(known);
 return a.length===b.length&&timingSafeEqual(a,b);
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
