import {SITES,SOURCE_LINKS,morningOutlook,siteStatus,periodAirF} from '../../lib/lakeSmoke.mjs';
import {ICE_DATASET,iceSeason,parseIceGrid,iceAssessment,iceAdjustedOutlook,iceAwareStatus} from '../../lib/lakeSmokeIce.mjs';
import {cameraFor} from '../../lib/lakeSmokeCameras.mjs';
import {attachViewingOutlook,rankShorelineViews} from '../../lib/lakeSmokeWind.mjs';
import {NDBC_LATEST_URL,parseNdbcLatest,buoyForSite} from '../../lib/lakeSmokeBuoys.mjs';
import {sharedDailyGlsea} from '../../lib/lakeSmokeGlseaAscii.mjs';

const UA='GreatLakesLakeSmoke/1.0 (https://phenology.chrisizworski.com/lake-smoke; public outdoor planning)';
async function getJson(url,timeout=3800){
  const response=await fetch(url,{headers:{'Accept':'application/json, application/geo+json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
async function getText(url,timeout=6000){
  const response=await fetch(url,{headers:{'Accept':'text/plain','User-Agent':UA},signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.text();
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
async function iceFor(site,now){
  const subset='ice_concentration[last][('+site.waterLat+')][('+site.waterLon+')]';
  const url='https://apps.glerl.noaa.gov/erddap/griddap/'+ICE_DATASET+'.json?'+encodeURIComponent(subset);
  return parseIceGrid(await getJson(url,4800),now);
}
async function forecastFor(site){
  const points=await getJson('https://api.weather.gov/points/'+site.lat+','+site.lon);
  const hourly=points?.properties?.forecastHourly;
  if(typeof hourly!=='string'||!hourly.startsWith('https://api.weather.gov/'))throw Error('Hourly NWS forecast not available');
  const response=await getJson(hourly,4200);
  if(!Array.isArray(response?.properties?.periods)||!response.properties.periods.length)throw Error('Hourly forecast empty');
  return {periods:response.properties.periods,updatedAt:response.properties.updateTime||null};
}
async function snapshot(site,now,buoyPromise,dailyGridPromise){
  const [waterResult,weatherResult,iceResult]=await Promise.allSettled([waterFor(site,now),forecastFor(site),iceSeason(now)?iceFor(site,now):Promise.resolve(null)]);
  const glsea=waterResult.status==='fulfilled'?waterResult.value:null;
  // ERDDAP's tiny per-pixel service intermittently fails. NOAA publishes the
  // full-resolution GLSEA grid at an independent CoastWatch endpoint. Read it
  // ONCE for all sites, then use near-local cells before in-water buoy proxies.
  const direct=glsea?null:(await dailyGridPromise)[site.id]||null;
  const water=glsea||direct||buoyForSite(site,await buoyPromise);
  const wx=weatherResult.status==='fulfilled'?weatherResult.value:null;
  const ice=iceResult.status==='fulfilled'?iceResult.value:null;
  const iceCheck=iceAssessment(ice,now);
  // Never attach a shore-view recommendation before the existing water and ice safeguards.
  const weatherOutlook=iceAdjustedOutlook(morningOutlook(site,water,wx?.periods||[],now),iceCheck);
  const outlook=attachViewingOutlook(site,weatherOutlook,wx?.periods||[]);
  const current=wx?.periods?.find(p=>new Date(p.startTime).getTime()>=now.getTime()-3600000);
  return {
    ...site,
    water,
    ice,
    iceCheck,
    camera:cameraFor(site.id),
    forecastUpdatedAt:wx?.updatedAt||null,
    airForecastF:current?periodAirF(current):null,
    outlook,
    status:iceAwareStatus(outlook,water,iceCheck,siteStatus(outlook,water)),
    unavailable:{
      water:!water?'No recent NOAA ERDDAP pixel, daily GLSEA surface-grid cell, or nearby same-lake NDBC observation.':null,
      weather:!wx?'NWS hourly forecast could not be retrieved.':null,
      ice:iceCheck.state==='unavailable'?'Recent NOAA ice concentration data are required during ice season and could not be retrieved.':null
    }
  };
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=900');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const now=new Date();
  // One shared national NOAA buoy request, not fifteen separate buoy requests.
  // NOAA GLSEA remains primary: this feed is used only if a valid recent grid cell is absent.
  const buoyPromise=getText(NDBC_LATEST_URL,6500).then(text=>parseNdbcLatest(text,now)).catch(()=>[]);
  // Shared direct NOAA grid request is only one request for the entire Great Lakes.
  const dailyGridPromise=sharedDailyGlsea(SITES,now).catch(()=>({}));
  const results=await Promise.all(SITES.map(site=>snapshot(site,now,buoyPromise,dailyGridPromise)));
  const ranked=results.filter(r=>r.outlook.best).sort((a,b)=>b.outlook.best.score-a.outlook.best.score);
  const viewing=rankShorelineViews(results);
  return res.status(200).json({
    generatedAt:now.toISOString(),
    model:'Experimental conditions-based lake smoke setup index; not a fog observation, visibility forecast, or probability.',
    verifiedSightings:false,
    activeLocations:ranked.length,
    glseaBackedLocations:ranked.filter(r=>!r.water?.isProxy).length,
    buoyBackedLocations:ranked.filter(r=>r.water?.isProxy).length,
    dailyGridBackedLocations:ranked.filter(r=>r.water?.fromDailyGrid).length,
    shoreViewingLocations:viewing.length,
    viewingMethod:'Wind direction is FROM the reported NWS direction. Approximate waterward bearing is derived from the mapped shoreline point and local offshore sampling cell. View ranking is a qualitative heuristic and does not change the lake smoke weather score.',
    locations:results,
    sources:SOURCE_LINKS,
    notes:['Primary water input is NOAA GLSEA local satellite analysis. A separate NOAA daily GLSEA full-resolution map is sampled locally when ERDDAP point requests fail; its HTTP file date is treated as publication provenance, not the observation time. If both are unavailable, only geographically nearby, same-lake NOAA NDBC in-water buoy observations with valid timestamps may be substituted. These buoy temperatures are NOT satellite surface pixels or local shoreline readings; each proxy reports its station and distance. Sites without a qualifying buoy remain unranked. Ice assessments are sampled separately from GLSEA/NIC in November–May; a current grid cell does not predict future ice.','NWS forecasts describe hourly atmospheric conditions near each viewing location.','Ratings require recent local water temperature and usable hourly forecast data, plus recent local ice coverage in November–May; missing data produce no ranking. A patchy ice signal caps scores at 45, and 15% or greater ice cover suppresses scores.','Wind, local geography, ice, and turbulence can change actual visibility; consult NWS marine forecasts and advisories for safety. Shoreline view rankings are available only when a forecast wind direction and trustworthy ice/water conditions are present. Along-shore, shoreward and lakeward drift are approximations, not measured plume tracks.']
  });
}
