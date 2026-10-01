const commonsImage = (fileName, width = 1200) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=${width}`;
const commonsPage = (fileName) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;

export const BLOOM_EXPERIENCES = Object.freeze({
  'traverse-city-cherries': {
    headline: 'White orchard rows, rolling peninsula roads, and blue water between the trees.',
    whatYouWillSee: 'The experience is a moving landscape rather than one flower bed: white cherry blossoms sweep across working orchards on Old Mission Peninsula, with East and West Grand Traverse Bay appearing between hills and farm fields.',
    bestExperience: 'Drive M-37 north on Old Mission Peninsula. The bloom usually advances from warmer southern areas toward the north, so the tracker’s zone progression matters more here than one citywide peak date. Stay on public roads and pull-offs; the orchards are working private farms.',
    lookFor: 'Clusters of small white cherry flowers on mostly bare branches, often forming long bright rows across the hillsides.',
    experienceSource: {
      label: 'Traverse City Tourism blossom tour',
      url: 'https://www.traversecity.com/things-to-do/tours/cherry-blossom-tours/',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Prunus avium flowers.jpg'),
        alt: 'White Prunus avium cherry flowers, a flower reference for Traverse City sweet cherry blossoms',
        caption: 'Flower reference: sweet cherry blossoms. Pair this with the Old Mission setting photo to picture the trip.',
        creator: 'G. Bernetti / EUFORGEN',
        license: 'CC BY-SA 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Prunus avium flowers.jpg'),
      },
      {
        kind: 'location-setting',
        imageUrl: commonsImage('Old Mission Peninsula.jpg'),
        alt: 'Grand Traverse Bay landscape viewed from Old Mission Peninsula near Traverse City, Michigan',
        caption: 'Old Mission Peninsula setting — the bloom drive runs through this bay-and-orchard landscape.',
        creator: 'stanthejeep',
        license: 'CC BY-SA 2.5',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Old Mission Peninsula.jpg'),
      },
    ],
  },
  'holland-tulips': {
    headline: 'Dense color you can walk through rather than a single roadside stop.',
    whatYouWillSee: 'Holland’s display is intentionally planted at city scale: blocks, parks, and paths filled with mixed tulip colors. Window on the Waterfront alone has more than 100,000 tulips and winding paths through the display.',
    bestExperience: 'For the most immersive walk, start at Window on the Waterfront. Centennial Park is the tighter downtown option; Windmill Island adds a large bulb field near DeZwaan. Because plantings are staggered, one bed can look different from another on the same day.',
    lookFor: 'Massed beds of red, orange, yellow, pink, purple, and white cultivars — the appeal is the density and patterns, not one individual variety.',
    experienceSource: {
      label: 'City of Holland Tulip Tracker',
      url: 'https://www.cityofholland.com/1022/Tulip-Tracker',
    },
    photos: [
      {
        kind: 'exact-bloom',
        imageUrl: commonsImage('Holland MI Tulips 02.jpg'),
        alt: 'Tulip beds decorating downtown Holland, Michigan during Tulip Time',
        caption: 'Downtown Holland tulip beds during Tulip Time.',
        creator: 'BazookaJoe',
        license: 'CC BY-SA 3.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Holland MI Tulips 02.jpg'),
      },
    ],
  },
  'um-peony-garden': {
    headline: 'A historic grid of enormous flowers built for slow walking, color, and fragrance.',
    whatYouWillSee: 'The W.E. Upjohn Peony Garden is a formal collection of 27 beds with hundreds of plants. Around peak, thousands of flowers open across traditional whites, blushes, pinks, and reds, with many cultivars carrying distinct fragrance.',
    bestExperience: 'Walk the broad garden paths slowly rather than treating this as a photo stop. Morning or late afternoon gives better color, fragrance, and light; midday sun can flatten both color and scent. The bed maps let you identify individual historic cultivars.',
    lookFor: 'Large layered blooms ranging from simple single forms to dense double and “bomb” forms, often held just above waist-high foliage.',
    experienceSource: {
      label: 'U-M Peony Garden visit guide',
      url: 'https://mbgna.umich.edu/when-visit-peony-garden',
    },
    photos: [
      {
        kind: 'exact-bloom',
        imageUrl: commonsImage('Nichols Arboretum Peony.jpg'),
        alt: 'Peony flowers in bloom at Nichols Arboretum in Ann Arbor, Michigan',
        caption: 'Peonies in the Nichols Arboretum collection.',
        creator: 'Santosdo',
        license: 'CC BY-SA 3.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Nichols Arboretum Peony.jpg'),
      },
    ],
  },
  'meijer-gardens-cherries': {
    headline: 'Cherry blossom is part of a designed garden experience, not an orchard drive.',
    whatYouWillSee: 'At Meijer Gardens the cherry experience is concentrated around the Japanese Garden and Cherry Tree Promenade. Yoshino and Weeping Higan cherries can be at different stages at the same time, so the walk can shift from airy white blossom to cascading pink-white forms.',
    bestExperience: 'Treat the tracker as a reason to walk the Japanese Garden rather than chase one tree. The Cherry Tree Promenade is the bloom-specific target, while ponds, bridges, stone, and garden views provide the surrounding experience.',
    lookFor: 'Yoshino cherries make broad pale canopies; Weeping Higan cherries carry flowers along drooping branches and may peak on a different schedule.',
    experienceSource: {
      label: 'Meijer Gardens cherry blossom tracker',
      url: 'https://www.meijergardens.org/blossoms/',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Cherry blossoms (Somei Yoshino), Nagai Botanical Garden, April 2026 -1488.jpg'),
        alt: 'Pale Yoshino cherry blossoms, a flower reference for the Meijer Gardens cherry display',
        caption: 'Flower reference: Yoshino cherry blossom, one of the cherry types tracked at Meijer Gardens.',
        creator: 'Laitche',
        license: 'CC BY-SA 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Cherry blossoms (Somei Yoshino), Nagai Botanical Garden, April 2026 -1488.jpg'),
      },
      {
        kind: 'location-setting',
        imageUrl: commonsImage('Japanese garden at Meijer Gardens.jpg'),
        alt: 'Waterfall and landscape in the Japanese Garden at Frederik Meijer Gardens in Grand Rapids, Michigan',
        caption: 'Japanese Garden setting — the cherry display is experienced as part of this designed landscape.',
        creator: 'MSwierenga',
        license: 'CC BY 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Japanese garden at Meijer Gardens.jpg'),
      },
    ],
  },
  'mackinac-lilacs': {
    headline: 'Fragrant lilacs woven into a car-free island walk, not confined to one garden.',
    whatYouWillSee: 'Mackinac’s lilacs are part of the streetscape: mature shrubs and old trunks sit among Victorian buildings, park lawns, carriage routes, and lake views. The biggest concentration is in Marquette Park, with additional old plants around downtown and the west side.',
    bestExperience: 'Start in Marquette Park, then walk through downtown and toward Windermere Point. The boardwalk toward Mackinac Island Public School is specifically known for old twisted lilac trunks. This is a walking experience; fragrance and setting are as important as flower density.',
    lookFor: 'Large panicles of purple, lavender, pink, and white common lilac flowers, often on mature woody shrubs much larger than a typical home-landscape lilac.',
    experienceSource: {
      label: 'Mackinac Island Lilac Festival guide',
      url: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Flowers of Syringa vulgaris.jpg'),
        alt: 'Purple Syringa vulgaris common lilac flowers, a flower reference for Mackinac Island lilacs',
        caption: 'Flower reference: common lilac, the species at the heart of Mackinac Island’s display.',
        creator: 'Krzysztof Golik',
        license: 'CC BY-SA 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Flowers of Syringa vulgaris.jpg'),
      },
      {
        kind: 'location-setting',
        imageUrl: commonsImage('Spring in Mackinac Island, Michigan.jpg'),
        alt: 'Spring scenery on Mackinac Island, Michigan',
        caption: 'Mackinac Island spring setting — use the live bloom decision above for current lilac conditions.',
        creator: 'RB Photo / rboed',
        license: 'CC BY 2.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Spring in Mackinac Island, Michigan.jpg'),
      },
    ],
  },
  'milan-lavender': {
    headline: 'A fragrant field of purple and white rows that turns a midsummer farm visit into a sensory trip.',
    whatYouWillSee: 'Lavender Lane grows more than 10,000 mature lavender plants, with the farm describing late June into early August as its broad peak-bloom period. At full color the experience is low, dense rows of purple and white flower spikes rather than towering flowers.',
    bestExperience: 'Go for the field itself, not just the festival date. Walk the rows slowly, use the U-pick opportunity when offered, and plan for full summer sun. The strongest visit combines saturated color with fragrance; heat and harvest can shorten how long the field feels at peak.',
    lookFor: 'Dense purple, lilac, and white flower spikes with bees working above compact gray-green foliage.',
    experienceSource: {
      label: 'Lavender Lane Farm seasonal information',
      url: 'https://lavenderlanemi.com/local/',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Lavender 8679.jpg'),
        alt: 'Rows of flowering English lavender, a visual reference for the Milan lavender-field experience',
        caption: 'Flower-field reference: English lavender in mass bloom. Use the live decision above for Milan’s current field condition.',
        creator: 'Chris Light',
        license: 'CC BY-SA 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Lavender 8679.jpg'),
      },
    ],
  },
  'frankenmuth-sunflowers': {
    headline: 'More than 25 acres of tall sunflowers make this a field-scale experience, not a decorative garden.',
    whatYouWillSee: 'Grandpa Tiny’s Farm describes more than 25 acres of sky-high sunflowers during the Frankenmuth Flower Festival. The scale matters: the visual payoff comes from looking across rows and masses of yellow rather than finding a few photogenic blooms.',
    bestExperience: 'Use the farm’s weekly pre-festival and daily festival updates as the current signal. When the field is genuinely on, walk deep enough into the planting to get the full horizon of flowers and use U-pick as a secondary experience rather than the reason for the trip.',
    lookFor: 'Broad yellow sunflower faces above chest- to head-high stems, with the strongest effect when many rows are open at once.',
    experienceSource: {
      label: "Grandpa Tiny's Farm flower festival",
      url: 'https://www.grandpatinys.com/frankenmuth-flower-festival',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Sunflower Field Ann Arbor Township Michigan.JPG'),
        alt: 'Large Michigan sunflower field, a visual reference for the Frankenmuth sunflower experience',
        caption: 'Michigan sunflower-field reference. The current Frankenmuth field status comes from verified evidence, not this file photo.',
        creator: 'Dwight Burdette',
        license: 'CC BY 3.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Sunflower Field Ann Arbor Township Michigan.JPG'),
      },
    ],
  },
  'gull-meadow-sunflowers': {
    headline: 'Five acres and more than two dozen varieties create a changing sunflower field rather than one uniform peak.',
    whatYouWillSee: 'Gull Meadow Farms plants a five-acre sunflower field with more than two dozen varieties. Differences in variety and agricultural timing mean one section can be stronger than another, which is exactly why the farm calls its event dates crop-dependent.',
    bestExperience: 'Treat the bloom signal as more important than the printed event weekend. A wagon ride takes visitors to the field, where the appeal is a walk through mixed sunflower forms, photo opportunities, and U-cut blooms. Late-day light can be especially useful for photography.',
    lookFor: 'A mixed field of yellow and warm-toned sunflower heads at different heights and stages rather than a single cloned row.',
    experienceSource: {
      label: 'Gull Meadow Farms Sunflower Days',
      url: 'https://gullmeadowfarms.com/pages/sunflower-days',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('A sunflower field.jpg'),
        alt: 'Dense sunflower field, a visual reference for Gull Meadow Sunflower Days',
        caption: 'Sunflower-field reference. Gull Meadow’s current crop condition is determined separately from verified observations.',
        creator: 'Zcebeci',
        license: 'CC BY-SA 4.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('A sunflower field.jpg'),
      },
    ],
  },
  'blakes-sunflowers': {
    headline: 'A late-summer sunflower field that can carry Michigan’s flower-trip season into Labor Day.',
    whatYouWillSee: 'Blake’s Sunflower Festival is built around broad sunflower fields, U-pick flowers, and photo-oriented walking. Its late-August and early-September timing makes it a different decision from the July sunflower fields: this is the last major tracked color wave of the season.',
    bestExperience: 'Use the live field condition to decide whether the festival weekend and the flowers actually line up. If they do, arrive with time to walk beyond the busiest photo areas; if they do not, the tracker should say so rather than letting the event calendar substitute for bloom.',
    lookFor: 'Tall yellow sunflower rows mixed with late-summer U-pick flowers, strongest when the field still holds broad, upright color rather than scattered remaining heads.',
    experienceSource: {
      label: "Blake's Sunflower Festival",
      url: 'https://blakefarms.com/sunflower-festival/',
    },
    photos: [
      {
        kind: 'flower-reference',
        imageUrl: commonsImage('Sunflower Field Saline Township Michigan.JPG'),
        alt: 'Michigan sunflower field, a visual reference for Blake’s late-summer sunflower display',
        caption: 'Michigan sunflower-field reference. Use the live decision above for Blake’s current field condition.',
        creator: 'Dwight Burdette',
        license: 'CC BY 3.0',
        source: 'Wikimedia Commons',
        sourceUrl: commonsPage('Sunflower Field Saline Township Michigan.JPG'),
      },
    ],
  },
});

export function getBloomExperience(id) {
  return BLOOM_EXPERIENCES[id] || null;
}

export function photoFitLabel(kind) {
  if (kind === 'exact-bloom') return 'This bloom at this destination';
  if (kind === 'location-setting') return 'Location setting';
  return 'Flower reference';
}
