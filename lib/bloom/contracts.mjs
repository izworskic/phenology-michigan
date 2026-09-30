export const BLOOM_STAGES = Object.freeze([
  'DORMANT',
  'EMERGING',
  'BUILDING',
  'NEAR_PEAK',
  'PEAK',
  'FADING',
  'DONE',
]);

export const DISPLAY_POTENTIAL = Object.freeze({
  NORMAL: 'normal',
  REDUCED: 'reduced',
  SEVERELY_REDUCED: 'severely_reduced',
  UNKNOWN: 'unknown',
});

export const DECISIONS = Object.freeze({
  GO: 'GO',
  GO_BEFORE: 'GO_BEFORE',
  WAIT: 'WAIT',
  LIMITED: 'LIMITED',
  UNKNOWN: 'UNKNOWN',
});

export const CONFIDENCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

const STAGE_INDEX = Object.freeze(Object.fromEntries(BLOOM_STAGES.map((stage, i) => [stage, i])));

export function stageIndex(stage) {
  return STAGE_INDEX[stage] ?? -1;
}

export function isValidStage(stage) {
  return stageIndex(stage) >= 0;
}

export function ageDays(observedAt, now = new Date()) {
  const observed = new Date(observedAt);
  if (!Number.isFinite(observed.getTime())) return Infinity;
  return Math.max(0, (now.getTime() - observed.getTime()) / 86400000);
}

export function confidenceCapForObservationAge(destination, observedAt, now = new Date()) {
  const age = ageDays(observedAt, now);
  const policy = destination.observationPolicy;
  if (age <= policy.highConfidenceMaxAgeDays) return CONFIDENCE.HIGH;
  if (age <= policy.mediumConfidenceMaxAgeDays) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

export function horizonMode(destination, horizonDays) {
  const p = destination.forecastPolicy;
  if (horizonDays <= p.operationalThroughDays) return 'operational';
  if (horizonDays <= p.usefulWindowThroughDays) return 'window';
  if (horizonDays <= p.directionalThroughDays) return 'directional';
  return 'seasonal_outlook';
}

export function exactStageAllowed(destination, horizonDays) {
  return horizonDays <= destination.forecastPolicy.exactStageMaxDays;
}

export function validateObservation(observation) {
  const errors = [];
  if (!observation || typeof observation !== 'object') return ['observation is required'];
  if (!isValidStage(observation.stage)) errors.push(`invalid stage: ${observation.stage}`);
  if (!observation.observedAt || !Number.isFinite(new Date(observation.observedAt).getTime())) errors.push('observedAt must be an ISO date/time');
  if (!observation.source?.name) errors.push('source.name is required');
  if (!Object.values(DISPLAY_POTENTIAL).includes(observation.displayPotential || DISPLAY_POTENTIAL.UNKNOWN)) errors.push('invalid displayPotential');
  return errors;
}
