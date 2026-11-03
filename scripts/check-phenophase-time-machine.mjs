import assert from 'node:assert/strict';
import fs from 'node:fs';
import ARCHIVE from '../data/michigan-phenophase-archive/2026.json' with {type:'json'};
import INDEX from '../data/michigan-phenophase-archive-index.json' with {type:'json'};
import REGIONS from '../data/michigan-observation-regions.json' with {type:'json'};
import {validateHistoryIndex,validateHistoryYear} from '../lib/phenophase-history.mjs';
import {archiveToMap,capturedDates,betweenCaptureDays,regionCapture,compareCaptures} from '../lib/phenophase-playback.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
assert.ok(validateHistoryIndex(INDEX),'Original archive index must remain truthfully validated');
assert.ok(validateHistoryYear(ARCHIVE,2026),'Original archive record must remain valid');
assert.ok(INDEX.years.some(x=>x.year===2026));
assert.ok(ARCHIVE.snapshots.length>0);
assert.equal(ARCHIVE.snapshots[0].asOfDate,'2026-11-03');
const first=ARCHIVE.snapshots[0],historyMap=archiveToMap(first);
assert.equal(historyMap.schema,'michigan-phenophase-geography-v1');
assert.equal(historyMap.status,'historical','Never present an old capture as live data');
assert.equal(historyMap.asOfDate,first.asOfDate);
assert.equal(historyMap.windowStart,first.windowStart);
assert.equal(historyMap.windowEnd,first.windowEnd);
assert.deepEqual(capturedDates(ARCHIVE),ARCHIVE.snapshots.map(s=>s.asOfDate));
assert.equal(historyMap.regions.length,9);
for(let i=0;i<9;i++){
 const original=first.regions[i],replay=historyMap.regions[i],fixed=REGIONS.regions[i];
 assert.equal(replay.id,fixed.id);
 assert.equal(replay.lat,fixed.lat,'Only stable, predefined region centers may become map pins');
 assert.equal(replay.lon,fixed.lon);
 assert.equal(replay.sampledReportCount,original.sampledReports);
 assert.equal(replay.phases.length,original.phases.length);
 for(let j=0;j<replay.phases.length;j++){
  const phase=original.phases[j],plotted=replay.phases[j];
  assert.equal(plotted.id,phase.id);
  assert.deepEqual(plotted.sourceReports,phase.reports);
  assert.equal(plotted.latest,phase.latest);
  assert.equal(plotted.coverage,phase.coverage);
 }
}
const bay=regionCapture(first,'saginaw-bay');
assert.equal(bay.id,'saginaw-bay');
assert.equal(bay.siteSamples,4,'Keep the real first-day Saginaw Bay reporting sample');
assert.ok(bay.presentPhaseIds.has('leaf-color'));
assert.equal(compareCaptures(null,first,'saginaw-bay'),null,
 'No preceding frame means no invented prior-year trend');
assert.equal(betweenCaptureDays('2026-11-03','2026-11-04'),0);
assert.equal(betweenCaptureDays('2026-11-03','2026-11-08'),4);
assert.equal(betweenCaptureDays('2026-11-03','2026-11-03'),null);

const next=clone(first);
next.asOfDate='2026-11-04';
next.windowStart='2026-10-21';
next.windowEnd='2026-11-04';
const testRegion=next.regions.find(x=>x.id==='saginaw-bay');
testRegion.sampledReports=5;
testRegion.phases[0].reports.inaturalist=5;
const comparison=compareCaptures(first,next,'saginaw-bay');
assert.equal(comparison.oldSampledReports,4);
assert.equal(comparison.newSampledReports,5);
assert.deepEqual(comparison.newlyVisibleInSample,[]);
assert.ok(comparison.interpretation.includes('not a count of new events'));
assert.ok(!Object.prototype.hasOwnProperty.call(comparison,'newDailyEvents'));
const missing=clone(next);
missing.asOfDate='2026-11-09';
missing.windowStart='2026-10-26';
missing.windowEnd='2026-11-09';
assert.equal(compareCaptures(first,missing,'saginaw-bay').missingDays,5);

const raw=JSON.stringify(historyMap);
for(const forbidden of ['"site_id"','"observer"','"reporter"','"geojson"','"individual_id"','"gps"']){
 assert.ok(!raw.includes(forbidden),'No precise individual or source location leaks from archive conversion: '+forbidden);
}
assert.equal(archiveToMap({...first,kind:'fake-individual-daily-events'}),null);
assert.equal(archiveToMap({...first,regions:first.regions.slice(0,2)}),null);
assert.equal(archiveToMap({...first,regions:[...first.regions.slice(1),first.regions[0]]}),null);

const dispatch=fs.readFileSync(new URL('../components/NaturalYearDispatch.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../components/PhenophaseTimeMachine.js',import.meta.url),'utf8');
const map=fs.readFileSync(new URL('../components/MichiganPhenophaseMap.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/index.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/phenophase-time-machine.css',import.meta.url),'utf8');
assert.ok(dispatch.includes('"history","Time Machine"')&&dispatch.includes('<PhenophaseTimeMachine />'),'Existing dispatch gets a fifth, purpose-built lens');
assert.ok(dispatch.includes('["now","map","history","next","regions"].includes(requested)'),'Direct shareable view query should be allowlisted');
assert.ok(player.includes("getArchive(ROOT+'?year='+year"),'Annual captures must be read from validated historical API');
assert.ok(player.includes('snapshots.length<2')&&player.includes('only the days actually collected'),'A one-day archive must not pretend it can play an invented season');
assert.ok(player.includes('previous&&snapshot?compareCaptures'),'Only compare two genuinely captured frames');
assert.ok(player.includes("url.searchParams.set('date',snapshot.asOfDate)"),'Historical frame deep links must be exact captured dates');
assert.ok(player.includes('missed>0')&&player.includes('gap>0'),'Gaps must be visible, not interpolated');
assert.ok(player.includes('reporting samples')&&player.includes('overlapping'),'Users need an explicit overlap interpretation');
assert.ok(player.includes('sourceStatus.iNaturalistFailedQueries')&&player.includes('sourceStatus.iNaturalistCappedQueries'),'Partial source evidence must persist');
assert.ok(map.includes('isHistorical')&&map.includes("No eligible reports in this archived sample"),'Do not label historical maps current or missing samples as biological absence');
assert.ok(page.includes('phenophase-time-machine.css')&&page.includes('<link rel="canonical" href={SITE + "/"} />'),'Preserve existing SEO canonical and site styling');
assert.ok(css.includes('@media(max-width:520px)'),'Time Machine must remain usable on mobile');
assert.ok(!player.includes('visitor report form')&&!player.includes('upload your'),'Visitor verification remains unnecessary');
console.log('Living Season Time Machine: honest original frame, 9 geographies, discrete-only playback, missing days, source uncertainty, privacy, share links, mobile CSS and no invented biological incidence passed.');
