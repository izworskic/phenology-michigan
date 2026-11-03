import committed from "../data/phenology-species-trials.json";

const URL = "https://raw.githubusercontent.com/izworskic/phenology-michigan/main/data/phenology-species-trials.json";

function localDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return parts.year + "-" + parts.month + "-" + parts.day;
}

// Historical species trials never become "live sightings". Protect the UI even
// if a future generator or upstream response changes its shape.
export function validateSpeciesTrials(candidate, now = new Date()) {
  if (!candidate || candidate.schema !== "phenology-species-trials-v1"
      || typeof candidate.generatedForDate !== "string"
      || candidate.generatedForDate > localDay(now)
      || !Array.isArray(candidate.species) || candidate.species.length !== 2) return null;
  const species = candidate.species;
  if (species[0]?.id !== "trillium-grandiflorum"
      || species[1]?.id !== "ruby-throated-hummingbird"
      || species[0]?.regions?.length !== 7 || species[1]?.regions?.length !== 9) return null;
  const regions = [...species[0].regions, ...species[1].regions];
  if (regions.some(r => !r.id || !Array.isArray(r.annual) || !Array.isArray(r.heldOut)
      || !["historical-skill", "heat-date-withheld", "reporting-history", "insufficient-reporting"].includes(r.modelStatus))) return null;
  return candidate;
}

export async function readSpeciesTrials() {
  try {
    const res = await fetch(URL + "?b=" + Math.floor(Date.now() / 600000), {
      headers: { "User-Agent": "phenology-michigan/species-trials" }
    });
    if (res.ok) {
      const parsed = validateSpeciesTrials(await res.json());
      if (parsed) return parsed;
    }
  } catch { /* use verified bundled copy */ }
  return validateSpeciesTrials(committed);
}
