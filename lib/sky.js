// Computed night-sky guide. Pure astronomy from date and location, no external source.
// Places prominent constellations for this evening at the given latitude using local sidereal time,
// reports the moon phase and illumination, and flags an active meteor shower with a moonlight check.

const RAD = Math.PI / 180;

// US Eastern offset with daylight saving (second Sunday March to first Sunday November).
function easternOffset(d) {
  const y = d.getUTCFullYear();
  const march = new Date(Date.UTC(y, 2, 1));
  const secondSunMar = 1 + ((7 - march.getUTCDay()) % 7) + 7;
  const nov = new Date(Date.UTC(y, 10, 1));
  const firstSunNov = 1 + ((7 - nov.getUTCDay()) % 7);
  const start = Date.UTC(y, 2, secondSunMar, 7);
  const end = Date.UTC(y, 10, firstSunNov, 6);
  const t = d.getTime();
  return t >= start && t < end ? -4 : -5;
}

function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function gmstHours(jd) {
  const d = jd - 2451545.0;
  let g = 280.46061837 + 360.98564736629 * d;
  g = ((g % 360) + 360) % 360;
  return g / 15;
}

function moonInfo(jd) {
  const synodic = 29.530588853;
  const ref = 2451550.1; // 2000-01-06 new moon
  let phase = ((jd - ref) % synodic) / synodic;
  if (phase < 0) phase += 1;
  const illum = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const names = ["new", "waxing crescent", "first quarter", "waxing gibbous", "full", "waning gibbous", "last quarter", "waning crescent"];
  return { phase, illum, name: names[Math.round(phase * 8) % 8] };
}

const CONSTELLATIONS = [
  { name: "Ursa Major", ra: 11.0, dec: 56, note: "the Big Dipper, pointing the way to Polaris" },
  { name: "Cassiopeia", ra: 1.0, dec: 60, note: "the lopsided W across the pole from the Dipper" },
  { name: "Cepheus", ra: 22.0, dec: 66, note: "the house-shaped king" },
  { name: "Cygnus", ra: 20.5, dec: 42, note: "the Northern Cross, Deneb at its head" },
  { name: "Lyra", ra: 18.8, dec: 39, note: "brilliant blue-white Vega" },
  { name: "Aquila", ra: 19.7, dec: 9, note: "Altair, the flying eagle" },
  { name: "Bootes", ra: 14.5, dec: 25, note: "the kite, anchored by orange Arcturus" },
  { name: "Corona Borealis", ra: 15.8, dec: 30, note: "the delicate northern crown" },
  { name: "Hercules", ra: 17.2, dec: 30, note: "the keystone and its great globular cluster" },
  { name: "Scorpius", ra: 16.5, dec: -30, note: "red Antares riding low in the south" },
  { name: "Sagittarius", ra: 19.0, dec: -28, note: "the teapot steaming over the Milky Way core" },
  { name: "Leo", ra: 10.5, dec: 15, note: "the sickle and Regulus" },
  { name: "Virgo", ra: 13.4, dec: -5, note: "blue-white Spica" },
  { name: "Orion", ra: 5.5, dec: 2, note: "the hunter, Betelgeuse and Rigel" },
  { name: "Taurus", ra: 4.5, dec: 18, note: "the Pleiades and ruddy Aldebaran" },
  { name: "Gemini", ra: 7.0, dec: 24, note: "the twins Castor and Pollux" },
  { name: "Canis Major", ra: 6.8, dec: -18, note: "Sirius, the brightest star in the sky" },
  { name: "Auriga", ra: 5.2, dec: 44, note: "the charioteer and bright Capella" },
  { name: "Perseus", ra: 3.4, dec: 45, note: "the hero beside the Double Cluster" },
  { name: "Andromeda", ra: 1.0, dec: 40, note: "home to the great spiral galaxy" },
  { name: "Pegasus", ra: 23.0, dec: 18, note: "the Great Square" },
  { name: "Cetus", ra: 1.7, dec: -10, note: "the sea monster, low in the south" },
];

const SHOWERS = [
  { name: "Quadrantids", doy: 3, note: "a brief, sharp January peak" },
  { name: "Lyrids", doy: 112, note: "swift, with occasional fireballs" },
  { name: "Eta Aquariids", doy: 126, note: "dust of Halley's Comet, low before dawn" },
  { name: "Perseids", doy: 224, note: "the summer classic, up to sixty an hour" },
  { name: "Draconids", doy: 282, note: "best in the early evening, variable" },
  { name: "Orionids", doy: 294, note: "fast Halley meteors" },
  { name: "Leonids", doy: 321, note: "fast and known to storm" },
  { name: "Geminids", doy: 348, note: "the year's richest, bright and slow" },
  { name: "Ursids", doy: 356, note: "sparse, near the pole" },
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function meteorTonight(now, moon) {
  const doy = dayOfYear(now);
  for (const s of SHOWERS) {
    if (Math.abs(doy - s.doy) <= 4) {
      const moonNote = moon.illum > 60 ? "a bright moon will wash out the fainter streaks" : moon.illum < 35 ? "dark skies favor it" : "some moonlight to contend with";
      return { name: s.name, note: s.note, moonNote, when: doy === s.doy ? "peaks tonight" : `peaks within ${Math.abs(doy - s.doy)} days` };
    }
  }
  return null;
}

function positionPhrase(alt, az) {
  if (alt > 65) return "nearly overhead";
  const compass = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(az / 45) % 8];
  return `${alt > 35 ? "high" : "low"} in the ${compass}`;
}

// Compute the evening sky for the given location. Defaults to tonight at 10 pm local.
export function skyTonight(lat, lon, now = new Date()) {
  const off = easternOffset(now);
  const evening = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22 - off, 0, 0));
  const jd = toJulian(evening);
  const lst = (gmstHours(jd) + lon / 15 + 24) % 24;
  const phi = lat * RAD;
  const out = [];
  for (const c of CONSTELLATIONS) {
    let H = lst - c.ra;
    if (H > 12) H -= 24;
    if (H < -12) H += 24;
    const Hd = H * 15 * RAD;
    const dec = c.dec * RAD;
    const alt = Math.asin(Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(Hd)) / RAD;
    if (alt < 10) continue;
    const A = Math.atan2(Math.sin(Hd), Math.cos(Hd) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    const az = (A / RAD + 180 + 360) % 360;
    out.push({ name: c.name, note: c.note, alt: Math.round(alt), circumpolar: c.dec > 90 - lat, where: positionPhrase(alt, az) });
  }
  out.sort((a, b) => b.alt - a.alt);
  const moon = moonInfo(jd);
  return { moon, constellations: out.slice(0, 8), meteor: meteorTonight(now, moon) };
}
