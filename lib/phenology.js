// Shared phenology model for Saginaw Bay and northeastern Michigan.
// Day of year windows are non leap. Growing degree days use base 50 F.

export const MONTH_NORMAL_F = [23, 25, 34, 46, 58, 68, 73, 71, 63, 51, 39, 28];
export const MID_MONTH_DOY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
export const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

export function normalMeanF(doy) {
  if (doy <= MID_MONTH_DOY[0]) return MONTH_NORMAL_F[0];
  if (doy >= MID_MONTH_DOY[11]) return MONTH_NORMAL_F[11];
  for (let i = 0; i < 11; i++) {
    if (doy >= MID_MONTH_DOY[i] && doy <= MID_MONTH_DOY[i + 1]) {
      const f = (doy - MID_MONTH_DOY[i]) / (MID_MONTH_DOY[i + 1] - MID_MONTH_DOY[i]);
      return MONTH_NORMAL_F[i] + f * (MONTH_NORMAL_F[i + 1] - MONTH_NORMAL_F[i]);
    }
  }
  return 50;
}

export function gddSeries() {
  const out = [];
  let acc = 0;
  for (let d = 1; d <= 365; d++) {
    acc += Math.max(0, normalMeanF(d) - 50);
    out.push({ doy: d, gdd: Math.round(acc) });
  }
  return out;
}

export function cToF(c) { return c * 9 / 5 + 32; }

// daily normal GDD increment for a day of year
export function dailyNormalGdd(doy) {
  return Math.max(0, normalMeanF(doy) - 50);
}

// GDD threshold for each hatch, defined as the climatological accumulation at its peak
export function hatchThresholds() {
  const s = gddSeries();
  const m = {};
  EVENTS.filter((e) => e.cat === "hatch").forEach((e) => { m[e.name] = s[Math.min(364, e.p - 1)].gdd; });
  return m;
}

// project the day of year a threshold is reached, given observed GDD to date.
// future days accumulate at the climatological rate scaled by this season's pace.
export function projectOnset(thresholdGdd, realTotal, doy) {
  const normal = gddSeries();
  const normalToday = normal[Math.min(364, doy - 1)].gdd;
  const factor = normalToday > 0 ? realTotal / normalToday : 1;
  if (realTotal >= thresholdGdd) return null;
  let acc = realTotal;
  for (let d = doy + 1; d <= 365; d++) {
    acc += dailyNormalGdd(d) * factor;
    if (acc >= thresholdGdd) return d;
  }
  return null;
}

// convert a day of year to a Date in the current year
export function doyToDate(doy) {
  const d = new Date(new Date().getFullYear(), 0, 1);
  d.setDate(doy);
  return d;
}

// Curated Michigan hatches and insect emergences with approximate GDD base-50 onset thresholds.
// Aquatic entries carry a water-temperature trigger so the projection can be cross-checked against
// the live river reading. Thresholds are estimates; emergence timing varies year to year with weather.
export const EMERGENCE = [
  { name: "Grannom caddis", kind: "caddis", gdd: 150, water: 50, window: 14, note: "the early black caddis blizzard" },
  { name: "Hendrickson", kind: "mayfly", gdd: 180, water: 52, window: 18, note: "afternoon emergence on cool days" },
  { name: "Sulphur", kind: "mayfly", gdd: 300, water: 56, window: 35, note: "long evening spinner falls" },
  { name: "Brown Drake", kind: "mayfly", gdd: 480, water: 58, window: 10, note: "big evening hatch, brief window" },
  { name: "Isonychia", kind: "mayfly", gdd: 540, water: 60, window: 60, note: "fast water, much of the summer" },
  { name: "Hexagenia limbata", kind: "mayfly", gdd: 700, water: 64, window: 21, note: "the Hex, after dark, the season's biggest" },
  { name: "Trico", kind: "mayfly", gdd: 1050, water: 60, window: 50, note: "tiny morning spinner falls" },
  { name: "White Fly", kind: "mayfly", gdd: 1550, water: 62, window: 21, note: "late-summer evening blizzard" },
  { name: "Spongy moth egg hatch", kind: "insect", gdd: 95, note: "caterpillars climbing oaks" },
  { name: "Eastern tent caterpillar", kind: "insect", gdd: 120, note: "tents in cherry and apple" },
  { name: "Emerald ash borer flight", kind: "insect", gdd: 500, note: "first adults emerge from ash" },
  { name: "Firefly peak", kind: "insect", gdd: 800, note: "field displays at dusk" },
  { name: "Japanese beetle", kind: "insect", gdd: 1030, note: "adults on roses and lindens" },
  { name: "Dog-day cicada", kind: "insect", gdd: 1500, note: "afternoon drone in the canopy" },
];

