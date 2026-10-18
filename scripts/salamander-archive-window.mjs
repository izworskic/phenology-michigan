// Keeps second spring retry inexpensive if a verified issue is already in the repository.
// A delayed scheduler never archives once the Michigan evening migration window starts.
import fs from 'node:fs';
import {localDate,isSeason} from '../lib/salamanders.mjs';
import {michiganHour} from '../lib/salamander-archive-health.mjs';
import {checkedArchive} from '../lib/salamander-forecast-archive.mjs';
const now=new Date(),date=localDate(now),hour=michiganHour(now);
const records=JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8'));
if(!Array.isArray(records))throw Error('Invalid archive file; retry skip not safe');
const verified=checkedArchive(records,date);
if(records.length!==verified.length)throw Error('Invalid or future/duplicate forecast issue in archive');
const exists=verified.some(r=>r.issueDay===date);
const required=isSeason(now)&&hour>=12&&hour<18&&!exists;
console.log(required?'Capture is due for '+date:exists?'Already captured '+date:'Outside safe spring daytime capture window');
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'capture_required='+String(required)+'\n');
