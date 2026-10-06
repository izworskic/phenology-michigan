import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("pages/index.js", "utf8");
const bloom = readFileSync("pages/_app.js", "utf8");
const tracker = readFileSync("pages/bloom-tracker.js", "utf8");
const person = "https://chrisizworski.com/#person";
const profile = "https://chrisizworski.com/chris-izworski/";

assert.ok(page.includes(person), "canonical Person ID missing");
assert.match(page, /"@type": "Person", "@id": "https:\/\/chrisizworski\.com\/#person", name: "Chris Izworski", url: "https:\/\/chrisizworski\.com\/",/s, "Person url must identify the creator homepage");
assert.ok(page.includes(`href="${profile}">Chris Izworski</a>`), "homepage visible credit must link to the creator profile");
assert.ok(!page.includes('SITE + "/#person"'), "local Phenology Person ID must not be minted");
assert.ok(bloom.includes(`rel="author" href="${profile}"`), "site-wide canonical author link missing");
assert.ok(bloom.includes(`"@id": CHRIS_PERSON,\n      name: "Chris Izworski",\n      url: "https://chrisizworski.com/",`), "Bloom structured data must define the canonical Person");
assert.ok(bloom.includes("publisher: { \"@id\": CHRIS_PERSON }"), "Bloom publisher references must resolve to the canonical Person");
assert.ok(tracker.includes(`Built by <a href="${profile}">Chris Izworski</a>`), "Bloom Tracker needs visible profile credit");

console.log("Phenology creator entity checks passed.");