function normalDoyForGdd(g) {
  const s = gddSeries();
  for (let i = 0; i < 365; i++) { if (s[i].gdd >= g) return i + 1; }
  return 365;
}

// For each emergence, compute whether it is on now or how far out, from observed GDD to date,
// today's day of year, and (for aquatic insects) the live river temperature. Passed and out-of-reach
// entries are dropped. Returns nearest first.
export function emergenceForecast(realTotal, doy, riverTempF) {
  if (realTotal == null) return [];
  const out = [];
  for (const e of EMERGENCE) {
    const window = e.window || 16;
    const onsetN = normalDoyForGdd(e.gdd);
    let endGdd = e.gdd;
    for (let d = onsetN + 1; d <= Math.min(365, onsetN + window); d++) endGdd += dailyNormalGdd(d);
    if (realTotal >= endGdd) continue;
    let status, phase, sort;
    if (realTotal >= e.gdd) {
      phase = "on"; status = "on now"; sort = -1;
    } else {
      const od = projectOnset(e.gdd, realTotal, doy);
      if (od == null) continue;
      const daysOut = od - doy;
      if (daysOut > 75) continue;
      phase = "soon"; sort = daysOut;
      status = daysOut <= 1 ? "any day now" : daysOut <= 10 ? `about ${daysOut} days out` : `~${Math.round(daysOut / 7)} week${Math.round(daysOut / 7) === 1 ? "" : "s"} out`;
    }
    let waterNote = null;
    if (e.water != null && riverTempF != null && riverTempF < e.water - 1) {
      waterNote = `river ${Math.round(e.water - riverTempF)} deg below the ${e.water} trigger`;
    }
    out.push({ name: e.name, kind: e.kind, note: e.note, status, phase, sort, waterNote });
  }
  out.sort((a, b) => a.sort - b.sort);
  return out;
}

