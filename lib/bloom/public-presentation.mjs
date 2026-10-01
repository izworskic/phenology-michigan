import { BLOOM_STAGES } from './contracts.mjs';

export const PUBLIC_DECISION_ORDER = Object.freeze({
  GO_BEFORE: 0,
  GO: 1,
  WAIT: 2,
  LIMITED: 3,
  UNKNOWN: 4,
});

export const PUBLIC_DECISION_LABELS = Object.freeze({
  GO_BEFORE: 'GO BEFORE WEATHER',
  GO: 'GO',
  WAIT: 'WAIT',
  LIMITED: 'LIMITED',
  UNKNOWN: 'UNKNOWN',
});

export const PUBLIC_STAGE_LABELS = Object.freeze({
  DORMANT: 'Dormant',
  EMERGING: 'Emerging',
  BUILDING: 'Building',
  NEAR_PEAK: 'Near peak',
  PEAK: 'Peak',
  FADING: 'Fading',
  DONE: 'Done',
});

const WEEKDAY_TO_SATURDAY = Object.freeze({
  Sun: 0,
  Mon: 5,
  Tue: 4,
  Wed: 3,
  Thu: 2,
  Fri: 1,
  Sat: 0,
});

export function decisionRank(decision) {
  return PUBLIC_DECISION_ORDER[decision] ?? PUBLIC_DECISION_ORDER.UNKNOWN;
}

export function stageLabel(stage) {
  return PUBLIC_STAGE_LABELS[stage] || 'Unknown';
}

export function decisionLabel(decision) {
  return PUBLIC_DECISION_LABELS[decision] || PUBLIC_DECISION_LABELS.UNKNOWN;
}

export function stageRangeLabel(low, high) {
  if (!low && !high) return 'No forecast';
  if (low === high) return stageLabel(low);
  return `${stageLabel(low)} → ${stageLabel(high)}`;
}

export function daysUntilWeekend(dateLike = new Date()) {
  const date = new Date(dateLike);
  if (!Number.isFinite(date.getTime())) return 3;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    weekday: 'short',
  }).format(date);
  return WEEKDAY_TO_SATURDAY[weekday] ?? 3;
}

export function selectWeekendForecast(forecast = [], dateLike = new Date()) {
  if (!Array.isArray(forecast) || !forecast.length) return null;
  const target = Math.max(1, daysUntilWeekend(dateLike));
  return forecast
    .filter((item) => Number.isFinite(item?.horizonDays))
    .sort((a, b) => {
      const da = Math.abs(a.horizonDays - target);
      const db = Math.abs(b.horizonDays - target);
      return da - db || a.horizonDays - b.horizonDays;
    })[0] || null;
}

export function hasUsefulStageInRange(window) {
  if (!window) return false;
  const low = BLOOM_STAGES.indexOf(window.stageLow);
  const high = BLOOM_STAGES.indexOf(window.stageHigh);
  const near = BLOOM_STAGES.indexOf('NEAR_PEAK');
  const peak = BLOOM_STAGES.indexOf('PEAK');
  if (low < 0 || high < 0) return false;
  return high >= near && low <= peak;
}

export function sortPublicDestinations(destinations = [], generatedAt = new Date()) {
  return [...destinations].sort((a, b) => {
    const aDecision = a?.decision?.decision || 'UNKNOWN';
    const bDecision = b?.decision?.decision || 'UNKNOWN';
    const rankDiff = decisionRank(aDecision) - decisionRank(bDecision);
    if (rankDiff !== 0) return rankDiff;

    const aWeekend = selectWeekendForecast(a?.decision?.forecast, generatedAt);
    const bWeekend = selectWeekendForecast(b?.decision?.forecast, generatedAt);
    const weekendDiff = Number(hasUsefulStageInRange(bWeekend)) - Number(hasUsefulStageInRange(aWeekend));
    if (weekendDiff !== 0) return weekendDiff;

    return String(a?.name || '').localeCompare(String(b?.name || ''));
  });
}
