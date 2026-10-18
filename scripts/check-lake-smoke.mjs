import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SITES,scoreWindow,windMph,localParts,morningOutlook,siteStatus} from '../lib/lakeSmoke.mjs';
import {iceSeason,parseIceGrid,iceAssessment,iceAdjustedOutlook,iceAwareStatus} from '../lib/lakeSmokeIce.mjs';
import {CAMERAS,cameraFor} from '../lib/lakeSmokeCameras.mjs';

assert.equal(SITES.length,15,'Cover all five lakes with 15 lookouts');
assert.deepEqual([...new Set(SITES.map(x=>x.lake))].sort(),['Erie','Huron','Michigan','Ontario','Superior']);
assert.ok(SITES.every(x=>x.waterLat&&x.waterLon&&x.lat&&x.lon&&x.tz),'Each point needs a land forecast and an offshore grid point');
assert.equal(windMph('5 to 10 mph'),10);
assert.equal(windMph('Calm'),0);
assert.equal(localParts(new Date('2026-10-16T11:00:00Z'),'America/Detroit').hour,7);
const strong=scoreWindow(14,40,5,0);
assert.ok(strong.score>=75&&strong.spreadC>8,'Warm lake, cold air and breeze should be strong');
assert.equal(scoreWindow(3,50,5).score,0,'Warm air over colder lake cannot be a steam-fog signal');
assert.ok(scoreWindow(14,40,20).score<strong.score,'High winds should suppress a promising viewing score');
assert.equal(scoreWindow(null,40,5),null,'Missing temperature must not produce a score');
const site=SITES.find(x=>x.id==='saginaw-bay'),now=new Date('2026-10-16T09:00:00Z');
const water={c:14,time:'2026-10-16T07:00:00Z'};
const periods=[{startTime:'2026-10-16T11:00:00Z',temperature:39,temperatureUnit:'F',windSpeed:'5 mph',probabilityOfPrecipitation:{value:0}},{startTime:'2026-10-17T12:00:00Z',temperature:50,temperatureUnit:'F',windSpeed:'16 mph',probabilityOfPrecipitation:{value:50}}];
const good=morningOutlook(site,water,periods,now);
assert.equal(good.windows.length,2);
assert.equal(good.best.date,'2026-10-16');
assert.equal(good.best.hour,7);
assert.equal(siteStatus(good,water).tone,'strong');
assert.equal(morningOutlook(site,null,periods,now).windows.length,0,'Missing water must keep scores blank');
assert.equal(morningOutlook(site,{c:14,time:'2026-09-30T00:00:00Z'},periods,now).windows.length,0,'Stale water must keep scores blank');
const api=readFileSync(new URL('../pages/api/lake-smoke.js',import.meta.url),'utf8');
assert.match(api,/GLSEA_ACSPO_GCS/);
assert.match(api,/forecastHourly/);
assert.match(api,/value<=0\.5/,'Near-freezing or masked pixels should be rejected when open water is not verified');
assert.match(api,/noindex, nofollow/);
assert.match(api,/s-maxage=900/,'Fresh source data should replace cached outages within 15 minutes');
const page=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
assert.match(page,/rel='canonical'/);
assert.match(page,/FAQPage/);
assert.match(page,/MapPanel/);
assert.match(page,/MorningChart/);
console.log('Lake smoke engine, data gates, Great Lakes coverage, API and page checks passed');

