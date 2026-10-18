/* Operator camera pages and published embedded players, reviewed 2026-10-17.
 * Never restream, record, scrape, proxy or auto-classify third-party footage.
 * Approved YouTube, Nest and IPCamLive player iframes are clicked-to-load.
 * Embeddability is not evidence of stream uptime.
 */
export const CAMERAS={
  marquette:{name:'Marquette Waterfront & Ore Dock',operator:'WZMQ 19 News',url:'https://wzmq19.com/weather/cameras/',view:'Lower Harbor waterfront and ore dock, Lake Superior',embed:{kind:'ipcamlive',alias:'6a025c9c5ea0d'},note:'Operator hosts the waterfront player. Live status is not monitored.'},
  munising:{name:'Munising Bay Cam',operator:'Pictured Rocks Cruises / Explore Munising',url:'https://www.exploremunising.com/web-cams/',view:'Munising Bay, near docks and Grand Island',embed:{kind:'nest',cameraId:'o8aiKdKx4x'},note:'Published embedded camera player on the local visitor website. Service may be offline or seasonally unavailable.'},
  'grand-marais':{name:'Grand Marais Harbor Camera',operator:'Grand Marais Tavern / Explore Munising',url:'https://www.exploremunising.com/web-cams/',view:'Grand Marais harbor, not exposed Lake Superior',embed:{kind:'nest',cameraId:'A2SY1WyGt4'},note:'Harbor view, not an offshore lake visibility measurement. The source may be unavailable seasonally.'},
  'whitefish-point':{name:'Whitefish Point Weather Cam',operator:'Great Lakes Shipwreck Historical Society',url:'https://shipwreckmuseum.com/about/live-weather-cam/',view:'Lake Superior coast at Whitefish Point'},
  frankfort:{name:'Lake Michigan View — Oliver Art Center',operator:'Oliver Art Center',url:'https://oliverartcenterfrankfort.org/webcam',view:'Lake Michigan and the Frankfort breakwater from Oliver Art Center',embed:{kind:'rtspme',streamId:'SQ2GeaQN'},autoEmbed:true,note:'This is a nearby Frankfort lake-facing view, not the Harbor Lights beachfront camera. Check the time printed on the footage; a player may display an older frame.',alternates:[{name:'Betsie Bay Harbor View — Oliver Art Center',operator:'Oliver Art Center',url:'https://oliverartcenterfrankfort.org/webcam',view:'Betsie Bay harbor at Frankfort — NOT exposed Lake Michigan',embed:{kind:'rtspme',streamId:'A9ST7n4N'},note:'This is an inland harbor view, not a check of conditions on open Lake Michigan. Check the footage timestamp.'}],unavailableCameras:[{name:'Harbor Lights Beach',operator:'Harbor Lights Resort / Angelcam',url:'https://frankfort-harbor-lights-beach.click2stream.com/',status:'Source unavailable',note:'The original Harbor Lights webcam is stuck on “Connecting to camera” on its own provider page. Embedding it cannot restore the stream.'}]},
  ludington:{name:'Ludington Lighthouse Cameras',operator:'Lakeshore Keepers',url:'https://lakeshorekeepers.org/webcams/',view:'Breakwater and Lake Michigan',note:'Breakwater cameras are seasonal (typically May–September); may be offline during lake-smoke season.'},
  'grand-haven':{name:'Grand Haven Pier 360° Live Lighthouse Cam',operator:'Grand Haven Lighthouse Conservancy',url:'https://www.youtube.com/watch?v=aZoKXcoW34g',operatorPage:'https://visitgrandhaven.com/live-cams/',view:'Grand Haven pier and lighthouse on Lake Michigan',embed:{kind:'youtube',videoId:'aZoKXcoW34g'}},
  'mackinaw-city':{name:'Mackinac Bridge Views',operator:'Mackinac Bridge Authority',url:'https://www.mackinacbridge.org/fares-traffic/bridge-cam/',view:'Straits views, some cameras point toward bridge rather than open water',note:'Bridge still images generally refresh every minute; check the timestamp on the operator page.'},
  alpena:{name:'Alpena NOAA Weather Camera',operator:'NOAA GLERL',url:'https://glerl.noaa.gov/metdata/apn/',view:'Thunder Bay shore and conditions'},
  oswego:{name:'Lake Ontario Hart Hall Camera',operator:'SUNY Oswego',url:'https://ww1.oswego.edu/webcams',view:'Campus view toward Lake Ontario'},
  'saginaw-bay':{name:'Saginaw River Cam — Smith Park, Essexville',operator:'Saginaw River Cam / City of Essexville',url:'https://www.youtube.com/watch?v=zWohYnhiBpg',operatorPage:'https://essexville.org/',view:'Saginaw River near its mouth, NOT open water of Saginaw Bay',note:'This nearby river camera cannot verify conditions across the open Saginaw Bay surface.',embed:{kind:'youtube',videoId:'zWohYnhiBpg'}},
};
export function cameraFor(id){return CAMERAS[id]||null;}
export const EMBEDDABLE_IDS=Object.freeze(Object.entries(CAMERAS)
  .filter(([,camera])=>Boolean(playableCamera(camera)))
  .map(([id])=>id));
export function playableCamera(camera){
  const embed=camera?.embed;
  if(!embed||typeof embed!=='object')return null;
  if(embed.kind==='youtube'){
    const id=embed.videoId;
    if(typeof id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
    return {
      kind:'youtube',id,
      embedUrl:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1',
      posterUrl:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
    };
  }
  if(embed.kind==='nest'){
    const id=embed.cameraId;
    if(typeof id!=='string'||!/^[A-Za-z0-9]{10}$/.test(id))return null;
    return {kind:'nest',id,embedUrl:'https://video.nest.com/embedded/live/'+id+'?autoplay=0',posterUrl:null};
  }
  if(embed.kind==='angelcam'){
    const id=embed.cameraId;
    if(typeof id!=='string'||!/^[a-z0-9]{10}$/.test(id))return null;
    return {kind:'angelcam',id,embedUrl:'https://v.angelcam.com/iframe?v='+id+'&autoplay=0',posterUrl:null};
  }
  if(embed.kind==='rtspme'){
    const id=embed.streamId;
    if(typeof id!=='string'||!/^[A-Za-z0-9]{8}$/.test(id))return null;
    return {kind:'rtspme',id,embedUrl:'https://rtsp.me/embed/'+id+'/',posterUrl:null};
  }
  if(embed.kind==='ipcamlive'){
    const id=embed.alias;
    if(typeof id!=='string'||!/^[0-9a-f]{13}$/.test(id))return null;
    return {kind:'ipcamlive',id,embedUrl:'https://g1.ipcamlive.com/player/player.php?alias='+id,posterUrl:null};
  }
  return null;
}
export const CAMERA_REVIEW_DATE='2026-10-17';
