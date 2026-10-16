import fs from 'node:fs/promises';
import {makeIssueFromLive,updateArchive,emptyArchive} from '../lib/lakeSmokeArchive.mjs';

const FILE=new URL('../data/lake-smoke-forecast-issues.json',import.meta.url);
const SOURCE='https://phenology.chrisizworski.com/api/lake-smoke';
const sourceFile=process.argv.find(a=>a.startsWith('--input='));
const dryRun=process.argv.includes('--dry-run');
const now=new Date();
async function loadLive(attempt=1){
  if(sourceFile)return JSON.parse(await fs.readFile(sourceFile.slice('--input='.length),'utf8'));
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  try{
    const url=attempt===1?SOURCE:SOURCE+'?historyRetry='+attempt+'-'+new Date().toISOString().slice(0,16);
    const res=await fetch(url,{headers:{Accept:'application/json','User-Agent':'LakeSmokeForecastIssueRecorder/1.0 (https://phenology.chrisizworski.com/lake-smoke)'},signal:controller.signal,cache:'no-store'});
    if(!res.ok)throw Error('Lake smoke API HTTP '+res.status);
    return res.json();
  }finally{clearTimeout(timeout);}
}
// Do not bank an all-blank daily issue when every upstream water/air reading
// was briefly unavailable. A separate cache-busted retry may recover NOAA.
let issue=null;
for(let attempt=1;attempt<=3;attempt++){
  try{
    const live=await loadLive(attempt);
    const candidate=makeIssueFromLive(live,new Date());
    if(candidate.available===0)throw Error('No location has a usable next-morning forecast; do not archive an all-blank issue');
    issue=candidate;
    break;
  }catch(err){
    if(sourceFile||attempt===3)throw err;
    console.warn('Lake smoke archive attempt '+attempt+' unavailable: '+err.message);
    await new Promise(resolve=>setTimeout(resolve,4000));
  }
}
if(!issue)throw Error('No trustworthy forecast issue captured');
let archive;
try{archive=JSON.parse(await fs.readFile(FILE,'utf8'));}
catch(err){if(err.code==='ENOENT')archive=emptyArchive();else throw err;}
const updated=updateArchive(archive,issue);
if(updated.changed&&!dryRun)await fs.writeFile(FILE,JSON.stringify(updated.archive,null,2)+'\n');
console.log(JSON.stringify({status:updated.reason,issueDate:issue.date,target:issue.targetDay,available:issue.available,locations:issue.sites.length,issues:updated.archive.issues.length,write:updated.changed&&!dryRun}));
