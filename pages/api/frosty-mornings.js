import {SITES,BOARD_IDS,lookup,evaluateGrid} from '../../lib/frostMorning.mjs';
const UA='MichiganFrostyMornings/1.0 (https://phenology.chrisizworski.com/frosty-mornings)';
const PREFIX='https://api.weather.gov/';
async function getJson(url){
  if(typeof url!=='string'||!url.startsWith(PREFIX))throw Error('NWS link unavailable');
  const r=await fetch(url,{headers:{Accept:'application/geo+json, application/json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(4800)});
  if(!r.ok)throw Error('NWS HTTP '+r.status);
  return r.json();
}
async function siteForecast(site,now){
  try{
    const point=await getJson(PREFIX+'points/'+site.lat+','+site.lon);
    const link=point?.properties?.forecastGridData;
    const grid=await getJson(link);
    const props=grid?.properties;
    if(!props?.temperature?.values||!props?.dewpoint?.values||!props?.windSpeed?.values||!props?.skyCover?.values)throw Error('Required forecast grids missing');
    const issued=props.updateTime||null;
    const issuedMs=Date.parse(issued);
    if(issued&&(!Number.isFinite(issuedMs)||now.getTime()-issuedMs>24*3600000||issuedMs-now.getTime()>3600000))throw Error('NWS grid update timestamp outside freshness window');
    const analysis=evaluateGrid(props,now,site);
    return {...site,...analysis,status:analysis.coverage?'forecast':'incomplete',issuedAt:issued,
      source:'National Weather Service forecast grid; modelled frost-friendly weather only',
      note:'No forecast of actual surface temperature, hoarfrost crystal growth, fog or a sighting.'};
  }catch{
    return {...site,status:'unavailable',mornings:[],best:null,coverage:0,issuedAt:null,
      note:'Required live NWS forecast fields were unavailable, incomplete or out of date. No replacement weather was invented.'};
  }
}
export default async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const now=new Date();
  const mode=typeof req.query.mode==='string'?req.query.mode:'site';
  if(mode==='site'){
    const site=lookup(typeof req.query.site==='string'?req.query.site:'bay-city');
    if(!site)return res.status(400).json({error:'Unknown Michigan forecast location'});
    const data=await siteForecast(site,now);
    res.setHeader('Cache-Control',data.status==='unavailable'?'public, s-maxage=120':'public, s-maxage=1800, stale-while-revalidate=900');
    return res.status(200).json({generatedAt:now.toISOString(),location:data,observation:false});
  }
  if(mode==='board'){
    const sites=BOARD_IDS.map(id=>lookup(id));
    const locations=[];
    // Limit NWS concurrency, but cover all 12 sites with only three 4-site batches.
    // Each site's /points and grid calls remain sequential to follow NWS links.
    for(let i=0;i<sites.length;i+=4){
      const batch=await Promise.all(sites.slice(i,i+4).map(site=>siteForecast(site,now)));
      locations.push(...batch);
    }
    res.setHeader('Cache-Control',locations.every(s=>s.status==='unavailable')?'public, s-maxage=120':'public, s-maxage=1800, stale-while-revalidate=900');
    return res.status(200).json({generatedAt:now.toISOString(),locations,allLocations:SITES.map(({id,name,region,lat,lon})=>({id,name,region,lat,lon})),
      usable:locations.filter(s=>s.best).length,requested:sites.length,observation:false,
      summary:'Ranked by forecast atmospheric suitability, not observed frost or likelihood percentages.'});
  }
  return res.status(400).json({error:'Unknown request mode'});
}
export const _test={siteForecast};
