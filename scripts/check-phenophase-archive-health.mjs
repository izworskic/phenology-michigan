import assert from 'node:assert/strict';
import fs from 'node:fs';
import INDEX from '../data/michigan-phenophase-archive-index.json' with {type:'json'};
import {archiveHealth,archiveHealthLabel} from '../lib/phenophase-archive-health.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
// Freeze the historical sample: production collects new archive days automatically,
// and must not cause a Nov 4 example to change under a Nov 5/6 daily commit.
const SAMPLE=clone(INDEX);
SAMPLE.years=SAMPLE.years.filter(y=>y.year===2026).slice(0,1);
SAMPLE.years[0].lastSnapshot='2026-11-04';
SAMPLE.years[0].snapshotDays=2;
SAMPLE.years[0].missingCollectionDaysBetweenSnapshots=0;
SAMPLE.years[0].latestSourceStatus={usaNpn:'ok',iNaturalist:'ok',iNaturalistCappedQueries:0,iNaturalistFailedQueries:0};
assert.equal(archiveHealth(INDEX,new Date(INDEX.years.at(-1).lastSnapshot+'T17:00:00Z')).asOf,INDEX.years.at(-1).lastSnapshot,
  'Real archive snapshot must remain readable on its actual collection date');
const normal=archiveHealth(SAMPLE,new Date('2026-11-05T10:00:00Z'));
assert.equal(normal.asOf,'2026-11-04');
assert.equal(normal.state,'recent','At 5 AM Michigan time on Nov 5, the Nov 4 capture is expected');
assert.equal(normal.daysSince,1);
assert.equal(normal.missingCollectionDays,0);
assert.equal(archiveHealth(SAMPLE,new Date('2026-11-06T17:00:00Z')).state,'overdue',
 'Two elapsed Michigan calendar dates without a recorded capture is late, not proof of biological inactivity');
assert.equal(archiveHealth(SAMPLE,new Date('2026-11-07T17:00:00Z')).state,'stale');
assert.equal(archiveHealth(SAMPLE,new Date('2026-11-03T17:00:00Z')).state,'invalid',
 'Future-dated science archive must never appear healthy');
const partial=clone(SAMPLE);partial.years.at(-1).latestSourceStatus.iNaturalist='partial';
partial.years.at(-1).latestSourceStatus.iNaturalistFailedQueries=2;
assert.equal(archiveHealth(partial,new Date('2026-11-05T17:00:00Z')).state,'partial');
assert.equal(archiveHealth(partial,new Date('2026-11-07T17:00:00Z')).state,'stale',
 'Overdue collection takes priority over partial source metadata');
const gaps=clone(SAMPLE);gaps.years.at(-1).missingCollectionDaysBetweenSnapshots=4;
assert.equal(archiveHealth(gaps,new Date('2026-11-05T17:00:00Z')).missingCollectionDays,4);
assert.equal(archiveHealth({},new Date('2026-11-05T17:00:00Z')).state,'unknown');
assert.ok(archiveHealthLabel(archiveHealth(SAMPLE,new Date('2026-11-07T17:00:00Z'))).includes('overdue'));

const app=fs.readFileSync(new URL('../pages/_app.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../components/PhenophaseTimeMachine.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/phenophase-time-machine.css',import.meta.url),'utf8');
assert.ok(app.includes('params.get("view") === "history" && params.get("focus") === "1"'),
 'Only an explicitly selected history focus view excludes the loader');
assert.ok(app.includes('!isHistoricalFocus && !isFirstFreezeFocus && <script defer src="https://chrisizworski.com/assets/network-ads-v1.js"'),
 'The standard homepage and specialist pages must retain the network ad loader');
assert.ok(player.includes("'&focus=1#living-season'")&&player.includes("focusMode?standardUrl:focusUrl"),
 'Focus must be opt-in, reversible, and use native reload links');
assert.ok(player.includes('archiveHealth(index,healthNow)'));
assert.ok(player.includes("No new capture has been recorded recently; this is not evidence"));
assert.ok(player.includes('No visitor reports are required'));
assert.ok(css.includes('.nytm-focus-link')&&css.includes('.nytm-health--stale'));
assert.ok(!css.includes('.adsbygoogle')&&!css.includes('.google-auto-placed')&&!css.includes('google_ads'),
 'Do not hide or manipulate Google-rendered advertisements with CSS');
console.log('Michigan Phenology: opt-in unchanged-canonical focus view, retained standard advertising, local-date collection health, outages and historical no-absence protection passed.');
