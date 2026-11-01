// Shared Michigan seasonal air-temperature accumulation evidence.
// Source: USA National Phenology Network GeoServer, base 50F / Jan 1, 4-km grids.
// This is NOT an insect emergence clock, soil measurement or live flower observation.
const TZ='America/Detroit';
const BASE_F=50;
const DAY_MS=86400000;
const WMS='https://geoserver.usanpn.org/geoserver/wms';
export const LAYERS=Object.freeze({current:'gdd:agdd_50f',anomaly:'gdd:agdd_anomaly_50f'});
export const WMS_PROPERTIES=Object.freeze({current:'AGDD',anomaly:'AGDD_ANOMALY'});
export function localDate(date=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
export function addDays(day,n){return new Date(Date.parse(day+'T12:00:00Z')+n*DAY_MS).toISOString().slice(0,10);}
export function validPoint(lat,lon){
 return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=41.5&&lat<=48.6&&lon>=-90.6&&lon<=-82.0;
}
export function gddDailyF(high,low,base=BASE_F){
 if(high===null||low===null||typeof high!=='number'||typeof low!=='number'||!Number.isFinite(high)||!Number.isFinite(low)||high< -120||high>135||low< -120||low>135||low>high||!Number.isFinite(base))return null;
 return Math.max(0,(high+low)/2-base);
}
export function wmsUrl(lat,lon,day,kind){
 if(!validPoint(lat,lon))throw Error('HEAT_INVALID_LOCATION');
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('HEAT_INVALID_DAY');
 if(!Object.hasOwn(LAYERS,kind))throw Error('HEAT_INVALID_LAYER');
 const d=.02,layer=LAYERS[kind],url=new URL(WMS);
 const fields={service:'WMS',version:'1.1.1',request:'GetFeatureInfo',layers:layer,query_layers:layer,
  srs:'EPSG:4326',bbox:[lon-d,lat-d,lon+d,lat+d].join(','),width:'5',height:'5',x:'2',y:'2',
  info_format:'application/json',time:day,feature_count:'1'};
 for(const [key,val] of Object.entries(fields))url.searchParams.set(key,String(val));
 return url.href;
}
export function parseLayer(payload,kind){
 const key=WMS_PROPERTIES[kind];if(!key||!payload||payload.type!=='FeatureCollection'||!Array.isArray(payload.features)||payload.features.length!==1)return null;
 const props=payload.features[0]?.properties;
 if(!props||typeof props[key]!=='number'||!Number.isFinite(props[key]))return null;
 const val=props[key];if(val<=-9990||val>10000||(kind==='current'&&val<0))return null;
 return val;
}
export function seasonalSnapshot({lat,lon,asOfDate,current,anomaly,previous=null,previousDate=null,now=new Date()}){
 if(!validPoint(lat,lon))throw Error('HEAT_INVALID_LOCATION');
 if(typeof asOfDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate))throw Error('HEAT_INVALID_AS_OF_DATE');
 const year=Number(asOfDate.slice(0,4));
 const base={schema:'seasonal-heat-v1',provider:'USA National Phenology Network',status:'UNAVAILABLE',
  scope:'modeled-grid-air-temperature-seasonal-context',seasonYear:year,asOfDate,checkedAt:now.toISOString(),
  location:{latitude:lat,longitude:lon,kind:'approximate-grid-point'},
  method:{baseF:BASE_F,startDate:year+'-01-01',
   daily:'max(0, (highF + lowF)/2 - 50F)',timeZone:TZ,
   source:'USA-NPN current-year 50F accumulated growing degree days (AGDD) and independently published 50F anomaly',
   griddedResolution:'approximately 4 km',referencePeriod:'1991-2020',
   restrictions:'Grid-based weather estimate, not station observation; no species-specific emergence threshold'},
  sourceUrls:{current:wmsUrl(lat,lon,asOfDate,'current'),anomaly:wmsUrl(lat,lon,asOfDate,'anomaly')},
  caveats:['USA-NPN AGDD is an air-temperature map, not a measurement in the selected garden.',
   'Anomaly compares the same base-50F mapped product with USA-NPN reference-period data.',
   'Early-spring lilac and honeysuckle indices cannot establish summer flowers or pollinator forage.',
   'None of these figures predicts leafcutter emergence or authorizes cocoon release.'],
  totalGdd50F:null,comparison:null,weekChangeGdd50F:null,bloomStatus:'UNVERIFIED',speciesEmergenceStatus:'UNVERIFIED',
  modelNotObservation:true};
 const total=parseLayer(current,'current'),delta=parseLayer(anomaly,'anomaly');
 if(total===null)return {...base,reason:'Current-year accumulated heat was not returned by the authoritative grid service.'};
 const round=n=>Math.round(n*10)/10;
 const p=previousDate&&previous?parseLayer(previous,'current'):null;
 const validPrevious=p!==null&&previousDate?.slice(0,4)===asOfDate.slice(0,4)&&previousDate<asOfDate&&total>=p;
 return {...base,status:delta===null?'PARTIAL':'AVAILABLE',totalGdd50F:round(total),
  reason:delta===null?'Reference anomaly is not mapped at this location; current accumulated heat remains valid.':null,
  comparison:delta===null?null:{anomalyGdd50F:round(delta),referencePeriod:'1991-2020',
   direction:delta>5?'ahead-of-reference':delta< -5?'behind-reference':'near-reference',
   type:'official-agdd-anomaly',isBloomObservation:false},
  weekChangeGdd50F:validPrevious?round(total-p):null,
  previousDate:validPrevious?previousDate:null,
  sourceUrls:{...base.sourceUrls,previous:validPrevious?wmsUrl(lat,lon,previousDate,'current'):null},
  freshness:{asOfDate,sourceType:'daily-gridded-product',verifiedPublicationTime:null,
    note:'Time dimension requested from USA-NPN GeoServer; timestamp of grid publication is not separately verified.'}};
}
export function requestDates(now=new Date()){
 const today=localDate(now),asOfDate=addDays(today,-1);
 const year=today.slice(0,4);
 if(asOfDate<year+'-01-01')return {state:'PENDING_FIRST_COMPLETE_DAY',today,asOfDate:null,previousDate:null};
 const weekPrior=addDays(asOfDate,-7);
 return {state:'OK',today,asOfDate,previousDate:weekPrior>=year+'-01-01'?weekPrior:null};
}
