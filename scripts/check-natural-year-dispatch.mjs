import assert from "node:assert/strict";
import fs from "node:fs";
import CATALOG from "../data/natural-year-connections.json" with {type:"json"};
import DISPATCH from "../data/natural-year-dispatch.json" with {type:"json"};
import { validateNaturalYearDispatch } from "../lib/natural-year-dispatch.mjs";

assert.equal(CATALOG.schema, "natural-year-connections-v1");
assert.equal(CATALOG.regions.length, 7);
assert.ok(CATALOG.experiences.length >= 8);
assert.equal(new Set(CATALOG.experiences.map(x=>x.id)).size, CATALOG.experiences.length);

for(const e of CATALOG.experiences) {
  if(e.url.startsWith("/")){
    assert.ok(fs.existsSync(new URL("../pages" + e.url + ".js",import.meta.url)),e.url+" must resolve to an existing specialist route");
  }else if(e.url.startsWith("#")){
    assert.equal(e.url,"#turning-year","External anchors must be deliberately approved");
  }else{
    assert.equal(e.url,"https://michiganbirdingreport.com");
  }
  assert.ok(Number.isInteger(e.startDoy) && e.startDoy >= 1 && e.startDoy <= 365);
  assert.ok(Number.isInteger(e.endDoy) && e.endDoy >= 1 && e.endDoy <= 365);
  assert.ok(e.what?.length >= 35 && e.caution?.length >= 35,"Visitor copy and uncertainty must be meaningful");
}
assert.equal(DISPATCH.schema,"natural-year-dispatch-v1");
assert.ok(validateNaturalYearDispatch(DISPATCH,new Date("2026-11-03T16:00:00Z")),"Initial dated version must pass schema and today gates");
assert.equal(validateNaturalYearDispatch(DISPATCH,new Date("2027-01-01T16:00:00Z")),null,"Outdated dispatch must never be shown as current");
assert.equal(validateNaturalYearDispatch({...DISPATCH,asOfDate:"2099-01-01"},new Date("2026-11-03T16:00:00Z")),null,"Future reports must not be published");
assert.equal(validateNaturalYearDispatch({...DISPATCH,active:[{...DISPATCH.active[0],url:"https://evil.example/"}]},new Date("2026-11-03T16:00:00Z")),null,"Never accept unapproved navigation links");
assert.equal(validateNaturalYearDispatch({...DISPATCH,reports:[{...DISPATCH.reports[0],sourceUrl:"https://fake.example"}]},new Date("2026-11-03T16:00:00Z")),null,"Only exact USA-NPN evidence link is allowed");
assert.equal(validateNaturalYearDispatch({...DISPATCH,reportsState:"archive-only"},new Date("2026-11-03T16:00:00Z")),null,"Stale mode must not keep reporting current notes");

const page=fs.readFileSync(new URL("../pages/index.js",import.meta.url),"utf8");
const component=fs.readFileSync(new URL("../components/NaturalYearDispatch.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/natural-year-dispatch.css",import.meta.url),"utf8");
const worker=fs.readFileSync(new URL("./build-natural-year-dispatch.py",import.meta.url),"utf8");
assert.ok(page.includes('<NaturalYearDispatch read={naturalYear} />'));
assert.ok(page.includes("readNaturalYearDispatch()"));
assert.ok(page.includes('id="turning-year"'));
assert.ok(page.includes("<SpeciesTrialObservatory data={speciesTrials} />"),"Preserve complete scientific observatory");
assert.ok(page.includes("<SeasonalFieldRead read={fieldRead} />"),"Preserve dated Python field evidence");
assert.ok(page.includes('<link rel="canonical" href={SITE + "/"} />'));
assert.ok(component.includes("Right now") && component.includes("Next on the calendar") && component.includes("Compare Michigan regions"));
assert.ok(component.includes("What observers actually reported") && component.includes("statewide") && component.includes("This overview never"));
assert.ok(component.includes("not a local")===false,"Narrative must remain clear and intentional");
assert.ok(css.includes("@media(max-width:520px)"));
assert.ok(worker.includes("observed_reports")&&worker.includes("historical_regions")&&worker.includes("MAX_SIGNALS_AGE_DAYS"));
console.log("Natural-year dispatch: confirmed specialist routes, archive freshness, regional historical scope, statewide observations, source trust, existing homepage preservation and mobile styling passed.");
