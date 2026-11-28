import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {currentEnvelope,currentRegionalEnvelope,currentSingleRegion} from "../lib/spring-response-admission.mjs";
const now=Date.parse("2026-11-28T15:00:00Z"),regions=[{id:"a"},{id:"b"}],valid={generatedAt:new Date(now).toISOString(),regions};
assert.equal(currentRegionalEnvelope(valid,regions,3,"generatedAt",now),true);
for(const x of [{...valid,generatedAt:"2020-05-01T12:00:00Z"},{...valid,generatedAt:new Date(now+60001).toISOString()},{...valid,generatedAt:null},{...valid,regions:[{id:"a"},{id:"a"}]},{...valid,regions:[{id:"a"},{id:"c"}]},{...valid,regions:[{id:"a"}]}])assert.equal(currentRegionalEnvelope(x,regions,3,"generatedAt",now),false);
assert.equal(currentEnvelope({updatedAt:valid.generatedAt},"updatedAt",13,now),true);
assert.equal(currentSingleRegion({generatedAt:valid.generatedAt,region:{id:"a",nights:[]}},"a",3,now),true);
assert.equal(currentSingleRegion({generatedAt:valid.generatedAt,region:{id:"b",nights:[]}},"a",3,now),false);
for(const name of ["hummingbird-tracker","firefly-tracker","frog-chorus","salamander-migration","michigan-trillium","woodcock-sky-dance"]){const source=readFileSync("pages/"+name+".js","utf8");assert.match(source,/if\(!current(?:RegionalEnvelope|SingleRegion)\(/);}
console.log("PASS spring delivery age and regional identity");
