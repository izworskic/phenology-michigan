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
      url: 'https://msu-prod.dotcms.cloud/fruit/news',
      locator: 'msu_nw_fruit_update',
      name: 'MSU Extension — Northwest Michigan Fruit Update',
      parser: 'msu_tart_cherry',
      note: 'The locator scans the official Fruit & Nuts news index for the newest dated Northwest Michigan fruit update, then parses that article.',
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
  'milan-lavender': [
    {
      id: 'lavender-lane-official',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
      url: 'https://lavenderlanemi.com/local/',
      name: 'Lavender Lane Farm — Milan',
      parser: null,
      note: 'The official farm publishes the broad late-June-through-early-August peak window, but calendar language alone cannot create a current bloom observation.',
    },
  ],
  'frankenmuth-sunflowers': [
    {
      id: 'grandpa-tinys-flower-festival',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
      url: 'https://www.grandpatinys.com/frankenmuth-flower-festival',
      name: "Grandpa Tiny's Farm — Frankenmuth Flower Festival",
      parser: null,
      note: 'The official farm states that it posts weekly updates before the festival and daily updates during it. Those dated updates may be verified manually; festival dates alone never create a bloom claim.',
    },
  ],
  'gull-meadow-sunflowers': [
    {
      id: 'gull-meadow-sunflower-days',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
      url: 'https://gullmeadowfarms.com/pages/sunflower-days',
      name: 'Gull Meadow Farms — Sunflower Days',
      parser: null,
      note: 'The official farm explicitly describes the dates as crop-dependent. A current bloom stage therefore requires a dated official or verified field observation.',
    },
  ],
  'blakes-sunflowers': [
    {
      id: 'blakes-sunflower-festival',
      authority: 100,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
      url: 'https://blakefarms.com/sunflower-festival/',
      name: "Blake's Orchard & Cider Mill — Sunflower Festival",
      parser: null,
      note: 'The official festival page establishes the destination and event window but does not expose a reliable dated bloom-state feed. Current bloom requires a verified observation.',
    },
  ],
});

export function getBloomSources(destinationId) {
  return BLOOM_SOURCES[destinationId] || [];
}