export const EVENTS = [
  { name: "Ice-in, inland lakes", cat: "water", s: 335, p: 354, e: 375, note: "Shallow bays lock up; the ice-out model flips to winter." },
  { name: "Snowy owl irruption (some years)", cat: "bird", s: 319, p: 354, e: 411, note: "Open shoreline and fields near the bay.", signal: "In irruption winters, snowy owls hunt the open shoreline and field edges near the bay." },
  { name: "Great Lakes seasonal low", cat: "water", s: 335, p: 385, e: 424, note: "Lake Huron near its annual minimum." },
  { name: "Tundra swans north", cat: "bird", s: 60, p: 79, e: 100, note: "First big waterfowl push up the flyway." },
  { name: "Steelhead run, tributaries", cat: "fish", s: 84, p: 105, e: 125, note: "Spring chrome in the rivers." },
  { name: "Ice-out, inland lakes", cat: "water", s: 84, p: 100, e: 115, note: "The hinge of the northern year." },
  { name: "Sucker spawn", cat: "fish", s: 105, p: 115, e: 130, note: "Riffles fill; trout drop in behind them." },
  { name: "Hendrickson hatch, AuSable", cat: "hatch", s: 108, p: 118, e: 132, note: "First great mayfly hatch of the season." },
  { name: "Morel season", cat: "wild", s: 115, p: 130, e: 145, note: "Warm soil under aspen and ash." },
  { name: "Lilac first bloom", cat: "bloom", s: 118, p: 128, e: 138, note: "The classic phenology index plant.", signal: "The benchmark spring index. Lilacs in bloom means the soil has warmed for beans and squash, and the Hendricksons are on the rivers." },
  { name: "Warbler migration peak", cat: "bird", s: 120, p: 134, e: 148, note: "Tawas Point and the bay shoreline light up." },
  { name: "Last spring frost (median)", cat: "garden", s: 125, p: 135, e: 145, note: "Bay City median; tender crops wait until past." },
  { name: "March Brown and Sulphur hatches", cat: "hatch", s: 125, p: 138, e: 156, note: "Steady afternoon and evening fishing." },
  { name: "Warm-season transplanting, 6a", cat: "garden", s: 140, p: 148, e: 166, note: "Tomatoes, peppers, squash go to the bay garden." },
  { name: "Breeding bird peak song", cat: "bird", s: 140, p: 161, e: 181, note: "Dawn chorus at full volume." },
  { name: "Monarch arrival", cat: "wild", s: 145, p: 161, e: 176, note: "First milkweed eggs." },
  { name: "Brown Drake hatch", cat: "hatch", s: 148, p: 156, e: 166, note: "Big evening drakes, short and intense." },
  { name: "Hexagenia (Hex) hatch", cat: "hatch", s: 163, p: 173, e: 186, note: "The legendary AuSable night hatch." },
  { name: "Great Lakes seasonal peak", cat: "water", s: 152, p: 196, e: 227, note: "Lake Huron near its annual high." },
  { name: "Trico hatch", cat: "hatch", s: 196, p: 217, e: 248, note: "Tiny morning spinners." },
  { name: "Fall warbler migration", cat: "bird", s: 232, p: 253, e: 278, note: "Quiet, plumage-puzzle season." },
  { name: "Salmon run, rivers", cat: "fish", s: 244, p: 263, e: 288, note: "Kings push up out of the lake." },
  { name: "Fall color peak, NE Michigan", cat: "bloom", s: 268, p: 281, e: 293, note: "Maples and aspen turn.", signal: "Peak color in the canopy. The brook trout are in full spawning dress, the salmon are on their runs, and the last warblers and woodcock push south." },
  { name: "First hard frost", cat: "garden", s: 268, p: 283, e: 298, note: "End of the warm-season garden.", signal: "First hard frost ends the warm-season garden and sweetens the kale, carrots, and brassicas." },
  { name: "Tundra swans and waterfowl south", cat: "bird", s: 288, p: 309, e: 329, note: "The flyway reverses." },
  { name: "Forsythia bloom", cat: "bloom", s: 105, p: 114, e: 124, note: "Bright yellow, one of the first shrubs to flower.", signal: "Forsythia in bloom is the crabgrass pre-emergent window: soil is near 55 degrees. Get it down before the petals drop." },
  { name: "American woodcock display", cat: "bird", s: 74, p: 88, e: 104, note: "The dusk sky dance over damp field edges." },
  { name: "Common loon return", cat: "bird", s: 98, p: 110, e: 122, note: "Back on the inland lakes as the ice clears." },
  { name: "Dandelion bloom", cat: "bloom", s: 113, p: 125, e: 150, note: "The first broad nectar flow of spring.", signal: "Dandelions up means soil is warming and trout begin looking up. Time for peas and potatoes." },
  { name: "Oak leaf-out, squirrel's ear", cat: "garden", s: 122, p: 132, e: 142, note: "New oak leaves about the size of a squirrel's ear.", signal: "Oak leaves at squirrel's-ear size is the morel peak signal and the old cue to plant corn." },
  { name: "Serviceberry bloom", cat: "bloom", s: 116, p: 125, e: 135, note: "Shadbush, white along the woods edge.", signal: "Serviceberry flags the morel onset and the Hendrickson, and historically the shad run." },
  { name: "Ruby-throated hummingbird arrival", cat: "bird", s: 124, p: 133, e: 145, note: "First at the feeders and the columbine." },
  { name: "Baltimore oriole arrival", cat: "bird", s: 124, p: 133, e: 144, note: "Orange in the treetops; hang orange halves and jelly." },
  { name: "Apple blossom", cat: "bloom", s: 128, p: 137, e: 147, note: "Orchards in full flower.", signal: "Apple blossom brings the orioles and hummingbirds, and starts the codling moth degree-day clock." },
  { name: "Flowering dogwood bloom", cat: "bloom", s: 130, p: 140, e: 150, note: "At the northern edge of its range here.", signal: "Dogwood in bloom is morel peak, and the folk rule to set tomatoes once it flowers." },
  { name: "Black locust bloom", cat: "bloom", s: 145, p: 153, e: 163, note: "Cream-white clusters, heavy and fragrant.", signal: "Black locust bloom is the Isonychia and late Sulphur cue, and the all-clear for heat-loving crops." },
  { name: "Fireflies emerge", cat: "wild", s: 158, p: 172, e: 205, note: "First flashes over the damp meadows.", signal: "Fireflies on warm nights run with the Hex on the rivers; high summer is here." },
  { name: "Common milkweed bloom", cat: "bloom", s: 166, p: 178, e: 200, note: "Pink heads humming with insects.", signal: "Milkweed in flower is monarch egg-laying peak and the richest nectar of the year." },
  { name: "Joe-Pye weed bloom", cat: "bloom", s: 196, p: 210, e: 235, note: "Tall dusky-rose heads in wet ground.", signal: "Joe-Pye and ironweed mark late summer and feed the first monarchs staging south." },
  { name: "Katydid song begins", cat: "wild", s: 210, p: 225, e: 250, note: "The nighttime rasp of late summer.", signal: "When the katydids start calling, the old rule puts first frost about ninety days out." },
  { name: "Goldenrod first bloom", cat: "bloom", s: 218, p: 233, e: 262, note: "Gold along every roadside and field.", signal: "Goldenrod opening is the turn toward fall: monarchs and warblers begin fueling for the trip south." },
  { name: "Aster bloom", cat: "bloom", s: 244, p: 262, e: 290, note: "Purple and white, the last nectar.", signal: "Asters are the final fuel of the year for the southbound monarchs." },
  { name: "Sugar maple first color", cat: "bloom", s: 255, p: 266, e: 278, note: "The first reds and oranges in the canopy.", signal: "First maple color runs with the kings pushing into the rivers and the brook trout starting to color up for the spawn." },
  { name: "Woolly bear caterpillars", cat: "wild", s: 272, p: 286, e: 305, note: "Rusty-and-black caterpillars on the move.", signal: "Woolly bears crossing the roads is the folk winter-severity sign: narrower rust band, harder winter, they say." },
  { name: "Brook and brown trout spawn", cat: "fish", s: 278, p: 292, e: 312, note: "Fish on the gravel in the headwaters.", signal: "Brook and brown trout are coloring up and moving onto the gravel: the brookies in spawning orange, the browns going buttery gold with crimson spots. It runs with the leaves turning. Fish carefully and give the redds a wide berth." },
  { name: "Witch hazel bloom", cat: "bloom", s: 288, p: 300, e: 320, note: "Spidery yellow flowers as the leaves fall.", signal: "Witch hazel is the last native bloom of the year, opening as the leaves come down." },
  { name: "Great horned owl nesting", cat: "bird", s: 5, p: 25, e: 55, note: "Hooting and courtship in the cold woods.", signal: "Great horned owls are nesting, the earliest of any bird here, deep in winter." },
  { name: "Bald eagle nesting begins", cat: "bird", s: 35, p: 50, e: 75, note: "Pairs rebuilding nests along the bay and rivers.", signal: "Bald eagles are refurbishing nests; eggs come in late winter." },
  { name: "Maple sap run", cat: "garden", s: 50, p: 66, e: 85, note: "Freeze at night, thaw by day.", signal: "Nights below freezing and days above means the maple sap is running; sugaring is on." },
  { name: "Red-winged blackbird return", cat: "bird", s: 55, p: 67, e: 82, note: "Conk-la-ree back on the cattails.", signal: "The first red-winged blackbirds are the earliest true sign of spring migration." },
  { name: "Skunk cabbage bloom", cat: "bloom", s: 58, p: 72, e: 92, note: "Melts up through the snow on its own heat.", signal: "Skunk cabbage is the first bloom of the year, thawing its own way out of frozen ground." },
  { name: "Red and silver maple flowering", cat: "bloom", s: 70, p: 84, e: 100, note: "A red haze in the swamps before any leaves.", signal: "The first tree flowers, a red haze over the swamps and roadsides; the sap run is ending and the red-wings are back." },
  { name: "Willow and pussy willow catkins", cat: "bloom", s: 82, p: 96, e: 112, note: "Silvery buds along the stream edges.", signal: "Willow catkins are the first real pollen and nectar, the food that wakes the queen bumblebees and the honeybees." },
  { name: "Quaking aspen catkins", cat: "bloom", s: 92, p: 104, e: 120, note: "Gray dangling catkins, early wind pollen.", signal: "Aspen and poplar catkins fly their pollen on the wind as the woods green from the ground up." },
  { name: "Black cherry bloom", cat: "bloom", s: 128, p: 138, e: 150, note: "White flower spikes along the woods edge.", signal: "Black cherry in bloom; the eastern tent caterpillars are working the same trees, and the warblers feed on them." },
  { name: "Oak flowering, catkins", cat: "bloom", s: 124, p: 134, e: 146, tags: ["fish"], note: "Yellow-green catkins as the leaves open.", signal: "Oak catkins drop their pollen as the morels peak and the Hendrickson comes off: the same warm spell opens the season's first big hatch." },
  { name: "Eastern white pine pollen", cat: "bloom", s: 148, p: 160, e: 174, note: "Yellow pollen films the puddles and cars.", signal: "Pine pollen everywhere marks the turn to summer; it coats the still water and the windshields for a week." },
  { name: "American basswood bloom", cat: "bloom", s: 175, p: 188, e: 202, note: "Pale fragrant flowers high in the linden.", signal: "Basswood, or linden, is the great midsummer nectar flow: the whole tree hums with bees and makes the surest honey of the year." },
  { name: "White-tail velvet shed", cat: "wild", s: 240, p: 250, e: 263, note: "Bucks rubbing off the velvet summer coat.", tags: ["hunt", "water"], signal: "Velvet shedding marks peak summer in the woods and the buck's transition toward rut; the bucks start moving more aggressively." },
  { name: "White-tail rut peak", cat: "wild", s: 305, p: 320, e: 335, note: "Peak breeding season; bucks chasing and scent-marking.", tags: ["hunt"], signal: "The rut is the prime hunting window: bucks are moving aggressively, pursuing does, less cautious." },
  { name: "White-tail fawning", cat: "wild", s: 135, p: 160, e: 180, note: "Does bearing fawns in the forest.", tags: ["hunt"], signal: "Fawning season; does are protective and bedded, bucks are in bachelor groups recovering from spring." },
  { name: "White-tail antler casting", cat: "wild", s: 1, p: 35, e: 80, note: "Bucks dropping last year's antlers.", tags: ["hunt"], signal: "Bucks are casting last season's antlers, a few weeks after the rut winds down; this is shed-hunting season in the bare woods." },
  { name: "White-tail antlers in velvet", cat: "wild", s: 105, p: 180, e: 235, note: "New racks growing under velvet.", tags: ["hunt"], signal: "Bucks are growing this year's rack in velvet, soft and blood-rich and the fastest-growing bone there is, peaking near the solstice; they hold in low-key bachelor groups until late summer." },
  { name: "American turkey spring gobble", cat: "bird", s: 100, p: 115, e: 140, note: "Gobblers strut and call from the roost at dawn.", tags: ["hunt"], signal: "Spring gobble is the turkey rut: gobblers are vocal and responsive, the prime hunt window." },
  { name: "Walleye spring spawn", cat: "fish", s: 105, p: 120, e: 140, note: "Walleye moving to shallow gravel in rivers and the bay shallows.", tags: ["fish", "water"], signal: "Walleye spawn runs concurrent with turkey gobble and spring winds; spawning fish are aggressive on jigs and live bait." },
  { name: "Walleye summer lows", cat: "fish", s: 195, p: 215, e: 245, note: "Walleye retreat to deep water and cool zones.", tags: ["fish", "water"], signal: "Summer heat drives walleye deep and inactive; fishing is slow; focus early morning and dusk." },
  { name: "Walleye fall feed-up", cat: "fish", s: 260, p: 283, e: 310, note: "Walleye move shallow and aggressive as water cools.", tags: ["fish", "water"], signal: "Fall walleye feed heavily as water cools; this is the second-best season after spring spawn." },
  { name: "Saginaw Bay NE wind season", cat: "water", s: 75, p: 120, e: 155, note: "Spring northeast winds, cold and steady, slow the bay warm-up.", tags: ["water", "garden"], signal: "Spring NE winds cool the bay and slow the water warm-up, delaying walleye and supporting early fishing; in the garden, they slow growth and can damage young transplants." },
  { name: "Saginaw Bay summer calm", cat: "water", s: 155, p: 210, e: 245, note: "Light winds, warm bay, ideal for boating and surface life.", tags: ["water", "garden"], signal: "Summer calm waters and light winds are perfect for boating and garden growth, but walleye go deep seeking cool; focus structure and depth." },
];

