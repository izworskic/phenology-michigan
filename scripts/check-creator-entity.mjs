import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("pages/index.js", "utf8");
const app = readFileSync("pages/_app.js", "utf8");
const person = "https://chrisizworski.com/#person";
const profile = "https://chrisizworski.com/chris-izworski/";

assert.ok(page.includes(person), "canonical Person ID missing");
assert.ok(page.includes(profile), "canonical profile URL missing");
assert.ok(!page.includes('SITE + "/#person"'), "local Phenology Person ID must not be minted");
assert.ok(app.includes(`rel="author" href="${profile}"`), "site-wide canonical author link missing");

console.log("Phenology creator entity checks passed.");
