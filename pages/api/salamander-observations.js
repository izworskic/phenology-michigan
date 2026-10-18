import {REGIONS,isSeason,localDate} from '../../lib/salamanders.mjs';
import {TARGET_TAXA,observationUrl,aggregateObservations,reviewedMigration,INAT_SOURCE} from '../../lib/salamander-observations.mjs';
import REPORTS from '../../data/salamander-migration-reports.json';
import MONITORED from '../../data/salamander-monitored-nights.json';
import FORECAST_ISSUES from '../../data/salamander-forecast-issues.json';
import {forecastArchiveCoverage,checkedArchive} from '../../lib/salamander-forecast-archive.mjs';
import {archiveHealth} from '../../lib/salamander-archive-health.mjs';
import {evaluationDiagnostics} from '../../lib/salamander-evaluation.mjs';
import {fieldEvidenceReadiness} from '../../lib/salamander-field-review.mjs';

const UA='Michigan Salamander Observation Evidence (https://phenology.chrisizworski.com/salamander-migration)';
async function speciesObservations(taxon,day){
 const r=await fetch(observationUrl(taxon,day),{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(7500)});
 if(!r.ok)throw Error('Observation feed unavailable');
 const json=await r.json();
 if(!Array.isArray(json?.results)||!Number.isFinite(json.total_results))throw Error('Unexpected observations response');
 return {taxon,results:json.results,total_results:json.total_results};
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 // Two GETs total each cache refresh, independent of NWS/ACIS. Do not poll outside spring.
 res.setHeader('Cache-Control','public, s-maxage=10800, stale-while-revalidate=10800');
 const now=new Date(),day=localDate(now),spring=isSeason(now);
 const archive=reviewedMigration(REPORTS,day);
 const reports=spring?archive.filter(r=>r.observedOn>=day.slice(0,4)+'-03-01'&&r.observedOn>=new Date(new Date(day+'T12:00:00Z').getTime()-21*86400000).toISOString().slice(0,10)).slice(0,12):[];
 const readiness=fieldEvidenceReadiness(REPORTS,day,MONITORED);
 const forecastCoverage=forecastArchiveCoverage(FORECAST_ISSUES,MONITORED,day);
 const operations=archiveHealth(FORECAST_ISSUES,now);
 const evaluation=evaluationDiagnostics(FORECAST_ISSUES,MONITORED,day);
 const historicalIssues=checkedArchive(FORECAST_ISSUES,day);
 const issueTimeline=historicalIssues.slice(-21).map(issue=>({day:issue.issueDay,
  observedRegions:issue.regions.length,forecasts:issue.regions.length*7,
  strongTonight:issue.regions.filter(r=>r.nights[0].level==='strong').length,
  watchTonight:issue.regions.filter(r=>r.nights[0].level==='watch').length,
  unknownTonight:issue.regions.filter(r=>r.nights[0].level==='unknown').length}));
 const base={generatedAt:now.toISOString(),date:day,season:spring?'spring':'off_season',
  migration:{status:reports.length?'recent_source_reviewed':'no_recent_source_reviewed_reports',reports,count:reports.length,
   history:archive.slice(0,12),readiness,
   monitored:readiness.monitoring,
   forecastArchive:{...forecastCoverage,issueTimeline,health:operations},
   evaluation,
   explanation:'Only independently source-reviewed institutional reports qualify as documented migration. Historical reports are separate from current activity; forecast scoring is not calibrated from these events.'},
  sources:[{name:'iNaturalist research-grade observations',url:INAT_SOURCE},
   {name:'iNaturalist Research Grade explanation',url:'https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-dqa-and-how-do-observations-qualify-to-become-research-grade-'},
   {name:'iNaturalist geoprivacy',url:'https://help.inaturalist.org/en/support/solutions/articles/151000169938-what-is-geoprivacy-what-does-it-mean-for-an-observation-to-be-obscured-'}]};
 if(!spring)return res.status(200).json({...base,observations:{status:'off_season',state:'off_season',
  message:'Live sighting totals resume during Michigan spring monitoring. No current migration is implied.',
  claimsMigration:false,regions:REGIONS.map(r=>({id:r.id,state:'off_season',count:null,species:null,trend:null})),
  statewide:{state:'off_season',count:null,species:null,trend:null},links:[],sampleComplete:false}});
 const inputs=[];
 for(let i=0;i<TARGET_TAXA.length;i++){
  // iNaturalist recommends approximately one API request per second. Respect that across species.
  if(i>0)await new Promise(resolve=>setTimeout(resolve,1100));
  const taxon=TARGET_TAXA[i].name;
  try{inputs.push(await speciesObservations(taxon,day));}
  catch{inputs.push({taxon,error:'unavailable'});}
 }
 const summary=aggregateObservations(inputs,day,REGIONS.map(r=>r.id));
 // Sanitize every response. Never leak raw observation object, hidden GPS, username, image or ID.
 return res.status(200).json({...base,observations:{...summary,status:summary.state,
  message:summary.state==='unavailable'?'iNaturalist currently unavailable; no observation claim is being made.':
    summary.state==='partial'?'One species feed is unavailable. Counts are incomplete; regional counts are withheld.':
    summary.state==='sampled'?'High reporting volume: only the newest 200 observations per species are summarized, so totals are lower bounds.':
    'Research-grade IDs are species sightings, not documented migration. Counts depend on observer effort.'}});
}
