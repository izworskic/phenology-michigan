import { DISPLAY_TYPES } from './destinations.mjs';
import {
  BLOOM_STAGES,
  CONFIDENCE,
  DECISIONS,
  DISPLAY_POTENTIAL,
  ageDays,
  confidenceCapForObservationAge,
  exactStageAllowed,
  horizonMode,
  stageIndex,
  validateObservation,
} from './contracts.mjs';

function lowerConfidence(a, b) {
  const order = [CONFIDENCE.LOW, CONFIDENCE.MEDIUM, CONFIDENCE.HIGH];
  return order[Math.min(order.indexOf(a), order.indexOf(b))] || CONFIDENCE.LOW;
}

function clampRangeForPhysicalState(observationStage, low, high) {
  const current = stageIndex(observationStage);
  let lo = Math.max(0, stageIndex(low));
  let hi = Math.max(lo, stageIndex(high));

  // Generic/untrusted windows cannot skip across the development/durability boundary.
  if (current < stageIndex('PEAK')) hi = Math.min(hi, stageIndex('PEAK'));
  if (current === stageIndex('PEAK')) hi = Math.min(hi, stageIndex('FADING'));

  return { low: BLOOM_STAGES[lo], high: BLOOM_STAGES[hi] };
}

function widenForMixedDisplay(destination, range, horizonDays) {
  if (destination.displayType !== DISPLAY_TYPES.STAGGERED_MIXED) return range;
  if (horizonDays < 5) return range;
  const lo = stageIndex(range.low);
  const hi = stageIndex(range.high);
  return {
    low: BLOOM_STAGES[Math.max(stageIndex('BUILDING'), lo - 1)],
    high: BLOOM_STAGES[Math.min(stageIndex('FADING'), hi + 1)],
  };
}

function validateForecastWindow(window) {
  const errors = [];
  if (!Number.isFinite(window?.horizonDays) || window.horizonDays <= 0) errors.push('horizonDays must be positive');
  if (stageIndex(window?.stageLow) < 0) errors.push(`invalid stageLow: ${window?.stageLow}`);
  if (stageIndex(window?.stageHigh) < 0) errors.push(`invalid stageHigh: ${window?.stageHigh}`);
  if (!errors.length && stageIndex(window.stageLow) > stageIndex(window.stageHigh)) errors.push('stageLow cannot be after stageHigh');
  return errors;
}

function usableStage(stage) {
  return ['NEAR_PEAK', 'PEAK'].includes(stage);
}

function displayPotentialDecision(displayPotential) {
  if (displayPotential === DISPLAY_POTENTIAL.SEVERELY_REDUCED) return DECISIONS.LIMITED;
  return null;
}

