// Read-only nightly spring watchdog; it never issues, revises or backfills forecasts.
// GitHub workflow turns stdout/outputs into a single deduplicated operator issue.
import fs from 'node:fs';
import {watchdogStatus,archiveHealth} from '../lib/salamander-archive-health.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8'));
if(!Array.isArray(rows))throw Error('Archive JSON must be an array');
const now=new Date(),health=archiveHealth(rows,now),status=watchdogStatus(rows,now);
console.log('Michigan archive watchdog:',JSON.stringify({
 issueDay:status.issueDay,state:status.state,
 alert:status.alert,completed:health.recordedCompletedDays,
 expected:health.expectedCompletedDays,missingDays:health.missedCompletedDays
}));
if(process.env.GITHUB_OUTPUT){
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'alert='+String(status.alert)+'\n');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,'issue_day='+status.issueDay+'\n');
}
