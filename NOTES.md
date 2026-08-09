# Michigan Phenology, working notes

Where we are leaving off, so any future session can pick this up by reading the repo.

Live: https://phenology.chrisizworski.com
Repo: github.com/izworskic/phenology-michigan
Vercel project: prj_68jPocjLfOELQpcyWhBeeAqpHir3 (git-linked, SSR Next.js, Pages Router)

## What this is

A real-time phenology read for Saginaw Bay and northeastern Michigan. It pulls live data, computes deterministic insight from it (no LLM in the page), and lays it out as a short "moment" plus a narrative "read" plus a tabbed deck. It is built around the owner's actual life on the bay, not a generic dashboard.

## Owner context that shapes the content

- Lives ON Saginaw Bay. This is the home water and the lead of the read.
- Fishes the AuSable only a few times a year. It is the occasional trip north, demoted in the read, shown only in trout season.
- Gardens at the bay (Freighter View Farms).
- Hunts near Pinconning, about 15 miles up.
- Kayaks the bay and beaches.
- The Kawkawlin River reaches the bay a half mile down the shore. No live USGS flow gauge (the nearby gauges are stage-only), so it is referenced by proximity, not a number.
- The Saginaw River is up the shoreline. Live gauge 04157005. It reads reverse/negative flow when wind and seiche push bay water upstream, so the read says "running slack" below 50 cfs instead of a negative number.

## Deploy routine (do this every time)

1. Edit files in the working copy. `npm run build` must show "Compiled successfully".
2. git add/commit/push to main with a NORMAL commit message (no "[skip deploy]"). Rely on the git-triggered Vercel auto-deploy. Do NOT POST a manual deployment, it gets deduped and canceled.
3. Poll the v6 deployments list for the commit SHA until READY.
4. SSO RE-ENABLES after EVERY production deploy. PATCH the project with {"ssoProtection":null,"passwordProtection":null} to unlock, or the site 401s.
5. Verify live with a cache-buster (`?v=$(date +%s)`); s-maxage is 600.

Docs-only commits (like this file) can use "[skip deploy]" in the message to skip the build and avoid re-locking SSO. The Vercel Ignored Build Step checks the triggering commit message for that string.

Env vars set in Vercel: GH_TOKEN (snapshot + signals writes), CRON_SECRET, EBIRD_API_TOKEN. Credentials are NOT in this repo; this is a public repo, keep it that way.

## Architecture

- `lib/phenology.js`: the season model. EVENTS (the phenology calendar with signal/correlation text), CAT categories, RIVERS gauges, and the computed functions: emergenceForecast (river hatches), gardenWindow (almanac planting), huntingForecast + rutClock, fallColor, bayHatch, skyTonight (in lib/sky.js), activeIndicators + coOccurring.
- `lib/sources.js`: all the live fetchers (USGS rivers with trend, NWS, NOAA levels, eBird, Open-Meteo with soil/snow/sunrise ISO, NDBC buoy 45203, GLERL ice/GLSEA, drought, alerts, river forecast, aurora). All no-key.
- `lib/signals.js`: daily-cadence sources (spring index, USA-NPN observations, iNaturalist, drought, bay ice/GLSEA) are gathered once a day by the cron into data/signals.json (GitHub Contents API, [skip deploy] commit) and read at runtime from the raw CDN. Cuts external calls about 80 percent.
- `pages/index.js`: the page. getServerSideProps fetches only the live sources (timeout-guarded) plus readSignals(). The component computes the moment, the read, and all the tab content.
- `pages/api/cron.js`: daily snapshot + signals refresh. `.github/workflows/daily.yml` triggers it.

## What is built

- Moment block at top: tappable chips (river, water, season pace, moon, frost, daylight) and a highlight line (Hatching / Plant now / Overhead / Color) that taps through to the matching tab.
- The read: a narrative synthesis, now bay-first (buoy water temp, wind, the walleye season, kayak note, ice in winter), then bay hatches, then local rivers, then the AuSable only in trout season, then season pace / daylight / garden / Pinconning hunting / birds / drought. Rebuilt fresh each load, so it tracks conditions and the date.
- Sticky tabbed deck, six tabs: Water and fish, Hunting, Garden, Sky, Life, Trends. Instruments are data-driven and split by tab. Tab choice persists in localStorage. Overview (moment, read, wheel, connections) stays pinned above.
- Water and fish: river and bay instruments, the river hatch forecast (AuSable degree-day projection), and the Saginaw Bay hatches card (lake flies, caddis, fishflies, Hexagenia, keyed to live buoy water temp).
- Hunting: the rut clock (phase or countdown to mid-Nov peak), legal shooting hours from real sunrise/sunset, and the Michigan season board (ten seasons, open-now or days-out, verify DNR digest).
- Garden: soil/frost/snow instruments and the almanac planting window (spring and fall windows anchored to last frost about May 15 and first frost about Oct 5; tender crops also gated on soil temp and frost outlook).
- Sky: Aurora watch (NOAA SWPC Kp, forecast peak, OVATION, moon, verdict for this latitude) and the night sky (constellations, moon, meteor showers).
- Life: Fall color card in season (computed stage, percent, the trout-coloring correlation, pointer to michigan.org/fall-color-map), plus eBird notable, iNaturalist, and statewide USA-NPN observations.
- Trends: air and degree-day instruments, the degree-day accumulation chart, how-the-year-ranks, the banked record (year-over-year, started about June 1 2026, not yet a full season).
- Connections in play: the active phenology signals and what each points to, with live-sensor confirmation chips where there is a measurable driver (forsythia/lilac/etc. vs soil temp; walleye/trout/firefly vs water temp; frost vs the outlook). The intro counts how many are backed by today's readings.
- The wheel and the three lists (Happening now / Next three weeks / Just past) are all clickable and open the EventPopout: status, window dates, description, the signal correlation, and what it runs with.

