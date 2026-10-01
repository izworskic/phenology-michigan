import assert from 'node:assert/strict';
import {
  daysUntilWeekend,
  decisionLabel,
  selectWeekendForecast,
  sortPublicDestinations,
  stageRangeLabel,
} from '../lib/bloom/public-presentation.mjs';

assert.equal(decisionLabel('GO_BEFORE'), 'GO BEFORE WEATHER');
assert.equal(stageRangeLabel('NEAR_PEAK', 'PEAK'), 'Near peak → Peak');
assert.equal(daysUntilWeekend('2026-09-30T18:00:00-04:00'), 3, 'Wednesday in Detroit should target Saturday in 3 days');

const forecast = [
  { horizonDays: 3, stageLow: 'BUILDING', stageHigh: 'NEAR_PEAK' },
  { horizonDays: 5, stageLow: 'NEAR_PEAK', stageHigh: 'PEAK' },
  { horizonDays: 7, stageLow: 'PEAK', stageHigh: 'FADING' },
];
assert.equal(selectWeekendForecast(forecast, '2026-09-30T18:00:00-04:00').horizonDays, 3);
assert.equal(selectWeekendForecast(forecast, '2026-09-28T18:00:00-04:00').horizonDays, 5);

const entries = [
  { id: 'wait', name: 'Wait', decision: { decision: 'WAIT', forecast } },
  { id: 'unknown', name: 'Unknown', decision: { decision: 'UNKNOWN', forecast: [] } },
  { id: 'go', name: 'Go', decision: { decision: 'GO', forecast: [] } },
  { id: 'before', name: 'Go Before', decision: { decision: 'GO_BEFORE', forecast: [] } },
  { id: 'limited', name: 'Limited', decision: { decision: 'LIMITED', forecast: [] } },
];
const sorted = sortPublicDestinations(entries, '2026-09-30T18:00:00-04:00');
assert.deepEqual(sorted.map((item) => item.id), ['before', 'go', 'wait', 'limited', 'unknown']);

const tied = sortPublicDestinations([
  { id: 'plain', name: 'Plain', decision: { decision: 'WAIT', forecast: [{ horizonDays: 3, stageLow: 'BUILDING', stageHigh: 'BUILDING' }] } },
  { id: 'weekend', name: 'Weekend', decision: { decision: 'WAIT', forecast: [{ horizonDays: 3, stageLow: 'NEAR_PEAK', stageHigh: 'PEAK' }] } },
], '2026-09-30T18:00:00-04:00');
assert.equal(tied[0].id, 'weekend', 'within the same backend decision, a useful weekend range may sort first');

console.log('Bloom public presentation invariants: PASS');
