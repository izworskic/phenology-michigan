import assert from 'node:assert/strict';
import partA from '../lib/bloom/social-card-a.mjs';
import partB from '../lib/bloom/social-card-b.mjs';
import partC from '../lib/bloom/social-card-c.mjs';

const png = Buffer.from(`${partA}${partB}${partC}`, 'base64');
assert.ok(png.length > 20_000, 'social card must remain a nontrivial image');
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'social card must decode to PNG');
assert.equal(png.readUInt32BE(16), 1200, 'social card must remain 1200px wide');
assert.equal(png.readUInt32BE(20), 630, 'social card must remain 630px high');

console.log('Bloom social card checks passed.');
