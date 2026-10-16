import {STOPS} from '../../lib/trillium.mjs';
import HISTORY from '../../data/trillium-site-history.json';
import {readArchive,summarizeSiteEvidence} from '../../lib/trillium-site-history.mjs';
const ISSUE_URL='https://form.jotform.com/262882681844066';
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const requested=req.query.site;
 if(requested!==undefined && (typeof requested!=='string'||!STOPS.some(s=>s.id===requested)))
  return res.status(400).json({error:'Unknown destination'});
 try{
  const validated=readArchive(HISTORY,STOPS);
  const summary=summarizeSiteEvidence(STOPS,validated);
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=21600');
  return res.status(200).json({updatedAt:HISTORY.updatedAt||null,state:'ready',
   reports:summary.totalReports,sitesWithReports:summary.sitesWithReports,multiYearSites:summary.multiYearSites,
   sites:requested?summary.sites.filter(s=>s.siteId===requested):summary.sites,
   submitUrl:ISSUE_URL,
   method:'Only editor-reviewed, dated source-linked observations explicitly tied to the named public preserve are archived. Reporter-provided coordinates, proximity, weather and regional observations do not qualify. An archive entry is not necessarily a bloom now: current status independently expires after seven days. No site-level predictive calibration is published until independent years and a held-out validation exist.'});
 }catch{
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({state:'unavailable',error:'The reviewed evidence archive failed validation. No site confirmations are published.'});
 }
}
