#!/usr/bin/env node
/** Foundry pilot 01 fail-closed regression, included in the owning repository npm test. */
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildWaterfowlRead,buildColdWeek,makeFieldBrief} from "../lib/first-freeze-depth.mjs";
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


const surveyBank=JSON.parse(fs.readFileSync("data/first-freeze-waterfowl.json","utf8"));
const seasonRead=buildWaterfowlRead(surveyBank,"2026-11-06");
assert.equal(seasonRead.season,"2026–27");
assert.equal(seasonRead.areas.nayanquing.counts.ducks.latest.count,12000);
assert.equal(seasonRead.areas.nayanquing.counts.ducks.latest.date,"2026-11-01");
assert.equal(seasonRead.areas.nayanquing.counts.ducks.delta,1400);
assert.equal(seasonRead.areas["fish-point"].counts.ducks.latest.count,18325);
assert.equal(seasonRead.areas["fish-point"].counts.swans.latest.count,504);
assert.equal(seasonRead.areas["fish-point"].species.items.find(x=>x.name==="Tundra swan").count,450);
assert.equal(seasonRead.areas.nayanquing.counts.swans.latest.count,0,"DNR zero is a counted sample, not missing data");
const archiveRead=buildWaterfowlRead(surveyBank,"2027-01-18");
assert.equal(archiveRead.areas.nayanquing.counts.ducks.status,"archive-only");
assert.equal(buildWaterfowlRead(surveyBank,"2027-11-06").available,false,
 "Previous season's surveys must not appear as current fall data");
assert.equal(buildWaterfowlRead(surveyBank,"2026-10-01").areas.nayanquing.counts.ducks.latest.date,"2026-09-27",
 "A future-dated area survey must never be shown early");
const coldWeek=buildColdWeek(fixture.forecast,"2026-11-05");
assert.equal(coldWeek.days.length,7);
assert.equal(coldWeek.below32,6);
assert.equal(coldWeek.days[0].date,"2026-11-05");
assert.equal(coldWeek.days[1].date,"2026-11-06");
assert.match(makeFieldBrief({waterfowl:seasonRead,weather:coldWeek,today:"2026-11-06"}).interpretation,/12,000 ducks/);
assert.equal(buildColdWeek({lows:[null,null]},"2026-11-05").availableDays,0);
const integrated=buildFirstFreezeEvidence({...fixture,waterfowlBank:surveyBank});
assert.equal(integrated.pulse.waterfowl.areas.nayanquing.counts.ducks.latest.count,12000);
assert.equal(integrated.pulse.weather.below32,6);

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
assert.ok(home.includes('className="ff-invite"'),"normal homepage must use only a compact First Freeze invitation");
assert.ok(home.includes('href="/?experience=first-freeze#first-freeze"'),"invitation opens dedicated focus");
assert.ok(home.includes('firstFreezeFocused: query?.experience === "first-freeze"'),"focus is resolved on server");
assert.ok(home.includes('<meta name="robots" content="noindex,follow" />'),"query variant must not become a competing indexable page");
const app=fs.readFileSync("pages/_app.js","utf8");
assert.ok(app.includes('isHome && !isFirstFreezeFocus'),"focused view excludes unrelated homepage footer links");

assert.ok(home.includes("signalGeneratedAt: sig.generatedAt"));
assert.ok(jsx.includes('aria-pressed={chapter.id===c.id}'));
assert.ok(jsx.includes('<FirstFreezePulse read={evidence.pulse} evidence={evidence} />'));
assert.ok(!jsx.includes('className="ff-facts"'),"two giant empty NOAA cards removed from visitor first screen");
const pulse=fs.readFileSync("components/FirstFreezePulse.js","utf8");
const depthCss=fs.readFileSync("public/first-freeze-depth.css","utf8");
assert.ok(pulse.includes("Weekly field count")||pulse.includes("weekly field count"));
assert.ok(pulse.includes("SurveyDetail")&&pulse.includes("ColdClock"));
assert.ok(pulse.includes("ffp-count-table"));
assert.ok(pulse.includes("no recent usable point value")||pulse.includes("No recent usable point value"));
assert.ok(depthCss.includes("@media(max-width:650px)"));
assert.ok(home.includes('href="/first-freeze-depth.css"'));
assert.ok(jsx.includes('aria-live="polite"'));
assert.ok(jsx.includes('Check current operator notice'));
assert.ok(jsx.includes('All four seasonal chapters and land-manager references'));
assert.ok(css.includes("@media(max-width:610px)"));
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(!jsx.includes("mapbox")&&!jsx.includes("leaflet"),"No blank or invented map");
console.log("First Freeze Foundry pilot evidence/closure/ownership tests passed.");
