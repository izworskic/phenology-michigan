import { DISPLAY_POTENTIAL } from './contracts.mjs';
import { getBloomDestination } from './destinations.mjs';
import { normalizeVerifiedOverride } from './observation-ingestion.mjs';

export const BLOOM_OPERATOR_SOURCES = Object.freeze({
  'holland-tulips': Object.freeze({
    id: 'operator:holland-city-tulip-tracker',
    name: 'City of Holland Tulip Tracker — verified camera review',
    url: 'https://www.cityofholland.com/1022/Tulip-Tracker',
    authority: 100,
  }),
  'mackinac-lilacs': Object.freeze({
    id: 'operator:mackinac-tourism-lilacs',
    name: 'Mackinac Island Tourism Bureau — verified island observation',
    url: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/',
    authority: 95,
  }),
  'traverse-city-cherries': Object.freeze({
    id: 'operator:traverse-city-local',
    name: 'Traverse City cherry blossom — verified local observation',
    url: 'https://www.traversecity.com/things-to-do/tours/cherry-blossom-tours/',
    authority: 90,
  }),
  'meijer-gardens-cherries': Object.freeze({
    id: 'operator:meijer-cherry-official',
    name: 'Frederik Meijer Gardens — verified blossom observation',
    url: 'https://www.meijergardens.org/blossoms/',
    authority: 100,
  }),
  'um-peony-garden': Object.freeze({
    id: 'operator:um-peony-official',
    name: 'University of Michigan Peony Garden — verified observation',
    url: 'https://mbgna.umich.edu/whats-bloom-peony-garden',
    authority: 100,
  }),
});

export function getBloomOperatorSource(destinationId) {
  return BLOOM_OPERATOR_SOURCES[destinationId] || null;
}

export function buildVerifiedOperatorObservation(body, now = new Date()) {
  const destination = getBloomDestination(body?.destinationId);
  if (!destination) return { observation: null, error: 'unknown destination' };

  const source = getBloomOperatorSource(destination.id);
  if (!source) return { observation: null, error: 'no approved operator source configured' };

  const evidenceText = String(body?.evidenceText || '').trim();
  if (evidenceText.length < 8) {
    return { observation: null, error: 'evidence note is required and must briefly describe what was observed' };
  }

  const displayPotential = body?.displayPotential || DISPLAY_POTENTIAL.NORMAL;
  if (!Object.values(DISPLAY_POTENTIAL).includes(displayPotential)) {
    return { observation: null, error: 'invalid displayPotential' };
  }

  const observedAt = new Date(body?.observedAt);
  const validThrough = new Date(body?.validThrough);
  if (!Number.isFinite(observedAt.getTime()) || !Number.isFinite(validThrough.getTime()) || validThrough < observedAt) {
    return { observation: null, error: 'observedAt and validThrough are required; validThrough must be after observedAt' };
  }

  const observation = normalizeVerifiedOverride({
    destinationId: destination.id,
    zone: body?.zone || null,
    stage: body?.stage,
    observedAt: observedAt.toISOString(),
    validThrough: validThrough.toISOString(),
    displayPotential,
    source,
    evidenceText,
    notes: String(body?.notes || '').trim() || null,
  }, now);

  if (!observation) {
    return { observation: null, error: 'verified observation is expired, future-dated, or has an invalid bloom stage' };
  }

  return { observation, error: null };
}