export const CAT = {
  water: { label: "Water and ice", color: "#3f7d8c" },
  fish: { label: "Fish", color: "#9a5b3f" },
  hatch: { label: "Hatches", color: "#b08828" },
  bird: { label: "Birds", color: "#5a7d4f" },
  bloom: { label: "Bloom and color", color: "#8a4b6b" },
  garden: { label: "Garden, zone 6a", color: "#6b7d3f" },
  wild: { label: "Wildlife", color: "#7a6a4f" },
};

export function seasonOf(doy) {
  if (doy < 80 || doy >= 335) return { name: "Winter", color: "#5b7286" };
  if (doy < 152) return { name: "Spring", color: "#5a8a4a" };
  if (doy < 266) return { name: "Summer", color: "#c79a2e" };
  return { name: "Autumn", color: "#a85a2c" };
}

// Rivers with live USGS gauges. Both are home water in this region and both post temperature.
export const RIVERS = [
  { id: "ausable", name: "AuSable", site: "04136000", hatchOffset: 0, note: "the home water" },
  { id: "rifle", name: "Rifle", site: "04142000", hatchOffset: -2, note: "Trout Camp water, drains to Saginaw Bay" },
];

// classify events relative to a day of year, with a per-river offset on hatches
export function classify(doy, hatchOffset = 0) {
  const active = [], imminent = [], recent = [];
  EVENTS.forEach((ev) => {
    const off = ev.cat === "hatch" ? hatchOffset : 0;
    const sh = { ...ev, s: ev.s + off, p: ev.p + off, e: ev.e + off };
    const s = sh.s % 365, e = sh.e % 365;
    const within = sh.e > 365 ? (doy >= sh.s || doy <= e) : (doy >= s && doy <= e);
    if (within) active.push(sh);
    else if (sh.s - doy > 0 && sh.s - doy <= 21) imminent.push(sh);
    else if (doy - sh.e > 0 && doy - sh.e <= 12) recent.push(sh);
  });
  active.sort((a, b) => Math.abs(a.p - doy) - Math.abs(b.p - doy));
  imminent.sort((a, b) => a.s - b.s);
  return { active, imminent, recent };
}

