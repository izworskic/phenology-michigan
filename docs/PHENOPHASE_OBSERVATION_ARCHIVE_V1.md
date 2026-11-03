# Michigan Phenophase Observation Archive v1

## Purpose and actual starting point

The existing Michigan Phenology map at `/?view=map` already collects dated public *reported biological phases* across nine predefined Michigan regions. Its data source is a **15-calendar-day inclusive sample**: `asOfDate - 14 days` through `asOfDate`. Before this release the source map file was replaced daily and its previous reported samples were lost.

**The archive begins with the genuine November 3, 2026 published map snapshot.** Do not claim earlier historic coverage based on its 14-day observation window. The user does not need to contribute, submit, verify, or visit any site. No Redis, Supabase, service database, or new API key.

This release persists **one immutable dated public reporting snapshot per successful automatic collection day**, rather than retroactively reconstructing individual daily observation counts from a rolling summary. The visitor-facing seasonal time machine can use the real dated state of the map without double counting overlapping windows.

## Immutable annual archive files

- `data/michigan-phenophase-archive/2026.json` and one automatically created file for each subsequent capture year.
- `data/michigan-phenophase-archive-index.json` lists only years with actual captured snapshots, first/last capture days, number of actual captures, and **missing collection days between** the first and last capture. A missing date is never treated as an absent event.
- Each archived observation has one `asOfDate`, an inclusive `windowStart` and `windowEnd`, fixed `kind: overlapping-14-day-reporting-snapshot`, source health, and only approved region-level aggregates.
- Region rows: stable region ID, count of eligible sampled reports (a 15-date window, not a day's unique biological events), unavailable iNaturalist phase queries, and at most six published biological phases.
- Each biological phase: ID, last actual submitted observation date, source counts, number of independent reporting sites and observers, days with submitted reports, a *reporting coverage* label, and up to four pre-existing public common-name examples with dates.
- No individual observer IDs, source IDs, public or obscured observation GPS, patch locations, photos, or personal records are stored.

**Nonnegotiable arithmetic rule:** do NOT sum counts across consecutive snapshots to construct seasonal total reports, abundance, first flower timing, or daily incidence. Their observation intervals overlap by 14 days. The archive is a record of what was available on each **collection date**, not a rebuilt daily biological census or retrospective forecast. The recorded `sampledReports` counter can also exceed the shown top-six phase rows.

## Source truth and reliability

The existing daily `michigan-phenophase-geography.yml` workflow first fetches USA-NPN and iNaturalist through `scripts/build-michigan-phenophase-geography.py`. After an officially successful NPN fetch it runs `scripts/archive-michigan-phenophase.py`. That Python worker validates the full source-to-archive provenance, all nine canonical reference regions, the observation dates, reporting counts, and a strict allowlist of public archive fields. It writes the correct annual file and builds the index by inspecting all previously published year files. This happens in the **same GitHub Action** as the source collection, then the source map, annual archive, and index are committed together as one non-deploying data update.

One snapshot per capture day is immutable. Dispatching the workflow again on the same date does **not** duplicate or replace that historical measurement. A substantive correction needs an explicitly reviewed code/data PR. A missing day remains a **gap**; failed or partial sources are never represented as zero biological activity. The iNaturalist state, failed-query count and capped-query count are retained in the historical snapshot. If USA-NPN is unavailable the scheduled collector fails, so no "healthy" capture is manufactured.

The collection window may cross December/January. The capture year controls which annual archive file receives that day's window; snapshots are never duplicated in both years or reinterpreted as observation dates.

## Downstream access (ready for a seasonal time machine)

`/api/phenophase-history` — returns the validated archive index and only actual captured years.

`/api/phenophase-history?year=2026` — returns the actual immutable 2026 collection-day snapshots.

`/api/phenophase-history?date=2026-11-03` — returns exactly one real capture day. A missing date returns HTTP 404 `not-collected`, **not** an empty biological event.

`lib/phenophase-history.mjs` validates all archive fields and historical window dates against the fixed Michigan region registry and the current approved phenophases. Source data comes from versioned main-branch GitHub JSON; a bundled copy of the original 2026 record is a last-resort fallback, never a claim of current data. Unknown years cannot be used as arbitrary download URLs. The API is cacheable for 10 minutes. The full seasonal time machine interface is a separate subsequent investment; no artificial history or new indexable URL is introduced here.

## Validation and acceptance

```sh
python3 -m unittest discover -s scripts -p 'test_phenophase_archive.py' -v
node scripts/check-phenophase-archive.mjs
python3 scripts/archive-michigan-phenophase.py
npm test
npm run build
```

Check original November 3 capture; identical same-day workflow reruns; a changed same-day source sample cannot rewrite yesterday's published knowledge; missing collection days; late reports in following overlapping windows; year rollover with a December/January 15-day window; scoped partial upstream failures; exact-schema coordinate and observer privacy; invalid or future dates; index sum/reconciliation; public API and 404-versus-503 logic; absence of any visitor reporting requirement.

For later scientific progression analysis: compare each *separately dated* rolling snapshot, quantify reporting-effort and spatial sampling differences, and treat phase-date changes as descriptive rather than causal. To derive genuinely independent daily events, ingest and preserve de-duplicated raw observation IDs with a separate source-specific consent/privacy and backfill protocol. Never subtract adjacent rolling-window counts and call the difference new daily biological activity.
