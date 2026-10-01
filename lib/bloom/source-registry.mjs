export const BLOOM_SOURCE_MODES = Object.freeze({
  DATED_TRACKER: 'dated_tracker',
  DATED_ARTICLE: 'dated_article',
  CAMERA_MANUAL: 'camera_manual',
  VERIFIED_OVERRIDE: 'verified_override',
});

export const BLOOM_SOURCES = Object.freeze({
  'um-peony-garden': [
    {
      id: 'um-peony-official',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.DATED_TRACKER,
      url: 'https://mbgna.umich.edu/whats-bloom-peony-garden',
      name: 'University of Michigan Peony Garden — What’s in Bloom',
      parser: 'um_peony',
    },
  ],
  'meijer-gardens-cherries': [
    {
      id: 'meijer-cherry-official',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.DATED_TRACKER,
      url: 'https://www.meijergardens.org/blossoms/',
      name: 'Frederik Meijer Gardens — Cherry Blossoms',
      parser: 'meijer_cherry',
    },
  ],
  'traverse-city-cherries': [
    {
      id: 'msu-nwmihort',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.DATED_ARTICLE,
      url: 'https://msu-prod.dotcmscloud.com/fruit/news',
      name: 'MSU Extension — Northwest Michigan Fruit Update',
      parser: 'msu_tart_cherry',
      locator: 'msu_northwest_fruit_update',
      note: 'The refresh locates the newest dated Northwest Michigan fruit update from the MSU Fruit & Nuts news listing, then parses Montmorency stage from the article itself.',
    },
  ],
  'holland-tulips': [
    {
      id: 'holland-city-tulip-tracker',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.CAMERA_MANUAL,
      url: 'https://www.cityofholland.com/1022/Tulip-Tracker',
      name: 'City of Holland Tulip Tracker',
      parser: null,
      note: 'The official page is useful for cameras/status but may retain undated seasonal text. It cannot autonomously create a current observation.',
    },
  ],
  'mackinac-lilacs': [
    {
      id: 'mackinac-tourism-lilacs',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
      url: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/',
      name: 'Mackinac Island Tourism Bureau',
      parser: null,
      note: 'Official visitor pages establish the display context but do not expose a reliable dated bloom-state feed.',
    },
  ],
});

export function getBloomSources(destinationId) {
  return BLOOM_SOURCES[destinationId] || [];
}
