/* Operator pages and explicit YouTube player embeds, reviewed 2026-10-17.
 * Never restream, record, scrape, proxy or auto-classify third-party footage.
 * YouTube embeds are clicked-to-load player iframes, not a claim of uptime.
 */
export const CAMERAS={
  marquette:{name:'Marquette Waterfront & Ore Dock',operator:'WZMQ 19 News',url:'https://www.youtube.com/watch?v=asHboYPi8cQ',operatorPage:'https://wzmq19.com/weather/cameras/',view:'Actual Lower Harbor and ore dock, Lake Superior',embed:{kind:'youtube',videoId:'asHboYPi8cQ'}},
  munising:{name:'Munising Bay Camera',operator:'Greater Munising Bay / Alger County Chamber',url:'https://algercountychamber.com/weather-and-webcams',view:'Munising Bay water'},
  'grand-marais':{name:'Grand Marais Bay & Marina',operator:'Grand Marais Chamber of Commerce',url:'https://grandmaraismichigan.com/webcams/',view:'Grand Marais Harbor, not exposed lake'},
  'whitefish-point':{name:'Whitefish Point Weather Cam',operator:'Great Lakes Shipwreck Historical Society',url:'https://shipwreckmuseum.com/about/live-weather-cam/',view:'Lake Superior coast at Whitefish Point'},
  frankfort:{name:'Frankfort Beach Cameras',operator:'Benzie County Chamber of Commerce',url:'https://www.benzie.org/visitor-resources/',view:'Harbor Lights Resort beachfront camera'},
  ludington:{name:'Ludington Lighthouse Cameras',operator:'Lakeshore Keepers',url:'https://lakeshorekeepers.org/webcams/',view:'Breakwater and Lake Michigan',note:'Breakwater cameras are seasonal (typically May–September); may be offline during lake-smoke season.'},
  'grand-haven':{name:'Grand Haven Pier 360° Live Lighthouse Cam',operator:'Grand Haven Lighthouse Conservancy',url:'https://www.youtube.com/watch?v=aZoKXcoW34g',operatorPage:'https://visitgrandhaven.com/live-cams/',view:'Grand Haven pier and lighthouse on Lake Michigan',embed:{kind:'youtube',videoId:'aZoKXcoW34g'}},
  'mackinaw-city':{name:'Mackinac Bridge Views',operator:'Mackinac Bridge Authority',url:'https://www.mackinacbridge.org/fares-traffic/bridge-cam/',view:'Straits views, some cameras point toward bridge rather than open water',note:'Bridge still images generally refresh every minute; check the timestamp on the operator page.'},
  alpena:{name:'Alpena NOAA Weather Camera',operator:'NOAA GLERL',url:'https://glerl.noaa.gov/metdata/apn/',view:'Thunder Bay shore and conditions'},
  oswego:{name:'Lake Ontario Hart Hall Camera',operator:'SUNY Oswego',url:'https://ww1.oswego.edu/webcams',view:'Campus view toward Lake Ontario'},
  'saginaw-bay':{name:'Saginaw River Cam — Smith Park, Essexville',operator:'Saginaw River Cam / City of Essexville',url:'https://www.youtube.com/watch?v=zWohYnhiBpg',operatorPage:'https://essexville.org/',view:'Saginaw River near its mouth, NOT open water of Saginaw Bay',note:'This nearby river camera cannot verify conditions across the open Saginaw Bay surface.',embed:{kind:'youtube',videoId:'zWohYnhiBpg'}},
};
export function cameraFor(id){return CAMERAS[id]||null;}
export const EMBEDDABLE_IDS=Object.freeze(Object.entries(CAMERAS)
  .filter(([,camera])=>camera.embed?.kind==='youtube')
  .map(([id])=>id));
export function playableCamera(camera){
  if(!camera?.embed||camera.embed.kind!=='youtube')return null;
  const id=camera.embed.videoId;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
  return {
    kind:'youtube',
    videoId:id,
    embedUrl:'https://www.youtube-nocookie.com/embed/'+id+'?rel=0&playsinline=1',
    posterUrl:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
  };
}
