import fs from 'node:fs/promises';
import {makeIssueFromLive,updateArchive,emptyArchive} from '../lib/lakeSmokeArchive.mjs';

const FILE=new URL('../data/lake-smoke-forecast-issues.json',import.meta.url);
const SOURCE='https://phenology.chrisizworski.com/api/lake-smoke';
const sourceFile=process.argv.find(a=>a.startsWith('--input='));
const dryRun=process.argv.includes('--dry-run');
const now=new Date();
async function loadLive(){
  if(sourceFile)return JSON.parse(await fs.readFile(sourceFile.slice('--input='.length),'utf8'));
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
  try{
    const res=await fetch(SOURCE,{headers:{Accept:'application/json','User-Agent':'LakeSmokeForecastIssueRecorder/1.0 (https://phenology.chrisizworski.com/lake-smoke)'},signal:controller.signal,cache:'no-store'});
    if(!res.ok)throw Error('Lake smoke API HTTP '+res.status);
    return res.json();
  }finally{clearTimeout(timeout);}
}
const live=await loadLive();
const issue=makeIssueFromLive(live,now);
let archive;
try{archive=JSON.parse(await fs.readFile(FILE,'utf8'));}
catch(err){if(err.code==='ENOENT')archive=emptyArchive();else throw err;}
const updated=updateArchive(archive,issue);
if(updated.changed&&!dryRun)await fs.writeFile(FILE,JSON.stringify(updated.archive,null,2)+'\n');
console.log(JSON.stringify({status:updated.reason,issueDate:issue.date,target:issue.targetDay,available:issue.available,locations:issue.sites.length,issues:updated.archive.issues.length,write:updated.changed&&!dryRun}));
