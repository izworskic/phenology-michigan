/* Great Lakes shore-oriented wind guidance, separate from steam-fog formation.
 * This is an editorial VISUAL-DRIFT heuristic, not a sighting, visibility forecast,
 * wind-over-water analysis, plume track or numerical chance of photography success.
 *
 * A shore-to-offshore-grid bearing is an approximate direction to open water.
 * The NWS hourly windDirection is the FROM direction (meteorological convention).
 */
const COMPASS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const NO_VIEW={viewWindows:[],bestView:null};

export function degrees360(n){return (n%360+360)%360;}
export function compass(degrees){
  if(!Number.isFinite(degrees))return null;
  return COMPASS[Math.round(degrees360(degrees)/22.5)%16];
}
export function windFromDegrees(value){
  if(typeof value==='number')return Number.isFinite(value)&&value>=0&&value<=360?degrees360(value):null;
  if(typeof value!=='string')return null;
  const s=value.trim().toUpperCase();
  if(!s||['VRB','VARIABLE','CALM','VAR','N/A','UNKNOWN'].includes(s))return null;
  const idx=COMPASS.indexOf(s);
  if(idx>=0)return idx*22.5;
  // Explicit cardinal or degree notation only; "15 mph" is not a wind direction.
  const match=/^(\d{1,3}(?:\.\d+)?)\s*(?:°|DEG(?:REES)?)$/i.exec(s);
  if(match){const n=Number(match[1]);return n>=0&&n<=360?degrees360(n):null;}
  return null;
}
export function bearingToWater(site){
  const values=[site?.lat,site?.lon,site?.waterLat,site?.waterLon];
  if(!values.every(Number.isFinite))return null;
  const [lat1,lon1,lat2,lon2]=values.map(v=>v*Math.PI/180);
  const diff=lon2-lon1;
  const east=Math.sin(diff)*Math.cos(lat2);
  const north=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(diff);
  // Reject near-identical coordinates as an undefined shoreline orientation.
  if(Math.hypot(east,north)<0.000005)return null;
  return degrees360(Math.atan2(east,north)*180/Math.PI);
}
export function angleDistance(a,b){
  return Math.abs((degrees360(a-b+180))-180);
}
export function driftForHour(site,windDirection,windSpeed){
  const from=windFromDegrees(windDirection);
  const lakeward=bearingToWater(site);
  if(from==null||lakeward==null)return {
    status:'unknown',rank:null,label:'Direction unavailable',explanation:'Wind direction or a usable shore-to-water bearing is missing; no shoreline-view ranking.',
    windFrom:from==null?null:compass(from),windFromDeg:from,driftTowardDeg:from==null?null:degrees360(from+180),
    lakewardDeg:lakeward,lakeward:compass(lakeward)
  };
  const angle=angleDistance(from,lakeward);
  let status,label,rank,explanation;
  if(angle<=55){
    [status,label,rank,explanation]=['shoreward','Toward shore',2,'Wind from open water may carry wisps toward the coast. Shoreline visibility could also deteriorate.'];
  }else if(angle>=125){
    [status,label,rank,explanation]=['lakeward','Out toward lake',1,'Wind from land may push wisps away over the lake; the nearest shore might see less nearby fog.'];
  }else{
    [status,label,rank,explanation]=['alongshore','Along the shore',3,'Wind may sweep wisps sideways across the lake view without necessarily covering the shoreline.'];
  }
  const speed=Number(windSpeed);
  if(!Number.isFinite(speed)||speed<3||speed>16){
    rank=null;
    explanation+=' Wind is too light, strong or unknown for a directional viewing recommendation.';
    return {status:'uncertain',label:'Drift uncertain',rank,explanation,
      windFrom:compass(from),windFromDeg:from,driftTowardDeg:degrees360(from+180),
      lakewardDeg:lakeward,lakeward:compass(lakeward),angleToWaterDeg:Math.round(angle)};
  }
  return {status,label,rank,explanation,
    windFrom:compass(from),windFromDeg:from,driftTowardDeg:degrees360(from+180),
    lakewardDeg:lakeward,lakeward:compass(lakeward),angleToWaterDeg:Math.round(angle)};
}
function byView(a,b){return (b.viewing?.rank??-1)-(a.viewing?.rank??-1)||b.score-a.score||a.time.localeCompare(b.time);}
export function attachViewingOutlook(site,outlook,periods){
  const source=outlook||{hourly:[],windows:[],best:null};
  if(!source.best||!Array.isArray(source.hourly)||!source.hourly.length)return {...source,...NO_VIEW};
  const wx=new Map((periods||[]).filter(p=>Number.isFinite(Date.parse(p.startTime))).map(p=>[new Date(p.startTime).toISOString(),p]));
  const hourly=source.hourly.map(h=>({...h,viewing:driftForHour(site,wx.get(h.time)?.windDirection,h.windMph)}));
  const days=[...new Set(hourly.map(h=>h.date))].sort();
  const viewWindows=[];
  for(const date of days){
    const items=hourly.filter(h=>h.date===date);
    const strongest=Math.max(...items.map(h=>h.score));
    // Don't rank a weaker atmospheric hour merely because its wind angle is favorable.
    const contenders=items.filter(h=>h.score>=50&&h.score>=strongest-15&&h.viewing.rank!=null);
    if(contenders.length)viewWindows.push(contenders.slice().sort(byView)[0]);
  }
  const bestView=viewWindows.slice().sort(byView)[0]||null;
  const windByTime=new Map(hourly.map(h=>[h.time,h.viewing]));
  return {
    ...source,hourly,
    windows:(source.windows||[]).map(w=>({...w,viewing:windByTime.get(w.time)||null})),
    best:source.best?{...source.best,viewing:windByTime.get(source.best.time)||null}:null,
    viewWindows,bestView
  };
}
export function rankShorelineViews(locations){
  return (locations||[]).filter(s=>s.outlook?.bestView?.viewing?.rank!=null&&s.outlook.bestView.score>=50)
    .slice().sort((a,b)=>{
      const av=a.outlook.bestView,bv=b.outlook.bestView;
      return byView(av,bv)||a.name.localeCompare(b.name);
    });
}
