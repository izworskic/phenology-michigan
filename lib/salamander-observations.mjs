// Michigan mole-salamander observation evidence: public aggregates ONLY.
// Research-grade iNaturalist = verified taxonomic ID, NOT verified migration.
// No individual observation URLs, IDs, coordinates, precise dates, usernames,
// photo URLs, locality notes or free-text descriptions cross this module's output boundary.
export const TARGET_TAXA=[
 {name:'Ambystoma maculatum',label:'Spotted salamander'},
 {name:'Ambystoma laterale',label:'Blue-spotted salamander'}
];
export const MIN_REGION_REPORTS=3;
export const MIN_REGION_OBSERVERS=2;
export const LOOKBACK_DAYS=21;
export const INAT_SOURCE='https://www.inaturalist.org/pages/developers';
export function shiftDay(day,offset){
 const d=new Date(day+'T12:00:00Z');if(Number.isNaN(+d))return '';
 d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);
}
const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
export function observationUrl(taxon,day){
 if(!TARGET_TAXA.some(t=>t.name===taxon)||!dateOk(day))throw Error('Invalid species/date');
 // API /v1/observations supports taxon_name. Do NOT query private data or individual records.
 const params=new URLSearchParams({place_id:'29',taxon_name:taxon,
  quality_grade:'research',d1:shiftDay(day,-20),d2:day,
  per_page:'200',page:'1',order_by:'observed_on',order:'desc'});
 return 'https://api.inaturalist.org/v1/observations?'+params.toString();
}
export function publicSearchUrl(taxon){
 const params=new URLSearchParams({place_id:'29',taxon_name:taxon,quality_grade:'research'});
 return 'https://www.inaturalist.org/observations?'+params;
}
const validCoordinate=(lat,lon)=>typeof lat==='number'&&Number.isFinite(lat)&&typeof lon==='number'&&Number.isFinite(lon)&&lat>=41.65&&lat<=48.35&&lon>=-90.6&&lon<=-82.0;
// Deliberately coarse, approximate zone attribution; never a point/crossing/site.
export function broadRegion(lat,lon){
 if(!validCoordinate(lat,lon))return null;
 if(lat>=45.7)return lon<-88.15?'western-up':'central-up';
 if(lat>=44.25)return lon<-85.15?'northwest':'northeast';
 if(lat>=43.25&&lon>=-84.55)return 'saginaw-bay';
 if(lon>=-83.85)return 'southeast';
 if(lon>=-85.15)return 'mid';
 if(lat>=42.70)return 'west';
 return 'southwest';
}
function observerKey(r){
 const user=r.user;
 return (typeof user?.id==='number'||typeof user?.id==='string')?String(user.id):null;
}
function isExactSpecies(r,taxon){return r?.taxon?.name===taxon;}
function isOpenLocation(r){
 return (r.geoprivacy===null||r.geoprivacy===undefined||r.geoprivacy==='open')&&
 (r.taxon_geoprivacy===null||r.taxon_geoprivacy===undefined||r.taxon_geoprivacy==='open')&&
 r.coordinates_obscured!==true;
}
function validReport(r,taxon,day){
 if(!r||r.quality_grade!=='research'||!isExactSpecies(r,taxon)||!dateOk(r.observed_on))return false;
 return r.observed_on<=day&&r.observed_on>=shiftDay(day,-20);
}
function ageInDays(day,observationDay){
 const diff=(Date.parse(day+'T12:00:00Z')-Date.parse(observationDay+'T12:00:00Z'))/86400000;
 return Math.round(diff);
}
export function aggregateObservations(payloads,day,regionIds){
 const requested=TARGET_TAXA.length;
 const allowed=new Set(regionIds);
 const sources=Array.isArray(payloads)?payloads:[];
 const bins=[0,0,0],species={};
 const all=new Set(),byRegion=new Map(),stateObservers=new Set();
 let unavailable=0,overflow=false;
 for(const taxon of TARGET_TAXA){
  const input=sources.find(p=>p?.taxon===taxon.name);
  if(!input||input.error||!Array.isArray(input.results)){unavailable++;species[taxon.name]=null;continue;}
  overflow=overflow||Number(input.total_results)>input.results.length;
  const seen=new Set();let count=0;
  for(const r of input.results){
   if(!validReport(r,taxon.name,day))continue;
   const id=typeof r.id==='number'||typeof r.id==='string'?String(r.id):null;
   if(!id||seen.has(id)||all.has(id))continue;
   seen.add(id);all.add(id);count++;
   const age=ageInDays(day,r.observed_on),bucket=Math.min(2,Math.floor(age/7));
   if(bucket>=0&&bucket<=2)bins[bucket]++;
   const observer=observerKey(r);
   if(observer)stateObservers.add(observer);
   if(!isOpenLocation(r))continue;
   const coords=r.geojson?.coordinates;
   const region=Array.isArray(coords)&&coords.length===2?broadRegion(coords[1],coords[0]):null;
   if(!region||!allowed.has(region))continue;
   if(!byRegion.has(region))byRegion.set(region,{count:0,observers:new Set(),species:{},bins:[0,0,0]});
   const entry=byRegion.get(region);
   entry.count++;if(observer)entry.observers.add(observer);
   entry.species[taxon.name]=(entry.species[taxon.name]||0)+1;entry.bins[bucket]++;
  }
  species[taxon.name]=count;
 }
 const regions=regionIds.map(id=>{
  const r=byRegion.get(id),valid=r&&r.count>=MIN_REGION_REPORTS&&r.observers.size>=MIN_REGION_OBSERVERS;
  return {id,state:unavailable?'source_incomplete':valid?'reported':'insufficient',
   // Suppress all counts (even one) below a defensible privacy/reporting threshold.
   count:unavailable||!valid?null:r.count,
   species:unavailable||!valid?null:r.species,
   trend:unavailable||!valid?null:r.bins};
 });
 const state=unavailable===requested?'unavailable':unavailable?'partial':overflow?'sampled':'available';
 return {state,windowStart:shiftDay(day,-20),windowEnd:day,
  sampleComplete:!overflow&&unavailable===0,
  // No source-specific date or location metadata in this response.
  statewide:unavailable||all.size<MIN_REGION_REPORTS?{state:unavailable?'unavailable':'insufficient',count:null,species:null,trend:null}:
    {state:overflow?'sampled':'reported',count:all.size,species,trend:bins},
  regions, source:'iNaturalist research-grade species observations',
  claimsMigration:false,method:'Species observations only; do not establish direction, breeding activity, or a Big Night.',
  privacy:'Approximate Michigan regions; small counts suppressed; obscured or private locations excluded from regional classification. No observation-level data returned.',
  links:TARGET_TAXA.map(t=>({label:t.label,url:publicSearchUrl(t.name)})),
  observedAt:null};
}
// Separately reviewed institutional field reports. This ledger begins EMPTY.
// No automated iNaturalist record or weather forecast may create a verified migration event.
const VALID_STATES=new Set(['southeast','southwest','west','mid','saginaw-bay','northwest','northeast','central-up','western-up']);
const TRUSTED_HOSTS=new Set(['michigan.gov','www.michigan.gov','marquettemi.gov','www.marquettemi.gov','michigannature.org','www.michigannature.org','michigannature.wordpress.com','nature.org','www.nature.org','mivernalpools.com','www.mivernalpools.com','vppartnership.iescentral.com']);
export function reviewedMigration(records,day){
 if(!Array.isArray(records)||!dateOk(day))return [];
 const result=[];const seen=new Set();
 for(const r of records){
  if(!r||r.type!=='migration_observed'||!VALID_STATES.has(r.regionId)||!dateOk(r.observedOn)||!dateOk(r.reviewedOn)||r.observedOn>day||r.reviewedOn>day||r.reviewedOn<r.observedOn)continue;
  if(typeof r.organization!=='string'||r.organization.length<4||r.organization.length>100||typeof r.summary!=='string'||r.summary.length<25||r.summary.length>240)continue;
  if(r.summary.match(/(?:\d{2}\.\d{3,}|[NSEW]\s?\d{2,}\s?[NSEW]?|GPS|coordinates|crossing at)/i))continue;
  let url;try{url=new URL(r.sourceUrl);}catch{continue;}
  if(url.protocol!=='https:'||!TRUSTED_HOSTS.has(url.hostname)||!/^https:\/\/[^@\s]+$/.test(r.sourceUrl)||seen.has(r.sourceUrl))continue;
  seen.add(r.sourceUrl);
  result.push({type:'migration_observed',regionId:r.regionId,observedOn:r.observedOn,reviewedOn:r.reviewedOn,
   organization:r.organization,summary:r.summary,sourceUrl:r.sourceUrl,status:'source_reviewed',type:'migration_observed',
   method:r.method==='direct_field_monitoring'?'direct_field_monitoring':'institutional_report',
   verification:'source_reviewed',privacy:'regional_only'});
 }
 return result.sort((a,b)=>b.observedOn.localeCompare(a.observedOn)).slice(0,200);
}
