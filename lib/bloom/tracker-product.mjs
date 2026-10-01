const HUMAN_DECISION = Object.freeze({
  GO: 'Worth the drive',
  GO_BEFORE: 'Go before the weather turns',
  WAIT: 'Wait a few days',
  LIMITED: 'Past the best viewing',
  UNKNOWN: 'Not enough fresh evidence',
});

const SHORT_DECISION = Object.freeze({
  GO: 'GO NOW',
  GO_BEFORE: 'GO SOON',
  WAIT: 'WAIT',
  LIMITED: 'LIMITED',
  UNKNOWN: 'UNCERTAIN',
});

export function humanDecisionLabel(decision) {
  return HUMAN_DECISION[decision] || HUMAN_DECISION.UNKNOWN;
}

export function shortDecisionLabel(decision) {
  return SHORT_DECISION[decision] || SHORT_DECISION.UNKNOWN;
}

export function decisionCounts(destinations = []) {
  return destinations.reduce((counts, entry) => {
    const state = entry?.decision?.decision || 'UNKNOWN';
    counts[state] = (counts[state] || 0) + 1;
    return counts;
  }, { GO: 0, GO_BEFORE: 0, WAIT: 0, LIMITED: 0, UNKNOWN: 0 });
}

function dateForHorizon(generatedAt, horizonDays) {
  const date = new Date(generatedAt);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(horizonDays)) return null;
  date.setUTCDate(date.getUTCDate() + horizonDays);
  return date;
}

function weekday(date) {
  if (!date) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    weekday: 'long',
  }).format(date);
}

export function goBeforeWindow(decision = {}, generatedAt = new Date()) {
  if (decision.decision !== 'GO_BEFORE') return null;
  const forecast = Array.isArray(decision.forecast)
    ? decision.forecast.filter((item) => Number.isFinite(item?.horizonDays)).sort((a, b) => a.horizonDays - b.horizonDays)
    : [];

  const damaging = forecast.find((item) => ['high', 'severe'].includes(String(item?.durabilityRisk || '').toLowerCase()));
  if (!damaging) return 'Go sooner rather than later';

  const riskDay = weekday(dateForHorizon(generatedAt, damaging.horizonDays));
  const safer = [...forecast].reverse().find((item) => item.horizonDays < damaging.horizonDays && !['high', 'severe'].includes(String(item?.durabilityRisk || '').toLowerCase()));
  const safeDay = safer ? weekday(dateForHorizon(generatedAt, safer.horizonDays)) : null;

  if (safeDay && riskDay && safeDay !== riskDay) return `Go ${safeDay} — risk rises ${riskDay}`;
  if (riskDay) return `Go before ${riskDay}`;
  return 'Go sooner rather than later';
}

export function freshnessLabel(decision = {}) {
  if (decision.observationAgeDays == null) return 'Freshness unknown';
  const age = Number(decision.observationAgeDays);
  if (!Number.isFinite(age)) return 'Freshness unknown';
  if (age < 0.8) return 'Observed today';
  if (age < 1.8) return 'Observed about 1 day ago';
  return `Observed ${Math.round(age)} days ago`;
}

export function evidenceStrength(decision = {}) {
  const age = Number(decision.observationAgeDays);
  if (decision.decision === 'UNKNOWN') return 'weak';
  if (!Number.isFinite(age)) return 'weak';
  if (age <= 2 && decision.confidence === 'HIGH') return 'fresh';
  if (age <= 5) return 'aging';
  return 'weak';
}
