export const DISPLAY_TYPES = Object.freeze({
  BIOLOGICAL: 'biological',
  STAGGERED_MIXED: 'staggered_mixed',
});

const commonForecastPolicy = Object.freeze({
  operationalThroughDays: 3,
  usefulWindowThroughDays: 5,
  directionalThroughDays: 7,
  exactStageMaxDays: 5,
});

export const BLOOM_DESTINATIONS = Object.freeze([
  {
    id: 'traverse-city-cherries',
    name: 'Traverse City Cherry Blossoms',
    region: 'Northwest Michigan',
    species: ['Prunus cerasus', 'Prunus avium'],
    displayType: DISPLAY_TYPES.BIOLOGICAL,
    coordinates: { lat: 44.7631, lon: -85.6206 },
    zones: [
      'Acme/Williamsburg',
      'Old Mission South',
      'Old Mission Central',
      'Old Mission North',
      'Southern Leelanau',
      'Northern Leelanau/Northport',
    ],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: commonForecastPolicy,
    sourcePolicy: {
      preferred: ['MSU Extension / Northwest Michigan Horticulture Research Center'],
      supporting: ['Traverse City Tourism', 'USA-NPN'],
    },
  },
  {
    id: 'meijer-gardens-cherries',
    name: 'Meijer Gardens Cherry Blossoms',
    region: 'Grand Rapids',
    species: ['ornamental cherry'],
    displayType: DISPLAY_TYPES.BIOLOGICAL,
    coordinates: { lat: 42.9807, lon: -85.5870 },
    zones: ['Japanese Garden / cherry display'],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: commonForecastPolicy,
    sourcePolicy: {
      preferred: ['Frederik Meijer Gardens & Sculpture Park'],
      supporting: ['USA-NPN'],
    },
  },
  {
    id: 'um-peony-garden',
    name: 'University of Michigan Peony Garden',
    region: 'Ann Arbor',
    species: ['Paeonia lactiflora and cultivars'],
    displayType: DISPLAY_TYPES.BIOLOGICAL,
    coordinates: { lat: 42.2999, lon: -83.6645 },
    zones: ['W.E. Upjohn Peony Garden'],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: commonForecastPolicy,
    sourcePolicy: {
      preferred: ['University of Michigan Matthaei Botanical Gardens & Nichols Arboretum'],
      supporting: ['USA-NPN'],
    },
  },
  {
    id: 'holland-tulips',
    name: 'Holland Tulips',
    region: 'West Michigan',
    species: ['Tulipa cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 42.7877, lon: -86.1081 },
    zones: ['Centennial Park', 'Window on the Waterfront', 'citywide tulip lanes'],
    observationPolicy: { highConfidenceMaxAgeDays: 3, mediumConfidenceMaxAgeDays: 5 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ['City of Holland Tulip Tracker'],
      supporting: ['Tulip Time Festival'],
    },
  },
  {
    id: 'mackinac-lilacs',
    name: 'Mackinac Island Lilacs',
    region: 'Straits of Mackinac',
    species: ['Syringa vulgaris and cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 45.8492, lon: -84.6189 },
    zones: ['Downtown', 'Marquette Park', 'West Bluff', 'East Bluff'],
    observationPolicy: { highConfidenceMaxAgeDays: 3, mediumConfidenceMaxAgeDays: 5 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ['Mackinac Island Tourism Bureau'],
      supporting: ['dated firsthand island observations'],
    },
  },
  {
    id: 'milan-lavender',
    name: 'Milan Lavender Lane',
    region: 'Southeast Michigan',
    species: ['Lavandula angustifolia and cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 42.083747, lon: -83.670218 },
    zones: ['Lavender Lane Farm field'],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ['Lavender Lane Farm'],
      supporting: ['Destination Ann Arbor', 'dated firsthand farm observations'],
    },
  },
  {
    id: 'frankenmuth-sunflowers',
    name: 'Frankenmuth Flower Festival Sunflowers',
    region: 'Frankenmuth',
    species: ['Helianthus annuus and cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 43.340413, lon: -83.741230 },
    zones: ["Grandpa Tiny's sunflower fields"],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ["Grandpa Tiny's Farm"],
      supporting: ['Frankenmuth Convention & Visitors Bureau', 'dated official farm updates'],
    },
  },
  {
    id: 'gull-meadow-sunflowers',
    name: 'Gull Meadow Sunflower Days',
    region: 'Southwest Michigan',
    species: ['Helianthus annuus and cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 42.36758, lon: -85.46417 },
    zones: ['Gull Meadow sunflower field'],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ['Gull Meadow Farms'],
      supporting: ['dated official farm observations'],
    },
  },
  {
    id: 'blakes-sunflowers',
    name: "Blake's Sunflower Festival",
    region: 'Thumb / Metro Detroit',
    species: ['Helianthus annuus and cultivars'],
    displayType: DISPLAY_TYPES.STAGGERED_MIXED,
    coordinates: { lat: 42.849784, lon: -82.951413 },
    zones: ["Blake's Orchard sunflower fields"],
    observationPolicy: { highConfidenceMaxAgeDays: 2, mediumConfidenceMaxAgeDays: 4 },
    forecastPolicy: { ...commonForecastPolicy, exactStageMaxDays: 3 },
    sourcePolicy: {
      preferred: ["Blake's Orchard & Cider Mill"],
      supporting: ['dated official farm observations'],
    },
  },
]);

export const BLOOM_DESTINATION_BY_ID = Object.freeze(
  Object.fromEntries(BLOOM_DESTINATIONS.map((destination) => [destination.id, destination]))
);

export function getBloomDestination(id) {
  return BLOOM_DESTINATION_BY_ID[id] || null;
}
