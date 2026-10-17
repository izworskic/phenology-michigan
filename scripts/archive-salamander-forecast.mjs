// Scheduled before the evening starts, never retroactively backfilled.
// Fetches the same public forecast API used by the page; Git history audits writes.
import fs from 'node:fs';
import {createForecastIssue,appendForecastIssue,SNAPSHOT_SOURCE} from '../lib/salamander-forecast-archive.mjs';
const file=new URL('../data/salamander-forecast-issues.json',import.meta.url);
const live=new Date();
async function archive(){
 const existing=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(existing))throw Error('Unexpected existing archive structure');
 // Check existing day first: retries must not reissue/rewrite an earlier prediction.
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(live);
 const value=k=>local.find(p=>p.type===k).value;
 const today=value('year')+'-'+value('month')+'-'+value('day');
 if(existing.some(e=>e?.issueDay===today)){console.log('already_recorded: as-issued forecast snapshot is immutable for '+today);return;}
 if(!['03','04','05'].includes(today.slice(5,7)))throw Error('Do not create forecast snapshots outside spring');
 const res=await fetch(SNAPSHOT_SOURCE,{headers:{Accept:'application/json','Cache-Control':'no-cache','User-Agent':'Michigan-Salamander-Forecast-Archive/1.0 (phenology.chrisizworski.com)'},signal:AbortSignal.timeout(40000)});
 if(!res.ok)throw Error('Live forecast endpoint returned '+res.status);
 const payload=await res.json();
 const issue=createForecastIssue(payload,new Date());
 // Check earliest/latest against actual fetched data before writing. This is NOT a forecast rebuild.
 const {state,archive}=appendForecastIssue(existing,issue);
 if(state!=='added'){console.log('already_recorded');return;}
 fs.writeFileSync(file,JSON.stringify(archive,null,2)+'\n');
 console.log('Recorded '+issue.issueDay+' as issued at '+issue.apiGeneratedAt+
  ', captured '+issue.archivedAt+' with '+issue.regions.length+' of 9 regions and seven forecast nights per region.');
}
archive().catch(e=>{console.error('Forecast archival refused: '+e.message);process.exitCode=1;});
