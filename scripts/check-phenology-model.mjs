import assert from "node:assert/strict";
import { seasonOffsetDays, classify } from "../lib/phenology.js";

// Regression for live November 2026: neither an entire season "242 days
// late" nor a forced autumn shift of species windows is supportable.
assert.equal(seasonOffsetDays(2277, 307), null);
assert.equal(seasonOffsetDays(2200, 285), null);
assert.equal(seasonOffsetDays(null, 150), null);
assert.equal(seasonOffsetDays(-1, 150), null);
assert.equal(seasonOffsetDays(80, 150), null);
assert.equal(seasonOffsetDays(2277, 350), null);
const catalog = classify(307, 0, 0);
assert.ok(catalog.active.every(x => Number.isFinite(x.p)));
console.log("PASS bounded thermal phase and unshifted calendar");


import { civilDateLabel,michiganCivilDay } from "../lib/civil-date.mjs";
import { huntingForecast,rutClock } from "../lib/phenology.js";
const priorTZ=process.env.TZ;
let board;
try{
 for(const tz of ["UTC","America/Detroit","Pacific/Honolulu","Asia/Tokyo"]){
  process.env.TZ=tz;
  assert.equal(civilDateLabel("2026-11-28",{weekday:"short"}),"Sat");
  assert.equal(civilDateLabel("2026-11-28",{weekday:"long"}),"Saturday");
  assert.equal(civilDateLabel("2026-02-30",{weekday:"short"}),"date unavailable");
  assert.equal(michiganCivilDay(new Date("2026-03-09T03:30:00Z")),67);
  const snapshot=JSON.stringify([huntingForecast(280),rutClock(282),huntingForecast(332)]);
  if(board)assert.equal(snapshot,board);else board=snapshot;
 }
}finally{if(priorTZ===undefined)delete process.env.TZ;else process.env.TZ=priorTZ;}
console.log("PASS civil forecast weekday and hunting calendar parity across four timezones");


import { readFileSync } from "node:fs";
import vm from "node:vm";
const wiSource=readFileSync("pages/wisconsin-bloom-tracker.js","utf8");
const wiAdmission=vm.runInNewContext("("+wiSource.match(/function verifiedObservation\(stop, notes, now\) \{[\s\S]*?\n\}/)[0]+")",{OBSERVATION_MAX_AGE_MS:5*86400000});
const wiStop={id:"test",sourceUrl:"https://example.org/report"},wiNow=new Date("2026-11-28T15:00:00Z"),wiNote={destinationId:"test",stage:"PEAK",observedAt:"2026-11-27T12:00:00Z",sourceName:"Operator",sourceUrl:wiStop.sourceUrl};
assert.equal(wiAdmission(wiStop,[wiNote],wiNow),wiNote);
for(const invalid of [{...wiNote,observedAt:"2027-02-26T12:00:00Z"},{...wiNote,observedAt:"2020-05-01T12:00:00Z"},{...wiNote,stage:"invalid"},{...wiNote,sourceUrl:"https://example.net/"},{...wiNote,sourceName:""}])assert.equal(wiAdmission(wiStop,[invalid],wiNow),null);
assert.match(wiSource,/const latestSources=WISCONSIN\.destinations\.map\(stop=>verifiedObservation\(stop,observations,now\)\)\.filter\(Boolean\)/);
assert.match(wiSource,/catch\{setObservations\(\[\]\);setCheckedAt\(null\);\}/);
