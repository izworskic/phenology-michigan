// Annual archive updater. Run after the spring flowering season (normally July 20).
// Makes 8 bounded iNaturalist HISTOGRAM calls total; never downloads photos/coordinates.
import fs from 'node:fs/promises';
import {PARTITIONS,histogramUrl,combineHistograms} from '../lib/trillium-history.mjs';
const path=new URL('../data/trillium-flowering-history.json',import.meta.url);
const archive=JSON.parse(await fs.readFile(path,'utf8'));
const requested=process.argv.find(arg=>/^--year=\d{4}$/.test(arg));
const now=new Date(),year=requested?Number(requested.slice(7)):now.getUTCFullYear();
if(year<2019||year>now.getUTCFullYear() ||(!requested&&now.getUTCMonth()<6))throw new Error('Only refresh an observed spring season after July, or supply --year=YYYY explicitly.');
async function read(url){
 for(let attempt=0;attempt<3;attempt++){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),13000);
  try{
   const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'michigan-trillium-history/1.0 (https://phenology.chrisizworski.com)'},
    signal:c.signal});
   if(!response.ok)throw new Error('iNaturalist HTTP '+response.status);
   const data=await response.json();
   if(!data?.results?.week)throw new Error('No weekly history results');
   return data;
  }catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,(attempt+1)*1750));}
  finally{clearTimeout(t);}
 }
}
const next=structuredClone(archive);
for(const [region,boxes] of Object.entries(PARTITIONS)){
 if(!next.regions?.[region])throw new Error('Missing archived region '+region);
 const found=[];
 for(let i=0;i<boxes.length;i++){found.push(await read(histogramUrl(region,year,i)));await new Promise(resolve=>setTimeout(resolve,850));}
 const spring=combineHistograms(found,year);
 const older=next.regions[region].weekly.filter(([date])=>!String(date).startsWith(year+'-'));
 next.regions[region].weekly=[...older,...spring].sort(([a],[b])=>a.localeCompare(b));
 next.regions[region].partitions=boxes;
 console.log(region+': '+spring.reduce((n,[day,count])=>n+count,0)+' reports / '+spring.length+' weeks in '+year);
}
next.observationPeriod.through=year+'-07-15';
next.retrievedAt=new Date().toISOString().slice(0,10);
await fs.writeFile(path,JSON.stringify(next,null,2)+'\n');
console.log('Updated archive through '+year+' without retaining observer coordinates.');
