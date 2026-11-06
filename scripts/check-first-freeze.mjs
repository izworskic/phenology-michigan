#!/usr/bin/env node
/** Foundry pilot 01 fail-closed regression, included in the owning repository npm test. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {FIRST_FREEZE_CHAPTERS,FIRST_FREEZE_SITES,buildFirstFreezeEvidence,firstFreezeSiteAccess,firstFreezeChapterForDate} from "../lib/first-freeze.mjs";

const date = "2026-11-05T14:00:00Z";
const fixture = {
  now:new Date(date),
  signalGeneratedAt:"2026-11-05T13:00:00Z",
  bay:{iceConc:15.4,iceDate:"2026-11-05",glseaF:45,glseaDate:"2026-11-04"},
  forecast:{lows:[33,27,24,28,30,31,26]},
  birds:[
    {comName:"Tundra Swan",obsDt:"2026-11-04 11:35",locName:"A Bay County site",obsReviewed:true},
    {comName:"American Redstart",obsDt:"2026-11-05 10:00",obsReviewed:false},
    {comName:"American Bittern",obsDt:"2026-10-20 12:00",obsReviewed:true}
  ]
};
const x=buildFirstFreezeEvidence(fixture);
assert.equal(x.ice.kind,"recent-reference");
assert.equal(x.ice.text,"15.4%");
assert.match(x.ice.detail,/not a baywide ice percentage/);
assert.equal(x.surface.kind,"recent-reference");
assert.equal(x.coldOutlook.kind,"forecast");
assert.equal(x.coldOutlook.text,"24°F");
assert.equal(x.birds.length,2);
assert.equal(x.birds.find(b=>b.name==="American Redstart").reviewed,false);
assert.equal(x.birds.find(b=>b.name==="Tundra Swan").reviewed,true);
assert.match(x.birdsScope,/not reports at the selected viewpoint/);

const stale=buildFirstFreezeEvidence({...fixture,signalGeneratedAt:"2026-10-25T00:00:00Z"});
assert.equal(stale.ice.kind,"historical");
assert.equal(stale.surface.kind,"historical");
const missing=buildFirstFreezeEvidence({now:new Date(date),bay:{iceConc:null,iceDate:null,glseaF:null},birds:[],forecast:{lows:[]}});
assert.equal(missing.ice.kind,"unavailable");
assert.equal(missing.surface.kind,"unavailable");
assert.equal(missing.coldOutlook.kind,"unavailable");
assert.equal(missing.birds.length,0);
const invalid=buildFirstFreezeEvidence({...fixture,bay:{iceConc:300,iceDate:"2026-11-07",glseaF:45,glseaDate:"2026-11-09"},birds:[{comName:"Future",obsDt:"2026-12-01"}]});
assert.equal(invalid.ice.kind,"unavailable");
assert.equal(invalid.surface.kind,"unavailable");
assert.equal(invalid.birds.length,0);
assert.equal(firstFreezeChapterForDate("2027-01-05"),"deep-winter");
assert.equal(firstFreezeChapterForDate("2027-03-01"),"spring-return");
assert.equal(firstFreezeChapterForDate("2027-07-01"),"late-autumn");
assert.equal(buildFirstFreezeEvidence({now:new Date("2027-07-01T12:00:00Z")}).inSeason,false);
assert.equal(x.inSeason,true);

const ferguson=FIRST_FREEZE_SITES.find(s=>s.id==="ferguson");
assert.equal(firstFreezeSiteAccess(ferguson,"2026-11-05").kind,"listed-closure");
assert.equal(firstFreezeSiteAccess(ferguson,"2026-11-15").kind,"listed-closure");
assert.equal(firstFreezeSiteAccess(ferguson,"2026-12-21").kind,"listed-closure");
assert.equal(firstFreezeSiteAccess(ferguson,"2026-11-06").kind,"verify");
assert.equal(firstFreezeSiteAccess(ferguson,"2027-11-05").kind,"verify");
assert.equal(firstFreezeSiteAccess(FIRST_FREEZE_SITES[0],"2026-11-05").kind,"verify");

assert.equal(FIRST_FREEZE_CHAPTERS.length,4);
assert.equal(FIRST_FREEZE_SITES.length,4);
assert.equal(new Set(FIRST_FREEZE_SITES.map(s=>s.id)).size,4);
for(const s of FIRST_FREEZE_SITES){
  assert.match(s.link,/^https:\/\/(www\.)?(michigan\.gov|fws\.gov)\//);
  assert.ok(s.reason.length>65);
}
const jsx=fs.readFileSync("components/FirstFreezeJourney.js","utf8");
const css=fs.readFileSync("public/first-freeze.css","utf8");
const home=fs.readFileSync("pages/index.js","utf8");
assert.ok(home.includes('import FirstFreezeJourney from "../components/FirstFreezeJourney"'));
assert.ok(home.includes('import {buildFirstFreezeEvidence} from "../lib/first-freeze.mjs"'));
assert.equal((home.match(/<FirstFreezeJourney evidence=\{firstFreeze\}/g)||[]).length,1,"one focused journey, not stacked homepage sections");
assert.ok(home.includes('href="/first-freeze.css"'));
assert.ok(home.includes("signalGeneratedAt: sig.generatedAt"));
assert.ok(jsx.includes('aria-pressed={chapter.id===c.id}'));
assert.ok(jsx.includes('aria-live="polite"'));
assert.ok(jsx.includes('Check current operator notice'));
assert.ok(jsx.includes('All four seasonal chapters and land-manager references'));
assert.ok(css.includes("@media(max-width:610px)"));
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(!jsx.includes("mapbox")&&!jsx.includes("leaflet"),"No blank or invented map");
console.log("First Freeze Foundry pilot evidence/closure/ownership tests passed.");
