import {REGIONS,isSeason,localDate} from '../../lib/salamanders.mjs';
import {TARGET_TAXA,observationUrl,aggregateObservations,reviewedMigration,INAT_SOURCE} from '../../lib/salamander-observations.mjs';
import REPORTS from '../../data/salamander-migration-reports.json';

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
 const reports=reviewedMigration(REPORTS,day).filter(r=>r.observedOn.slice(0,4)===day.slice(0,4));
 const base={generatedAt:now.toISOString(),date:day,season:spring?'spring':'off_season',
  migration:{status:reports.length?'source_reviewed':'no_reviewed_reports',reports,count:reports.length,
   explanation:'Only independently source-reviewed institutional reports qualify as migration evidence. No verified movement reports have been added unless shown below.'},
  sources:[{name:'iNaturalist research-grade observations',url:INAT_SOURCE},
   {name:'iNaturalist Research Grade explanation',url:'https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-dqa-and-how-do-observations-qualify-to-become-research-grade-'},
   {name:'iNaturalist geoprivacy',url:'https://help.inaturalist.org/en/support/solutions/articles/151000169938-what-is-geoprivacy-what-does-it-mean-for-an-observation-to-be-obscured-'}]};
 if(!spring)return res.status(200).json({...base,observations:{status:'off_season',state:'off_season',
  message:'Live sighting totals resume during Michigan spring monitoring. No current migration is implied.',
  claimsMigration:false,regions:REGIONS.map(r=>({id:r.id,state:'off_season',count:null,species:null,trend:null})),
  statewide:{state:'off_season',count:null,species:null,trend:null},links:[],sampleComplete:false}});
 const results=await Promise.allSettled(TARGET_TAXA.map(t=>speciesObservations(t.name,day)));
 const inputs=TARGET_TAXA.map((t,i)=>results[i].status==='fulfilled'?results[i].value:{taxon:t.name,error:'unavailable'});
 const summary=aggregateObservations(inputs,day,REGIONS.map(r=>r.id));
 // Sanitize every response. Never leak raw observation object, hidden GPS, username, image or ID.
 return res.status(200).json({...base,observations:{...summary,status:summary.state,
  message:summary.state==='unavailable'?'iNaturalist currently unavailable; no observation claim is being made.':
    summary.state==='partial'?'One species feed is unavailable. Counts are incomplete; regional counts are withheld.':
    summary.state==='sampled'?'High reporting volume: only the newest 200 observations per species are summarized, so totals are lower bounds.':
    'Research-grade IDs are species sightings, not documented migration. Counts depend on observer effort.'}});
}
