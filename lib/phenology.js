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
  { name: "Fall color peak, NE Michigan", cat: "bloom", s: 268, p: 281, e: 293, note: "Maples and aspen turn." },
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
  { name: "Sugar maple first color", cat: "bloom", s: 255, p: 266, e: 278, note: "The first reds and oranges in the canopy.", signal: "First maple color runs with the kings pushing into the rivers." },
  { name: "Woolly bear caterpillars", cat: "wild", s: 272, p: 286, e: 305, note: "Rusty-and-black caterpillars on the move.", signal: "Woolly bears crossing the roads is the folk winter-severity sign: narrower rust band, harder winter, they say." },
  { name: "Brook and brown trout spawn", cat: "fish", s: 278, p: 292, e: 312, note: "Fish on the gravel in the headwaters.", signal: "Trout are on the redds; fish carefully and give the spawning gravel a wide berth." },
  { name: "Witch hazel bloom", cat: "bloom", s: 288, p: 300, e: 320, note: "Spidery yellow flowers as the leaves fall.", signal: "Witch hazel is the last native bloom of the year, opening as the leaves come down." },
  { name: "Great horned owl nesting", cat: "bird", s: 5, p: 25, e: 55, note: "Hooting and courtship in the cold woods.", signal: "Great horned owls are nesting, the earliest of any bird here, deep in winter." },
  { name: "Bald eagle nesting begins", cat: "bird", s: 35, p: 50, e: 75, note: "Pairs rebuilding nests along the bay and rivers.", signal: "Bald eagles are refurbishing nests; eggs come in late winter." },
  { name: "Maple sap run", cat: "garden", s: 50, p: 66, e: 85, note: "Freeze at night, thaw by day.", signal: "Nights below freezing and days above means the maple sap is running; sugaring is on." },
  { name: "Red-winged blackbird return", cat: "bird", s: 55, p: 67, e: 82, note: "Conk-la-ree back on the cattails.", signal: "The first red-winged blackbirds are the earliest true sign of spring migration." },
  { name: "Skunk cabbage bloom", cat: "bloom", s: 58, p: 72, e: 92, note: "Melts up through the snow on its own heat.", signal: "Skunk cabbage is the first bloom of the year, thawing its own way out of frozen ground." },
  { name: "White-tail velvet shed", cat: "wild", s: 240, p: 250, e: 263, note: "Bucks rubbing off the velvet summer coat.", tags: ["hunt", "water"], signal: "Velvet shedding marks peak summer in the woods and the buck's transition toward rut; the bucks start moving more aggressively." },
  { name: "White-tail rut peak", cat: "wild", s: 305, p: 320, e: 335, note: "Peak breeding season; bucks chasing and scent-marking.", tags: ["hunt"], signal: "The rut is the prime hunting window: bucks are moving aggressively, pursuing does, less cautious." },
  { name: "White-tail fawning", cat: "wild", s: 135, p: 160, e: 180, note: "Does bearing fawns in the forest.", tags: ["hunt"], signal: "Fawning season; does are protective and bedded, bucks are in bachelor groups recovering from spring." },
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
