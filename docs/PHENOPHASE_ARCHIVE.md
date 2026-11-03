# Michigan Phenophase Historical Observation Archive (v1)

**Purpose:** An automatically collected, reproducible history for the **existing** Michigan Phenology homepage's nine-region observation map. It does **not** ask visitors to submit or verify observations, and it does not constitute another website or a new ecological forecast.

## What is archived

The daily collector already gathers USA-NPN and annotated research-grade iNaturalist observations, filters them into nine broad Michigan regions, and publishes a dated 14-day geographic evidence summary.

The new Python worker `scripts/archive-michigan-phenophase.py` saves **one immutable snapshot for each actual Michigan-local collection date** into `data/michigan-phenophase-archive/YYYY.json`. A snapshot contains:
- Actual snapshot date and the explicit 15 inclusive-day sample range (current day minus 14 through current day).
- Nine canonical region IDs, and each region's sampled reporting count, presented phenophases, date of latest eligible report, independent reporting-site/observer breadth, and a maximum of four public species-name examples per phase.
- Full source-health record (including partial iNaturalist queries, failed queries and capped sampling), and which regional iNaturalist stage queries did not complete.
- No raw GPS, coordinates of individual plants/animals, observer identities, usernames, site IDs, or raw scraped observations. The already published map stores its own coarse public reference centers; these **are not needed in the historical archive**.

The date is the **collection date**, not an individual organism's emergence date. Consecutive windows overlap on 14 days. Counts can be shown independently for each snapshot, but **must never be summed** to infer unique observations, species abundance, probability, or actual phenophase onset.

## Data access contract

- `data/michigan-phenophase-archive-index.json` — machine-readable index, available years, first/last actual snapshots, count of days on which collection succeeded, and **missing collection days between captured dates**. An absent date is an archival gap, not biological absence.
- `data/michigan-phenophase-archive/YYYY.json` — validated, self-contained public yearly time series of immutable snapshots.
- `GET /api/phenophase-history` — current year/index metadata.
- `GET /api/phenophase-history?year=2026` — all actually collected 2026 snapshots.
- `GET /api/phenophase-history?date=2026-11-03` — one explicitly captured day.
- Future years roll into new yearly files automatically; the source archive starts at the **genuine, preexisting November 3, 2026 geographic snapshot**. Prior dates are not reconstructed from rolling 14-day totals. An unknown year or absent day returns a clear not-collected state.

The read API uses a strict versioned schema, audited GitHub-origin URLs, data-size limits, and caching. The bundled index and original 2026 capture are trusted fallbacks for temporary outages; a historical request must not fabricate missing observations.

## Automation

`.github/workflows/michigan-phenophase-geography.yml` is the existing daily ingestion workflow. The archive step runs **after** the official source fetch and before the Git commit. If USA-NPN collection is stale or failed, the archive step fails closed; no new historical snapshot is written or published. `git add` now includes the yearly archive directory and index along with the current map summary so these are committed together. No new cron, database, Supabase, Redis, or new provider is required.

The archival worker intentionally rejects a second, possibly changed snapshot for the same calendar day. Corrections must be reviewed in source control rather than silently replacing the historical record. Annual files cap at 366 snapshots, and every previously archived year is schema-validated before updating.

## Scientific limitations

- These are independently dated **reporting-window snapshots**, not daily independent ecological events. The iNaturalist source is seasonally sampled/capped and provides no biological census.
- Reporting effort varies by location, year, taxon and observation network. Multi-site evidence is broader sampled coverage, **not** a quantified biological probability.
- Late reports change what future collectors see; they do not retroactively rewrite an already archived daily snapshot.
- A region with no report is *unobserved or unsupported in this sample*, not a claim of phenophase absence.
- Public site-level flower-onset research has a separate monitoring process; this archive does not infer site-level first bloom.

## Verification and release gate

```sh
python3 -m unittest discover -s scripts -p 'test_phenophase_archive.py' -v
node scripts/check-phenophase-archive.mjs
npm test
npm run build
```

Python regression tests cover a genuine initial seed, immutable idempotent daily capture, non-additive overlapping windows, source outages, year rollover across December/January, archival gaps, strict geography and privacy. Node tests cover API contracts, invalid extra fields, duplicate dates and frontend compatibility.

Following release, verify `/api/phenophase-history`, `?year=2026`, and `?date=2026-11-03`. The visitor-facing *Living Season Time Machine* can be built on these data **after** multiple genuine collected snapshots exist. Avoid presenting a one-day series as an empirical trend.