const winter=new Date('2027-01-14T14:00:00Z');
const autumn=new Date('2026-10-16T14:00:00Z');
assert.equal(iceSeason(autumn),false);
assert.equal(iceSeason(winter),true);
const grid=pct=>({table:{columnNames:['time','latitude','longitude','ice_concentration'],rows:[['2027-01-13T12:00:00Z',43.672,-83.818,pct]]}});
assert.equal(parseIceGrid(grid(0),winter).percent,0);
assert.equal(parseIceGrid(grid(62.5),winter).percent,62.5);
assert.throws(()=>parseIceGrid(grid(-99999),winter),/Invalid ice/,'Missing-value sentinel is not 0% ice');
assert.throws(()=>parseIceGrid(grid(null),winter),/missing/,'Null pixel cannot be read as 0% ice');
assert.throws(()=>parseIceGrid({table:{columnNames:['time','ice_concentration'],rows:[['2026-12-01T12:00:00Z',0]]}},winter),/stale/);
assert.equal(iceAssessment(null,autumn).state,'not-checked','October should not rely on stale summertime ice chart');
assert.equal(iceAssessment(null,winter).state,'unavailable','Winter ice data must fail closed');
assert.equal(iceAssessment({percent:0},winter).state,'sampled-clear');
assert.equal(iceAssessment({percent:6},winter).state,'patchy');
assert.equal(iceAssessment({percent:15},winter).state,'blocked');
const noIce=iceAdjustedOutlook(good,iceAssessment({percent:0},winter));
assert.deepEqual(noIce,good);
assert.equal(iceAdjustedOutlook(good,iceAssessment(null,winter)).best,null,'Missing ice blocks winter score');
assert.equal(iceAdjustedOutlook(good,iceAssessment({percent:40},winter)).best,null,'Heavy ice blocks open-water score');
const patchy=iceAdjustedOutlook(good,iceAssessment({percent:6},winter));
assert.ok(patchy.best.score<=45,'Partial cover caps forecast score');
assert.ok(patchy.windows.every(x=>x.score<=45)&&patchy.hourly.every(x=>x.score<=45),'Cap must apply consistently to chart/hourly');
assert.equal(iceAwareStatus(patchy,water,iceAssessment({percent:6},winter),siteStatus(patchy,water)).label,'Limited — possible ice');
assert.equal(iceAwareStatus(null,water,iceAssessment(null,winter),null).label,'Ice map unavailable');
assert.ok(Object.keys(CAMERAS).length>=8);
assert.ok(Object.keys(CAMERAS).every(id=>SITES.some(x=>x.id===id)&&/^https:\/\//.test(cameraFor(id).url)),'Camera links must map to known location and use HTTPS');
assert.match(cameraFor('saginaw-bay')?.view||'',/NOT open water/,'The independently sourced Essexville river cam must never be presented as open Saginaw Bay');
assert.match(api,/GL_Ice_Concentration_GCS|ICE_DATASET/);
assert.match(api,/iceSeason\(now\)/);
assert.match(api,/iceAdjustedOutlook/);
assert.match(page,/Open operator camera/);
assert.match(page,/iceCheck/);
console.log('Lake smoke winter ice gate and operator webcam contracts passed');


// V3 shore-relative wind guide: directional truth must not alter formation scores.
const {windFromDegrees,bearingToWater,angleDistance,driftForHour,attachViewingOutlook,rankShorelineViews,compass}=await import('../lib/lakeSmokeWind.mjs');
assert.equal(windFromDegrees('N'),0,'N wind comes FROM north');
assert.equal(windFromDegrees('WSW'),247.5);
assert.equal(windFromDegrees('360°'),0);
assert.equal(windFromDegrees('270 deg'),270);
assert.equal(windFromDegrees('VRB'),null,'Variable wind is not an observed bearing');
assert.equal(windFromDegrees('calm'),null);
assert.equal(windFromDegrees('15 mph'),null,'Speed must not be misparsed as a direction');
assert.equal(windFromDegrees('361°'),null);
assert.equal(windFromDegrees(null),null);
assert.equal(compass(360),'N');
assert.equal(compass(-90),'W');
assert.equal(angleDistance(359,1),2,'Bearing wraps around north correctly');
const frankfort=SITES.find(x=>x.id==='frankfort');
assert.ok(bearingToWater(frankfort)>240&&bearingToWater(frankfort)<300,'Lake Michigan open water is west of Frankfort Beach');
const toward=driftForHour(frankfort,'W',6);
assert.equal(toward.status,'shoreward','West wind moves toward Michigan east shore');
assert.equal(toward.driftTowardDeg,90,'West wind blows east');
assert.equal(toward.windFrom,'W');
const away=driftForHour(frankfort,'E',6);
assert.equal(away.status,'lakeward','East wind goes offshore from Lake Michigan east shore');
assert.equal(away.driftTowardDeg,270);
const across=driftForHour(frankfort,'N',6);
assert.equal(across.status,'alongshore','North wind moves south along west-facing shoreline');
assert.ok(across.rank>toward.rank && toward.rank>away.rank);
assert.equal(driftForHour(frankfort,'VRB',6).rank,null,'Unknown wind must not be ranked');
assert.equal(driftForHour(frankfort,'W',0).rank,null,'Calm day must not be ranked');
assert.equal(driftForHour(frankfort,'W',18).rank,null,'Strong wind must not be ranked as a clear view');
assert.equal(driftForHour({...frankfort,waterLat:frankfort.lat,waterLon:frankfort.lon},'W',6).rank,null,'Identical shoreline and water grid points must not be ranked');
const at=new Date('2026-10-16T08:00:00Z');
const modeledWater={c:16,time:'2026-10-16T06:00:00Z'};
const directional=[
  {startTime:'2026-10-16T11:00:00Z',temperature:36,temperatureUnit:'F',windSpeed:'7 mph',windDirection:'W',probabilityOfPrecipitation:{value:0}},
  {startTime:'2026-10-16T12:00:00Z',temperature:37,temperatureUnit:'F',windSpeed:'7 mph',windDirection:'N',probabilityOfPrecipitation:{value:0}},
  {startTime:'2026-10-17T11:00:00Z',temperature:36,temperatureUnit:'F',windSpeed:'7 mph',windDirection:'VRB',probabilityOfPrecipitation:{value:0}}
];
const atmospheric=morningOutlook(frankfort,modeledWater,directional,at);
const enhanced=attachViewingOutlook(frankfort,atmospheric,directional);
assert.equal(atmospheric.best.score,enhanced.best.score,'Wind view info must not modify formation scores');
assert.equal(enhanced.windows.length,atmospheric.windows.length,'Preserve morning atmospheric bars');
assert.equal(enhanced.hourly.length,atmospheric.hourly.length,'Preserve every hourly bar');
assert.equal(enhanced.viewWindows.length,1,'Missing directions cannot create a second viewing morning');
assert.equal(enhanced.bestView.viewing.status,'alongshore','Prefer a comparable across-shore viewing hour');
assert.equal(enhanced.bestView.hour,8,'Viewing hour may differ from highest setup hour');
assert.equal(enhanced.best.hour,7,'Original weather best hour remains unchanged');
assert.equal(attachViewingOutlook(frankfort,atmospheric,[]).bestView,null,'Missing NWS wind direction cannot be manufactured');
const blocked=iceAdjustedOutlook(atmospheric,iceAssessment(null,winter));
assert.equal(attachViewingOutlook(frankfort,blocked,directional).bestView,null,'Never bypass winter ice gate');
const patchyV3=iceAdjustedOutlook(atmospheric,iceAssessment({percent:6},winter));
assert.equal(attachViewingOutlook(frankfort,patchyV3,directional).bestView,null,'Patchy ice caps scores under 50 and prevents a strong-view recommendation');
const ranked=rankShorelineViews([
 {name:'Lakeward',outlook:{bestView:{...enhanced.bestView,viewing:away}}},
 {name:'Across',outlook:{bestView:{...enhanced.bestView,viewing:across}}},
 {name:'Missing',outlook:{bestView:{...enhanced.bestView,viewing:driftForHour(frankfort,'VRB',6)}}},
 {name:'Toward',outlook:{bestView:{...enhanced.bestView,viewing:toward}}}
]);
assert.deepEqual(ranked.map(s=>s.name),['Across','Toward','Lakeward']);
const apiV3=readFileSync(new URL('../pages/api/lake-smoke.js',import.meta.url),'utf8');
const pageV3=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
assert.match(apiV3,/iceAdjustedOutlook\(morningOutlook/);
assert.match(apiV3,/attachViewingOutlook\(site,weatherOutlook/);
assert.match(pageV3,/WindCompass/);
assert.match(pageV3,/rankShorelineViews/);
assert.match(pageV3,/Best shoreline views/);
assert.match(pageV3,/Strongest fog setup/);
assert.match(pageV3,/No direction-qualified/);
console.log('Lake smoke wind direction, dual rankings, unknown-wind gates and winter safeguards passed');


// V4: One-day-ahead issue archive only; never turn modelled weather into sightings.
const {HISTORY_LIMIT,emptyArchive,makeIssueFromLive,updateArchive,validateArchive,historyForSite, nextDate}=await import('../lib/lakeSmokeArchive.mjs');
assert.equal(nextDate('2026-12-31'),'2027-01-01');
assert.equal(nextDate('2028-02-28'),'2028-02-29');
assert.throws(()=>nextDate('2026-02-31'),/Invalid issue/);
const issueNow=new Date('2026-10-16T12:20:00Z');
const tomorrowPoint={
  date:'2026-10-17',time:'2026-10-17T11:00:00.000Z',score:83,spreadC:11.5,windMph:6,
  viewing:{status:'alongshore',windFrom:'NNW',rank:3}
};
const fixture={
  generatedAt:'2026-10-16T12:15:00.000Z',
  locations:SITES.map(s=>({
    id:s.id,water:{time:'2026-10-15T13:00:00.000Z'},
    forecastUpdatedAt:'2026-10-16T11:00:00.000Z',
    iceCheck:{state:'not-checked'},outlook:{windows:[tomorrowPoint],viewWindows:[tomorrowPoint]}
  }))
};
const issue=makeIssueFromLive(fixture,issueNow);
assert.equal(issue.date,'2026-10-16');
assert.equal(issue.targetDay,'2026-10-17');
assert.equal(issue.available,SITES.length);
assert.equal(issue.sites[0].next.score,83);
assert.equal(issue.sites[0].view.windFrom,'NNW');
assert.equal(issue.sites[0].view.drift,'alongshore');
assert.ok(!JSON.stringify(issue).includes('confirmedSightings'),'Archive must not invent observational fields');
assert.throws(()=>makeIssueFromLive({...fixture,locations:fixture.locations.slice(0,-1)},issueNow),/Incomplete/);
assert.throws(()=>makeIssueFromLive({...fixture,generatedAt:'2026-10-15T08:00:00Z'},issueNow),/stale/);
assert.throws(()=>makeIssueFromLive({...fixture,generatedAt:'2026-10-16T12:15:00Z'},new Date('2026-10-17T12:25:00Z')),/stale|another/);
const sparse=makeIssueFromLive({...fixture,locations:fixture.locations.map(x=>({...x,outlook:{windows:[],viewWindows:[]}}))},issueNow);
assert.equal(sparse.available,0,'Missing forecast is stored as missing, not numeric zero');
assert.equal(sparse.sites[0].next,null);
const appended=updateArchive(emptyArchive(),issue);
assert.equal(appended.changed,true);
assert.equal(appended.archive.issues.length,1);
assert.equal(updateArchive(appended.archive,issue).changed,false,'Archives are immutable and idempotent for each local date');
assert.equal(updateArchive(appended.archive,{...issue,sites:sparse.sites}).archive.issues[0].available,15,'Retries must not rewrite issue retrospectively');
assert.equal(historyForSite(appended.archive,'saginaw-bay')[0].score,83);
assert.equal(historyForSite(appended.archive,'does-not-exist').length,0);
assert.equal(validateArchive({schemaVersion:1,kind:'forecast_issues_not_observations',issues:[issue,issue]}).issues.length,1);
assert.equal(validateArchive(null).issues.length,0);
const runner=readFileSync(new URL('../scripts/record-lake-smoke.mjs',import.meta.url),'utf8');
const flow=readFileSync(new URL('../.github/workflows/lake-smoke-archive.yml',import.meta.url),'utf8');
const archiveApi=readFileSync(new URL('../pages/api/lake-smoke-history.js',import.meta.url),'utf8');
const historyPage=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
assert.match(flow,/workflow_dispatch/);
assert.match(flow,/schedule:/);
assert.match(flow,/permissions:\s*\n\s+contents: write/);
assert.match(flow,/node scripts\/record-lake-smoke\.mjs/);
assert.match(flow,/\[skip deploy\]/);
assert.match(runner,/makeIssueFromLive/);
assert.match(runner,/candidate\.available===0/,'Do not bank a day with no data at any lake');
assert.match(runner,/historyRetry/,'Cache-bust a limited number of retries');
assert.match(runner,/attempt<=3/,'Bound retries to prevent resource exhaustion');
assert.match(runner,/updateArchive/);
assert.match(archiveApi,/getGitHubJson/);
assert.match(archiveApi,/evidenceStatus/);
assert.match(historyPage,/Next-morning forecast archive/);
assert.match(historyPage,/No reviewed lake-smoke sightings/);
assert.match(historyPage,/historyForSite/);
assert.match(historyPage,/No data/);
const ledger=JSON.parse(readFileSync(new URL('../data/lake-smoke-observations.json',import.meta.url),'utf8'));
assert.equal(ledger.records.length,0,'Never invent initial confirmed sightings');
assert.ok(ledger.policy.includes('manually reviewed'));
console.log('Lake smoke forecast-issue archive, retry protection, provenance, history display and schedule tests passed');


assert.match(page,/tiles\.openfreemap\.org\/styles\/positron/,'Use keyless OpenFreeMap vector basemap');
assert.match(page,/maplibre-gl@4\.7\.1/,'MapLibre JS and CSS must be loaded');
assert.match(page,/GreatLakesStaticMap/,'Keep offline-safe geographic Great Lakes fallback');
assert.doesNotMatch(page,/basemaps\.cartocdn\.com/,'Do not emit watermarked CARTO raster tiles');
assert.match(page,/ml\.Marker/,'Keep geolocated shore markers on vector map');
assert.match(page,/fitBounds/,'All 15 lake shorelines must fit the map viewport');
assert.match(page,/setSelected|chooseRef\.current/,'Map markers must remain selectable');
assert.match(page,/Keyless Great Lakes shoreline map/);
console.log('Lake smoke keyless vector map, marker layer, style CSS and tile-failure fallback verified');

assert.match(page,/Natural Earth shorelines/,'Geographic outlines must be described accessibly');
assert.match(page,/GREAT_LAKES/,'Fallback uses geographically sourced lake polygon data');
assert.match(page,/smoke-static-pin/,'Fallback locations must remain clickable');
assert.match(page,/onClick=\{\(\)=>onChoose\(site.id\)\}/,'Fallback markers must support location selection');
const geo=readFileSync(new URL('../lib/lakeSmokeGeography.mjs',import.meta.url),'utf8');
assert.match(geo,/ne_50m_lakes\.geojson/,'Great Lakes source attribution must be retained');
assert.match(geo,/Lake Superior/);
assert.match(geo,/Lake Ontario/);
console.log('Lake smoke keyless interactive geographical fallback layer verified');


// NOAA GLSEA outages: only fresh, same-lake, nearby NOAA NDBC WTMP readings may rescue a site.
const {parseNdbcLatest,buoyForSite,kmBetween,MAX_BUOY_KM,MAX_BUOY_AGE_HOURS}=
  await import('../lib/lakeSmokeBuoys.mjs');
const NDBC_NOW=new Date('2026-10-17T11:21:00Z');
const NDBC_HEADER='#STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES PTDY ATMP WTMP DEWP VIS TIDE\n'+
  '#text deg deg yr mo day hr mn degT m/s m/s m sec sec degT hPa hPa degC degC degC nmi ft\n';
const row=(id,lat,lon,time,temp)=>{
  const [y,m,d,h,minute]=time;
  return [id,lat,lon,y,m,d,h,minute,'340','11.0','13.0','MM','MM','MM','MM','1020','MM','4.6',temp,'MM','MM','MM'].join(' ');
};
const rows=[
 row('45029','42.900','-86.272',[2026,10,17,3,30],'11.7'),
 row('45183','44.982','-85.831',[2026,10,17,3,0],'14.7'),
 row('45194','45.803','-84.792',[2026,10,17,3,30],'12.9'),
 row('45165','41.704','-83.264',[2026,10,17,3,40],'16.8'),
 row('45149','43.540','-82.080',[2026,10,17,3,0],'15.4'),
 row('45135','43.780','-76.870',[2026,10,17,3,0],'13.9'),
 row('45026','41.982','-86.619',[2026,10,17,3,30],'15.2'),
 row('45012','43.621','-77.401',[2026,10,17,3,30],'13.8')
];
const NDBC_FIXTURE=NDBC_HEADER+rows.join('\n')+'\n';
const observedBuoys=parseNdbcLatest(NDBC_FIXTURE,NDBC_NOW);
assert.equal(observedBuoys.length,8);
assert.equal(observedBuoys.find(r=>r.id==='45029').c,11.7,'Read WTMP not ATMP');
assert.equal(buoyForSite(SITES.find(s=>s.id==='grand-haven'),observedBuoys)?.stationId,'45029');
assert.equal(buoyForSite(SITES.find(s=>s.id==='frankfort'),observedBuoys)?.stationId,'45183');
assert.equal(buoyForSite(SITES.find(s=>s.id==='mackinaw-city'),observedBuoys)?.stationId,'45194');
assert.equal(buoyForSite(SITES.find(s=>s.id==='st-joseph'),observedBuoys)?.stationId,'45026');
assert.equal(buoyForSite(SITES.find(s=>s.id==='monroe'),observedBuoys)?.stationId,'45165');
assert.equal(buoyForSite(SITES.find(s=>s.id==='oswego'),observedBuoys)?.stationId,'45135');
assert.equal(buoyForSite(SITES.find(s=>s.id==='saginaw-bay'),observedBuoys),null,'Do not substitute a far lakewide reading for Saginaw Bay');
assert.equal(buoyForSite(SITES.find(s=>s.id==='marquette'),observedBuoys),null,'No distant Great Lakes proxy');
assert.ok(MAX_BUOY_KM<=55&&MAX_BUOY_AGE_HOURS<=18);
assert.ok(buoyForSite(SITES.find(s=>s.id==='grand-haven'),observedBuoys).isProxy);
assert.ok(buoyForSite(SITES.find(s=>s.id==='grand-haven'),observedBuoys).distanceKm<35);
assert.ok(buoyForSite(SITES.find(s=>s.id==='grand-haven'),observedBuoys).scope.includes('NOT a shoreline'));
assert.ok(kmBetween(43,-86,43,-86)<0.001);
assert.equal(parseNdbcLatest(NDBC_HEADER+row('45029','42.900','-86.272',[2026,10,15,3,30],'11.7'),NDBC_NOW).length,0,'Stale buoy must fail closed');
assert.equal(parseNdbcLatest(NDBC_HEADER+row('45029','42.900','-86.272',[2026,10,17,3,30],'MM'),NDBC_NOW).length,0,'Missing WTMP sentinel cannot become a temperature');
assert.equal(parseNdbcLatest(NDBC_HEADER+row('45029','42.900','-86.272',[2026,10,17,3,30],'99.9'),NDBC_NOW).length,0,'Reject invalid water temperatures');
assert.equal(parseNdbcLatest(NDBC_HEADER+row('45029','42.900','-86.272',[2026,10,17,3,30],'0.0'),NDBC_NOW).length,0,'Reject near freezing NDBC as uncertain ice/water state');
assert.equal(parseNdbcLatest(NDBC_HEADER+row('99999','42.900','-86.272',[2026,10,17,3,30],'11.7'),NDBC_NOW).length,0,'Unapproved buoy is not assigned to a lake');
assert.throws(()=>parseNdbcLatest('not ndbc'),/malformed/);
assert.throws(()=>parseNdbcLatest(NDBC_HEADER.replace('WTMP','ATMP')),/columns changed/);
assert.ok(!buoyForSite(SITES.find(s=>s.id==='monroe'),observedBuoys).sourceUrl.includes('glsea'),'Buoy provenance should remain distinct');
const smokeApiV5=readFileSync(new URL('../pages/api/lake-smoke.js',import.meta.url),'utf8');
const smokePageV5=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
assert.match(smokeApiV5,/getText\(NDBC_LATEST_URL,6500\)/,'One NDBC request should be shared among all sites');
assert.match(smokeApiV5,/glsea\|\|direct\|\|buoyForSite/,'Use local NOAA grid before a buoy fallback');
assert.match(smokeApiV5,/buoyBackedLocations/);
assert.match(smokeApiV5,/iceAdjustedOutlook/,'Ice gate remains intact for buoy-backed sites');
assert.match(smokePageV5,/NOAA buoy '\+picked.water.stationId/,'NOAA buoy links remain station-specific');
assert.match(smokePageV5,/picked.water.scope/);
console.log('Lake smoke live NOAA buoy fallback same-lake, distance, age, provenance and ice source gates passed');


// Direct NOAA CoastWatch GLSEA full-resolution daily raster, independent of ERDDAP.
const {sampleDailyGlsea,NOAA_GLSEA_ASCII_URL,NOAA_GLSEA_ASCII_MAX_BYTES,MAX_OFFSET_KM}=
  await import('../lib/lakeSmokeGlseaAscii.mjs');
assert.equal(NOAA_GLSEA_ASCII_URL,'https://apps.glerl.noaa.gov/coastwatch/webdata/glsea/cur/glsea_cur.asc');
assert.ok(NOAA_GLSEA_ASCII_MAX_BYTES>=8000000 && NOAA_GLSEA_ASCII_MAX_BYTES<=12000000);
const directNow=new Date('2026-10-17T12:00:00Z'),modified='Sat, 17 Oct 2026 10:50:00 GMT';
const xll=-10288921.955,yll=4676874.158,cell=1800;
const position=site=>{
 const x=6378137*site.waterLon*Math.PI/180;
 const y=6378137*Math.log(Math.tan(Math.PI/4+site.waterLat*Math.PI/360));
 return {col:Math.floor((x-xll)/cell),row:1023-Math.floor((y-yll)/cell)};
};
const rowBlank=' 255.000'.repeat(1024);
const dailyLines=Array(1024).fill(rowBlank);
for(const [id,temp] of [['saginaw-bay','12.700'],['marquette','8.900'],['alpena','13.200'],['tawas','12.300']]){
 const p=position(SITES.find(s=>s.id===id));
 assert.ok(p.col>0&&p.col<1024&&p.row>0&&p.row<1024);
 const cols=dailyLines[p.row].trim().split(/\s+/);
 cols[p.col]=temp;
 dailyLines[p.row]=' '+cols.join(' ');
}
const dailyText=['ncols 1024','nrows 1024','xllcorner '+xll,'yllcorner '+yll,'cellsize '+cell,'NODATA_value -9999.0',...dailyLines].join('\n')+'\n';
const direct=sampleDailyGlsea(dailyText,SITES,modified,directNow);
assert.equal(direct['saginaw-bay']?.c,12.7,'A real Saginaw Bay offshore pixel must be recoverable');
assert.equal(direct['marquette']?.c,8.9,'A Lake Superior offshore pixel must be recoverable');
assert.equal(direct['alpena']?.c,13.2,'A Lake Huron offshore pixel must be recoverable');
assert.equal(direct['tawas']?.c,12.3,'A second Huron offshore cell must be recoverable');
assert.equal(direct['frankfort'],undefined,'Masked water pixels must remain unavailable');
assert.equal(direct['saginaw-bay'].fromDailyGrid,true);
assert.equal(direct['saginaw-bay'].sourceUrl,NOAA_GLSEA_ASCII_URL);
assert.match(direct['saginaw-bay'].timestampType,/not a satellite overpass/);
assert.ok(direct['saginaw-bay'].gridOffsetKm<MAX_OFFSET_KM);
assert.throws(()=>sampleDailyGlsea(dailyText,SITES,'Sat, 10 Oct 2026 10:00:00 GMT',directNow),/stale/);
assert.throws(()=>sampleDailyGlsea(dailyText,SITES,null,directNow),/lacks date/);
assert.throws(()=>sampleDailyGlsea(dailyText.slice(0,6000),SITES,modified,directNow),/truncated/);
assert.throws(()=>sampleDailyGlsea(dailyText.replace('cellsize 1800','cellsize 999'),SITES,modified,directNow),/geometry/);
assert.throws(()=>sampleDailyGlsea(dailyText.replace('ncols 1024','ncols 512'),SITES,modified,directNow),/geometry/);
const coastApi=readFileSync(new URL('../pages/api/lake-smoke.js',import.meta.url),'utf8');
const coastPage=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
assert.match(coastApi,/sharedDailyGlsea\(SITES,now\)/,'Exactly one shared daily GLSEA request');
assert.match(coastApi,/glsea\|\|direct\|\|buoyForSite/,'Original ERDDAP pixel first, full NOAA raster second, local buoy third');
assert.match(coastApi,/dailyGridBackedLocations/);
assert.match(coastApi,/iceAdjustedOutlook/,'Winter ice gate remains in all pathways');
assert.match(coastPage,/NOAA daily grid source/,'Daily map provenance is explicitly labelled');
assert.match(coastPage,/file last modified/,'Do not equate file modification time with satellite observation');
console.log('Lake smoke NOAA direct GLSEA 1024-grid projection, Saginaw Bay, Superior, missing/old cell safety passed');


// V7 authentic lake-smoke photo and location-specific, operator-hosted live embeds.
const {CAMERAS:LIVE_CAMS,cameraFor:camFor,playableCamera,EMBEDDABLE_IDS}=
  await import('../lib/lakeSmokeCameras.mjs');
assert.deepEqual([...EMBEDDABLE_IDS].sort(),['grand-haven','grand-marais','marquette','munising','saginaw-bay']);
for(const id of EMBEDDABLE_IDS){
  const camera=camFor(id),playable=playableCamera(camera);
  assert.ok(playable,'Operator player must be configured for '+id);
  assert.match(playable.embedUrl,/^https:\/\//,'Operator iframe URL must be HTTPS');
  assert.ok(['youtube','nest','ipcamlive'].includes(playable.kind));
  assert.ok(camera.url.startsWith('https://'));
}
assert.equal(camFor('marquette').operator,'WZMQ 19 News');
assert.equal(playableCamera(camFor('marquette'))?.embedUrl,'https://g1.ipcamlive.com/player/player.php?alias=6a025c9c5ea0d');
assert.equal(playableCamera(camFor('munising'))?.embedUrl,'https://video.nest.com/embedded/live/o8aiKdKx4x?autoplay=0');
assert.equal(playableCamera(camFor('grand-marais'))?.embedUrl,'https://video.nest.com/embedded/live/A2SY1WyGt4?autoplay=0');
assert.equal(playableCamera(camFor('grand-haven'))?.embedUrl,'https://www.youtube-nocookie.com/embed/aZoKXcoW34g?rel=0&playsinline=1');
assert.equal(camFor('grand-haven').operator,'Grand Haven Lighthouse Conservancy');
assert.match(camFor('saginaw-bay').view,/NOT open water/,'River cam is NOT open Saginaw Bay');
assert.match(camFor('grand-marais').view,/not exposed/,'Harbor camera is not an offshore lake observation');
assert.ok(!camFor('alpena').embed,'Unverified embeds are omitted');
assert.equal(playableCamera(camFor('alpena')),null);
assert.equal(playableCamera({embed:{kind:'youtube',videoId:'bad'}}),null);
assert.equal(playableCamera({embed:{kind:'nest',cameraId:'../evil'}}),null);
assert.equal(playableCamera({embed:{kind:'ipcamlive',alias:'abc&src=bad'}}),null);
assert.equal(playableCamera({embed:{kind:'iframe',url:'https://untrusted.example'}}),null);
assert.ok(Object.values(LIVE_CAMS).every(cam=>cam.url.startsWith('https://')),'Operator links must be HTTPS');
const licensedHero=readFileSync(new URL('../public/lake-smoke/lake-smoke-hero.jpg',import.meta.url));
assert.ok(licensedHero.byteLength>35000 && licensedHero.byteLength<2500000,'Licensed photo must be a real locally committed image');
assert.equal(licensedHero[0],0xff,'Hero should have JPEG magic number');
assert.equal(licensedHero[1],0xd8,'Hero should have JPEG magic number');
const packageConfig=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(packageConfig.scripts.build,'next build','Build must not depend on third-party media availability');
const lakePage=readFileSync(new URL('../pages/lake-smoke.js',import.meta.url),'utf8');
const lakeCss=readFileSync(new URL('../public/lake-smoke.css',import.meta.url),'utf8');
assert.match(lakePage,/smoke-hero-photo/);
assert.match(lakePage,/Edward Stojakovic \/ Wikimedia Commons/);
assert.match(lakePage,/CC BY 2\.0/);
assert.match(lakePage,/Steaming_Lake_Michigan/,'Photo must cite genuine Lake Michigan steam fog');
assert.match(lakePage,/iframe key=\{player.kind\+'-'\+player.id\}/,'Operator player is keyed by validated source and ID');
assert.match(lakePage,/allowFullScreen/,'Video player supports fullscreen viewing');
assert.match(lakePage,/loading='lazy'/,'Heavy camera content is lazily loaded');
assert.match(lakePage,/onClick=\{\(\)=>setPlaying\(true\)\}/,'Video requires user initiation, not autoplay on page load');
assert.match(lakePage,/key=\{picked.id\} camera=\{selectedCamera\}/,'New location resets prior camera player');
assert.match(lakePage,/picked\?\.camera\|\|cameraFor\(picked\?\.id\)/,'Show camera immediately before NOAA weather finishes');
assert.match(lakePage,/snapshotUrl/,'Still-image operator feeds can be refreshed when allowed');
assert.match(lakePage,/camera\?\.operatorPage/,'Operator camera options retain original provider links');
assert.match(lakeCss,/aspect-ratio:16\/9/,'Embeds have responsive widescreen layout');
assert.ok(lakePage.indexOf("id='cameras'")<lakePage.indexOf('<ShorelineViewing site={picked}/>'),
  'Embed appears near selected-location forecast, before history');

assert.match(lakePage,/Choose an embedded shoreline camera/,'Show operator camera selection without background stream loading');
assert.match(lakePage,/EMBEDDABLE_IDS\.map/,'Show every published embedded camera');
assert.match(lakePage,/chooseCamera\(id\)/,'Camera choices must switch site and scroll to player');
assert.match(lakePage,/smoke-list-cam-flag/,'Lookout list must show camera availability');
assert.match(lakePage,/smoke-top-camera-hint/,'Forecast ranking must reveal camera availability');
assert.match(lakePage,/player\.kind==='youtube'/,'Vendor-specific source avoids forcing incompatible autoplay parameters');
assert.match(lakePage,/stream status unverified/,'No false live-camera uptime claims');
assert.match(lakePage,/player\?\.kind==='youtube'\?'Open live stream on YouTube/,'Only YouTube links may claim a YouTube destination');
assert.match(lakeCss,/\.smoke-camera-picks\{/);

console.log('Lake-smoke authentic photo, five verified operator camera URLs, and no-autoplay watch board passed');
