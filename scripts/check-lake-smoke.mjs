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
assert.match(api,/s-maxage=3600/);
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
assert.equal(cameraFor('saginaw-bay'),null,'No inventing unverified Saginaw Bay webcam');
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
