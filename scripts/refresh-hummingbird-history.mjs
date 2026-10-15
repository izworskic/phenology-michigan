#!/usr/bin/env node
// Annual archive refresh. iNaturalist API v2, bounded to COMPLETE spring seasons.
// Does not fetch or expose private GPS coordinates; only stores the nearest of nine
// representative weather regions for records with adequate public location accuracy.
// Run: node scripts/refresh-hummingbird-history.mjs [--force] [--year=2027]
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const archiveUrl=new URL('../data/hummingbird-history.json',import.meta.url);
const engine=await readFile(new URL('../lib/hummingbirds.js',import.meta.url),'utf8');
const {REGIONS}=await import('data:text/javascript;base64,'+Buffer.from(engine).toString('base64'));
const archive=JSON.parse(await readFile(archiveUrl,'utf8'));
const force=process.argv.includes('--force');
const namedYear=process.argv.find(a=>a.startsWith('--year='));
const now=new Date();
const yearUTC=now.getUTCFullYear();
const completeThrough=(now.toISOString().slice(5,10)>='06-16'?yearUTC:yearUTC-1);
const firstYear=Math.max(2017,Math.min(...archive.years.map(y=>y.year)));
const lastYear=Math.max(...archive.years.map(y=>y.year));
let years=namedYear?[Number(namedYear.slice(7))]:Array.from({length:Math.max(0,completeThrough-lastYear)},(_,i)=>lastYear+1+i);
if(namedYear&&(!Number.isInteger(years[0])||years[0]<firstYear||years[0]>completeThrough))throw Error('Requested year is not a complete spring season');
if(!force)years=years.filter(y=>!archive.years.some(row=>row.year===y));
if(!years.length){console.log('Archive current through '+lastYear+'; no fetch needed.');process.exit(0);}
const dist=(a,b,c,d)=>{
 const rad=Math.PI/180,x=(c-a)*rad,y=(d-b)*rad,q=Math.sin(x/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(y/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(q)));
};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastRequestAt=0;
async function observations(year){
 const records=[];let total=null,pages=0;
 for(let page=1;page<=50;page++){
  const elapsed=Date.now()-lastRequestAt;
  if(lastRequestAt&&elapsed<1250)await delay(1250-elapsed);
  const params=new URLSearchParams({
   taxon_id:'6432',place_id:'29',quality_grade:'research',
   d1:year+'-04-01',d2:year+'-06-15',
   per_page:'200',page:String(page),
   fields:'id,observed_on,geojson,quality_grade,user.id,public_positional_accuracy'
  });
  const url='https://api.inaturalist.org/v2/observations?'+params.toString();
  lastRequestAt=Date.now();
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try{
      response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'MichiganPhenology/1.0 (https://phenology.chrisizworski.com/hummingbird-tracker)'},signal:AbortSignal.timeout(15000)});
      if(response.status===429||response.status>=500){await delay(3000*(attempt+1));continue;}
      break;
    }catch(error){
      if(attempt===2)throw error;
      await delay(3000*(attempt+1));
    }
  }
  if(!response?.ok)throw Error('iNaturalist API HTTP '+(response?.status||'unavailable'));
  const json=await response.json();
  if(!Array.isArray(json.results)||!Number.isInteger(json.total_results))throw Error('Invalid iNaturalist API response');
  if(total===null)total=json.total_results;
  if(json.total_results!==total)throw Error('Observation count changed during a paginated fetch; retry next year');
  records.push(...json.results);pages++;
  if(records.length>=total)break;
  if(page===50)throw Error('Exceeded the iNaturalist 10k API result limit');
 }
 let notAssigned=0;
 const seen=new Set();
 const observations=records.flatMap(v=>{
  if(seen.has(v.id))return [];seen.add(v.id);
  if(v.quality_grade!=='research'||!/^\d{4}-\d\d-\d\d$/.test(v.observed_on||'')){notAssigned++;return []}
  const [lon,lat]=v.geojson?.coordinates||[];
  const acc=v.public_positional_accuracy;
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||(acc!=null&&acc>20000)){notAssigned++;return []}
  const closest=REGIONS.map(r=>({id:r.id,km:dist(lat,lon,r.lat,r.lon)})).sort((a,b)=>a.km-b.km)[0];
  if(!closest||closest.km>120){notAssigned++;return []}
  return [[v.observed_on,closest.id,v.user?.id??null,Number(v.id)]];
 });
 if(records.length!==total)throw Error('Pagination incomplete; archive unchanged');
 if(observations.length+notAssigned!==total)throw Error('Unaccounted observations; archive unchanged');
 return {year,totalResults:total,pagesFetched:pages,notAssigned,observations};
}
for(const year of years){
 const result=await observations(year);
 archive.years=archive.years.filter(y=>y.year!==year).concat(result).sort((a,b)=>a.year-b.year);
 console.log(year+': '+result.observations.length+' matched / '+result.totalResults+' public records');
}
archive.observationCount=archive.years.reduce((count,y)=>count+y.observations.length,0);
archive.provenance.completeSeasons=archive.years[0].year+'-'+archive.years[archive.years.length-1].year;
archive.provenance.extractedOn=now.toISOString().slice(0,10);
await writeFile(archiveUrl,JSON.stringify(archive)+'\n','utf8');
console.log('Updated '+archive.years.length+' historical spring seasons; retained '+archive.observationCount+' mapped observations.');
