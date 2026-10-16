import {SITES,SOURCE_LINKS,morningOutlook,siteStatus,periodAirF} from '../../lib/lakeSmoke.mjs';

const UA='GreatLakesLakeSmoke/1.0 (https://phenology.chrisizworski.com/lake-smoke; public outdoor planning)';
async function getJson(url,timeout=3800){
  const response=await fetch(url,{headers:{'Accept':'application/json, application/geo+json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
function parseGlsea(json,now){
  const table=json?.table;
  const columns=table?.columnNames;
  const row=table?.rows?.[0];
  if(!Array.isArray(columns)||!Array.isArray(row))throw Error('Invalid NOAA grid response');
  const value=Number(row[columns.indexOf('sst')]);
  const time=row[columns.indexOf('time')];
  if(!Number.isFinite(value)||value<=0.5||value>35||!time)throw Error('NOAA water pixel missing or at freezing/possible ice state');
  const parsed=Date.parse(time);
  if(!Number.isFinite(parsed)||parsed>now.getTime()+6*3600000||now.getTime()-parsed>96*3600000)throw Error('NOAA grid is outdated');
  return {c:Math.round(value*10)/10,time:new Date(parsed).toISOString(),kind:'GLSEA satellite analysis',scope:'Local offshore grid cell (not a direct measurement)',source:'NOAA CoastWatch'};
}
async function waterFor(site,now){
  // Request the closest grid cell to an offshore point, not shoreline land.
  // A null/patched/old cell must never become a made-up current temperature.
  const subset='sst[last][('+site.waterLat+')][('+site.waterLon+')]';
  const url='https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.json?'+encodeURIComponent(subset);
  const json=await getJson(url,4500);
  return parseGlsea(json,now);
}
async function forecastFor(site){
  const points=await getJson('https://api.weather.gov/points/'+site.lat+','+site.lon);
  const hourly=points?.properties?.forecastHourly;
  if(typeof hourly!=='string'||!hourly.startsWith('https://api.weather.gov/'))throw Error('Hourly NWS forecast not available');
  const response=await getJson(hourly,4200);
  if(!Array.isArray(response?.properties?.periods)||!response.properties.periods.length)throw Error('Hourly forecast empty');
  return {periods:response.properties.periods,updatedAt:response.properties.updateTime||null};
}
async function snapshot(site,now){
  const [waterResult,weatherResult]=await Promise.allSettled([waterFor(site,now),forecastFor(site)]);
  const water=waterResult.status==='fulfilled'?waterResult.value:null;
  const wx=weatherResult.status==='fulfilled'?weatherResult.value:null;
  const outlook=morningOutlook(site,water,wx?.periods||[],now);
  const current=wx?.periods?.find(p=>new Date(p.startTime).getTime()>=now.getTime()-3600000);
  return {
    ...site,
    water,
    forecastUpdatedAt:wx?.updatedAt||null,
    airForecastF:current?periodAirF(current):null,
    outlook,
    status:siteStatus(outlook,water),
    unavailable:{
      water:!water?'Recent local NOAA lake-surface temperature could not be retrieved.':null,
      weather:!wx?'NWS hourly forecast could not be retrieved.':null
    }
  };
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const now=new Date();
  const results=await Promise.all(SITES.map(site=>snapshot(site,now)));
  const ranked=results.filter(r=>r.outlook.best).sort((a,b)=>b.outlook.best.score-a.outlook.best.score);
  return res.status(200).json({
    generatedAt:now.toISOString(),
    model:'Experimental conditions-based lake smoke setup index; not a fog observation, visibility forecast, or probability.',
    verifiedSightings:false,
    activeLocations:ranked.length,
    locations:results,
    sources:SOURCE_LINKS,
    notes:['NOAA GLSEA temperature is a satellite-derived analyzed grid, not a live thermometer or a precise nearshore reading.','NWS forecasts describe hourly atmospheric conditions near each viewing location.','Ratings require recent local water temperature and usable hourly forecast data; missing data produce no ranking.','Wind, local geography, ice, and turbulence can change actual visibility; consult NWS marine forecasts and advisories for safety.']
  });
}
