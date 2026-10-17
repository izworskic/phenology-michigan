/* Owner-reviewed evidence gate. Treat incoming GitHub issue body as untrusted data. */
import {readFileSync,writeFileSync} from 'node:fs';
import {SITES} from '../lib/frostMorning.mjs';
import {validDate,validateReviewedReport} from '../lib/frostVerification.mjs';
const input=JSON.parse(readFileSync(process.env.FROST_ISSUE_JSON||'/tmp/frost-issue.json','utf8'));
if(!['FROST_PHOTO_REVIEWED','FROST_PRIVACY_REVIEWED','FROST_OWNER_APPROVED'].every(k=>process.env[k]==='true'))throw Error('All owner, evidence and privacy approval required');
if(!Number.isInteger(input?.number)||!/^Frost field sighting:/i.test(input.title||'')||!['OPEN','open'].includes(input.state))throw Error('Requires original open frost issue');
const body=String(input.body||'');
function answer(label){
  const header='### '+label;
  const lines=body.split('\n');
  const ix=lines.findIndex(line=>line.trim()===header);
  if(ix<0)return '';
  return lines.slice(ix+1).map(v=>v.trim()).filter(Boolean)[0]||'';
}
const name=answer('Nearest forecast area');
const site=SITES.find(s=>s.name===name);
if(!site)throw Error('Unrecognized Michigan forecast area');
const date=answer('Observation date (Michigan local YYYY-MM-DD)');
if(!validDate(date))throw Error('Invalid local date');
const observed=Date.parse(date+'T12:00:00Z'),now=Date.now();
if(observed>now+86400000||observed<now-400*86400000)throw Error('Observation outside allowed dates');
const approximateTime=answer('Approximate observation time (Eastern)');
if(approximateTime.length<3||approximateTime.length>40)throw Error('Approximate time required for independent checking');
const evidenceUrl=answer('Original dated public frost photograph or source (HTTPS)');
const appearance=answer('What did the ice crystals look like?');
if(appearance.length<25)throw Error('Describe source evidence before approval');
const note=String(process.env.FROST_REVIEW_NOTE||'').trim();
const type=process.env.FROST_REVIEWED_TYPE||'';
const file=new URL('../data/frost-reviewed-sightings.json',import.meta.url);
const data=JSON.parse(readFileSync(file,'utf8'));
const report={issueNumber:input.number,siteId:site.id,date,type,evidenceUrl,reviewNote:note,reviewedAt:new Date().toISOString(),
  provenance:'Original public dated frost evidence independently checked by repository owner',
  issueUrl:'https://github.com/izworskic/phenology-michigan/issues/'+input.number};
validateReviewedReport(report,data.reports);
if(/(?:\b\d{1,5}\s+[A-Za-z0-9]+\s+(?:Street|St|Road|Rd|Drive|Dr|Lane|Ln)\b|[-+]?\d{2}\.\d{4,}\s*,\s*[-+]?\d{2}\.\d{4,})/i.test(note))throw Error('Redact private address and GPS coordinates');
data.reports.push(report);
data.reports.sort((a,b)=>a.date.localeCompare(b.date)||a.issueNumber-b.issueNumber);
writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Published owner-reviewed original photo evidence',input.number,site.id,date,type);
