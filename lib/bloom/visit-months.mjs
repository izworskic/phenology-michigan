import { BLOOM_PLANNING_WINDOWS } from './seasonal-context.mjs';

// A visitor-selected month filters typical operator-backed seasonal windows.
// It does not advance a flower's stage or establish that any display is open.
export const BLOOM_VISIT_MONTHS = Object.freeze([
  ['all', 'Any month'],
  ['3', 'March'],
  ['4', 'April'],
  ['5', 'May'],
  ['6', 'June'],
  ['7', 'July'],
  ['8', 'August'],
  ['9', 'September'],
  ['10', 'October'],
]);

export function matchesPlanningMonth(destinationId, month = 'all', { autumnMums = false } = {}) {
  if (month === 'all') return true;
  const parsed = Number(month);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12 || String(parsed) !== String(month)) return false;

  // The Meijer autumn mum display is a separate event, not the spring cherry
  // stage modeled for this destination. Never reuse the cherry bloom forecast.
  if (autumnMums) return destinationId === 'meijer-gardens-cherries' && parsed === 10;

  const window = BLOOM_PLANNING_WINDOWS[destinationId];
  if (!window || !Array.isArray(window.start) || !Array.isArray(window.end)) return false;
  const start = Number(window.start[0]);
  const end = Number(window.end[0]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 12) return false;
  return start <= end ? parsed >= start && parsed <= end : parsed >= start || parsed <= end;
}

// October chrysanthemums are a distinct operator-advertised display at a
// destination whose spring cherry bloom is tracked separately. Only the
// October planning view may replace the cherry presentation.
export function isAutumnMumsPlanningView(destinationId, month, flowerFilter = 'all') {
  return destinationId === 'meijer-gardens-cherries' && month === '10' &&
    ((month === '10' && (flowerFilter === 'all' || flowerFilter === 'mum')) ||
      (month === 'all' && flowerFilter === 'mum'));
}
