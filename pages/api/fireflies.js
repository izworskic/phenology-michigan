import {REGIONS,dateKey,seasonalWindow,parseAcisData,development,summarizeForecast,viewingLabel} from '../../lib/fireflies';

const UA='MichiganFireflyTracker/1.0 (https://phenology.chrisizworski.com/firefly-tracker)';
async function jsonFrom(url,ms=6500){
  const r=await fetch(url,{headers:{'Accept':'application/geo+json, application/json;q=0.9','User-Agent':UA},signal:AbortSignal.timeout(ms)});
  if(!r.ok)throw new Error('Upstream HTTP '+r.status);
  return r.json();
}
async function fetchWeather(region,now){
  const base='https://api.weather.gov/points/'+region.lat+','+region.lon;
  const loc=await jsonFrom(base);
  const url=loc?.properties?.forecastHourly;
  if(!url||!url.startsWith('https://api.weather.gov/'))throw new Error('Missing NWS forecast link');
  const fc=await jsonFrom(url);
  const nights=summarizeForecast(fc?.properties?.periods||[],now);
  if(!nights.length)throw new Error('No usable NWS nighttime forecast');
  return {nights,weatherUpdated:fc?.properties?.updateTime||null,weatherSource:'National Weather Service'};
}
async function fetchHeat(region,now){
  const year=Number(dateKey(now).slice(0,4));
  const yesterday=new Date(now.getTime()-86400000);
  const start=year+'-01-01';
  const end=dateKey(yesterday);
  if(end<start)return {gddC:null,precip10:null,wetDays:null};
  const params=new URLSearchParams({sid:region.sid,sdate:start,edate:end,elems:'maxt,mint,pcpn',output:'json'});
  const out=await jsonFrom('https://data.rcc-acis.org/StnData?'+params.toString(),8000);
  if(out.error)throw new Error('ACIS station not available');
  return parseAcisData(out.data);
}
async function regionalSnapshot(region,now){
  const season=seasonalWindow(region,now);
  const common={...region,season,source:'Climate timing only',nights:[],gddC:null,precip10:null,wetDays:null,weatherError:null,heatError:null};
  if(!season.inSeason)return {...common,development:development(null),current:viewingLabel(region,null,now)};
  const [wx,heat]=await Promise.allSettled([fetchWeather(region,now),fetchHeat(region,now)]);
  const weather=wx.status==='fulfilled'?wx.value:null;
  const thermal=heat.status==='fulfilled'?heat.value:null;
  return {
    ...common,
    ...(weather||{}),
    ...(thermal||{}),
    source:weather?'NWS forecast / modeled suitability':'Forecast unavailable',
    weatherError:weather?null:'National Weather Service forecast could not be retrieved.',
    heatError:thermal?null:'ACIS station history could not be retrieved.',
    development:development(thermal?.gddC),
    current:viewingLabel(region,weather?.nights?.[0],now),
  };
}
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=7200');
  const now=new Date();
  const month=Number(dateKey(now).slice(5,7));
  // Forecasting fireflies in October–April would be misleading. Do not call live data out of season.
  const activeMonths=month>=5&&month<=8;
  const rows=[];
  if(!activeMonths){
    for(const region of REGIONS)rows.push(await regionalSnapshot(region,now));
  }else{
    // Bounded batches prevent a flood of requests to NOAA servers.
    for(let i=0;i<REGIONS.length;i+=3){
      const results=await Promise.all(REGIONS.slice(i,i+3).map(r=>regionalSnapshot(r,now)));
      rows.push(...results);
    }
  }
  return res.status(200).json({
    generatedAt:now.toISOString(),status:activeMonths?'seasonal_watch':'off_season',
    confirmedSightings:false,observationMessage:'No confirmed sightings feed is integrated. This is a weather and thermal forecast, not a count or direct observation.',
    regions:rows,
    sources:[
      {name:'National Weather Service',url:'https://www.weather.gov/documentation/services-web-api'},
      {name:'NOAA Regional Climate Centers ACIS',url:'https://docs.rcc-acis.org/acisws/'},
      {name:'Hermann et al. (2016)',url:'https://doi.org/10.1098/rsos.160712'},
      {name:'Firefly Atlas',url:'https://www.fireflyatlas.org/firefly-survey-tips'}
    ]
  });
}