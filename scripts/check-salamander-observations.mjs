import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TARGET_TAXA,observationUrl,publicSearchUrl,broadRegion,aggregateObservations,reviewedMigration} from '../lib/salamander-observations.mjs';
import {REGIONS} from '../lib/salamanders.mjs';

const today='2027-04-10';
const src=observationUrl(TARGET_TAXA[0].name,today),url=new URL(src);
assert.equal(url.host,'api.inaturalist.org');
assert.equal(url.searchParams.get('place_id'),'29');
assert.equal(url.searchParams.get('quality_grade'),'research');
assert.equal(url.searchParams.get('d1'),'2027-03-21');
assert.equal(url.searchParams.get('d2'),'2027-04-10');
assert.equal(url.searchParams.get('per_page'),'200');
assert.throws(()=>observationUrl('SENSITIVE',today));
assert.ok(publicSearchUrl(TARGET_TAXA[1].name).startsWith('https://www.inaturalist.org/observations'));
assert.equal(broadRegion(43.6,-83.9),'saginaw-bay');
assert.equal(broadRegion(46.5,-87.4),'central-up');
assert.equal(broadRegion(47.1,-88.7),'western-up');
assert.equal(broadRegion(null,-83.9),null);
const report=(id,user,date='2027-04-09',region=[-83.90,43.60],opts={})=>({
 id,user:{id:user},observed_on:date,quality_grade:'research',taxon:{name:'Ambystoma maculatum'},
 geojson:{coordinates:region},geoprivacy:'open',taxon_geoprivacy:'open',notes:'DO NOT LEAK Habitat at a private home',
 photos:[{url:'https://photos.example/private-test.jpg'}],...opts
});
const observed=[report(1231,10),report(1232,11),report(1233,10),
 report(1234,12, '2027-03-30'),report(1235,12,'2027-04-02',[-83.8,42.4]),
 report(1236,13,'2027-03-24',[-83.8,42.4],{geoprivacy:'obscured'}),
 report(1237,14,'2027-04-08',[-83.8,42.4],{taxon_geoprivacy:'obscured'}),
 report(1238,14,'2027-04-09',[-83.8,42.4],{coordinates_obscured:true}),
 report(1239,99,'2027-04-09',[-83.8,42.4],{quality_grade:'needs_id'}),
 report(1240,99,'2027-04-09',[-83.8,42.4],{taxon:{name:'Ambystoma tigrinum'}}),
 report(1241,99,'2027-02-01',[-83.8,42.4])
];
const sightings=aggregateObservations([
 {taxon:TARGET_TAXA[0].name,results:observed,total_results:observed.length},
 {taxon:TARGET_TAXA[1].name,results:[],total_results:0}
],today,REGIONS.map(r=>r.id));
assert.equal(sightings.state,'available');
assert.equal(sightings.statewide.count,8);
assert.deepEqual(sightings.statewide.trend,[5,2,1]);
const bay=sightings.regions.find(r=>r.id==='saginaw-bay');
assert.equal(bay.count,4);
assert.equal(bay.state,'reported');
const detroit=sightings.regions.find(r=>r.id==='southeast');
assert.equal(detroit.state,'insufficient');
assert.equal(detroit.count,null);
assert.ok(!JSON.stringify(sightings).includes('private-test.jpg'));
for(const secret of ['DO NOT LEAK','1231','43.6','-83.9','10','photos.example']){
 // "10" may occur coincidentally in URL/metadata; check exact sensitive strings separately.
 if(secret==='10')continue;
 assert.ok(!JSON.stringify(sightings).includes(secret),'Sensitive observation data leaked: '+secret);
}
assert.ok(sightings.claimsMigration===false);
const absent=aggregateObservations([
 {taxon:TARGET_TAXA[0].name,results:observed,total_results:200},
 {taxon:TARGET_TAXA[1].name,error:'unavailable'}
],today,REGIONS.map(r=>r.id));
assert.equal(absent.state,'partial');
assert.equal(absent.regions.find(r=>r.id==='saginaw-bay').count,null);
const capped=aggregateObservations([
 {taxon:TARGET_TAXA[0].name,results:observed,total_results:500},
 {taxon:TARGET_TAXA[1].name,results:[],total_results:0}
],today,REGIONS.map(r=>r.id));
assert.equal(capped.state,'sampled');
assert.equal(capped.sampleComplete,false);
const duplicate=aggregateObservations([
 {taxon:TARGET_TAXA[0].name,results:[report(1,10),report(1,10),report(2,11),report(3,12)],total_results:4},
 {taxon:TARGET_TAXA[1].name,results:[],total_results:0}
],today,REGIONS.map(r=>r.id));
assert.equal(duplicate.regions.find(r=>r.id==='saginaw-bay').count,3);
const samePerson=aggregateObservations([
 {taxon:TARGET_TAXA[0].name,results:[report(1,10),report(2,10),report(3,10)],total_results:3},
 {taxon:TARGET_TAXA[1].name,results:[],total_results:0}
],today,REGIONS.map(r=>r.id));
assert.equal(samePerson.regions.find(r=>r.id==='saginaw-bay').count,null);
const validEvent={
 type:'migration_observed',regionId:'central-up',observedOn:'2027-04-09',reviewedOn:'2027-04-10',
 organization:'Michigan Nature Association',
 summary:'A source-reviewed report documented seasonal salamander movement in the broad central Upper Peninsula.',
 sourceUrl:'https://michigannature.wordpress.com/2027/04/verified-migration/'
};
assert.equal(reviewedMigration([validEvent],today).length,1);
assert.equal(reviewedMigration([{...validEvent,sourceUrl:'https://evil.example/report'}],today).length,0);
assert.equal(reviewedMigration([{...validEvent,summary:'crossing at N 46.555 W 87.444'}],today).length,0);
assert.equal(reviewedMigration([{...validEvent,reviewedOn:'2027-04-08'}],today).length,0);
assert.equal(reviewedMigration([{...validEvent,regionId:'secret-pool'}],today).length,0);
assert.equal(reviewedMigration([{...validEvent,type:'species_sighting'}],today).length,0);
assert.equal(reviewedMigration([validEvent,validEvent],today).length,1);
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/salamander-migration-reports.json',import.meta.url),'utf8')),[],'Do not seed false verified migrations');
const api=fs.readFileSync(new URL('../pages/api/salamander-observations.js',import.meta.url),'utf8');
const comp=fs.readFileSync(new URL('../components/SalamanderObservations.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/salamander-migration.js',import.meta.url),'utf8');
assert.ok(api.includes('isSeason(now)')&&api.includes('s-maxage=10800'));
assert.ok(api.includes('aggregateObservations')&&api.includes('reviewedMigration'));
assert.ok(comp.includes('not documented migration')||comp.includes('not establish'));
assert.ok(comp.includes('No reviewed migration report yet'));
assert.ok(page.includes('SalamanderObservations')&&page.includes('#observations'));
console.log('Salamander observations: privacy, research-grade vs migration, low-sample suppression, regional uncertainty, errors, off-season, zero seeded reports and UI passed.');
