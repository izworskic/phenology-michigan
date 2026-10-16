import {REGIONS,STOPS} from '../../lib/trillium.mjs';
import {LOCAL_HABITATS,batchForecastUrl,buildLocalOutlook} from '../../lib/trillium-local.mjs';
function localDay(date=new Date()){
 const values=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=t=>values.find(v=>v.type===t)?.value;
 return {year:+get('year'),month:+get('month'),date:get('year')+'-'+get('month')+'-'+get('day')};
}
function inactiveSites(){
 return STOPS.map(s=>({siteId:s.id,state:'off',label:'Local spring conditions start in March',
  habitat:LOCAL_HABITATS[s.id],source:'Site habitat context from the linked manager description',
  note:'Off season. No live snow, temperature or bloom claim.',compare:null}));
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const now=new Date(),today=localDay(now);
 res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=21600');
 const base={updatedAt:now.toISOString(),seasonYear:today.year,method:'Approximate destination pins and regional representative grid points. Seven-day Open-Meteo modeled air temperature and snow depth are not sensors at a preserve. Site-versus-region temperatures do not establish lake cooling, forest soil temperatures, or bloom dates. Site bloom verification remains a separate evidence layer.',
  source:'https://open-meteo.com/en/docs'};
 if(today.month<3||today.month>6)return res.status(200).json({...base,state:'off',sites:inactiveSites(),reason:'Off-season: no current flowering or snow-cover inference and no upstream forecast requests.'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  // Single, cached request for 10 destination grids + seven region comparisons.
  const url=batchForecastUrl(STOPS,REGIONS);
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'Michigan Trillium Local Conditions (https://phenology.chrisizworski.com)'}});
  if(!response.ok)throw Error('Open-Meteo temporarily unavailable');
  const grids=await response.json();
  const sites=buildLocalOutlook(STOPS,REGIONS,grids,today.date);
  const valid=sites.filter(s=>s.state==='available').length;
  return res.status(200).json({...base,state:valid?'available':'unavailable',
   summary:{availableSites:valid,totalSites:STOPS.length,comparedSites:sites.filter(s=>s.compare!==null).length},
   sites,reason:valid?'Local grid forecasts available; not site bloom confirmations.':'No valid local forecast grids; no inferred bloom status.'});
 }catch{
  return res.status(200).json({...base,state:'unavailable',sites:STOPS.map(s=>({siteId:s.id,state:'unavailable',
   label:'Site weather temporarily unavailable',habitat:LOCAL_HABITATS[s.id],compare:null,
   note:'No local snow or temperature comparison available. Historic and site evidence remain separate.'})),
   reason:'The location forecast could not be verified. No local warmth or snow claim is made.'});
 }finally{clearTimeout(timer);}
}
