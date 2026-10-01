const GENERATED_AT = '2026-05-08T12:00:00.000Z';

function forecast(stageLow, stageHigh, risks = ['low', 'low', 'low']) {
  return [1, 2, 3].map((horizonDays, index) => ({
    horizonDays,
    stageLow,
    stageHigh,
    durabilityRisk: risks[index] || risks[risks.length - 1] || 'low',
    confidence: 'HIGH',
  }));
}

function entry({ id, name, region, displayType = 'biological', stage, decision, reason, age = 0.4, confidence = 'HIGH', forecast: outlook, source = 'Synthetic product fixture', zoneStatus }) {
  return {
    id,
    name,
    region,
    displayType,
    zoneStatus,
    observation: { source: { label: source, url: null } },
    decision: {
      currentStage: stage,
      decision,
      reason,
      observationAgeDays: age,
      confidence,
      displayPotential: 'normal',
      source: { label: source, url: null },
      forecast: outlook,
    },
  };
}

const strong = {
  generatedAt: GENERATED_AT,
  delivery: 'fixture',
  destinations: [
    entry({ id: 'traverse-city-cherries', name: 'Traverse City Cherry Blossoms', region: 'Northwest Michigan', stage: 'NEAR_PEAK', decision: 'GO', reason: 'Peak conditions are spreading through Old Mission.', forecast: forecast('NEAR_PEAK', 'PEAK') }),
    entry({ id: 'holland-tulips', name: 'Holland Tulips', region: 'West Michigan', displayType: 'staggered_mixed', stage: 'PEAK', decision: 'GO', reason: 'Strong citywide tulip color is still holding.', forecast: forecast('PEAK', 'PEAK') }),
    entry({ id: 'um-peony-garden', name: 'University of Michigan Peony Garden', region: 'Ann Arbor', stage: 'BUILDING', decision: 'WAIT', reason: 'The display is building but has not reached its strongest window.', forecast: forecast('BUILDING', 'NEAR_PEAK') }),
    entry({ id: 'mackinac-lilacs', name: 'Mackinac Island Lilacs', region: 'Straits of Mackinac', displayType: 'staggered_mixed', stage: 'EMERGING', decision: 'WAIT', reason: 'Early bloom is starting, but the island-wide display is not ready yet.', forecast: forecast('EMERGING', 'BUILDING') }),
    entry({ id: 'meijer-gardens-cherries', name: 'Meijer Gardens Cherry Blossoms', region: 'Grand Rapids', stage: 'FADING', decision: 'LIMITED', reason: 'The strongest cherry display has passed.', forecast: forecast('FADING', 'DONE') }),
  ],
};

const weather = {
  ...strong,
  destinations: strong.destinations.map((item) => item.id === 'holland-tulips'
    ? entry({
        id: 'holland-tulips', name: 'Holland Tulips', region: 'West Michigan', displayType: 'staggered_mixed', stage: 'PEAK', decision: 'GO_BEFORE',
        reason: 'Peak now, with significant wind and rain durability risk arriving Sunday.',
        forecast: forecast('PEAK', 'FADING', ['low', 'high', 'high']),
      })
    : item),
};

const wave = {
  ...strong,
  destinations: strong.destinations.map((item) => item.id === 'traverse-city-cherries'
    ? {
        ...item,
        reason: 'The strongest cherry display has shifted north through Old Mission.',
        zoneStatus: [
          { name: 'Acme/Williamsburg', stage: 'FADING', coordinates: { lat: 44.7725, lon: -85.4933 } },
          { name: 'Old Mission South', stage: 'PEAK', coordinates: { lat: 44.8017, lon: -85.5850 } },
          { name: 'Old Mission Central', stage: 'NEAR_PEAK', coordinates: { lat: 44.9055, lon: -85.5062 } },
          { name: 'Old Mission North', stage: 'BUILDING', coordinates: { lat: 45.0130, lon: -85.4935 } },
          { name: 'Northern Leelanau / Northport', stage: 'EMERGING', coordinates: { lat: 45.1319, lon: -85.6169 } },
        ],
      }
    : item),
};

const weak = {
  ...strong,
  destinations: strong.destinations.map((item, index) => index < 3
    ? {
        ...item,
        decision: {
          ...item.decision,
          decision: 'UNKNOWN',
          reason: 'The last trustworthy observation is too old for a trip recommendation.',
          observationAgeDays: 8,
          confidence: 'LOW',
        },
      }
    : item),
};

const FIXTURES = Object.freeze({ strong, weather, wave, weak });

export function getBloomTrackerFixture(name) {
  return FIXTURES[name] || null;
}

export const BLOOM_TRACKER_FIXTURE_NAMES = Object.freeze(Object.keys(FIXTURES));
