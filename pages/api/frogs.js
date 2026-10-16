import {REGIONS,dateKey,seasonalStatus,parseRecent,groupEvenings,forecastRegion} from '../../lib/frogs';

const UA='MichiganFrogChorus/1.0 (https://phenology.chrisizworski.com/frog-chorus)';
async function getJson(url,ms=6500){
  const response=await fetch(url,{headers:{Accept:'application/geo+json, application/json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(ms)});
  if(!response.ok)throw new Error('Upstream HTTP '+response.status);
  return response.json();
}
async function getForecast(region,now){
  const point=await getJson('https://api.weather.gov/points/'+region.lat+','+region.lon);
  const url=point?.properties?.forecastHourly;
  if(!url||!url.startsWith('https://api.weather.gov/'))throw new Error('NWS forecast URL unavailable');
  const forecast=await getJson(url);
  return {evenings:groupEvenings(forecast?.properties?.periods,now),updated:forecast?.properties?.updateTime||null};
}
async function getRecent(region,now){
  const end=dateKey(new Date(now.getTime()-86400000));
  const start=dateKey(new Date(now.getTime()-14*86400000));
  const params=new URLSearchParams({sid:region.sid,sdate:start,edate:end,elems:'maxt,mint,pcpn',output:'json'});
  const results=await getJson('https://data.rcc-acis.org/StnData?'+params,8000);
  if(results?.error)throw new Error('ACIS station data unavailable');
  return parseRecent(results?.data);
}
async function one(region,now){
  const status=seasonalStatus(region,now);
  // Do not generate plausible-looking October frog nights just because it's warm.
  if(status.offSeason){
    return {...forecastRegion(region,[],null,now),weatherStatus:'Not requested outside the seasonal watch',forecastUpdated:null};
  }
  const [w,h]=await Promise.allSettled([getForecast(region,now),getRecent(region,now)]);
  const weather=w.status==='fulfilled'?w.value:null;
  const recent=h.status==='fulfilled'?h.value:null;
  return {...forecastRegion(region,weather?.evenings||[],recent,now),
    weatherStatus:weather?'NWS forecast available':'NWS forecast temporarily unavailable',
    recentStatus:recent?'ACIS observed recent weather':'Recent-weather history unavailable',
    forecastUpdated:weather?.updated||null};
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  const now=new Date(),rows=[];
  const month=Number(dateKey(now).slice(5,7));
  // Batch requests to NWS and NOAA ACIS instead of making 18 simultaneous hits.
  const batch=(month>=2&&month<=9)?3:9;
  for(let i=0;i<REGIONS.length;i+=batch){
    rows.push(...await Promise.all(REGIONS.slice(i,i+batch).map(r=>one(r,now))));
  }
  return res.status(200).json({
    generatedAt:now.toISOString(),dataType:'forecast-and-calendar-not-observed-chorus',
    confirmedCalls:false,
    advisory:'Predictions are regional planning guidance; no microphone network or verified calling-sightings feed is connected.',
    regions:rows,
    sources:[
      {name:'Michigan DNR species and call guide',url:'https://www.michigan.gov/dnr/education/michigan-species/reptiles/frogs-and-toads'},
      {name:'USGS Frog & Toad Calls',url:'https://www.umesc.usgs.gov/terrestrial/amphibians/armi/frog_calls.html'},
      {name:'National Weather Service hourly forecasts',url:'https://www.weather.gov/documentation/services-web-api'},
      {name:'NOAA regional climate center ACIS',url:'https://docs.rcc-acis.org/acisws/'}
    ]
  });
}
