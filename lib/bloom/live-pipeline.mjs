import { BLOOM_DESTINATIONS, getBloomDestination } from './destinations.mjs';
import { buildBloomDecision } from './engine.mjs';
import { forecastBloomWindows, BLOOM_MODEL_CALIBRATION } from './model.mjs';
import { buildBloomObservationSnapshot } from './snapshot.mjs';
import { fetchBloomWeather } from './weather.mjs';
import { buildBloomSeasonContext } from './seasonal-context.mjs';
import { buildBloomEditorial } from './editorial.mjs';
import {
  appendBloomForecasts,
  appendBloomObservations,
  bloomStorageConfigured,
  mergeObservationHistory,
  readBloomLatest,
  readBloomObservationHistory,
  readBloomOverrides,
  writeBloomLatest,
} from './history-store.mjs';

function destinationHistory(history, destinationId, through) {
  const throughMs = through ? new Date(through).getTime() : Infinity;
  return (history || [])
    .filter((o) => o?.destinationId === destinationId)
    .filter((o) => Number.isFinite(new Date(o?.observedAt).getTime()))
    .filter((o) => new Date(o.observedAt).getTime() <= throughMs)
    .sort((a, b) => new Date(a.observedAt) - new Date(b.observedAt));
}

function unknownDecision(destination, observationState, reason) {
  return {
    destinationId: destination.id,
    destinationName: destination.name,
    displayType: destination.displayType,
    decision: 'UNKNOWN',
    confidence: 'LOW',
    currentStage: observationState?.observation?.stage || null,
    displayPotential: observationState?.observation?.displayPotential || 'unknown',
    observationAgeDays: observationState?.observationAgeDays ?? null,
    reason,
    source: observationState?.observation?.source || null,
    forecast: [],
    forecastErrors: [],
  };
}

export async function runBloomLiveCycle({
  now = new Date(),
  fetchImpl = fetch,
  bootstrapOverrides = { observations: [] },
  storageOptions = {},
  persist = true,
  editorialAuthToken = null,
} = {}) {
  const generatedAt = now.toISOString();
  const storageConfigured = bloomStorageConfigured(storageOptions.token);

  const [storedHistoryResult, liveOverridesResult, previousLatestResult] = await Promise.all([
    storageConfigured ? readBloomObservationHistory({ ...storageOptions, fetchImpl }) : Promise.resolve({ ok: false, value: [] }),
    storageConfigured ? readBloomOverrides({ ...storageOptions, fetchImpl }) : Promise.resolve({ ok: false, value: bootstrapOverrides }),
    storageConfigured ? readBloomLatest({ ...storageOptions, fetchImpl }) : Promise.resolve({ ok: false, value: null }),
  ]);

  const existingHistory = storedHistoryResult.value || [];
  const overrides = liveOverridesResult.ok ? liveOverridesResult.value : bootstrapOverrides;
  const observationSnapshot = await buildBloomObservationSnapshot({ overrides, fetchImpl, now });
  const incomingObservations = observationSnapshot.destinations
    .map((d) => d.observation)
    .filter(Boolean);
  const mergedHistory = mergeObservationHistory(existingHistory, incomingObservations);

  const decisions = [];
  const issuances = [];

  for (const observationState of observationSnapshot.destinations) {
    const destination = getBloomDestination(observationState.id);
    if (!destination) continue;

    if (!observationState.usable || !observationState.observation) {
      decisions.push({
        ...observationState,
        decision: unknownDecision(destination, observationState, 'No sufficiently fresh authoritative bloom observation is available.'),
        weather: null,
      });
      continue;
    }

    let weather = null;
    let forecastWindows = [];
    let weatherError = null;
    try {
      weather = await fetchBloomWeather(destination, fetchImpl);
      const history = destinationHistory(mergedHistory, destination.id, observationState.observation.observedAt);
      forecastWindows = forecastBloomWindows({
        destination,
        observation: observationState.observation,
        observationHistory: history,
        weatherSnapshot: weather,
      });
    } catch (error) {
      weatherError = error instanceof Error ? error.message : String(error);
    }

    const decision = buildBloomDecision({
      destination,
      observation: observationState.observation,
      forecastWindows,
      now,
    });

    decisions.push({
      ...observationState,
      decision,
      weather: weather ? { source: weather.source, fetchedAt: weather.fetchedAt } : null,
      weatherError,
    });

    issuances.push({
      schemaVersion: 1,
      generatedAt,
      destinationId: destination.id,
      modelVersion: BLOOM_MODEL_CALIBRATION.version,
      observation: {
        stage: observationState.observation.stage,
        observedAt: observationState.observation.observedAt,
        sourceId: observationState.observation.source?.id || null,
      },
      decision: decision.decision,
      confidence: decision.confidence,
      forecast: decision.forecast,
      weather: weather ? { source: weather.source, fetchedAt: weather.fetchedAt } : null,
      weatherError,
    });
  }

  const season = buildBloomSeasonContext(decisions, now);
  let editorial;
  try {
    editorial = await buildBloomEditorial({
      destinations: decisions,
      seasonContext: season,
      previousEditorial: previousLatestResult?.value?.editorial || null,
      authToken: editorialAuthToken,
    });
  } catch (error) {
    editorial = {
      mode: 'deterministic-error-fallback',
      generatedAt,
      items: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  const latest = {
    schemaVersion: 1,
    generatedAt,
    modelVersion: BLOOM_MODEL_CALIBRATION.version,
    destinations: decisions,
    season,
    editorial,
    counts: {
      total: BLOOM_DESTINATIONS.length,
      observed: decisions.filter((d) => d.usable).length,
      unknown: decisions.filter((d) => !d.usable).length,
      go: decisions.filter((d) => d.decision?.decision === 'GO').length,
      goBefore: decisions.filter((d) => d.decision?.decision === 'GO_BEFORE').length,
      wait: decisions.filter((d) => d.decision?.decision === 'WAIT').length,
      limited: decisions.filter((d) => d.decision?.decision === 'LIMITED').length,
    },
    provenance: {
      observationHistoryRecords: mergedHistory.length,
      overridesSource: liveOverridesResult.ok ? 'github_live' : 'deployment_bootstrap',
      storageConfigured,
      editorialMode: editorial.mode,
    },
  };

  const writes = {
    observations: { ok: true, changed: false },
    forecasts: { ok: true, changed: false },
    latest: { ok: true, changed: false },
  };

  if (persist) {
    if (!storageConfigured) {
      writes.observations = writes.forecasts = writes.latest = { ok: false, changed: false, reason: 'GH_TOKEN not set' };
    } else {
      writes.observations = await appendBloomObservations(incomingObservations, { ...storageOptions, fetchImpl });
      writes.forecasts = await appendBloomForecasts(issuances.filter((x) => x.forecast.length || x.weatherError), { ...storageOptions, fetchImpl });
      writes.latest = await writeBloomLatest(latest, { ...storageOptions, fetchImpl });
    }
  }

  const failures = Object.entries(writes)
    .filter(([, result]) => !result.ok)
    .map(([name, result]) => `${name}: ${result.reason || 'write failed'}`);

  return {
    ok: failures.length === 0,
    generatedAt,
    latest,
    writes,
    failures,
  };
}
