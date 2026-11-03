import assert from 'node:assert/strict';
import fs from 'node:fs';
import ARCHIVE from '../data/michigan-phenophase-archive/2026.json' with {type:'json'};
import INDEX from '../data/michigan-phenophase-archive-index.json' with {type:'json'};
import {validateHistoryIndex,validateHistoryYear} from '../lib/phenophase-history.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));

assert.ok(validateHistoryIndex(INDEX),'The committed archive catalog must have a complete, scientific schema');
assert.ok(validateHistoryYear(ARCHIVE,2026),'An original real 2026 geography capture must be readable');
assert.equal(INDEX.snapshotCount,INDEX.years.reduce((sum,r)=>sum+r.snapshotDays,0));
assert.equal(ARCHIVE.snapshots[0].asOfDate,'2026-11-03');
assert.equal(ARCHIVE.snapshots[0].windowStart,'2026-10-20');
assert.equal(ARCHIVE.snapshots[0].windowEnd,'2026-11-03');
assert.equal(ARCHIVE.snapshots[0].kind,'overlapping-14-day-reporting-snapshot');

{
 const bad=clone(ARCHIVE);
 bad.snapshots[0].regions[4].latitude=43.614342;
 assert.equal(validateHistoryYear(bad,2026),null,'Exact public schema forbids observation GPS coordinates');
}
{
 const bad=clone(ARCHIVE);
 bad.snapshots[0].regions[0].phases[0].reporter='observer:1234';
 assert.equal(validateHistoryYear(bad,2026),null,'Individual submitters must not be stored');
}
{
 const bad=clone(ARCHIVE);
 bad.snapshots.push(clone(bad.snapshots[0]));
 assert.equal(validateHistoryYear(bad,2026),null,'Duplicate capture date is prohibited');
}
{
 const bad=clone(ARCHIVE);
 bad.snapshots[0].kind='daily-unique-biological-events';
 assert.equal(validateHistoryYear(bad,2026),null,'Never reclassify overlapping windows as daily occurrence counts');
}
{
 const bad=clone(ARCHIVE);
 bad.snapshots[0].sourceStatus.usaNpn='failed';
 assert.equal(validateHistoryYear(bad,2026),null,'Unverified source health is not an archival success');
}
{
 const bad=clone(INDEX);
 bad.years[0].snapshotDays++;
 assert.equal(validateHistoryIndex(bad),null,'Annual index must reconcile with the number of captured days');
}
{
 const bad=clone(INDEX);
 bad.years[0].file='https://malicious.example/observations';
 assert.equal(validateHistoryIndex(bad),null,'Annual source URLs cannot be attacker supplied');
}
{
 const bad=clone(INDEX);
 bad.interpretation.visitorSubmissionsRequired=true;
 assert.equal(validateHistoryIndex(bad),null,'No manual visitor verification or submission workflow');
}

const api=fs.readFileSync(new URL('../pages/api/phenophase-history.js',import.meta.url),'utf8');
const job=fs.readFileSync(new URL('../.github/workflows/michigan-phenophase-geography.yml',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('./archive-michigan-phenophase.py',import.meta.url),'utf8');
assert.ok(api.includes('readHistoryIndex')&&api.includes('readHistoryYear'));
assert.ok(api.includes("state:'not-collected'"),'A missed collection day is not a missing biological event');
assert.ok(api.includes('history.snapshots.length!==indexed.snapshotDays'),'Do not mistake incomplete fallback history for an uncollected day');
assert.ok(api.includes('indexed.lastSnapshot'),'Cross-check archived date coverage against live year metadata');
assert.ok(api.includes('s-maxage=600'),'Cache the index and annual archive');
assert.ok(job.includes('archive-michigan-phenophase.py'),'Daily source workflow must archive every successful capture');
assert.ok(job.includes('michigan-phenophase-archive-index.json'),'Daily source workflow must publish archival discovery');
assert.ok(job.includes('michigan-phenophase-archive'),'Year rollover must commit newly created archive files');
assert.ok(worker.includes('already-archived-immutable'));
assert.ok(worker.includes('index_from_archives'));
assert.ok(worker.includes('NEVER add consecutive snapshot counts together.'));
assert.equal(JSON.stringify(ARCHIVE).includes('"latitude"'),false);
assert.equal(JSON.stringify(ARCHIVE).includes('"longitude"'),false);
assert.equal(JSON.stringify(ARCHIVE).includes('"site_id"'),false);
assert.equal(JSON.stringify(ARCHIVE).includes('"reporter"'),false);
console.log('Michigan phenophase archive: verified original capture, no fabricated backfill, immutable overlapping windows, annual index, source integrity, privacy, and public time-machine API contract.');