// indicator events that carry a predictive signal, classified for today
export function activeIndicators(doy) {
  const out = [];
  EVENTS.filter((e) => e.signal).forEach((e) => {
    const eMod = e.e % 365;
    const within = e.e > 365 ? (doy >= e.s || doy <= eMod) : (doy >= e.s && doy <= e.e);
    let state = null, days = 0;
    if (within) state = "active";
    else if (e.s - doy > 0 && e.s - doy <= 21) { state = "soon"; days = e.s - doy; }
    else if (doy - eMod > 0 && doy - eMod <= 14) { state = "recent"; days = doy - eMod; }
    if (state) out.push({ ...e, state, days });
  });
  const rank = { active: 0, soon: 1, recent: 2 };
  out.sort((a, b) => rank[a.state] - rank[b.state] || Math.abs((a.p % 365) - doy) - Math.abs((b.p % 365) - doy));
  return out;
}

// Moon phase (0-1): 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
export function moonPhase(jd) {
  // jd = Julian day number
  const k = (jd - 2451550.1) / 29.530588861; // lunations since known new moon (2000 Jan 6.24)
  const phase = k - Math.floor(k);
  return phase || 0;
}

// events in other categories whose windows overlap this one: the natural web around it
export function coOccurring(ev, max = 4) {
  const overlaps = (a, b) => !(a.e < b.s || b.e < a.s);
  return EVENTS
    .filter((o) => o.name !== ev.name && o.cat !== ev.cat && overlaps(ev, o))
    .sort((a, b) => Math.abs(a.p - ev.p) - Math.abs(b.p - ev.p))
    .slice(0, max);
}

