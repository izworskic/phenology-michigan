import assert from 'node:assert/strict';
import {validPoint,gddDailyF,wmsUrl,parseLayer,seasonalSnapshot,requestDates} from '../lib/seasonal-heat.mjs';
const grid=(key,value)=>({type:'FeatureCollection',features:[{properties:{[key]:value}}]});
assert.equal(gddDailyF(80,60),20);
assert.equal(gddDailyF(40,30),0);
assert.equal(gddDailyF(null,60),null);
assert.ok(validPoint(43.6038,-83.9554));
assert.equal(validPoint(43.6038,-122),false);
const u=new URL(wmsUrl(43.6038,-83.9554,'2026-10-31','current'));
assert.equal(u.hostname,'geoserver.usanpn.org');
assert.equal(u.searchParams.get('layers'),'gdd:agdd_50f');
assert.equal(u.searchParams.get('time'),'2026-10-31');
assert.equal(u.searchParams.get('info_format'),'application/json');
assert.throws(()=>wmsUrl(43.6,-83.9,'2026-10-31','bogus'));
assert.throws(()=>wmsUrl(43.6,-83.9,'2026-10-31&evil=1','current'));
assert.equal(parseLayer(grid('AGDD',2805.2687),'current'),2805.2687);
assert.equal(parseLayer(grid('AGDD_ANOMALY',237.42),'anomaly'),237.42);
assert.equal(parseLayer(grid('AGDD',-9999),'current'),null);
assert.equal(parseLayer(grid('AGDD',null),'current'),null);
assert.equal(parseLayer(grid('OTHER',500),'current'),null);
assert.equal(parseLayer({type:'FeatureCollection',features:[]},'current'),null);
const now=new Date('2026-11-01T22:00:00Z'),dates=requestDates(now);
assert.deepEqual(dates,{state:'OK',today:'2026-11-01',asOfDate:'2026-10-31',previousDate:'2026-10-24'});
const snap=seasonalSnapshot({lat:43.6038,lon:-83.9554,asOfDate:dates.asOfDate,
 current:grid('AGDD',2805.2687),anomaly:grid('AGDD_ANOMALY',237.42),
 previous:grid('AGDD',2700.5),previousDate:dates.previousDate,now});
assert.equal(snap.status,'AVAILABLE');
assert.equal(snap.totalGdd50F,2805.3);
assert.equal(snap.comparison.anomalyGdd50F,237.4);
assert.equal(snap.weekChangeGdd50F,104.8);
assert.equal(snap.comparison.direction,'ahead-of-reference');
assert.equal(snap.method.referencePeriod,'1991-2020');
assert.equal(snap.bloomStatus,'UNVERIFIED');
assert.equal(snap.speciesEmergenceStatus,'UNVERIFIED');
assert.ok(snap.sourceUrls.current.includes('gdd%3Aagdd_50f'));
const missing=seasonalSnapshot({lat:43.6038,lon:-83.9554,asOfDate:dates.asOfDate,
 current:grid('AGDD',2800),anomaly:grid('DIFFERENT',15),now});
assert.equal(missing.status,'PARTIAL');
assert.equal(missing.totalGdd50F,2800);
assert.equal(missing.comparison,null);
assert.match(missing.reason,/not mapped/);
const missingCurrent=seasonalSnapshot({lat:47.1848,lon:-88.6408,asOfDate:dates.asOfDate,
 current:grid('AGDD',-9999),anomaly:grid('AGDD_ANOMALY',237.4),now});
assert.equal(missingCurrent.status,'UNAVAILABLE');
assert.equal(missingCurrent.totalGdd50F,null);
const northern=seasonalSnapshot({lat:47.1848,lon:-88.6408,asOfDate:dates.asOfDate,
 current:grid('AGDD',1874.3693),anomaly:grid('AGDD_ANOMALY',-9999),now});
assert.equal(northern.status,'PARTIAL');
assert.equal(northern.totalGdd50F,1874.4);
assert.equal(northern.comparison,null);
const misordered=seasonalSnapshot({lat:43.6038,lon:-83.9554,asOfDate:dates.asOfDate,
 current:grid('AGDD',2700),anomaly:grid('AGDD_ANOMALY',-120),
 previous:grid('AGDD',2800),previousDate:dates.previousDate,now});
assert.equal(misordered.weekChangeGdd50F,null);
const rollover=requestDates(new Date('2027-01-01T17:00:00Z'));
assert.equal(rollover.state,'PENDING_FIRST_COMPLETE_DAY');
assert.equal(rollover.asOfDate,null);
console.log('USA-NPN base-50 thermal evidence passed: exact WMS layers, anomaly, point validation, fail-closed, year rollover.');
