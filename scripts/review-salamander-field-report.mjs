// Only invoke via owner-approved GitHub workflow_dispatch after reading the source yourself.
// No public submission ever triggers this publisher.
import fs from 'node:fs';
import {reviewFieldReport} from '../lib/salamander-field-review.mjs';
const file=new URL('../data/salamander-migration-reports.json',import.meta.url);
const yes=v=>v==='true';
const input={regionId:process.env.REVIEW_REGION_ID,observedOn:process.env.REVIEW_OBSERVED_ON,
 organization:process.env.REVIEW_ORGANIZATION,method:process.env.REVIEW_METHOD,sourceUrl:process.env.REVIEW_SOURCE_URL,
 sourceExcerpt:process.env.REVIEW_SOURCE_EXCERPT,summary:process.env.REVIEW_SUMMARY,
 ownerApproved:yes(process.env.REVIEW_OWNER_APPROVED),sourceChecked:yes(process.env.REVIEW_SOURCE_CHECKED),
 dateChecked:yes(process.env.REVIEW_DATE_CHECKED),privacyChecked:yes(process.env.REVIEW_PRIVACY_CHECKED)};
try{
 const old=JSON.parse(fs.readFileSync(file,'utf8'));
 const next=reviewFieldReport(input,old,new Date());
 fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
 console.log('Stored one independently source-reviewed generalized Michigan migration event. Total:',next.length);
}catch(e){
 console.error('Source review refused:',e.message);
 process.exitCode=1;
}
