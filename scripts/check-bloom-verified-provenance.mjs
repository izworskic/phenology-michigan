import assert from 'node:assert/strict';
import { normalizeVerifiedOverride } from '../lib/bloom/observation-ingestion.mjs';
import { verifiedBloomSourceFor } from '../lib/bloom/verified-source-policy.mjs';

const now = new Date('2026-05-06T12:00:00-04:00');
const spoofed = normalizeVerifiedOverride({
  destinationId: 'holland-tulips',
  stage: 'PEAK',
  observedAt: '2026-05-06T10:00:00-04:00',
  validThrough: '2026-05-08T10:00:00-04:00',
  displayPotential: 'normal',
  source: {
    id: 'fake-source',
    name: 'Definitely Not the City of Holland',
    url: 'https://example.invalid/fake',
    authority: 100,
  },
  evidenceText: 'Centennial Park camera shows widespread open color.',
}, now);

assert.ok(spoofed, 'valid verified observation should normalize');
const hollandPolicy = verifiedBloomSourceFor('holland-tulips');
assert.equal(spoofed.source.id, hollandPolicy.id);
assert.equal(spoofed.source.name, hollandPolicy.name);
assert.equal(spoofed.source.url, hollandPolicy.url);
assert.equal(spoofed.source.authority, hollandPolicy.authority);
assert.notEqual(spoofed.source.url, 'https://example.invalid/fake', 'operator-supplied provenance must be ignored');

const traverse = normalizeVerifiedOverride({
  destinationId: 'traverse-city-cherries',
  stage: 'NEAR_PEAK',
  observedAt: '2026-05-06T10:00:00-04:00',
  validThrough: '2026-05-07T22:00:00-04:00',
  source: { name: 'Fake authority', url: 'https://example.invalid', authority: 100 },
  evidenceText: 'Local orchard observation shows roughly half of blossoms open.',
}, now);
assert.equal(traverse.source.authority, 90, 'verified local Traverse observation must not be promoted to primary-source authority');

assert.equal(
  normalizeVerifiedOverride({
    destinationId: 'made-up-destination',
    stage: 'PEAK',
    observedAt: '2026-05-06T10:00:00-04:00',
    validThrough: '2026-05-08T10:00:00-04:00',
    source: { name: 'Fake', url: 'https://example.invalid' },
  }, now),
  null,
  'unknown destinations must not receive verified provenance',
);

console.log('Bloom verified-source provenance invariants: PASS');
