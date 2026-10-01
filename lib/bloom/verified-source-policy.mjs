export const VERIFIED_BLOOM_SOURCES = Object.freeze({
  'holland-tulips': Object.freeze({
    id: 'verified:holland-city-tulip-tracker',
    name: 'City of Holland Tulip Tracker — verified camera review',
    url: 'https://www.cityofholland.com/1022/Tulip-Tracker',
    authority: 100,
  }),
  'mackinac-lilacs': Object.freeze({
    id: 'verified:mackinac-tourism-lilacs',
    name: 'Mackinac Island Tourism Bureau — verified island observation',
    url: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/',
    authority: 95,
  }),
  'traverse-city-cherries': Object.freeze({
    id: 'verified:traverse-city-local',
    name: 'Traverse City cherry blossoms — verified local observation',
    url: 'https://www.traversecity.com/things-to-do/tours/cherry-blossom-tours/',
    authority: 90,
  }),
  'meijer-gardens-cherries': Object.freeze({
    id: 'verified:meijer-cherry-official',
    name: 'Frederik Meijer Gardens — verified blossom observation',
    url: 'https://www.meijergardens.org/blossoms/',
    authority: 100,
  }),
  'um-peony-garden': Object.freeze({
    id: 'verified:um-peony-official',
    name: 'University of Michigan Peony Garden — verified observation',
    url: 'https://mbgna.umich.edu/whats-bloom-peony-garden',
    authority: 100,
  }),
});

export function verifiedBloomSourceFor(destinationId) {
  return VERIFIED_BLOOM_SOURCES[destinationId] || null;
}
