/* NOAA GLSEA daily full-grid ASCII fallback.
 * The dataset is the full-resolution GLSEA surface-temperature raster published by NOAA
 * CoastWatch independently of its ERDDAP per-pixel API:
 * https://apps.glerl.noaa.gov/coastwatch/webdata/glsea/cur/glsea_cur.asc
 *
 * ESRI ASCII grid coordinates are spherical Web Mercator metres (EPSG:3857).
 * Each row is north-to-south. We sample only a narrowly local offshore pixel.
 * Missing 255 and -9999, stale files, malformed grids and land cells fail closed.
 * File Last-Modified = publication freshness evidence, NOT satellite overpass time.
 */
export const NOAA_GLSEA_ASCII_URL='https://apps.glerl.noaa.gov/coastwatch/webdata/glsea/cur/glsea_cur.asc';
export const NOAA_GLSEA_ASCII_MAX_BYTES=10000000;
export const NOAA_GLSEA_ASCII_MAX_AGE_HOURS=96;
export const MAX_OFFSET_KM=5.5;
const WEB_MERCATOR_RADIUS=6378137;
function coord3857(lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>80||Math.abs(lon)>180)return null;
  const radians=lat*Math.PI/180;
  return {
    x:WEB_MERCATOR_RADIUS*lon*Math.PI/180,
    y:WEB_MERCATOR_RADIUS*Math.log(Math.tan(Math.PI/4+radians/2))
  };
}
function back3857(x,y){
  return {lat:(2*Math.atan(Math.exp(y/WEB_MERCATOR_RADIUS))-Math.PI/2)*180/Math.PI,
    lon:x/WEB_MERCATOR_RADIUS*180/Math.PI};
}
function kilometres(a,b){
  const rad=x=>x*Math.PI/180;
  const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);
  const q=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
  return 12742*Math.asin(Math.min(1,Math.sqrt(q)));
}
function validFreshFile(lastModified,now){
  const time=Date.parse(lastModified||'');
  if(!Number.isFinite(time))throw Error('Daily GLSEA file lacks date provenance');
  const age=(now.getTime()-time)/3600000;
  if(age < -3 || age>NOAA_GLSEA_ASCII_MAX_AGE_HOURS)throw Error('Daily GLSEA source file is stale');
  return new Date(time).toISOString();
}
function parseHeader(lines){
  if(lines.length<7)throw Error('GLSEA raster incomplete');
  const expected=['ncols','nrows','xllcorner','yllcorner','cellsize','nodata_value'];
  const obj={};
  for(let i=0;i<expected.length;i++){
    const parts=lines[i].trim().split(/\s+/);
    const name=parts[0]?.toLowerCase(),v=Number(parts[1]);
    if(name!==expected[i]||parts.length!==2||!Number.isFinite(v))throw Error('Unexpected NOAA ASCII grid header');
    obj[name]=v;
  }
  if(obj.ncols!==1024||obj.nrows!==1024||obj.cellsize!==1800||obj.xllcorner> -1000000||obj.yllcorner<1000000)throw Error('Unexpected GLSEA grid geometry');
  if(lines.length<obj.nrows+6)throw Error('Daily GLSEA raster truncated');
  return obj;
}
function asC(token,mask){
  if(!token || !/^-?\d+(?:\.\d+)?$/.test(token))return null;
  const v=Number(token);
  // NOAA codes 255 for land/missing in the distributed raster.
  if(!Number.isFinite(v)||v===mask||v===255||v<=0.5||v>35)return null;
  return v;
}
export function sampleDailyGlsea(text,sites,lastModified,now=new Date()){
  const time=validFreshFile(lastModified,now);
  if(typeof text!=='string'||text.length>NOAA_GLSEA_ASCII_MAX_BYTES)throw Error('Daily GLSEA raster invalid size');
  const lines=text.trimEnd().split(/\r?\n/);
  const grid=parseHeader(lines);
  const cachedRows=new Map();
  const rowAt=i=>{
    if(i<0||i>=grid.nrows)return null;
    if(!cachedRows.has(i)){
      const cols=lines[i+6]?.trim().split(/\s+/);
      if(cols?.length!==grid.ncols)throw Error('Daily GLSEA raster has malformed data row');
      cachedRows.set(i,cols);
    }
    return cachedRows.get(i);
  };
  const out={};
  for(const site of sites){
    const point=coord3857(site.waterLat,site.waterLon);
    if(!point)continue;
    const col=Math.floor((point.x-grid.xllcorner)/grid.cellsize);
    const row=grid.nrows-1-Math.floor((point.y-grid.yllcorner)/grid.cellsize);
    if(row<0||row>=grid.nrows||col<0||col>=grid.ncols)continue;
    const values=[];
    // Strict 5x5 search, no lakewide imputation. Only neighboring surface-grid pixels.
    for(let dy=-2;dy<=2;dy++){
      for(let dx=-2;dx<=2;dx++){
        const r=row+dy,c=col+dx,columns=rowAt(r);
        if(!columns||c<0||c>=grid.ncols)continue;
        const temp=asC(columns[c],grid.nodata_value);
        if(temp==null)continue;
        const p=back3857(grid.xllcorner+(c+0.5)*grid.cellsize,grid.yllcorner+(grid.nrows-r-0.5)*grid.cellsize);
        const distanceKm=kilometres({lat:site.waterLat,lon:site.waterLon},p);
        if(distanceKm>MAX_OFFSET_KM)continue;
        values.push({temp,distanceKm,lat:p.lat,lon:p.lon});
      }
    }
    values.sort((a,b)=>a.distanceKm-b.distanceKm);
    const best=values[0];
    if(!best)continue;
    out[site.id]={
      c:Math.round(best.temp*10)/10,time,
      kind:'NOAA GLSEA daily surface grid',
      source:'NOAA CoastWatch direct GLSEA daily ASCII',
      sourceUrl:NOAA_GLSEA_ASCII_URL,
      scope:'Offshore GLSEA grid pixel '+(best.distanceKm>1?'approximately '+best.distanceKm.toFixed(1)+' km from requested water cell':'at selected offshore cell')+'; file updated '+time.slice(0,10)+'. Analysis, not a thermometer.',
      timestampType:'Published NOAA grid-file modification time, not a satellite overpass',
      gridOffsetKm:Math.round(best.distanceKm*10)/10,fromDailyGrid:true
    };
  }
  return out;
}
export async function fetchDailyGlsea(sites,now=new Date(),fetcher=fetch,timeoutMs=8500){
  const response=await fetcher(NOAA_GLSEA_ASCII_URL,{
    headers:{Accept:'text/plain,*/*;q=0.5','User-Agent':'GreatLakesLakeSmoke/1.0 (https://phenology.chrisizworski.com/lake-smoke)'},
    signal:AbortSignal.timeout(timeoutMs),
    cache:'no-store'
  });
  if(!response.ok)throw Error('NOAA daily GLSEA HTTP '+response.status);
  const length=Number(response.headers.get('content-length'));
  if(Number.isFinite(length)&&length>NOAA_GLSEA_ASCII_MAX_BYTES)throw Error('NOAA daily raster too large');
  const lastModified=response.headers.get('last-modified');
  validFreshFile(lastModified,now);
  const file=await response.text();
  return sampleDailyGlsea(file,sites,lastModified,now);
}


// Best-effort warm-function memoization: avoid re-downloading an 8 MB daily map
// for multiple uncached page requests served by the same active function instance.
// This is not durable data storage; separate serverless instances may refetch.
let cachedDaily=null;
let inFlightDaily=null;
export function sharedDailyGlsea(sites,now=new Date()){
  if(cachedDaily && now.getTime()-cachedDaily.capturedAt<15*60000 &&
     now.getTime()-cachedDaily.capturedAt>=-60000 &&
     Object.values(cachedDaily.data).every(p=>{
       const age=(now.getTime()-Date.parse(p.time))/3600000;
       return age>=-3&&age<=NOAA_GLSEA_ASCII_MAX_AGE_HOURS;
     }))return Promise.resolve(cachedDaily.data);
  if(inFlightDaily)return inFlightDaily;
  inFlightDaily=fetchDailyGlsea(sites,now).then(data=>{
    cachedDaily={data,capturedAt:now.getTime()};
    return data;
  }).finally(()=>{inFlightDaily=null;});
  return inFlightDaily;
}
