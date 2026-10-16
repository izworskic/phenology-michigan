import {REGIONS,regionalResult,michiganDate,upcomingDates,windowFor} from '../../lib/woodcock';
const UA='MichiganWoodcockSkyDance/1.0 (https://phenology.chrisizworski.com/woodcock-sky-dance)';
async function nwsJson(url) {
  if(!url||!url.startsWith('https://api.weather.gov/'))throw new Error('Invalid forecast URL');
  const r=await fetch(url,{headers:{'Accept':'application/geo+json, application/json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw new Error('NWS forecast unavailable: '+r.status);
  return r.json();
}
async function getForecast(region) {
  const point=await nwsJson('https://api.weather.gov/points/'+region.lat+','+region.lon);
  const hourlyUrl=point?.properties?.forecastHourly,gridUrl=point?.properties?.forecastGridData;
  if(!hourlyUrl)throw new Error('Hourly forecast URL missing');
  const [hourly,grid]=await Promise.allSettled([nwsJson(hourlyUrl),gridUrl?nwsJson(gridUrl):Promise.resolve(null)]);
  if(hourly.status!=='fulfilled')throw new Error('Hourly forecast could not be retrieved');
  return {
    periods:hourly.value?.properties?.periods||[],
    clouds:grid.status==='fulfilled'?grid.value?.properties?.skyCover?.values||[]:[],
    updated:hourly.value?.properties?.updateTime||null,
    cloudAvailable:grid.status==='fulfilled'&&Boolean(grid.value?.properties?.skyCover?.values?.length)
  };
}
export default async function handler(req,res) {
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
  const id=typeof req.query.region==='string'?req.query.region:'saginaw-bay';
  const region=REGIONS.find(r=>r.id===id);
  if(!region)return res.status(400).json({error:'Unknown Michigan forecast region'});
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=3600');
  const now=new Date();
  const anySpring=upcomingDates(now).some(date=>windowFor(region,date).inSeason);
  let wx={periods:[],clouds:[],updated:null,cloudAvailable:false},error=null;
  // No meaningless October weather projection for a March-May courtship event.
  if(anySpring)try{wx=await getForecast(region);}catch(e){error='NWS forecast temporarily unavailable. Sunset windows remain available.';}
  const result=regionalResult(region,now,wx.periods,wx.clouds,wx.updated);
  return res.status(200).json({
    generatedAt:now.toISOString(),date:michiganDate(now),region:result,
    forecastError:error,cloudAvailable:wx.cloudAvailable,
    methodology:{
      confirmedBirdActivity:false,
      statement:'Forecast describes weather-fit for hearing/seeing displays where woodcock already occupy suitable habitat. No sightings, abundance, or arrival are asserted.',
      sunset:'Calculated astronomical sunset for the regional reference point (America/Detroit).',
      start:'USFWS survey-method timing: sunset +15 minutes when over 75% cloud, otherwise +22 minutes. When cloud data are missing, the 22-minute rule is displayed as a default.',
      weather:'USFWS excludes temperatures below 40°F, strong wind and heavy precipitation. The 0–100 weather-fit index adds clearly editorial wind and precipitation penalties; it is not an occurrence probability.',
      season:'Broad editorial regional planning range; official survey periods and individual bird arrival vary.'
    },
    sources:[
      {name:'USFWS woodcock singing-ground survey instructions',url:'https://migbirdapps.fws.gov/woodcock/survey_instructions.htm'},
      {name:'National Weather Service Forecast API',url:'https://www.weather.gov/documentation/services-web-api'},
      {name:'Audubon woodcock sky dance viewing guidance',url:'https://www.audubon.org/magazine/do-yourself-favor-spring-go-see-american-woodcocks-sky-dance'}
    ]
  });
}
