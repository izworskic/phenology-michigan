import {safeCandidateArchive} from './trillium-auto-intake.mjs';
const REPO='izworskic/phenology-michigan',PATH='data/trillium-automatic-reports.json';
async function jsonUrl(url,init={}){
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),9500);
 try{
  const r=await fetch(url,{...init,signal:c.signal});
  let body;try{body=await r.json();}catch{body=null;}
  return {ok:r.ok,status:r.status,data:body};
 }finally{clearTimeout(timeout);}
}
export async function commitCandidate(candidate){
 const token=process.env.GH_TOKEN;
 if(!token)throw Error('Missing repository write credential');
 const endpoint='https://api.github.com/repos/'+REPO+'/contents/'+PATH;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'trillium-automatic-source-review'};
 for(let attempt=0;attempt<4;attempt++){
  const old=await jsonUrl(endpoint+'?ref=main',{headers});
  if(!old.ok||!old.data?.sha||!old.data?.content)throw Error('Cannot read archive: '+old.status);
  const archive=JSON.parse(Buffer.from(old.data.content.replace(/\s/g,''),'base64').toString('utf8'));
  const rows=safeCandidateArchive(archive);
  if(rows.some(r=>String(r.submissionID)===candidate.submissionID || (candidate.checkStatus==='species_date_flowering_checked' && r.sourceUrl===candidate.sourceUrl)))return 'duplicate';
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
