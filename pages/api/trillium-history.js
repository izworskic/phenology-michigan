import ARCHIVE from '../../data/trillium-flowering-history.json';
import {ALLOWED_REGION_IDS,PARTITIONS,buildBenchmark,compareCurrentSeason,histogramUrl,combineHistograms,targetBloomYear} from '../../lib/trillium-history.mjs';
const UA='Michigan Trillium History (phenology.chrisizworski.com)';
async function readHistogram(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const res=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'},signal:controller.signal});
  if(!res.ok)throw new Error('iNaturalist history HTTP '+res.status);
  const body=await res.json();
  if(!body?.results?.week)throw new Error('Missing histogram bins');
  return body;
 }finally{clearTimeout(timer);}
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const region=String(req.query?.region||'');
 if(!ALLOWED_REGION_IDS.includes(region))return res.status(400).json({error:'Select a valid Michigan region.'});
 const now=new Date(),targetYear=targetBloomYear(now),benchmark=buildBenchmark(ARCHIVE,region,targetYear);
 const localMonth=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'numeric'}).format(now));
 const localYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric'}).format(now));
 let live={state:'off',note:'Current-season comparison runs in March–June; historical years remain visible.'};
 let liveStatus='Outside spring tracking period';
 if(localMonth>=3&&localMonth<=6){
  try{
   // 1 histogram call per rectangle (2 only for SE); never download photos or observer coordinates.
   const hist=await Promise.all(PARTITIONS[region].map((part,i)=>readHistogram(histogramUrl(region,localYear,i))));
   live=compareCurrentSeason(benchmark,combineHistograms(hist,localYear),now);
   liveStatus='Current-year iNaturalist flowering histograms available';
  }catch{
   live={state:'unavailable',note:'This season’s historical comparison feed is temporarily unavailable; no early/late claim is being made.'};
   liveStatus='Current-year history feed unavailable';
  }
 }
 res.setHeader('Cache-Control','public, s-maxage=43200, stale-while-revalidate=43200');
 return res.status(200).json({
  region,targetYear,benchmark,live,liveStatus,archiveRetrievedAt:ARCHIVE.retrievedAt,
  source:'iNaturalist annotated flowering report histograms',
  sourceUrl:'https://www.inaturalist.org/observations?place_id=29&taxon_name=Trillium%20grandiflorum&term_id=12&term_value_id=13',
  methodology:'Historical weekly, research-grade flowering annotations from 2019–2026, intersected with Michigan and fixed regional rectangles. Minimum 6 reports in two weeks per eligible year; minimum 4 years for benchmark. Per-year 20th, 50th and 80th percentiles are summarized by equal-weight year medians. The current season cannot be called early or late until its reference reporting window has passed, with adequate reports. This is observer-dependent reporting timing, not measured bloom onset or true peak; no site-specific claim.'
 });
}
