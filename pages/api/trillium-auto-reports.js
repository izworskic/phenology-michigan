import ARCHIVE from '../../data/trillium-automatic-reports.json';
import {STOPS} from '../../lib/trillium.mjs';
import {safeCandidateArchive,publicCandidate} from '../../lib/trillium-auto-intake.mjs';
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const site=typeof req.query?.site==='string'?req.query.site:null;
 if(site&&!STOPS.some(s=>s.id===site))return res.status(400).json({error:'Unknown preserve'});
 try{
  const rows=safeCandidateArchive(ARCHIVE).filter(r=>!site||r.siteId===site);
  const counts={sourceChecked:rows.filter(r=>r.checkStatus==='species_date_flowering_checked').length,
    linkOnly:rows.filter(r=>r.checkStatus==='link_only').length};
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=21600');
  return res.status(200).json({state:'ready',counts,records:rows.slice(-35).reverse().map(publicCandidate),
    source:'Automated Jotform source review, not preserve-boundary confirmation',
    policy:'These are visitor-selected preserve references. Publicly sourced species/flowering may pass automatic checks, but preserve membership is NOT independently established. None counts as an editor-reviewed site bloom, peak or site-specific training truth.'});
 }catch{return res.status(503).json({state:'unavailable',records:[],error:'Automatic-source archive failed verification'});}
}
