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
  "If the season is running early or late against its own record, say so plainly and let it shape",
  "the entry: a late year means the blooms and hatches below are arriving late too, and that is",
  "worth a sentence, because it is the one thing a calendar cannot tell anyone.",
  "Give the reader one concrete thing to go out and look at, count, or listen for, and say where.",
  "No exclamation marks. No em dashes. No second person plural cheerleading. No marketing language.",
  "Do not open with the date or with 'today'. Do not mention this site, data, models or forecasts.",
].join(" ");

function line(label, value, unit = "") {
  return value === null || value === undefined ? null : `${label}: ${value}${unit}`;
}

export function buildPrompt(snap, inWindow, soon, seasonPhrase) {
  const readings = [
    line("Date", snap.date),
    line("Air temperature in snapshot", snap.airF, " F"),
    line("Soil temperature", snap.soilF, " F"),
    line("Daylight", snap.daylightH, " hours"),
    line("Wind", snap.windSpeedMph, " mph"),
    line("Moon phase", snap.moonPhase == null ? null : snap.moonPhase.toFixed(2)),
    line("Growing degree days accumulated", snap.gdd),
    line("Notable bird species returned by eBird within its recent search window", snap.birdCount > 0 ? snap.birdCount : null),
    line("First notable bird in returned sample", snap.topBird),
  ].filter(Boolean);

  const now = inWindow.length
    ? inWindow.map((e) => `${e.name} (${e.cat}), ${e.note}`).join("; ")
    : "nothing is inside its window";
  const next = soon.length ? soon.map((e) => e.name).join("; ") : "nothing within three weeks";

  return [
    seasonPhrase ? `The season itself, measured against the record: ${seasonPhrase}.` : null,
    seasonPhrase ? "" : null,
    "Readings for the day:",
    readings.join("\n"),
    "",
    `Events inside their window now: ${now}`,
    `Events due within three weeks: ${next}`,
    "",
    "Write the entry.",
  ].filter((x) => x !== null).join("\n");
}

// The fallback describes the banked snapshot, not independently timestamped
// field observations. A calendar window is never evidence of an event occurring.
export function snapshotNote(snap,inWindow=[],soon=[],seasonPhrase){
  const fields=[["airF","Air temperature in the snapshot"," F"],["ausableFlow","AuSable discharge"," cfs"],
    ["rifleFlow","Rifle River discharge"," cfs"],["ausableTempF","AuSable water temperature"," F"],
    ["rifleTempF","Rifle River water temperature"," F"],["levelM","Regional water level"," m"],
    ["gdd","Accumulated growing degree days",""]];
  const lines=fields.filter(([k])=>typeof snap?.[k]==="number"&&Number.isFinite(snap[k])&&(k!=="gdd"||snap[k]>=0)).map(([k,label,unit])=>label+": "+snap[k]+unit);
  if(!lines.length)return {ok:false,reason:"no numerical source evidence for almanac"};
  const safe=s=>String(s??"").replace(/[\u2013\u2014<>]/g," ").replace(/\s+/g," ").trim();
  const active=inWindow.filter(e=>e&&typeof e.name==="string"&&e.name.trim()).slice(0,3).map(e=>safe(e.name));
  const next=soon.filter(e=>e&&typeof e.name==="string"&&e.name.trim()).slice(0,2).map(e=>safe(e.name));
  const parts=["The record for "+safe(snap.date)+" contains these source values: "+lines.join("; ")+". They are values carried by the daily snapshot, not observations made in the field for this entry. Individual measurement times are not supplied in this note.",
    active.length?"The usual seasonal calendar includes "+active.join(", ")+". A calendar window tells us what may be due, not what has been seen.":"No calendar event was selected in its usual window for this note; that is not evidence of absence.",
    next.length?"The next calendar windows include "+next.join(", ")+". Their actual onset still needs local observation.":"",
    "On the Saginaw Bay shoreline, compare the water, wind and vegetation with the previous visit and record the date and place of any change. Keep the field observation separate from the calendar expectation."];
  const text=parts.filter(Boolean).join(" ");
  return {ok:true,text,words:text.split(/\s+/).length,mode:"source-fallback"};
}
export async function writeAlmanac(snap,inWindow,soon,seasonPhrase,{env=process.env,fetchImpl=fetch}={}){
  const fallback=snapshotNote(snap,inWindow,soon,seasonPhrase);
  if(!fallback.ok)return fallback;
  const keys=[...new Set(["ANTHROPIC_API_KEY_FALL_COLOR","FALL_ANTHROPIC_API_KEY","ANTHROPIC_API_KEY"].map(n=>String(env[n]||"").trim()).filter(Boolean))];
  for(const key of keys){
    try{
      const r=await fetchImpl("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},
        body:JSON.stringify({model:MODEL,max_tokens:500,system:SYSTEM,messages:[{role:"user",content:buildPrompt(snap,inWindow,soon,seasonPhrase)}]}),
        signal:AbortSignal.timeout(60_000),
      });
      if([401,403].includes(r.status))continue;
      if(!r.ok)return {...fallback,reason:"provider-unavailable"};
      const j=await r.json();
      const text=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text||"").join("").replace(/[\u2013\u2014]/g,", ").replace(/\s+/g," ").trim();
      const words=text.split(/\s+/).length;
      if(words<60||words>200||/[<>]/.test(text)||j.stop_reason==="max_tokens")return {...fallback,reason:"invalid-provider-output"};
      return {ok:true,text,words,mode:"anthropic"};
    }catch{return {...fallback,reason:"provider-unavailable"};}
  }
  return {...fallback,reason:"credential-unavailable"};
}
