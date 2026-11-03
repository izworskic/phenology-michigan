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
