import assert from 'node:assert/strict';
import fs from 'node:fs';
import CONFIG from '../data/michigan-observation-regions.json' with {type:'json'};
import ARCHIVE from '../data/michigan-phenophase-geography.json' with {type:'json'};
import {normalizeGeographyArchive} from '../lib/michigan-phenophase-geography.mjs';

assert.equal(CONFIG.schema,'michigan-observation-regions-v1');
assert.equal(CONFIG.regions.length,9);
assert.equal(CONFIG.inaturalistPlaceId,29);
assert.ok(CONFIG.phenophases.some(x=>x.id==='leaf-fall' && x.inat===null),'Do not map missing iNaturalist leaf-fall annotation to actual leaf fall.');
const h=new Date();
const current=normalizeGeographyArchive(ARCHIVE,h);
assert.ok(current,'Initial or refreshed science archive must satisfy region, source and privacy schema.');
assert.equal(current.regions.length,9);
assert.equal(current.science.noSubmissionRequired,true);
assert.deepEqual(current.regions.map(x=>x.id),CONFIG.regions.map(x=>x.id));
assert.equal(normalizeGeographyArchive({...ARCHIVE,asOfDate:'2099-11-01'},h),null,'No future summaries');
assert.equal(normalizeGeographyArchive({...ARCHIVE,sourceStatus:{...ARCHIVE.sourceStatus,usaNpn:'invented'}},h),null);
assert.equal(normalizeGeographyArchive({...ARCHIVE,regions:[{...ARCHIVE.regions[0],lat:44.44},...ARCHIVE.regions.slice(1)]},h),null,'Never accept precise unapproved coordinates');
const off=normalizeGeographyArchive(ARCHIVE,new Date(Date.parse(ARCHIVE.asOfDate+'T16:00:00Z')+7*86400000));
assert.ok(off===null||off.status==='stale','Old archival reports never look current');
if(off)assert.ok(off.regions.every(x=>x.phases.length===0),'Suppress stale positive stages when upstream is late');
const bad=JSON.parse(JSON.stringify(ARCHIVE));
bad.regions[0].phases=[{id:'leaf-color',group:'plants',latest:'2026-11-02',coverage:'limited-sample',
    reportingSites:1,reportingObservers:0,uniqueReportingDays:1,sourceReports:{'usa-npn':1,inaturalist:0},
    species:[{name:'red maple',date:'2026-11-02',source:'usa-npn'}]}];
assert.ok(normalizeGeographyArchive(bad,h));
bad.regions[0].phases[0].species[0].source='untrusted';
assert.equal(normalizeGeographyArchive(bad,h),null,'Species example citations must come from one of two approved networks');

const page=fs.readFileSync(new URL('../pages/index.js',import.meta.url),'utf8');
const dispatch=fs.readFileSync(new URL('../components/NaturalYearDispatch.js',import.meta.url),'utf8');
const map=fs.readFileSync(new URL('../components/MichiganPhenophaseMap.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/michigan-phenophase-geography.css',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('./build-michigan-phenophase-geography.py',import.meta.url),'utf8');
assert.ok(page.includes('readGeographyEvidence()')&&page.includes('geography={geographyEvidence}'));
assert.ok(page.includes('<NaturalYearDispatch read={naturalYear} geography={geographyEvidence} />'));
assert.ok(page.includes('michigan-phenophase-geography.css'));
assert.ok(page.includes('<link rel="canonical" href={SITE + "/"} />'));
assert.ok(page.includes('<SpeciesTrialObservatory data={speciesTrials} />'));
assert.ok(dispatch.includes('["map","Across Michigan"]'));
assert.ok(dispatch.includes('<MichiganPhenophaseMap data={geography} />'));
assert.ok(dispatch.includes('new URLSearchParams(window.location.search).get("view")'),"The geography tab must support a shareable home ?view=map deep link");
assert.ok(dispatch.includes('["now","map","next","regions"]'),"Only existing dispatch views may be selected through the URL");
assert.ok(!map.includes('navigator.geolocation'),'No precise visitor location tracking feature should be introduced');
assert.ok(map.includes('no individual field-site coordinates'));
assert.ok(map.includes('No visitor reporting or verification is needed here'));
assert.ok(map.includes('Map tiles unavailable. Choose a region'));
assert.ok(css.includes('@media(max-width:520px)'));
for(const raw of ['site_id','individual_id','latitude','longitude','geojson.coordinates']){
 assert.ok(!JSON.stringify(ARCHIVE).includes('"'+raw+'"'),'No raw site/observer geolocation fields in the public archive: '+raw);
}
assert.ok(script.includes('phenophase_status')&&script.includes('geoprivacy')&&script.includes('MAX_INAT_PAGE'));
console.log('Michigan geographic phenophases: source and location schema, 14-day evidence, stale shutdown, URL preservation, privacy, map fallback, source attribution and no public contributions all passed.');
