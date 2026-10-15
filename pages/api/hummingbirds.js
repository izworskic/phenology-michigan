import {REGIONS,getDateKey,seasonState,groupSightings,weatherSignal,readout} from '../../lib/hummingbirds';
const UA='MichiganPhenologyHummingbirds/1.0 (https://phenology.chrisizworski.com/hummingbird-tracker)';
async function getJson(url,timeout=7200){
 const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(timeout)});
 if(!r.ok)throw Error('Upstream HTTP '+r.status);
 return r.json();
}
async function observations(now){
 const today=getDateKey(now),year=today.slice(0,4);
 const params=new URLSearchParams({taxon_name:'Archilochus colubris',place_id:'29',quality_grade:'research',d1:year+'-03-01',d2:today,per_page:'200',order_by:'observed_on',order:'desc',geo:'true'});
 const data=await getJson('https://api.inaturalist.org/v1/observations?'+params,8500);
 if(!Array.isArray(data?.results))throw Error('Unusable iNaturalist response');
 return {rows:data.results,total:data.total_results??null,truncated:(data.total_results||0)>data.results.length};
}
async function regionalWeather(region,now){
 const season=seasonState(region,now);
 if(!season.isSpring||season.daysUntilWindow>29||season.phase==='arrival_window_passed')return {weather:null,weatherStatus:'not_needed'};
 try{
   const meta=await getJson('https://api.weather.gov/points/'+region.lat+','+region.lon);
   const url=meta?.properties?.forecast;
   if(!url?.startsWith('https://api.weather.gov/'))throw Error('Missing NWS endpoint');
   const data=await getJson(url);
   return {weather:weatherSignal(data?.properties?.periods||[],now),weatherStatus:'ok',weatherUpdated:data?.properties?.updateTime||null};
 }catch(_e){return {weather:null,weatherStatus:'unavailable'};}
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=21600');
 const now=new Date(),today=getDateKey(now);
 const inMigration=today.slice(5)>='03-01'&&today.slice(5)<='06-15';
 let obs=[],obsTotal=null,sampleTruncated=false,observationStatus='off_season';
 if(inMigration){
   try{const result=await observations(now);obs=result.rows;obsTotal=result.total;sampleTruncated=result.truncated;observationStatus='available';}
   catch(_err){observationStatus='unavailable';}
 }
 const grouped=groupSightings(obs,now);
 // Keep requests bounded; weather is only meaningful during the spring migration approach.
 let all=[];
 for(let i=0;i<REGIONS.length;i+=3){
   const rows=await Promise.all(REGIONS.slice(i,i+3).map(r=>regionalWeather(r,now)));
   all.push(...rows);
 }
 const regions=REGIONS.map((r,i)=>({
   ...r,season:seasonState(r,now),weather:all[i].weather,weatherStatus:all[i].weatherStatus,
   weatherUpdated:all[i].weatherUpdated||null,sightings:grouped[r.id],
   signal:readout(r,now,all[i].weather,grouped[r.id])
 }));
 res.status(200).json({
  generatedAt:now.toISOString(),today,species:'Ruby-throated Hummingbird',scientificName:'Archilochus colubris',
  observationStatus,observationSource:'iNaturalist Research Grade',observationSampling:'Up to 200 most recently observed research-grade records from Michigan for this spring. Not a full count, not first arrivals, and not proof of local absence.',
  observationTotal:obsTotal,sampleTruncated,regions,
  methodology:'Regional arrival watch dates are editorial approximate seasonal windows, not statistically fitted arrival percentiles. NWS southerly winds and mild daytime highs are an exploratory movement-weather heuristic, not a calibrated bird prediction. Public iNaturalist observations are community-submitted and subject to identification error and observer sampling bias.',
  sources:[
   {label:'Journey North hummingbird migration maps',url:'https://maps.journeynorth.org/'},
   {label:'Michigan State University Extension',url:'https://ask.extension.org/kb/faq.php?id=820761'},
   {label:'iNaturalist observations',url:'https://www.inaturalist.org/observations?place_id=29&taxon_name=Archilochus%20colubris'},
   {label:'National Weather Service forecast API',url:'https://www.weather.gov/documentation/services-web-api'}
  ]
 });
}
