import { CONFIDENCE } from './contracts.mjs';

const MODEL_STAGES = Object.freeze(['EMERGING', 'BUILDING', 'NEAR_PEAK', 'PEAK', 'FADING', 'DONE']);
const MODEL_STAGE_INDEX = Object.freeze(Object.fromEntries(MODEL_STAGES.map((stage, i) => [stage, i])));

export const BLOOM_MODEL_CALIBRATION = Object.freeze({
  version: 'corrected-velocity-ridge-v1',
  trainingRows: 45,
  coefficients: Object.freeze([
    0.3897273821,
    0.4013089606,
    -0.4418226948,
    -0.3902974199,
    0.6482921534,
    0.5292500809,
    0.0437136050,
    -0.4227076118,
    -0.2453470047,
    -0.2083170230,
    -0.0232932192,
  ]),
  featureOrder: Object.freeze([
    'intercept',
    'horizon_days_over_7',
    'recent_velocity_x_horizon',
    'stage_index_over_5',
    'cherry_family',
    'gdd5_over_40',
    'gdd10_over_25',
    'freeze_hours_over_24',
    'precip_mm_over_25',
    'max_gust_kmh_over_60',
    'hot_hours_27_over_24',
  ]),
  validation: Object.freeze({
    correctedVelocityLoyo: Object.freeze({
      rows: 45,
      withinOneStagePct: 100.0,
      exactStagePct: 33.3,
      meanStageError: 0.667,
    }),
    frozenExternalHollandMackinac: Object.freeze({
      rows: 36,
      withinOneStagePct: 100.0,
      exactStagePct: 66.7,
      meanStageError: 0.333,
    }),
  }),
});

const CHERRY_DESTINATIONS = new Set(['traverse-city-cherries', 'meijer-gardens-cherries']);
const CALIBRATED_DESTINATIONS = new Set([
  'traverse-city-cherries',
  'meijer-gardens-cherries',
  'um-peony-garden',
  'holland-tulips',
  'mackinac-lilacs',
]);

export function bloomForecastIsCalibrated(destinationId) {
  return CALIBRATED_DESTINATIONS.has(destinationId);
}

function modelStageIndex(stage) {
  return MODEL_STAGE_INDEX[stage] ?? -1;
}

