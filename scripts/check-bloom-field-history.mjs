import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildBloomHistoryDesk } from '../lib/bloom/field-history.mjs';

const committed = JSON.parse(fs.readFileSync(new URL('../data/bloom-observation-history.json', import.meta.url), 'utf8'));
const reference = new Date('2026-11-18T20:00:00-05:00');
const real = buildBloomHistoryDesk(committed, { now: reference, archiveSource: 'committed verified archive' });
assert.equal(real.schemaVersion, 1);
assert.equal(real.destinationsTracked, 19);
assert.ok(real.totalRecords >= 1, 'the historical desk must preserve the existing archive');
assert.ok(real.byDestination['traverse-city-cherries'].records.some((r) => r.stage === 'DONE' && r.sourceUrl.includes('msu')), 'real MSU July 2026 source must survive');
assert.equal(real.byDestination['meijer-gardens-cherries'].count, 0, 'absence of records is not cherry flowering evidence');
assert.match(real.method, /not a confirmed peak/i, 'no historical peak prediction from archived reports');

const source = { id: 'fixture', name: 'Example park operator', url: 'https://example.org/field-report', mode: 'dated_article' };
const sample = { destinationId:'holland-tulips', stage:'PEAK', observedAt:'2026-05-02T12:00:00.000Z', source };
const synthetic = buildBloomHistoryDesk([
  sample, sample,
  { ...sample, source:{ ...source, url:'javascript:alert(1)' } },
  { ...sample, observedAt:'not-a-date' },
  { ...sample, observedAt:'2026-02-30T12:00:00.000Z' },
  { ...sample, observedAt:'2027-05-02T12:00:00.000Z' },
  { ...sample, destinationId:'fake-park' },
  { ...sample, stage:'PREDICTED_PEAK' },
  { ...sample, source:{ ...source, name:'' } },
], { now: reference });
assert.equal(synthetic.totalRecords, 1, 'dedupe and refuse unsupported, future-dated or forged entries');
assert.deepEqual(synthetic.byDestination['holland-tulips'].years, ['2026']);
assert.equal(synthetic.byDestination['holland-tulips'].records[0].evidenceType, 'dated operator or institutional article');
assert.equal(synthetic.byDestination['holland-tulips'].records[0].stage, 'PEAK');

const page = fs.readFileSync(new URL('../pages/bloom-tracker.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../pages/api/bloom-history.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/bloom-visit-guide.css', import.meta.url), 'utf8');
assert.ok(page.includes('HistoricalBloomRecord history={history} isAutumnMums={mumView}'), 'history must accompany the destination card, not displace the trip decision');
assert.ok(page.includes('history={historyDesk.byDestination?.[entry.id]}'), 'each destination must get its own records');
assert.ok(page.includes("fetch('/api/bloom-history'"), 'latest archive must refresh without a site rebuild');
assert.ok(page.includes('Spring cherry records are not evidence for this separate display.'), 'October mums must never reuse spring cherry records');
assert.ok(api.includes('readBloomObservationHistory()') && api.includes('mergeObservationHistory(COMMITTED, latest.value)'), 'API must use live versioned observations with committed fallback');
assert.ok(!api.includes('GH_TOKEN') && !api.includes('evidenceText'), 'API must not expose credentials or raw source text');
assert.ok(css.includes('.bloom-history-record'), 'destination-level historical notes need mobile styling');
console.log('Bloom historic field evidence: PASS');
