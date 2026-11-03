import {loadSiteOnset} from '../../lib/trillium-onset-source.mjs';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const output=await loadSiteOnset();
 if(!output){res.setHeader('Cache-Control','no-store');return res.status(503).json({state:'unavailable',message:'Reviewed site monitoring record unavailable; no first-bloom date may be inferred.'});}
 res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
 return res.status(200).json(output);
}
