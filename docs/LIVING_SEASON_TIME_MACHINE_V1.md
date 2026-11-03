# The Living Season Time Machine — Michigan Phenology

## What shipped

A fifth **Time Machine** lens in the existing Natural-Year Dispatch on the canonical homepage, `https://phenology.chrisizworski.com/?view=history`. This is **not** a new site, SEO-indexed detail page, observation form, or a rewrite of the live Michigan observation map. Existing Frog, Firefly, Trillium, Hummingbird, Lake Smoke and annual-field calendar experiences remain untouched.

The Time Machine replays actual days from the archive introduced in PR #82, using its year index and read-only endpoint:
- `GET /api/phenophase-history` → validated index of real year files
- `GET /api/phenophase-history?year=2026` → actual collection snapshots in that year
- `GET /api/phenophase-history?date=2026-11-03` → a single captured snapshot

The interface fetches the index when visitors choose Time Machine, fetches only the chosen year, and verifies its declared number of snapshots, first/last dates, shape and chronology before presenting it. API sources already independently validate precise schemas and privacy. The front end uses no external API beyond the existing internal archive endpoint, no new database, no visitor submissions, and no off-site verification requests.

## What the visitor sees

- A **field archive ledger** whose total count is real recorded capture dates, not aggregate submitted observation events.
- Year selector populated only by *actual indexed years*, never speculative historical backfill.
- Scrubber, previous/next and play/pause controls that advance only through *captured snapshots*. With one frame, playback is disabled and the visitor learns why.
- A date-stamped regional CARTO map using the **same canonical nine regional centers and species labels** already employed by Across Michigan. The existing map component adopts honest historical labels; it does **not** change current-map source rules.
- Date-specific reporting phase summaries including actual source samples and multiple reporting-site/observer evidence. There are no point-level citizen-science coordinates.
- A chosen-region sample ledger. For three or more actual captures, dots depict reporting-sample counts **without lines connecting missing dates**, and explicitly warn against treating point changes as biological incidence.
- A comparison of a selected frame with its immediately preceding **captured** snapshot. It can show which phase categories appear or disappear from the *sample*, but labels these as *sampling differences*, not a first flower, species loss, migration, start/end or daily unique event.
- Source failures/capped iNaturalist queries, missing captured days, gaps between adjacent frames, distinct window dates, a copyable date-specific link, conservation/privacy warnings, full keyboard accessibility and responsive mobile layout.
- Shareable links, e.g. `/?view=history&year=2026&date=2026-11-03#living-season`, without adding a new indexed URL or changing homepage canonical.

## Science boundaries

**NEVER sum, subtract or interpolate across adjacent archive frames to derive actual daily phenology events.** Every frame covers `asOfDate - 14` through `asOfDate` (15 inclusive calendar dates). A one-day difference in the frame dates represents two strongly overlapping samples, and a change in reporting effort or API coverage can change the counts without reflecting an ecological shift.

No capture on a calendar date means **not collected**, not "no reports" and certainly not no plants flowering, leaves turning or birds migrating. Exact GPS and reporter identities are excluded in the upstream regional archive and remain excluded in the client converter.

The earliest first frame is a real 2026-11-03 collection. Never invent October 2026 or earlier frames by disaggregating its October 20 – November 3 reporting window. The time machine becomes a valuable replay as automatic collection continues; it is already honest and functional with the limited present evidence.

## Testing

```sh
node scripts/check-phenophase-time-machine.mjs
npm test
npm run build
```

Check all existing homepage navigation modes, the Fifth Time Machine tab, mobile 390px viewport, first genuine frame with disabled playback, map map-tile positions, region selector, source provenance, backend archive API, historical year selection, future multi-day playback, missing-day gap handling, deep links and copy, existing canonical, ads and other trackers. `verify.yml` runs this integration regression whenever the page, map, replay code or archive API changes.

## Next eventual science investment (not part of this release)

Once the archive has useful longitudinal coverage, develop a formal reporting-effort normalized analysis that can distinguish observer participation changes from supported biological patterns. This must have explicit held-out validation and avoid pooling separate sources or taxonomic phenophases as if they were one phenological clock. Until then the Time Machine deliberately reports samples, not biological rates.
