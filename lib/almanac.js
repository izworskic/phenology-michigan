// The almanac note.
//
// Aldo Leopold's phenology was not a calendar of what happens. It was a RECORD, kept year on
// year, of when things actually happened, which is why the Leopold family notes could later
// show spring arriving earlier. This file is the writing half of that: one short daily note on
// what the turning year is doing here, in the register of A Sand County Almanac, banked
// alongside the day's numbers so the notes accumulate into a record of their own.
//
// The note is written from the day's measured snapshot and the events actually inside their
// window. It is told plainly not to invent an observation the data does not support: it may say
// the Hendricksons are due, because the calendar says so, and it may say the soil is at 63
// degrees, because the probe says so. It may not say anyone saw a woodcock.

const MODEL = "claude-sonnet-4-6";

const SYSTEM = [
  "You write one short daily entry for a phenology record kept on Saginaw Bay in eastern Michigan,",
  "covering the bay, the Thumb shoreline, and the AuSable River country to the north.",
  "The register is Aldo Leopold in A Sand County Almanac: plain, exact, unhurried, and attentive.",
  "Short declarative sentences. Name specific plants, birds, insects and water by their common names.",
  "Notice where the year stands and what it is turning toward.",
  "",
  "Hard rules:",
  "Between 90 and 140 words. One paragraph. No heading, no title, no sign-off, no list.",
  "Use only what the supplied readings and the in-window events support. State timing as timing:",
  "an event in its window is due or underway by the calendar, not something anyone has reported seeing.",
  "Never invent a sighting, a count, a bloom, or a hatch as observed fact.",
  "Give the reader one concrete thing to go out and look at, and say where.",
  "No exclamation marks. No em dashes. No second person plural cheerleading. No marketing language.",
  "Do not open with the date or with 'today'. Do not mention this site, data, models or forecasts.",
].join(" ");

function line(label, value, unit = "") {
  return value === null || value === undefined ? null : `${label}: ${value}${unit}`;
}

export function buildPrompt(snap, inWindow, soon) {
  const readings = [
    line("Date", snap.date),
    line("Air temperature", snap.meanF, " F mean"),
    line("Soil temperature", snap.soilF, " F"),
    line("Daylight", snap.daylightH, " hours"),
    line("Wind", snap.windSpeedMph, " mph"),
    line("Moon phase", snap.moonPhase == null ? null : snap.moonPhase.toFixed(2)),
    line("Growing degree days accumulated", snap.gdd),
    line("Bird species reported nearby in the last day", snap.birdCount),
    line("Most reported bird", snap.topBird),
  ].filter(Boolean);

  const now = inWindow.length
    ? inWindow.map((e) => `${e.name} (${e.cat}), ${e.note}`).join("; ")
    : "nothing is inside its window";
  const next = soon.length ? soon.map((e) => e.name).join("; ") : "nothing within three weeks";

  return [
    "Readings for the day:",
    readings.join("\n"),
    "",
    `Events inside their window now: ${now}`,
    `Events due within three weeks: ${next}`,
    "",
    "Write the entry.",
  ].join("\n");
}

export async function writeAlmanac(snap, inWindow, soon) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "ANTHROPIC_API_KEY not set" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: SYSTEM,
        messages: [{ role: "user", content: buildPrompt(snap, inWindow, soon) }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) return { ok: false, reason: `anthropic ${r.status}` };
    const j = await r.json();
    const text = (j.content || []).map((c) => c.text || "").join("").trim();
    if (!text) return { ok: false, reason: "empty response" };
    // The house style forbids em dashes everywhere on this network.
    const clean = text.replace(/\u2014/g, ", ").replace(/\s+/g, " ").trim();
    const words = clean.split(/\s+/).length;
    if (words < 60 || words > 200) return { ok: false, reason: `length ${words} words` };
    return { ok: true, text: clean, words };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
