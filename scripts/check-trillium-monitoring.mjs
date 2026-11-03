import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STOPS} from '../lib/trillium.mjs';
import {sections,candidateFromIssue,appendVisit} from './review-trillium-monitoring-visit.mjs';
import {validatedSiteOnset} from '../lib/trillium-onset-source.mjs';
import SUMMARY from '../data/trillium-site-onset-summary.json' with {type:'json'};
import VISITS from '../data/trillium-monitoring-visits.json' with {type:'json'};
import SOIL from '../data/trillium-monitoring-soil.json' with {type:'json'};

assert.equal(SUMMARY.schema,'trillium-site-onset-v1');
assert.deepEqual(SUMMARY.sites.map(x=>x.siteId).sort(),STOPS.map(s=>s.id).sort(),'Science must follow canonical ten public preserves');
assert.equal(SUMMARY.summary.reviewedVisits,VISITS.visits.length,'Cannot invent or miscount site-monitoring visits');
assert.equal(SUMMARY.summary.completeMeasuredSoilSeasons,SOIL.seasons.length);
assert.ok(validatedSiteOnset(SUMMARY,new Date('2027-06-30T15:00:00Z')));
assert.equal(validatedSiteOnset({...SUMMARY,species:'Trillium erectum'},new Date('2027-06-30T15:00:00Z')),null);
assert.equal(validatedSiteOnset({...SUMMARY,generatedForDate:'2099-04-15'},new Date('2027-06-30T15:00:00Z')),null);

const stop=STOPS[0],date='2027-04-23';
const body=`### Preserve

${stop.name}

### Stable tracked patch code

A

### Date plants were actually inspected

${date}

### Open flowers

no

### Flowers or flower buds

yes

### Snow on the monitored patch

no

### Optional spot soil temperature in Fahrenheit

47.2

### Optional soil probe depth in centimeters

10

### How can the same publicly accessible patch and preserve be verified?

I returned to the same clearly marked anonymous patch A on the authorized public trail; no plant positions or sensitive directions are shared.

### Optional public supporting observation or field log URL

https://www.usanpn.org/nn/faq

### Privacy and access

- [X] I observed the actual plants and have not posted locations.
`;
assert.equal(sections(body)['Open flowers'],'no');
const issue={number:99182,title:'[Trillium monitoring visit] A in Warren Dunes',state:'OPEN',body};
const reviewer={siteVerified:true,speciesVerified:true,samePlotVerified:true,
 reviewer:'owner-review',note:'I checked the full named preserve and recognized the repeat plot evidence, with no coordinates or visitor contact details.'};
const at=new Date('2027-04-25T15:00:00Z');
const row=candidateFromIssue(issue,reviewer,at);
assert.equal(row.siteId,stop.id);
assert.equal(row.plotId,'A');
assert.equal(row.openFlowers,'no','Reviewed negatives are legitimate scientific measurements');
assert.deepEqual(row.soilProbe,{fahrenheit:47.2,depthCm:10,method:'field_probe'});
assert.ok(!JSON.stringify(row).includes('authorized public trail'),'Source site locations may not leak into public archive');
const one=appendVisit(VISITS,row);
assert.equal(one.visits.length,VISITS.visits.length+1);
assert.throws(()=>appendVisit(one,row),'Owner cannot count same public issue twice');
const bad=(changes,review=reviewer)=>candidateFromIssue({...issue,...changes},review,at);
assert.throws(()=>bad({state:'CLOSED'}));
assert.throws(()=>bad({title:'Something else'}));
assert.throws(()=>bad({}, {...reviewer,siteVerified:false}));
assert.throws(()=>bad({}, {...reviewer,samePlotVerified:false}));
assert.throws(()=>bad({body:body.replace('### Open flowers\n\nno','### Open flowers\n\nyes').replace('### Flowers or flower buds\n\nyes','### Flowers or flower buds\n\nno')}));
assert.throws(()=>bad({body:body.replace('2027-04-23','2027-04-28')}),'Future visits must not be published');
assert.throws(()=>bad({body:body.replace('A\n\n### Date','GPS-43.4\n\n### Date')}));

const source=fs.readFileSync(new URL('../components/TrilliumSiteScience.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/michigan-trillium.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../pages/api/trillium-site-onset.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/trillium-site-science.css',import.meta.url),'utf8');
const issueTemplate=fs.readFileSync(new URL('../.github/ISSUE_TEMPLATE/trillium-repeat-visit.yml',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/trillium-monitoring-review.yml',import.meta.url),'utf8');
assert.ok(source.includes('IntervalExperiment')&&source.includes('No independently reviewed repeat-visit series'));
assert.ok(source.includes('INAT')===false,'No public observation is automatically converted to verified onset');
assert.ok(page.includes('<TrilliumSiteScience onOpenStop={selectStop}/>'));
assert.ok(page.includes('trillium-site-science.css'));
assert.ok(api.includes('loadSiteOnset')&&api.includes('s-maxage=600'));
assert.ok(css.includes('@media(max-width:620px)')&&css.includes('.tri-site-science-ladder-marker')===false);
assert.ok(issueTemplate.includes('Open flowers')&&issueTemplate.includes('Flowers or flower buds')&&issueTemplate.includes('Do not post coordinates'));
assert.ok(workflow.includes('workflow_dispatch')&&workflow.includes('github.actor')&&workflow.includes('github.repository_owner'));
assert.ok(!workflow.includes('issues:\n    opened'),'Unreviewed issues must not trigger instant publication');
console.log('Site first-flower research: zero fabricated evidence, visited-patch yes/no/uncertain records, owner review, privacy, data endpoint, responsive field lab and duplicate protections passed.');
