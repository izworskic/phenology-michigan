// Michigan Frog Chorus: regional decision-support model, not acoustic detection.
// Species timing and preferred temperatures are deliberately broad editorial
// envelopes. Neither the index nor the NWS forecast is a probability of hearing frogs.
// Sources: Michigan DNR frog and toad profiles, USGS ARMI call library, NWS API.
export const REGIONS=[
  {id:'detroit',name:'Detroit & Ann Arbor',place:'Southeast Lower Michigan',lat:42.33,lon:-83.05,sid:'KDTW',shift:-4},
  {id:'kalamazoo',name:'Kalamazoo',place:'Southwest Lower Michigan',lat:42.29,lon:-85.59,sid:'KAZO',shift:-4},
  {id:'grand-rapids',name:'Grand Rapids',place:'West Michigan',lat:42.96,lon:-85.67,sid:'KGRR',shift:-2},
  {id:'lansing',name:'Lansing',place:'Mid-Michigan',lat:42.73,lon:-84.55,sid:'KLAN',shift:0},
  {id:'saginaw-bay',name:'Saginaw Bay / Bay City',place:'Eastern Lower Peninsula',lat:43.60,lon:-83.89,sid:'KMBS',shift:3},
  {id:'traverse-city',name:'Traverse City',place:'Northwest Lower Peninsula',lat:44.76,lon:-85.62,sid:'KTVC',shift:8},
  {id:'gaylord',name:'Gaylord',place:'Northern Lower Peninsula',lat:45.03,lon:-84.67,sid:'KGLR',shift:11},
  {id:'marquette',name:'Marquette',place:'Central Upper Peninsula',lat:46.54,lon:-87.40,sid:'KSAW',shift:19},
  {id:'houghton',name:'Houghton / Keweenaw',place:'Western Upper Peninsula',lat:47.12,lon:-88.57,sid:'KCMX',shift:23}
];
const USGS='https://www.umesc.usgs.gov/terrestrial/amphibians/armi/species/';
const SOUND='https://www.umesc.usgs.gov/terrestrial/amphibians/armi/frog_calls/';
export const SPECIES=[
  {id:'wood',name:'Wood frog',scientific:'Lithobates sylvaticus',call:'Soft quacking and clucking, like a flock of ducks',habitat:'Shallow woodland vernal pools',start:66,end:126,comfort:[39,61],earliest:true,sound:SOUND+'woodfrog.mp3',guide:USGS+'wood_frog.html'},
  {id:'chorus',name:'Western chorus frog',scientific:'Pseudacris triseriata',call:'A rising raspy trill, like a fingernail drawn across a comb',habitat:'Flooded fields, grassy ditches and temporary pools',start:68,end:140,comfort:[40,66],earliest:true,sound:SOUND+'chorus_frog.mp3',guide:USGS+'chorus_frog.html'},
  {id:'peeper',name:'Northern spring peeper',scientific:'Pseudacris crucifer',call:'Piercing single peeps; a full chorus sounds like sleigh bells',habitat:'Woodland wetlands and shrubby pool margins',start:73,end:157,comfort:[43,71],earliest:true,sound:SOUND+'spring_peeper.mp3',guide:USGS+'northern_spring_peeper.html'},
  {id:'leopard',name:'Northern leopard frog',scientific:'Lithobates pipiens',call:'Low snoring croak followed by short chuckles',habitat:'Grassy marshes and shallow pond edges',start:86,end:156,comfort:[44,72],guide:USGS+'northern_leopard_frog.html'},
  {id:'pickerel',name:'Pickerel frog',scientific:'Lithobates palustris',call:'Short low-pitched snore, softer than a leopard frog',habitat:'Cool streams, seeps and wetland edges',start:91,end:166,comfort:[45,72],note:'Species of special concern: do not publish sensitive sites.'},
  {id:'toad',name:'Eastern American toad',scientific:'Anaxyrus americanus',call:'Long musical high-pitched trill, often 10–30 seconds',habitat:'Shallow ponds, gardens and flooded depressions',start:101,end:179,comfort:[51,77],guide:USGS+'eastern_american_toad.html'},
  {id:'gray',name:'Eastern gray treefrog',scientific:'Dryophytes versicolor',call:'Slow resonant melodic trill',habitat:'Wooded ponds and treetops',start:117,end:212,comfort:[55,82],guide:USGS+'eastern_gray_treefrog.html'},
  {id:'copes',name:"Cope's gray treefrog",scientific:'Dryophytes chrysoscelis',call:'A faster, buzzier trill than the eastern gray treefrog',habitat:'Wooded wetlands and shallow ponds',start:119,end:208,comfort:[57,84],guide:USGS+'copes_gray_treefrog.html'},
  {id:'green',name:'Green frog',scientific:'Lithobates clamitans',call:'A loose banjo string being plucked: gunk!',habitat:'Permanent ponds and lakes',start:137,end:249,comfort:[60,85],guide:USGS+'green_frog.html'},
  {id:'bullfrog',name:'American bullfrog',scientific:'Lithobates catesbeianus',call:'Deep jug-o-rum notes',habitat:'Lakes and permanent deeper-water wetlands',start:153,end:247,comfort:[64,88],guide:USGS+'bullfrog.html'},
  {id:'mink',name:'Mink frog',scientific:'Lithobates septentrionalis',call:'Series of short low knocking notes',habitat:'Cool northern boggy lakes and peatland waters',start:155,end:244,comfort:[55,78],upOnly:true,guide:USGS+'mink_frog.html'},
  {id:'fowlers',name:"Fowler's toad",scientific:'Anaxyrus fowleri',call:'Short nasal bleat, unlike the American toad trill',habitat:'Sandy shores in parts of southern Michigan',start:124,end:195,comfort:[58,82],restricted:true,note:'Special concern; habitat-dependent, not a statewide forecast.'},
  {id:'cricket',name:"Blanchard's cricket frog",scientific:'Acris blanchardi',call:'Metallic click-click-click resembling two pebbles',habitat:'Localized southern Michigan shallow wetlands',start:135,end:220,comfort:[62,87],restricted:true,note:'Threatened in Michigan. No locality prediction or site pins.',guide:USGS+'blanchards_cricket_frog.html'}
];
const TZ='America/Detroit',DAY=86400000;
export function localParts(value){
  return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).filter(x=>['year','month','day','hour'].includes(x.type)).map(x=>[x.type,Number(x.value)]));
}
export function dateKey(value){
  const p=localParts(value);
  return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-');
}
export function ordinalDate(key){
  const [y,m,d]=key.split('-').map(Number);
  return Math.round((Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/DAY)+1;
}
export function speciesForRegion(region){
  const north=region.lat>=46;
  return SPECIES.filter(s=>!s.restricted&&(!s.upOnly||north));
}
export function speciesWindow(species,region,date){
  const key=typeof date==='string'?date:dateKey(date);
  const d=ordinalDate(key);
  const leap=Number(new Date(Date.UTC(Number(key.slice(0,4)),1,29)).getUTCMonth()===1);
  const shift=region.shift+leap;
  const start=species.start+shift,end=species.end+shift;
  return {start,end,active:d>=start&&d<=end,approaching:d<start&&d>=start-12,passed:d>end,daysUntil:Math.max(0,start-d)};
}
export function seasonalStatus(region,now=new Date()){
  const key=dateKey(now),d=ordinalDate(key),windows=speciesForRegion(region).map(s=>speciesWindow(s,region,key));
  const any=windows.some(w=>w.active),approaching=windows.some(w=>w.approaching);
  return {active:any,approaching,offSeason:!any&&!approaching,status:any?'Seasonal calling window':approaching?'First calls approaching':d>265||d<48?'Outside typical calling season':'Between typical calling windows',year:Number(key.slice(0,4))};
}
export function parseRecent(data){
  if(!Array.isArray(data)||!data.length)return {rain7:null,wetDays7:null,highs3:null,lows3:null,complete:false};
  const last7=data.slice(-7),temps=data.slice(-3);
  const rainValues=last7.map(r=>r[3]==='T'?0:r[3]==='M'||r[3]==null||r[3]===''?null:Number(r[3]));
  const high=temps.map(r=>r[1]==='M'||r[1]==null?null:Number(r[1]));
  const low=temps.map(r=>r[2]==='M'||r[2]==null?null:Number(r[2]));
  const validRain=rainValues.filter(Number.isFinite);
  return {
    rain7:validRain.length>=5?+validRain.reduce((a,b)=>a+b,0).toFixed(2):null,
    wetDays7:validRain.length>=5?validRain.filter(x=>x>=.05).length:null,
    highs3:high.every(Number.isFinite)&&high.length===3?Math.round(high.reduce((a,b)=>a+b,0)/3):null,
    lows3:low.every(Number.isFinite)&&low.length===3?Math.round(low.reduce((a,b)=>a+b,0)/3):null,
    complete:validRain.length>=5&&high.every(Number.isFinite)&&low.every(Number.isFinite)
  };
}
export function groupEvenings(periods,now=new Date()){
  const result=new Map(),minDate=dateKey(now);
  for(const h of periods||[]){
    if(!h.startTime)continue;
    const dt=new Date(h.startTime),p=localParts(dt),key=dateKey(dt);
    // Rough evening listen window: spring 7–10 pm, summer 8–11 pm.
    const hourMin=p.month<=4?19:20;
    if(key<minDate||p.hour<hourMin||p.hour>hourMin+3)continue;
    if(!result.has(key))result.set(key,[]);
    result.get(key).push(h);
  }
  return [...result].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,7).map(([date,hours])=>{
    const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
    const temps=hours.map(x=>Number(x.temperature)).filter(Number.isFinite);
    const winds=hours.map(x=>x.windSpeed==null?NaN:Number.parseFloat(x.windSpeed)).filter(Number.isFinite);
    const pops=hours.map(x=>x.probabilityOfPrecipitation?.value).filter(Number.isFinite);
    const hazard=hours.some(x=>/thunder|tornado|severe|hail|lightning/i.test(x.shortForecast||''));
    return {date,temp:temps.length>=2?Math.round(avg(temps)):null,wind:winds.length>=2?Math.round(avg(winds)):null,pop:pops.length>=2?Math.round(Math.max(...pops)):null,thunder:hazard,hours:hours.length};
  });
}
export function scoreNight(night,species,region,antecedent){
  const window=speciesWindow(species,region,night.date);
  if(!window.active)return null;
  if(night.temp==null||night.wind==null||night.pop==null)return {score:null,label:'Incomplete NWS forecast',reason:'Temperature, wind or precipitation data missing.'};
  if(night.thunder)return {score:0,label:'Avoid thunderstorms',reason:'Thunderstorms in the evening forecast. Stay indoors.'};
  const [min,max]=species.comfort;
  let score=80;
  const reasons=[];
  if(night.temp<min-8){score-=62;reasons.push('Colder than typical calling weather');}
  else if(night.temp<min){score-=30;reasons.push('Cool for '+species.name.toLowerCase());}
  else if(night.temp>max+10){score-=34;reasons.push('Hot for this species');}
  else if(night.temp>max){score-=13;reasons.push('Warm edge of typical range');}
  else {score+=10;reasons.push('Suitable evening temperature');}
  if(night.wind>=18){score-=32;reasons.push('Strong wind reduces listening quality');}
  else if(night.wind>=11){score-=13;reasons.push('Breezy conditions');}
  else {score+=5;reasons.push('Low wind');}
  if(night.pop>=85){score-=30;reasons.push('Heavy rain may limit listening');}
  else if(night.pop>=35){score+=5;reasons.push('Possible wet-weather calling');}
  if(antecedent?.wetDays7!=null){
    if(antecedent.wetDays7>=2){score+=5;reasons.push('Recent wet days');}
    else if(antecedent.wetDays7===0){score-=8;reasons.push('Little recent rain');}
  }
  const value=Math.max(0,Math.min(100,Math.round(score)));
  return {score:value,label:value>=75?'Favorable listening conditions':value>=45?'Mixed conditions':'Unfavorable conditions',reason:reasons.join(' · ')};
}
export function forecastRegion(region,evenings,recent,now=new Date()){
  const status=seasonalStatus(region,now);
  const key=dateKey(now),species=speciesForRegion(region);
  const days=evenings.map(n=>{
    const rankings=species.map(s=>({id:s.id,name:s.name,...scoreNight(n,s,region,recent)}))
      .filter(x=>typeof x.score==='number').sort((a,b)=>b.score-a.score);
    const eligible=rankings.filter(x=>x.score>=45);
    return {...n,top:rankings.slice(0,4),speciesCount:eligible.length,
      bestScore:rankings.length?rankings[0].score:null,
      label:rankings.length?rankings[0].label:'Outside modeled calling windows'};
  });
  const current=days[0]||null;
  const seasonSpecies=species.filter(s=>speciesWindow(s,region,key).active).map(s=>s.id);
  const approaching=species.filter(s=>speciesWindow(s,region,key).approaching).map(s=>({id:s.id,name:s.name,daysUntil:speciesWindow(s,region,key).daysUntil}));
  return {...region,season:status,seasonSpecies,approaching,days,current,recent,
    methodology:'Editorial season-and-weather opportunity index. Not a measured chorus, abundance index or probability.'};
}
