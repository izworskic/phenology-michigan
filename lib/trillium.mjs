// Michigan trillium timing: planning windows and provenance, never a fabricated bloom percentage.
export const REGIONS = [
  {id:'southwest',name:'Southwest Michigan',short:'Southwest',lat:42.16,lon:-86.20,start:'04-18',end:'05-18',note:'Wooded dunes and beech-maple forests often wake first.'},
  {id:'southeast',name:'Southeast Michigan',short:'Southeast',lat:42.68,lon:-83.62,start:'04-23',end:'05-23',note:'Sheltered hardwood slopes can be several days ahead of exposed sites.'},
  {id:'central',name:'Central Michigan',short:'Central',lat:43.45,lon:-84.40,start:'04-28',end:'05-27',note:'Inland forest understory follows the progression of spring warmth.'},
  {id:'west',name:'West Michigan',short:'West',lat:43.26,lon:-86.09,start:'04-25',end:'05-26',note:'Cool Lake Michigan winds can hold coastal sites behind inland woods.'},
  {id:'north',name:'Northern Lower Peninsula',short:'Northern Lower',lat:45.14,lon:-85.33,start:'05-05',end:'06-03',note:'Northern hardwood stands commonly shine later in May.'},
  {id:'eastup',name:'Eastern Upper Peninsula',short:'Eastern UP',lat:46.10,lon:-84.45,start:'05-12',end:'06-09',note:'Lake-influenced forests often wait until late spring.'},
  {id:'westup',name:'Western Upper Peninsula',short:'Western UP',lat:46.65,lon:-87.53,start:'05-12',end:'06-12',note:'Cold spring weather and local elevation create broad variation.'}
];
// Windows are broad editorial PLANNING ranges, not calibrated predictions for any given woodlot.
export const STOPS = [
 {id:'warren-dunes',name:'Warren Dunes wooded study area',region:'southwest',town:'Sawyer / Bridgman',lat:41.90,lon:-86.59,type:'State park natural area',trail:'Seek the wooded stream corridor west of the natural area, not the open beach.',access:'DNR identifies large white trillium in April–May. Recreation Passport is generally required for vehicle access.',url:'https://www.michigan.gov/dnr/places/natural-areas/warren-dunes-nature-study-area',highlight:'DNR-confirmed large white trillium'},
 {id:'warren-woods',name:'Warren Woods Nature Study Area',region:'southwest',town:'Three Oaks',lat:41.83,lon:-86.58,type:'State natural area',trail:'Ancient beech-maple forest with a spectacular spring wildflower display.',access:'DNR highlights April and early May; its photo shows prairie trillium. Do not presume every trillium is white.',url:'https://www.michigan.gov/dnr/places/natural-areas/warren-woods-nature-study-area',highlight:'Ancient forest wildflowers'},
 {id:'trillium-ravine',name:'Trillium Ravine Nature Sanctuary',region:'southwest',town:'Niles',lat:41.84,lon:-86.30,type:'Nature sanctuary',trail:'Forested glacial ravine; check steep ground and trail conditions.',access:'MNA describes spring trilliums here; use its visitor directions and check access details before traveling.',url:'https://michigannature.org/index.cfm?action=listing&fuseaction=locationgallery&listing=145',highlight:'Ravine spring ephemerals'},
 {id:'nan-weston',name:'Nan Weston Nature Preserve',region:'southeast',town:'Manchester / Sharon Hollow',lat:42.15,lon:-84.04,type:'Nature Conservancy preserve',trail:'Floodplain forest and woodland trails with large-flowered trillium in mid-spring.',access:'Review the official preserve map, permitted activities and seasonal conditions before leaving.',url:'https://www.nature.org/en-us/get-involved/how-to-help/places-we-protect/nan-weston-nature-preserve-at-sharon-hollow-1/',highlight:'TNC-confirmed large-flowered trillium'},
 {id:'trillium-trail',name:'Trillium Trail Nature Sanctuary',region:'southeast',town:'Memphis / St. Clair County',lat:43.09,lon:-82.76,type:'MNA nature sanctuary',trail:'A roughly one-mile visit over wooded stream hillsides, some steep.',access:'MNA reports large colonies of white trillium in early to mid-May. Follow the official M-19 roadside parking and access-easement instructions.',url:'https://www.michigannature.org/index.cfm?action=listing&fuseaction=locationgallery&listing=74',highlight:'Large white-trillium colonies'},
 {id:'hoffmaster',name:'P.J. Hoffmaster spring wildflower hikes',region:'west',town:'Muskegon / Norton Shores',lat:43.13,lon:-86.27,type:'State park',trail:'The DNR publishes a spring wildflower hike guide that includes trillium.',access:'Use designated park trails; State Recreation Passport is generally required for vehicle entry.',url:'https://www.michigan.gov/mhc/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/Hoffmaster_Guide_to_spring_wildflower_hikes.pdf?hash=DB4DFA1F97A99277468CC6529B599A2D&rev=0a8cf7cabceb4b7cb53063fd561e2b9f',highlight:'DNR spring flower guide'},
 {id:'portage-point',name:'Portage Point Woods Preserve',region:'north',town:'Onekama',lat:44.38,lon:-86.25,type:'Nature Conservancy preserve',trail:'Back-dune forest and marked loop, including easy/moderate and steep sections.',access:'Open to the public; parking on Herkelrath Road; NO PETS and no beach access.',url:'https://www.nature.org/en-us/get-involved/how-to-help/places-we-protect/portage-point-woods-preserve/',highlight:'Trillium among woodland ephemerals'},
 {id:'hoogland',name:'Hoogland Family Nature Preserve',region:'north',town:'Harbor Springs / M-119',lat:45.52,lon:-85.04,type:'Little Traverse Conservancy',trail:'1.5-mile loop in maple-beech woods along the Tunnel of Trees.',access:'Official address: 4135 S Lake Shore Dr, Harbor Springs. Dogs on leash; visit conservancy page for trail map.',url:'https://landtrust.org/explore/hoogland-family-nature-preserve/',highlight:'Northern May trilliums'},
 {id:'woollam',name:'John Arthur Woollam Preserve',region:'eastup',town:'Cedarville / Port Dolomite',lat:45.99,lon:-84.23,type:'Nature Conservancy preserve',trail:'Follow the restored official trails; the unusual rocky environment is sensitive.',access:'Open sunrise–sunset, small six-space parking area, and no off-trail climbing. TNC identifies this as a trillium-viewing preserve.',url:'https://www.nature.org/en-us/get-involved/how-to-help/places-we-protect/john-arthur-woollam-preserve/',highlight:'Eastern UP woodland trilliums'},
 {id:'echo-lake',name:'Echo Lake Nature Preserve',region:'westup',town:'Marquette',lat:46.64,lon:-87.48,type:'Nature Conservancy preserve',trail:'Varied forest and steep rocky walks; not a casual drive-up flower stop.',access:'Open to the public; park at gate after two-track approach and hike in. NO PETS. TNC lists preserve among Michigan trillium-viewing sites.',url:'https://www.nature.org/en-us/get-involved/how-to-help/places-we-protect/echo-lake-nature-preserve/',highlight:'UP wildflowers and woodland trails'}
];
export const DAY=86400000;
export function localDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(k)=>Number(parts.find(p=>p.type===k)?.value);
 return {year:get('year'),month:get('month'),day:get('day')};
}
export function utcDay(year,mmdd){return Date.parse(year+'-'+mmdd+'T12:00:00Z');}
export function outlook(region,now=new Date(),weather=null,flowering=[]){
 const {year,month,day}=localDay(now),today=utcDay(year,String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0'));
 const start=utcDay(year,region.start),end=utcDay(year,region.end);
 const daysUntil=Math.ceil((start-today)/DAY);
 const season=month>=1&&month<=7;
 let state,label,explain;
 if(!season||today>end+14*DAY){state='off';label='Outside spring season';explain='The bloom window has passed. Plan for next spring; no current bloom claim.';}
 else if(today<start-21*DAY){state='off';label='Too early for typical bloom';explain='The regional spring window is still weeks away.';}
 else if(today<start){state='watch';label='Approaching typical window';explain='Spring weather can advance or delay these broad historical dates.';}
 else if(today<=end){state='window';label='Within typical window';explain='A seasonal opportunity, not confirmation of open flowers here.';}
 else{state='late';label='Usual window ending';explain='Late pockets may remain, but confirm locally before driving.';}
 const evidence=flowering.filter(x=>x.region===region.id && x.ageDays>=0 && x.ageDays<=10);
 if(evidence.length && state!=='off'){state='sighting';label='Recent regional flower reports';explain='Annotated flowering observations exist in this region, NOT a verified bloom at any listed trail.';}
 const warmDays=weather?.days?.filter(d=>Number(d.maxF)>=60).length??null;
 const frostDays=weather?.days?.filter(d=>Number(d.minF)<=32).length??null;
 const nudge=!weather||!season?'Forecast not used outside the spring decision window.':warmDays>=5?'Several mild days ahead may advance woodland development.':frostDays>=3?'Multiple freezing nights could slow near-term progression.':'No strong short-term temperature nudge from this simple forecast check.';
 return {state,label,explain,daysUntil,floweringCount:evidence.length,examples:evidence.slice(0,2),weather,nudge,window:region.start+' to '+region.end};
}
export function bucket(lat,lon){
 // Broad geographic buckets only: public observations never show exact locations.
 if(lat>=45.65)return lon< -85.5?'westup':'eastup';
 if(lat>=44.10)return 'north';
 if(lat<42.5)return lon< -85?'southwest':'southeast';
 if(lon< -85.1)return 'west';
 if(lon> -83.45)return 'southeast';
 return 'central';
}
export function normalizeSightings(results=[],now=new Date()){
 // The API itself requests annotated flowering; recheck its result before display.
 const seen=new Set();
 return results.filter(o=>
   Number.isSafeInteger(o?.id)&&!seen.has(o.id)&&seen.add(o.id) &&
   o.quality_grade==='research' && o?.taxon?.name==='Trillium grandiflorum' &&
   Array.isArray(o.annotations) &&
   o.annotations.some(a=>a.controlled_attribute_id===12 && a.controlled_value_id===13) &&
   (!o.geoprivacy||o.geoprivacy==='open')&&
   (!o.taxon_geoprivacy||o.taxon_geoprivacy==='open')&&o.coordinates_obscured!==true
 ).flatMap(o=>{
   const coords=Array.isArray(o?.geojson?.coordinates)&&o.geojson.coordinates.length>=2
     ? [o.geojson.coordinates[1],o.geojson.coordinates[0]]
     : (typeof o.location==='string'?o.location.split(','):[]);
   if(coords.length!==2 || coords.some(v=>v===null||String(v).trim()===''))return [];
   const lat=Number(coords[0]),lon=Number(coords[1]);
   if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41||lat>48||lon< -91||lon> -82)return [];
   const date=Date.parse(String(o.observed_on)+'T00:00:00Z');
   if(!Number.isFinite(date))return [];
   const ageDays=Math.floor((now.getTime()-date)/DAY);
   if(ageDays<0||ageDays>10)return [];
   return [{id:o.id,region:bucket(lat,lon),date:o.observed_on,ageDays,url:'https://www.inaturalist.org/observations/'+o.id}];
 });
}