// Regional growing-season anchors for the Saginaw Bay area (averages, not guarantees).
export const LAST_FROST_DOY = 135;   // about May 15
export const FIRST_FROST_DOY = 278;  // about October 5

// Almanac-style planting windows for the Saginaw Bay area. Each crop carries its spring and fall
// windows as day offsets from the average last spring frost and first fall frost; cool-season crops
// also have a fall sowing window, tender crops do not. Soil-temp minimums confirm the tender ones.
export const GARDEN = [
  { name: "Peas", act: "sow", hardy: true, soilMin: 40, spring: [-35, 0], fall: [-70, -55], note: "frost hardy, among the first in and a fall crop" },
  { name: "Spinach", act: "sow", hardy: true, soilMin: 40, spring: [-42, -7], fall: [-60, -40], note: "bolts in heat, a spring and fall green" },
  { name: "Lettuce", act: "sow", hardy: true, soilMin: 40, spring: [-28, 14], fall: [-65, -40], note: "succession sow, pause through summer heat" },
  { name: "Radish and arugula", act: "sow", hardy: true, soilMin: 40, spring: [-28, 21], fall: [-50, -25], note: "fast and frost hardy, quick succession" },
  { name: "Onions", act: "plant", hardy: true, soilMin: 45, spring: [-35, -7], fall: null, note: "sets and transplants, early spring" },
  { name: "Kale", act: "plant", hardy: true, soilMin: 45, spring: [-28, 0], fall: [-75, -55], note: "hardy transplants, sweetens after frost" },
  { name: "Carrots", act: "sow", hardy: true, soilMin: 45, spring: [-21, 21], fall: [-75, -60], note: "direct sow, frost tolerant" },
  { name: "Beets", act: "sow", hardy: true, soilMin: 45, spring: [-14, 21], fall: [-65, -50], note: "direct sow, spring and fall" },
  { name: "Potatoes", act: "plant", hardy: true, soilMin: 48, spring: [-14, 14], fall: null, note: "plant once soil hits the mid-40s" },
  { name: "Sweet corn", act: "sow", hardy: false, soilMin: 55, spring: [0, 35], fall: null, note: "wants warm soil to germinate" },
  { name: "Beans", act: "sow", hardy: false, soilMin: 57, spring: [0, 45], fall: null, note: "rot in cold ground, succession sow" },
  { name: "Cucumber and squash", act: "sow", hardy: false, soilMin: 60, spring: [0, 35], fall: null, note: "warm-season vines" },
  { name: "Tomatoes", act: "transplant", hardy: false, soilMin: 60, spring: [7, 30], fall: null, note: "warm soil and frost behind you" },
  { name: "Peppers and eggplant", act: "transplant", hardy: false, soilMin: 62, spring: [14, 35], fall: null, note: "want it warmer than tomatoes" },
  { name: "Basil", act: "transplant", hardy: false, soilMin: 60, spring: [10, 40], fall: null, note: "sulks below 50 at night" },
  { name: "Melons", act: "sow", hardy: false, soilMin: 65, spring: [7, 25], fall: null, note: "the last in, needs the warmest soil" },
];