export function buildBloomDecision({ destination, observation, forecastWindows = [], now = new Date() }) {
  if (!destination) throw new Error('destination is required');
  const observationErrors = validateObservation(observation);
  if (observationErrors.length) {
    return {
      destinationId: destination.id,
      decision: DECISIONS.UNKNOWN,
      confidence: CONFIDENCE.LOW,
      currentStage: null,
      reason: 'No trustworthy current bloom observation is available.',
      errors: observationErrors,
      forecast: [],
    };
  }

  const displayPotential = observation.displayPotential || DISPLAY_POTENTIAL.UNKNOWN;
  const hardGateDecision = displayPotentialDecision(displayPotential);
  const age = ageDays(observation.observedAt, now);
  const observationCap = confidenceCapForObservationAge(destination, observation.observedAt, now);
  const stale = observationCap === CONFIDENCE.LOW;

  const forecastErrors = [];
  const forecast = [];
  for (const window of forecastWindows.slice().sort((a, b) => a.horizonDays - b.horizonDays)) {
    const errors = validateForecastWindow(window);
    if (errors.length) {
      forecastErrors.push({ horizonDays: window?.horizonDays ?? null, errors });
      continue;
    }

    // Calibrated model windows already encode the physical split plus their
    // validated uncertainty tail. Generic/manual windows still receive the
    // stricter clamp and mixed-display widening here.
    const range = window.calibratedRange
      ? { low: window.stageLow, high: window.stageHigh }
      : widenForMixedDisplay(
          destination,
          clampRangeForPhysicalState(observation.stage, window.stageLow, window.stageHigh),
          window.horizonDays
        );

    const mode = horizonMode(destination, window.horizonDays);
    let confidence = lowerConfidence(window.confidence || CONFIDENCE.MEDIUM, observationCap);
    if (mode === 'directional' && confidence === CONFIDENCE.HIGH) confidence = CONFIDENCE.MEDIUM;
    if (mode === 'seasonal_outlook') confidence = CONFIDENCE.LOW;
    forecast.push({
      horizonDays: window.horizonDays,
      mode,
      stageLow: range.low,
      stageHigh: range.high,
      exactStage: exactStageAllowed(destination, window.horizonDays) && range.low === range.high ? range.low : null,
      pointStage: window.pointStage || null,
      confidence,
      peakWindow: window.peakWindow || null,
      durabilityRisk: window.durabilityRisk || null,
      riskFlags: Array.isArray(window.riskFlags) ? window.riskFlags : [],
      modelVersion: window.modelVersion || null,
      includesDurabilityTail: Boolean(window.includesDurabilityTail),
    });
  }

  let decision = hardGateDecision;
  let reason = null;
  let decisionConfidence = observationCap;

  if (!decision && stale) {
    decision = DECISIONS.UNKNOWN;
    reason = 'The latest bloom observation is too old for a confident trip decision.';
  }

  if (!decision) {
    const current = observation.stage;
    const nearTerm = forecast.find((f) => f.horizonDays <= 3) || forecast[0];
    const damagingNearTerm = nearTerm && ['high', 'severe'].includes(nearTerm.durabilityRisk);

    if (current === 'PEAK' && damagingNearTerm) {
      decision = DECISIONS.GO_BEFORE;
      decisionConfidence = lowerConfidence(decisionConfidence, nearTerm.confidence);
      reason = 'Peak display is present now, but forecast weather raises near-term petal-loss risk.';
    } else if (usableStage(current)) {
      decision = DECISIONS.GO;
      reason = current === 'PEAK' ? 'The display is at peak now.' : 'The display is close enough to peak to justify the trip now.';
    } else if (['DORMANT', 'EMERGING', 'BUILDING'].includes(current)) {
      const betterWindow = forecast.find((f) => stageIndex(f.stageHigh) >= stageIndex('NEAR_PEAK') && f.horizonDays <= 7);
      decision = DECISIONS.WAIT;
      if (betterWindow) decisionConfidence = lowerConfidence(decisionConfidence, betterWindow.confidence);
      reason = betterWindow ? 'The display is still building; a better window is developing.' : 'The display is not yet near peak.';
    } else if (['FADING', 'DONE'].includes(current)) {
      decision = DECISIONS.LIMITED;
      reason = current === 'DONE' ? 'The main display is over.' : 'The display is fading and trip value is declining.';
    } else {
      decision = DECISIONS.UNKNOWN;
      reason = 'Current bloom state is not sufficient for a trip recommendation.';
    }
  }

  if (displayPotential === DISPLAY_POTENTIAL.REDUCED && decision === DECISIONS.GO) {
    reason += ' Bloom quantity is reduced this season.';
  }

  return {
    destinationId: destination.id,
    destinationName: destination.name,
    displayType: destination.displayType,
    decision,
    confidence: decisionConfidence,
    currentStage: observation.stage,
    displayPotential,
    observationAgeDays: Math.round(age * 10) / 10,
    reason,
    source: observation.source,
    forecast,
    forecastErrors,
    generatedAt: now.toISOString(),
  };
}
