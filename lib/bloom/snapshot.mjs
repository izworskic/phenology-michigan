import { BLOOM_DESTINATIONS } from './destinations.mjs';
import { ageDays, confidenceCapForObservationAge, CONFIDENCE } from './contracts.mjs';
import { getBloomSources } from './source-registry.mjs';
import {
  fetchAutomaticObservation,
  normalizeVerifiedOverride,
  selectBestObservation,
} from './observation-ingestion.mjs';

export async function buildBloomObservationSnapshot({ overrides = { observations: [] }, fetchImpl = fetch, now = new Date() } = {}) {
  const normalizedOverrides = (overrides.observations || [])
    .map((raw) => normalizeVerifiedOverride(raw, now))
    .filter(Boolean);

  const destinations = await Promise.all(BLOOM_DESTINATIONS.map(async (destination) => {
    const candidates = normalizedOverrides.filter((o) => o.destinationId === destination.id);
    const sourceStatus = [];

    for (const source of getBloomSources(destination.id)) {
      try {
        const result = await fetchAutomaticObservation(destination.id, source, fetchImpl, now);
        sourceStatus.push({
          sourceId: source.id,
          name: source.name,
          url: source.url,
          mode: source.mode,
          diagnostic: result.diagnostic,
          observationFound: Boolean(result.observation),
          locatedArticle: result.locator?.article || null,
          locatorPagesScanned: result.locator?.pagesScanned || null,
        });
        if (result.observation) candidates.push(result.observation);
      } catch (error) {
        sourceStatus.push({
          sourceId: source.id,
          name: source.name,
          url: source.url,
          mode: source.mode,
          diagnostic: 'fetch_failed',
          error: error instanceof Error ? error.message : String(error),
          observationFound: false,
        });
      }
    }

    const observation = selectBestObservation(destination.id, candidates, now);
    const confidenceCap = observation
      ? confidenceCapForObservationAge(destination, observation.observedAt, now)
      : CONFIDENCE.LOW;
    const observationAgeDays = observation ? Math.round(ageDays(observation.observedAt, now) * 10) / 10 : null;
    const usable = Boolean(observation) && confidenceCap !== CONFIDENCE.LOW;

    return {
      id: destination.id,
      name: destination.name,
      region: destination.region,
      displayType: destination.displayType,
      status: usable ? 'OBSERVED' : 'UNKNOWN',
      usable,
      confidenceCap,
      observationAgeDays,
      observation: observation || null,
      sourceStatus,
    };
  }));

  return {
    generatedAt: now.toISOString(),
    schemaVersion: 1,
    destinations,
    counts: {
      observed: destinations.filter((d) => d.usable).length,
      unknown: destinations.filter((d) => !d.usable).length,
    },
  };
}
