/* Public operator pages, verified 2026-10-16.
 * Links only: do not hotlink camera video/images or claim that a feed is online.
 */
export const CAMERAS={
  marquette:{name:'Marquette Waterfront & Ore Dock',operator:'WZMQ 19 News',url:'https://wzmq19.com/weather/cameras/',view:'Lower Harbor waterfront'},
  munising:{name:'Munising Bay Camera',operator:'Greater Munising Bay / Alger County Chamber',url:'https://algercountychamber.com/weather-and-webcams',view:'Munising Bay water'},
  'grand-marais':{name:'Grand Marais Bay & Marina',operator:'Grand Marais Chamber of Commerce',url:'https://grandmaraismichigan.com/webcams/',view:'Grand Marais Harbor, not exposed lake'},
  'whitefish-point':{name:'Whitefish Point Weather Cam',operator:'Great Lakes Shipwreck Historical Society',url:'https://shipwreckmuseum.com/about/live-weather-cam/',view:'Lake Superior coast at Whitefish Point'},
  frankfort:{name:'Frankfort Beach Cameras',operator:'Benzie County Chamber of Commerce',url:'https://www.benzie.org/visitor-resources/',view:'Harbor Lights Resort beachfront camera'},
  ludington:{name:'Ludington Lighthouse Cameras',operator:'Lakeshore Keepers',url:'https://lakeshorekeepers.org/webcams/',view:'Breakwater and Lake Michigan',note:'Breakwater cameras are seasonal (typically May–September); may be offline during lake-smoke season.'},
  'grand-haven':{name:'Grand Haven Pier & Beach Cameras',operator:'Grand Haven Area Visitors Bureau',url:'https://visitgrandhaven.com/live-cams/',view:'Lake Michigan beach, pier and channel'},
  'mackinaw-city':{name:'Mackinac Bridge Views',operator:'Mackinac Bridge Authority',url:'https://www.mackinacbridge.org/fares-traffic/bridge-cam/',view:'Straits views, some cameras point toward bridge rather than open water',note:'Bridge still images generally refresh every minute; check the timestamp on the operator page.'},
  alpena:{name:'Alpena NOAA Weather Camera',operator:'NOAA GLERL',url:'https://glerl.noaa.gov/metdata/apn/',view:'Thunder Bay shore and conditions'},
  oswego:{name:'Lake Ontario Hart Hall Camera',operator:'SUNY Oswego',url:'https://ww1.oswego.edu/webcams',view:'Campus view toward Lake Ontario'},
};
export function cameraFor(id){return CAMERAS[id]||null;}