// Given live soil temperature, whether the next week looks frost free, and whether the average last
// frost has passed, decide what is plantable now. Frost-sensitive crops need both warm soil and frost
// risk behind us. Returns readiest first; soil-cold crops show only when within reach.
// Decide what to plant now from the almanac windows. A crop surfaces when today falls inside a
// spring or fall window, or when one opens within about two weeks. Tender crops also need soil at or
// above their minimum and no frost in the outlook. Returns readiest first; [] when nothing applies.
export function gardenWindow(doy, soilF, frostClear) {
  const LF = LAST_FROST_DOY, FF = FIRST_FROST_DOY;
  const out = [];
  const fmt = (d) => doyToDate(((d - 1 + 365) % 365) + 1).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  for (const c of GARDEN) {
    const windows = [];
    if (c.spring) windows.push({ kind: "spring", a: LF + c.spring[0], b: LF + c.spring[1] });
    if (c.fall) windows.push({ kind: "fall", a: FF + c.fall[0], b: FF + c.fall[1] });
    let active = null, soon = null;
    for (const w of windows) {
      if (doy >= w.a && doy <= w.b) { active = w; break; }
      const d = w.a - doy;
      if (d > 0 && d <= 14 && (!soon || d < soon.a - doy)) soon = w;
    }
    if (active) {
      const lastCall = active.b - doy <= 8;
      if (!c.hardy) {
        if (soilF == null) continue;
        if (soilF < c.soilMin) { out.push({ name: c.name, act: c.act, note: c.note, ready: false, status: `wait, soil ${c.soilMin - Math.round(soilF)} deg short`, sort: 2 }); continue; }
        if (!frostClear) { out.push({ name: c.name, act: c.act, note: c.note, ready: false, status: "soil ready, wait on frost", sort: 1 }); continue; }
        out.push({ name: c.name, act: c.act, note: c.note, ready: true, status: lastCall ? `last call, by ${fmt(active.b)}` : `${c.act} now`, sort: lastCall ? 0.5 : 0 });
      } else {
        const label = active.kind === "fall" ? "sow for fall" : lastCall ? `last call, by ${fmt(active.b)}` : `${c.act} now`;
        out.push({ name: c.name, act: c.act, note: c.note, ready: true, status: label, sort: active.kind === "fall" ? 0.7 : lastCall ? 0.5 : 0 });
      }
    } else if (soon) {
      out.push({ name: c.name, act: c.act, note: c.note, ready: false, status: `${soon.kind} window opens ${fmt(soon.a)}`, sort: 3 });
    }
  }
  out.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return out;
}

// Michigan hunting seasons, approximate statewide dates. Exact openers vary by year, zone, and
// management unit, so treat this as a planning guide and verify the current DNR digest before hunting.
export const HUNT_SEASONS = [
  { name: "Archery deer", ranges: [[10, 1, 11, 14], [12, 1, 1, 1]], note: "Oct 1 to mid-Nov, reopens Dec 1" },
  { name: "Firearm deer", ranges: [[11, 15, 11, 30]], note: "the November 15 opener" },
  { name: "Muzzleloader deer", ranges: [[12, 5, 12, 14]], note: "December, varies by zone" },
  { name: "Spring turkey", ranges: [[4, 20, 5, 31]], note: "late April into May, by hunt period" },
  { name: "Fall turkey", ranges: [[9, 15, 11, 14]], note: "mid-September into November" },
  { name: "Ducks, south zone", ranges: [[10, 11, 12, 7]], note: "Saginaw Bay area, often with a split" },
  { name: "Canada goose", ranges: [[9, 1, 9, 15], [10, 11, 12, 28]], note: "early September, then fall" },
  { name: "Woodcock", ranges: [[9, 21, 11, 4]], note: "fall flights" },
  { name: "Pheasant", ranges: [[10, 20, 11, 14]], note: "the October opener" },
  { name: "Rabbit and squirrel", ranges: [[9, 15, 3, 31]], note: "the long small-game season" },
];

function mdToDoy(m, d) { const x = new Date(2025, m - 1, d); const s = new Date(2025, 0, 0); return Math.floor((x - s) / 86400000); }