## June 9 2026 hardening and polish

- SSR resilience: every source in getServerSideProps is now timeout-guarded (8s) with a shape-matched fallback, and riverForecast plus aurora moved into the single parallel batch. Worst case is one timeout, not a hung page or serial stacking.
- The read now hoists the hottest sentence to the lead: the Hex coming off the bay, or the rut at Pinconning from seeking through peak. Otherwise the bay-first order stands. (Was an offered-not-built item; now built.)
- Bay hatches surface in the moment highlight: bayHatches is computed before the moment useMemo, and ready bay hatches join the Hatching line tagged "(bay)", listed first.
- Social cards: static /og-card.png (1200x630, parchment aesthetic, season wheel motif), og:image and twitter:card meta added. Static file, no runtime cost.
- JSON-LD expanded to the domain-playbook @graph: WebSite + WebPage + BreadcrumbList + Person with sameAs cluster.

## Recently added phenology

- Trees flowering: red and silver maple, willow catkins, aspen catkins, black cherry, oak catkins (tagged to fishing, runs with morels and the Hendrickson), white pine pollen, basswood.
- Fall color: the fallColor stage tracker (Life tab card + a Color cue in the moment).
- Trout fall coloring: the brook and brown trout spawn signal now reads as the coloring-up it is and cross-references the leaves turning, salmon, and migration.
- Antler cycle: casting (Jan to mid-March) and antlers in velvet (April through late August), alongside the existing velvet shed and rut.
- Sandhill cranes: spring return (mid-March) and the big fall staging at the Shiawassee Flats (Oct-Nov).

## Open items to tune (owner to confirm, then adjust)

- Frost dates drive the whole garden window. LAST_FROST_DOY and FIRST_FROST_DOY in lib/phenology.js are regional averages (about May 15 and Oct 5). The bay likely runs a little different. Set the owner's real dates and every window shifts.
- Fall color peak is set to about Oct 15 (doy 288) for the bay in fallColor(). Confirm against a real season and nudge.
- Offered but not built: draw correlation lines on the wheel between dots that share a driver.
- Localization to any Michigan address was discussed and deferred. Lookups verified (zip to lat/lon, USGS nearest gauges, FCC county, NWS zone).

## Conventions

- No em dashes anywhere, in code, content, or commits. Use colon, comma, period, semicolon, or restructure.
- Honest curation over AI slop. Everything computed and labeled as an estimate where it is one. No fabricated data.
- Value-function matrix before building. Terse output.

## The almanac note (added 2026-08-09)
A short written entry each morning, in the register of A Sand County Almanac, generated from the
day's banked snapshot and the events actually inside their calendar window, then banked to
`data/almanac.json` so the entries accumulate into a record of their own. Leopold's phenology
mattered because it was KEPT, not because any one day was remarkable.

The prompt is told not to invent a sighting, a count, a bloom or a hatch as observed fact, and the
page frames the block as "where the year stands, read from the day's numbers and the calendar,
not a field report". Keep that framing: the prose is present tense and reads like observation, so
the label is what stops it from being mistaken for one.

A failed note is logged but is NOT fatal to the refresh. The readings are the record; the note is
a reading of it.

## Backfill (scripts/backfill.mjs, added 2026-08-09)
`node scripts/backfill.mjs <start> <end> [--write]`. Dry run by default.

Reconstructs snapshot rows after an outage. Air, soil and wind are read from the HOURLY archive at
13:00 UTC, the hour the daily job fires, because a first pass using daily aggregates ran soil 14 F
warm and would have left a step change at the seam that looks like a real phenological signal.
Validated against the recorded series: open-meteo at the sampling hour reproduces recorded values
within about 2 F on both sides of the June and August seams.

birdCount, topBird, water temperatures and lake level are NOT backfilled and stay null. No archive
reproduces eBird sightings or instantaneous gauge readings. Every reconstructed row carries
`backfilled: true` and `backfilledFields`, and the script never overwrites a day that was really
recorded.

## The season's own clock (2026-08-09)
`seasonOffsetDays(gdd, doy)` in lib/phenology.js converts the accumulated growing degree days
against the normal curve into DAYS: how far this year is running ahead of or behind its own
record. It returns null below 120 GDD, where a few degree days swing the answer wildly, and
`seasonOffsetPhrase` refuses to dress up a difference under three days as meaningful.

This is the part that is actually Leopold. His phenology was not a calendar of what happens, it
was a record of when things happened, kept year on year, and its value was that it revealed
whether the season itself was early or late. The first version of the almanac here imitated his
PROSE, which is the least important thing about the book. This reads the record and says something.

`classify(doy, hatchOffset, seasonOffset)` shifts the event windows by that offset, but ONLY for
heat-driven categories: hatch, bloom, garden, wild, fish. Bird migration follows photoperiod and
weather far to the south, and lake levels follow basin hydrology. A warm spring in Michigan does
not move the equinox. Shifting everything would have been easier and wrong.

The offset is banked on each snapshot as `seasonOffsetDays` and passed to the almanac writer, so
the daily entry can say a bloom is running a week late instead of just naming it.
