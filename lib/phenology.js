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
  { name: "Snowy owl irruption (some years)", cat: "bird", s: 319, p: 354, e: 411, note: "Open shoreline and fields near the bay." },
  { name: "Great Lakes seasonal low", cat: "water", s: 335, p: 385, e: 424, note: "Lake Huron near its annual minimum." },
  { name: "Tundra swans north", cat: "bird", s: 60, p: 79, e: 100, note: "First big waterfowl push up the flyway." },
  { name: "Steelhead run, tributaries", cat: "fish", s: 84, p: 105, e: 125, note: "Spring chrome in the rivers." },
  { name: "Ice-out, inland lakes", cat: "water", s: 84, p: 100, e: 115, note: "The hinge of the northern year." },
  { name: "Sucker spawn", cat: "fish", s: 105, p: 115, e: 130, note: "Riffles fill; trout drop in behind them." },
  { name: "Hendrickson hatch, AuSable", cat: "hatch", s: 108, p: 118, e: 132, note: "First great mayfly hatch of the season." },
  { name: "Morel season", cat: "wild", s: 115, p: 130, e: 145, note: "Warm soil under aspen and ash." },
  { name: "Lilac first bloom", cat: "bloom", s: 118, p: 128, e: 138, note: "The classic phenology index plant." },
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
  { name: "First hard frost", cat: "garden", s: 268, p: 283, e: 298, note: "End of the warm-season garden." },
  { name: "Tundra swans and waterfowl south", cat: "bird", s: 288, p: 309, e: 329, note: "The flyway reverses." },
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

// Rivers with live USGS gauges and a per-river hatch timing offset in days.
// Warmer, more southerly rivers run hatches earlier than the cold AuSable.
export const RIVERS = [
  { id: "ausable", name: "AuSable", site: "04136000", hatchOffset: 0, note: "the home water, classic timing" },
  { id: "pm", name: "Pere Marquette", site: "04122500", hatchOffset: -7, note: "warmer, runs about a week ahead" },
  { id: "boardman", name: "Boardman", site: "04126740", hatchOffset: -3, note: "a few days ahead of the AuSable" },
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