export function huntingForecast(doy) {
  const out = [];
  for (const s of HUNT_SEASONS) {
    let open = false, daysClose = null, daysOpen = null;
    for (const [m1, d1, m2, d2] of s.ranges) {
      const a = mdToDoy(m1, d1), b = mdToDoy(m2, d2);
      const inRange = a <= b ? doy >= a && doy <= b : doy >= a || doy <= b;
      if (inRange) { open = true; daysClose = (b - doy + 365) % 365; }
      const dOpen = (a - doy + 365) % 365;
      if (daysOpen == null || dOpen < daysOpen) daysOpen = dOpen;
    }
    let status, sort;
    if (open) { status = daysClose <= 0 ? "last day" : `open, ${daysClose} ${daysClose === 1 ? "day" : "days"} left`; sort = -1; }
    else { status = daysOpen <= 1 ? "opens tomorrow" : `opens in ${daysOpen} days`; sort = daysOpen; }
    out.push({ name: s.name, note: s.note, open, status, sort });
  }
  out.sort((a, b) => a.sort - b.sort);
  return out;
}

export function rutClock(doy) {
  const peak = mdToDoy(11, 15);
  const days = (peak - doy + 365) % 365;
  let phase = null;
  if (doy >= mdToDoy(10, 10) && doy <= mdToDoy(10, 28)) phase = "pre-rut, scrapes and rubs opening up";
  else if (doy >= mdToDoy(10, 29) && doy <= mdToDoy(11, 7)) phase = "seeking, bucks on their feet and searching";
  else if (doy >= mdToDoy(11, 8) && doy <= mdToDoy(11, 14)) phase = "chasing, movement building toward the peak";
  else if (doy >= mdToDoy(11, 15) && doy <= mdToDoy(11, 22)) phase = "peak rut, breeding underway";
  else if (doy >= mdToDoy(11, 23) && doy <= mdToDoy(12, 6)) phase = "post-rut, a second wind as does cycle back";
  return { days, phase };
}

// Estimated fall color stage for the Saginaw Bay area, anchored to a local peak around mid-October.
// Northern Michigan and the Upper Peninsula run a week or two ahead. Cool nights pull it earlier,
// a warm spell holds it back. Returns null outside the color season. An estimate, not a live survey.
export function fallColor(doy) {
  if (doy < 245 || doy > 315) return null;
  let stage, label, pct;
  if (doy < 264) { stage = "first turning"; pct = "10 to 20 percent"; label = "Sumac, the red maples in wet ground, and Virginia creeper are the first to turn."; }
  else if (doy < 281) { stage = "coming on"; pct = "30 to 60 percent"; label = "Maples and aspen are warming the hillsides; it builds fast now."; }
  else if (doy <= 296) { stage = "peak"; pct = "70 to 100 percent"; label = "Peak color in the canopy, the best week of the year to be in the woods."; }
  else if (doy <= 308) { stage = "past peak"; pct = "fading"; label = "Maples nearly bare, oaks holding russet and bronze, tamarack going gold and dropping last."; }
  else { stage = "leaf drop"; pct = "bare canopy"; label = "The hardwoods are down; only the oaks and the tamarack hold on."; }
  return { stage, label, pct, peak: 288 };
}

// Saginaw Bay hatches, the warmwater lake emergences, keyed to live bay water temperature rather than
// river degree days. The Hex is the marquee: the giant burrowing mayfly that piles on the bridges and
// shore lights and turns the walleye and perch loose. Returns what is on or near, soonest first.
export const BAY_HATCHES = [
  { name: "Lake-fly midges", kind: "midge", water: 48, s: 108, e: 168, note: "non-biting clouds over the water and shore; the perch are working the larvae below" },
  { name: "Caddis", kind: "caddis", water: 58, s: 140, e: 188, note: "evening flights along the warm shallows" },
  { name: "Fishflies", kind: "fishfly", water: 64, s: 160, e: 196, note: "big clumsy fliers to the dock lights on warm nights" },
  { name: "Hexagenia, the giant mayfly", kind: "mayfly", water: 67, s: 170, e: 210, note: "the burrowing mayfly after dark; it piles on the bridges and lights and sends the walleye and perch into a feeding frenzy" },
];

export function bayHatch(doy, bayWaterF) {
  const out = [];
  for (const h of BAY_HATCHES) {
    const inWindow = doy >= h.s && doy <= h.e;
    const daysOut = h.s - doy;
    let status, ready, sort, water = null;
    if (inWindow) {
      if (bayWaterF == null) { status = "window open"; ready = false; sort = 1; }
      else if (bayWaterF >= h.water) { status = "on now"; ready = true; sort = 0; water = `bay water ${bayWaterF} deg F`; }
      else { status = `waiting on water`; ready = false; sort = 1; water = `bay ${bayWaterF} of ${h.water} deg F`; }
    } else if (daysOut > 0 && daysOut <= 24) {
      status = `about ${daysOut} days out`; ready = false; sort = 2;
    } else continue;
    out.push({ name: h.name, note: h.note, status, ready, sort, water });
  }
  out.sort((a, b) => a.sort - b.sort);
  return out;
}
