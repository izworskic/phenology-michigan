import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STOPS} from '../lib/trillium.mjs';
import {nearbyFlowers,siteDecision,verifiedSiteReport,dayAge,distanceKm,SITE_RADIUS_KM} from '../lib/trillium-site-verification.mjs';
const stop=STOPS[0],now=new Date('2027-05-15T18:00:00Z');
const good={id:9001,observed_on:'2027-05-14',quality_grade:'research',taxon:{name:'Trillium grandiflorum'},annotations:[{controlled_attribute_id:12,controlled_value_id:13}],geojson:{coordinates:[stop.lon+0.008,stop.lat]},positional_accuracy:25,geoprivacy:'open',taxon_geoprivacy:'open',coordinates_obscured:false};
assert.ok(distanceKm(stop.lat,stop.lon,stop.lat,stop.lon)<.001);
assert.equal(dayAge('2027-05-15',now),0);
assert.equal(dayAge('2027-05-16',now),-1);
assert.equal(dayAge('2027-05-14',now),1);
assert.equal(nearbyFlowers(stop,[good],now).length,1,'A precisely geolocated observed flowering counts as nearby only');
assert.equal(siteDecision(stop,now,[],nearbyFlowers(stop,[good],now)).state,'nearby','Nearby flowers must not confirm inside a preserve');
assert.equal(siteDecision(stop,new Date('2026-10-15T18:00:00Z'),[],nearbyFlowers(stop,[good],now)).state,'off','No autumn bloom claim');
const variants=[
 {...good,id:2,quality_grade:'casual'}, {...good,id:3,taxon:{name:'Trillium erectum'}},
 {...good,id:4,annotations:[]}, {...good,id:5,annotations:[{controlled_attribute_id:12,controlled_value_id:12}]},
 {...good,id:6,positional_accuracy:501}, {...good,id:7,positional_accuracy:null},
 {...good,id:8,geoprivacy:'obscured'}, {...good,id:9,taxon_geoprivacy:'obscured'},
 {...good,id:10,coordinates_obscured:true},
 {...good,id:11,geojson:{coordinates:[stop.lon+0.25,stop.lat]}},
 {...good,id:12,observed_on:'2027-05-01'},
 {...good,id:13,observed_on:'2027-05-16'},
 {...good,id:14,geojson:null,location:null}
];
for(const item of variants)assert.equal(nearbyFlowers(stop,[item],now).length,0,'False proximity or invalid evidence for observation '+item.id);
const exactReport={
 siteId:stop.id,siteName:stop.name,stage:'FLOWERING',observedAt:'2027-05-14',
 reviewedAt:'2027-05-15',reviewedBy:'Field editor',
 sourceKind:'land_manager',sourceUrl:stop.url,
 sourceExcerpt:'White trilliums at this preserve are blooming this week.'
};
assert.equal(verifiedSiteReport(stop,[exactReport],now).stage,'FLOWERING');
const confirmed=siteDecision(stop,now,[exactReport],nearbyFlowers(stop,[good],now));
assert.equal(confirmed.state,'confirmed');
assert.equal(confirmed.report.sourceUrl,stop.url);
assert.equal(confirmed.nearbyCount,1,'Nearby context must remain separate when site is verified');
const badReports=[
 {...exactReport,siteId:'wrong-park'}, {...exactReport,siteName:'wrong preserve'},
 {...exactReport,observedAt:'2027-05-01'}, {...exactReport,observedAt:'2027-05-16'},
 {...exactReport,reviewedAt:'2027-05-01'}, {...exactReport,reviewedAt:'2027-05-16'},
 {...exactReport,reviewedBy:''}, {...exactReport,sourceUrl:'http://bad.example'},
 {...exactReport,sourceUrl:'https://fake.example/photo'},
 {...exactReport,sourceExcerpt:''}, {...exactReport,stage:'PEAKISH'},
 {...exactReport,sourceKind:'reviewed_observation',sourceUrl:'https://www.inaturalist.org/observations/42',sourceExcerpt:''},
 {...exactReport,sourceKind:'reviewed_observation',sourceUrl:'https://www.inaturalist.org/observations/42#extra',sourceExcerpt:'',observationFloweringReviewed:false}
];
for(const report of badReports)assert.equal(verifiedSiteReport(stop,[report],now),null,'Reject invalid on-site report: '+JSON.stringify(report));
const reviewed={...exactReport,sourceKind:'reviewed_observation',sourceUrl:'https://www.inaturalist.org/observations/9001',sourceExcerpt:'',observationFloweringReviewed:true};
assert.equal(siteDecision(stop,now,[reviewed],[]).state,'confirmed');
const ledger=JSON.parse(fs.readFileSync(new URL('../data/trillium-site-reports.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(ledger.reports)&&ledger.reports.length===0,'Live product must not contain pretend verified reports');
const page=fs.readFileSync(new URL('../pages/michigan-trillium.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/trillium.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/trillium.css',import.meta.url),'utf8');
assert.ok(api.includes('siteDecision(')&&api.includes('nearbyFlowers(')&&api.includes('Promise.all(STOPS.map('));
assert.ok(api.includes('SITE_REPORTS.reports')&&api.includes('siteEvidencePolicy'));
assert.ok(page.includes('tri-site-evidence')&&page.includes('ev?.report')&&page.includes('ev.nearbyExamples')&&page.includes('setPendingStop(id)'));
assert.ok(css.includes('.tri-site-evidence.nearby')&&css.includes('.tri-site-evidence.confirmed'));
console.log('Trillium site evidence gate: privacy, date freshness, species, flowering annotations, nearby ≠ on-site, provenance, editorial ledger and UI passed.');