function roundDelta(value) {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function lowerConfidence(confidence) {
  if (confidence === CONFIDENCE.HIGH) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

export function computeBloomRecentVelocity(history = [], currentObservation = null) {
  const currentTime = currentObservation?.observedAt ? new Date(currentObservation.observedAt).getTime() : Infinity;
  const normalized = history
    .filter((o) => modelStageIndex(o?.stage) >= 0 && Number.isFinite(new Date(o?.observedAt).getTime()))
    .filter((o) => new Date(o.observedAt).getTime() <= currentTime)
    .sort((a, b) => new Date(a.observedAt) - new Date(b.observedAt));

  if (currentObservation && modelStageIndex(currentObservation.stage) >= 0 && Number.isFinite(currentTime)) {
    const alreadyIncluded = normalized.some((o) => o.stage === currentObservation.stage && new Date(o.observedAt).getTime() === currentTime);
    if (!alreadyIncluded) normalized.push(currentObservation);
  }

  if (normalized.length < 2) return 0;
  const window = normalized.slice(-4);
  const transitions = [];
  for (let i = 1; i < window.length; i += 1) {
    const a = window[i - 1];
    const b = window[i];
    const days = (new Date(b.observedAt) - new Date(a.observedAt)) / 86400000;
    if (days > 0) transitions.push((modelStageIndex(b.stage) - modelStageIndex(a.stage)) / days);
  }
  if (!transitions.length) return 0;
  if (transitions.length === 1) return transitions[0];
  return (transitions.slice(0, -1).reduce((sum, v) => sum + v, 0) + 2 * transitions.at(-1)) / (transitions.length + 1);
}

export function buildBloomModelFeatures({ destinationId, issueStage, horizonDays, recentVelocity = 0, weather }) {
  const stage = modelStageIndex(issueStage);
  if (stage < 0) throw new Error(`Stage ${issueStage} is outside calibrated bloom model state space`);
  if (![3, 5, 7].includes(horizonDays)) throw new Error(`Unsupported calibrated horizon: ${horizonDays}`);
  if (!bloomForecastIsCalibrated(destinationId)) throw new Error(`Destination ${destinationId} is outside calibrated bloom model destination families`);
  const required = ['gdd5', 'gdd10', 'freezeHours', 'precipMm', 'maxGustKmh', 'hotHours27'];
  for (const key of required) {
    if (!Number.isFinite(Number(weather?.[key]))) throw new Error(`Missing calibrated weather feature: ${key}`);
  }
  return [
    1,
    horizonDays / 7,
    recentVelocity * horizonDays,
    stage / 5,
    CHERRY_DESTINATIONS.has(destinationId) ? 1 : 0,
    Number(weather.gdd5) / 40,
    Number(weather.gdd10) / 25,
    Number(weather.freezeHours) / 24,
    Number(weather.precipMm) / 25,
    Number(weather.maxGustKmh) / 60,
    Number(weather.hotHours27) / 24,
  ];
}

export function predictBloomWindowFromFeatures({ destinationId, issueStage, horizonDays, recentVelocity = 0, weather }) {
  const current = modelStageIndex(issueStage);
  if (current < 0) {
    return {
      horizonDays,
      stageLow: issueStage === 'DORMANT' ? 'DORMANT' : issueStage,
      stageHigh: issueStage === 'DORMANT' ? 'EMERGING' : issueStage,
      confidence: CONFIDENCE.LOW,
      durabilityRisk: null,
      riskFlags: ['outside_calibrated_stage_space'],
      calibratedRange: false,
      modelVersion: BLOOM_MODEL_CALIBRATION.version,
    };
  }

  const features = buildBloomModelFeatures({ destinationId, issueStage, horizonDays, recentVelocity, weather });
  const rawDelta = dot(BLOOM_MODEL_CALIBRATION.coefficients, features);
  const roundedDelta = Math.max(0, roundDelta(rawDelta));
  const rawTarget = Math.min(modelStageIndex('DONE'), current + roundedDelta);

  // Point estimate respects the hard development/durability split.
  let point = rawTarget;
  if (current < modelStageIndex('PEAK')) point = Math.min(point, modelStageIndex('PEAK'));
  else if (current === modelStageIndex('PEAK')) point = Math.min(point, modelStageIndex('FADING'));

  // Published output is an uncertainty band, not the point estimate. The
  // band may cross PEAK into a durability tail at 5–7 days even though the
  // development point itself is capped at PEAK.
  let low = Math.max(current, point - 1);
  let high = Math.min(modelStageIndex('DONE'), point + 1);
  let includesDurabilityTail = false;
  let durabilityRisk = null;
  const riskFlags = [];

  if (current < modelStageIndex('PEAK')) {
    if (point === modelStageIndex('PEAK') && horizonDays >= 5) {
      high = Math.min(modelStageIndex('FADING'), high);
      includesDurabilityTail = true;
      durabilityRisk = 'medium';
      riskFlags.push('may_pass_peak_within_window');
    } else {
      high = Math.min(modelStageIndex('PEAK'), high);
    }
  } else if (current === modelStageIndex('PEAK')) {
    if (point === modelStageIndex('FADING')) {
      durabilityRisk = 'medium';
      riskFlags.push('model_projects_fade');
      if (horizonDays >= 5) includesDurabilityTail = true;
    }
    if (!includesDurabilityTail) high = Math.min(modelStageIndex('FADING'), high);
  }

  if (roundedDelta >= 2) riskFlags.push('rapid_progression');

  const confidence = horizonDays === 3 ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;

  return {
    horizonDays,
    stageLow: MODEL_STAGES[low],
    stageHigh: MODEL_STAGES[high],
    pointStage: MODEL_STAGES[point],
    confidence,
    peakWindow: null,
    durabilityRisk,
    riskFlags,
    calibratedRange: true,
    includesDurabilityTail,
    modelVersion: BLOOM_MODEL_CALIBRATION.version,
    diagnostics: {
      rawDelta: Math.round(rawDelta * 1000) / 1000,
      recentVelocity: Math.round(recentVelocity * 1000) / 1000,
    },
  };
}

export function forecastBloomWindows({ destination, observation, observationHistory = [], weatherSnapshot }) {
  if (!destination || !observation || !weatherSnapshot?.windows) return [];
  // The current calibration was trained/validated on the original spring
  // destination families. New lavender/sunflower displays remain fully usable
  // for verified current-state decisions, but do not inherit unvalidated
  // 3/5/7-day stage projections.
  if (!bloomForecastIsCalibrated(destination.id)) return [];
  if (observation.stage === 'DORMANT') {
    return weatherSnapshot.windows
      .filter((w) => [3, 5, 7].includes(w.horizonDays))
      .map((w) => predictBloomWindowFromFeatures({
        destinationId: destination.id,
        issueStage: 'DORMANT',
        horizonDays: w.horizonDays,
        recentVelocity: 0,
        weather: w,
      }));
  }

  const recentVelocity = computeBloomRecentVelocity(observationHistory, observation);
  return weatherSnapshot.windows
    .filter((w) => [3, 5, 7].includes(w.horizonDays))
    .map((w) => {
      const result = predictBloomWindowFromFeatures({
        destinationId: destination.id,
        issueStage: observation.stage,
        horizonDays: w.horizonDays,
        recentVelocity,
        weather: w,
      });
      if (observationHistory.length < 1 && result.confidence === CONFIDENCE.HIGH) {
        return { ...result, confidence: lowerConfidence(result.confidence), riskFlags: [...result.riskFlags, 'limited_observation_history'] };
      }
      return result;
    });
}
