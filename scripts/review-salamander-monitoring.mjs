// Owner-only. Called by workflow_dispatch after independent original-source verification.
// Never invoked by public form: no unreviewed submission can change the published ledger.
import fs from 'node:fs';
import {reviewMonitoring} from '../lib/salamander-monitoring.mjs';
const target=new URL('../data/salamander-monitored-nights.json',import.meta.url);
const yes=v=>v==='true';
const num=v=>/^\d+$/.test(String(v??''))?Number(v):NaN;
const input={regionId:process.env.REVIEW_REGION,night:process.env.REVIEW_NIGHT,
 outcome:process.env.REVIEW_OUTCOME,method:process.env.REVIEW_METHOD,
 minutes:num(process.env.REVIEW_MINUTES),observers:num(process.env.REVIEW_OBSERVERS),
 completed:yes(process.env.REVIEW_COMPLETED),repeatedProtocol:yes(process.env.REVIEW_REPEATED),
 organization:process.env.REVIEW_ORGANIZATION,sourceUrl:process.env.REVIEW_SOURCE_URL,
 sourceExcerpt:process.env.REVIEW_SOURCE_EXCERPT,
 ownerApproved:yes(process.env.REVIEW_OWNER_APPROVED),sourceChecked:yes(process.env.REVIEW_SOURCE_CHECKED),
 dateChecked:yes(process.env.REVIEW_DATE_CHECKED),effortChecked:yes(process.env.REVIEW_EFFORT_CHECKED),
 privacyChecked:yes(process.env.REVIEW_PRIVACY_CHECKED)};
try{
 const before=JSON.parse(fs.readFileSync(target,'utf8'));
 const updated=reviewMonitoring(input,before,new Date());
 fs.writeFileSync(target,JSON.stringify(updated,null,2)+'\n');
 console.log('Owner-approved one completed monitored session. Total reviewed sessions:',updated.length);
}catch(e){console.error('Monitoring publication refused:',e.message);process.exitCode=1;}
