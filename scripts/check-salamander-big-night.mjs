import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REGIONS,shiftDate} from '../lib/salamanders.mjs';
import {createForecastIssue} from '../lib/salamander-forecast-archive.mjs';
import {bigNightDecision,attachBigNightDecisions} from '../lib/salamander-big-night.mjs';

const now=new Date('2027-04-10T19:10:00Z'),day='2027-04-10';
const night=(date,level='strong',rain=85,warm=5)=>({
 date,level,label:'Forecast weather signal',temp:47,rainChance:rain,warmRainHours:warm,
 warmHours:7,snowHours:0,thawLimited:false,thawRecheck:false,details:'Warm rain weather fit, not proof of migration.'
});
const region=(id='saginaw-bay',today='strong',tomorrow='watch')=>({
 ...REGIONS.find(r=>r.id===id),season:'spring',nwsUpdatedAt:'2027-04-10T18:00:00Z',
 thaw:{state:'warming',impact:'none',label:'Station warming'},
 nights:[night(day,today),night('2027-04-11',tomorrow,60,1),...Array.from({length:5},(_,i)=>night(shiftDate(day,i+2),'dry',10,0))]
});
const first=bigNightDecision(region(),null,day,now);
assert.equal(first.status,'ready');
assert.equal(first.source.status,'current');
assert.equal(first.source.ageHours,1);
assert.equal(first.tonight.level,'strong');
assert.equal(first.tonight.temp,47);
assert.equal(first.tonight.rainChance,85);
assert.equal(first.tonight.warmRainHours,5);
assert.equal(first.tonight.drivers[0].state,'favorable');
assert.equal(first.tonight.drivers[1].state,'favorable');
assert.equal(first.tonight.drivers[2].state,'unknown');
assert.equal(first.comparison.status,'tonight');
assert.equal(first.bestIn48Hours,'tonight');
assert.equal(first.priorIssue,null);
assert.ok(first.tonight.advice.includes('Movement is not confirmed'));
assert.ok(!JSON.stringify(first).includes('probabilityOfMigration'));
const better=bigNightDecision(region('saginaw-bay','dry','strong'),null,day,now);
assert.equal(better.comparison.status,'tomorrow');
assert.equal(better.bestIn48Hours,'tomorrow');
const same=bigNightDecision(region('saginaw-bay','watch','watch'),null,day,now);
assert.equal(same.comparison.status,'similar');
const partial=region();partial.nights[0].level='unknown';
const incomplete=bigNightDecision(partial,null,day,now);
assert.equal(incomplete.comparison.status,'unavailable');
assert.equal(incomplete.tonight.drivers[0].state,'unknown');
assert.equal(incomplete.tonight.advice.includes('insufficient'),true);
const thaw=region();thaw.thaw.impact='caution';thaw.nights[0].thawLimited=true;thaw.nights[0].level='guarded';
assert.equal(bigNightDecision(thaw,null,day,now).tonight.drivers[2].state,'limited');
const missingSource=region();missingSource.nwsUpdatedAt=null;
assert.equal(bigNightDecision(missingSource,null,day,now).status,'source_unverified');
assert.equal(bigNightDecision(missingSource,null,day,now).source.status,'unverified');
const stale=region();stale.nwsUpdatedAt='2027-04-09T12:00:00Z';
assert.equal(bigNightDecision(stale,null,day,now).status,'stale');
assert.equal(bigNightDecision(stale,null,day,now).source.status,'stale');
assert.equal(bigNightDecision(stale,null,day,now).tonight.advice.startsWith('Update needed'),true);
assert.equal(bigNightDecision({...REGIONS[0],season:'off',nights:[]},null,day,now).status,'off_season');
assert.equal(bigNightDecision({...REGIONS[0],season:'unavailable',nights:[]},null,day,now).status,'unavailable');
const priorDay='2027-04-09';
const priorInput={status:'spring_watch',generatedAt:'2027-04-09T19:00:00Z',regions:REGIONS.map(r=>({
 id:r.id,season:'spring',nwsUpdatedAt:'2027-04-09T18:00:00Z',
 thaw:{state:'warming',observationAgeDays:1},
 nights:Array.from({length:7},(_,i)=>({...night(shiftDate(priorDay,i),i===1?'dry':i===2?'strong':'watch',65,2)}))
}))};
const issue=createForecastIssue(priorInput,new Date('2027-04-09T19:10:00Z'));
const changed=bigNightDecision(region(),issue,day,now);
assert.equal(changed.priorIssue.issueDay,'2027-04-09');
assert.equal(changed.priorIssue.tonight.previousLevel,'dry');
assert.equal(changed.priorIssue.tonight.currentLevel,'strong');
assert.equal(changed.priorIssue.tonight.status,'improved');
assert.equal(changed.priorIssue.tomorrow.previousLevel,'strong');
assert.equal(changed.priorIssue.tomorrow.currentLevel,'watch');
assert.equal(changed.priorIssue.tomorrow.status,'weakened');
assert.equal(changed.priorIssue.tonight.tempDelta,0);
assert.equal(changed.priorIssue.tonight.rainDelta,20);
const skipped=bigNightDecision(region(),{...issue,issueDay:'2027-04-08'},day,now);
assert.equal(skipped.priorIssue,null,'Wrong-day archive must not masquerade as yesterday');
const ranked=attachBigNightDecisions([region('saginaw-bay','strong','watch'),region('west','watch','strong'),stale],[],day,now);
assert.equal(ranked.statewide.strongTonight,1);
assert.equal(ranked.statewide.possibleTonight,1);
assert.equal(ranked.statewide.regionsWithCurrentSource,2);
assert.deepEqual(ranked.statewide.regionalRanking.slice(0,2).map(x=>x.id),['saginaw-bay','west']);
assert.equal(ranked.regions.length,3);
const withPrior=attachBigNightDecisions([region()], [issue],day,now);
assert.equal(withPrior.regions[0].bigNight.priorIssue.tonight.status,'improved');
const badPrior=attachBigNightDecisions([region()], [{...issue,apiGeneratedAt:'2027-04-10T19:00:00Z'}],day,now);
assert.equal(badPrior.regions[0].bigNight.priorIssue,null,'Reject invalid archived hindsight record');
const nowOff=attachBigNightDecisions(REGIONS.map(r=>({...r,season:'off',nights:[],tonight:null,best:null})),[], '2026-10-17',new Date('2026-10-17T19:10:00Z'));
assert.equal(nowOff.statewide.strongTonight,0);
assert.equal(nowOff.statewide.regionalRanking.length,0);
assert.equal(nowOff.regions[0].bigNight.status,'off_season');
for(const [path,phrase] of [
 ['pages/api/salamanders.js','attachBigNightDecisions(regions,ISSUED,basis.date,now)'],
 ['pages/salamander-migration.js','<SalamanderBigNight region={region}'],
 ['pages/salamander-migration.js','href="#big-night"'],
 ['pages/salamander-migration.js','refreshForecast='],
 ['components/SalamanderBigNight.js','Tonight or tomorrow?'],
 ['components/SalamanderBigNight.js','No verified prior-afternoon forecast'],
 ['components/SalamanderBigNight.js','Peak rain chance'],
 ['components/SalamanderBigNight.js','Show all nine Michigan regions'],
 ['components/SalamanderMap.js','const level=row?.tonight?.level'],
 ['public/salamander-migration.css','.sala-action-two']
])assert.ok(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').includes(phrase),'Big Night contract missing: '+path);
assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../data/salamander-forecast-issues.json',import.meta.url),'utf8')),[],'Never invent yesterday comparison history');
console.log('Salamander Big Night: real 48-hour ranking, warming/rain/thaw drivers, NWS staleness, current versus previous as-issued snapshot, no invented October comparisons and map parity passed.');
