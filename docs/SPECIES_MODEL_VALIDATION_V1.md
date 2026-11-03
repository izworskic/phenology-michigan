# Species-specific phenology trials, November 2026

## Product and scientific distinction

The phenology homepage now includes an **interactive, reproducible comparative trial** of two different biological clocks:

1. **Large-flowered trillium, Trillium grandiflorum**: seven Michigan zones, flowering-annotated iNaturalist weekly bins (2019–2026 initial archive) matched to March 1–June 30 ERA5 representative-point daily mean air temperature. The date being predicted is the **regional midpoint week of annotated public flowering reports**, not first bloom, flowering percentage, peak flower abundance, or an individual preserve.
2. **Ruby-throated Hummingbird, Archilochus colubris**: nine regions, iNaturalist research-grade public reports (2017–2026 initial archive), requiring at least two independent observers in an eligible year. The date is the **first public report**, never a population-level first arrival, absence of birds, or migration probability. We do NOT fit a local accumulated-heat forcing model to long-distance bird movement.

No new provider, database, paid infrastructure or API secret. Existing weather, source quality and editorial contracts remain authoritative. The outputs are **historical diagnostics and planning context**, never a current-year sighting or bloom verdict.

## Backtesting trillium

The Python generator `scripts/build-species-trials.py` is intentionally independent of the existing JavaScript model.

- Only years with at least 6 annotated flowering reports over 2+ weeks and complete 122-day ERA5 sequences are eligible. Leap years normalize to the same March–June month/day index; leap-day is never silently mapped.
- The species index is cumulative `max(0, mean air °F - 40°F)` since March 1, **not** a verified trillium physiological threshold.
- Train a single median heat-at-report-week index and separate historical-calendar median using only **earlier eligible years**. From 2024 onward, predict each held-out year before incorporating it into the training record. This is rolling-origin retrospective evaluation.
- As a second independent check, leave one historical year out, fit on the other years, and score that held-out year. This is not additional unseen external data; both tests are required.
- An unachievable heat threshold incurs a 30-day failure penalty instead of silently dropping that fold.
- Only label a region `historical-skill` if 7+ eligible years, 3+ rolling-origin holdouts, no unachievable crossing, rolling MAE <=9 days and <=85% of calendar MAE, leave-one-year-out MAE <=9 days and <=90% of calendar MAE, and no rolling-year error >14 days.
- An empirical heat reference is suppressed for every region failing the gate. Do **not** treat a passed gate as a first-flower or local park forecast.
- Do not transfer fitted coefficients from a warmer south-facing habitat to a shaded northern site, or combine bird and plant phenology into one seasonal offset.

**Initial 2026 record:** only Southeast passes both historical gates. Across its three later eligible springs (2024–2026) rolling heat-date MAE is 4.3 days versus calendar-only 6.7 days. All metrics are for flowering-report-week midpoints, not known first bloom. These are only three rolling holdouts, so prospective real-world validation remains outstanding. Existing JS trillium heat forecast remains independently gated and is not overridden by Python.

## Hummingbird safeguards

The calendar summary needs 6+ eligible seasons with 2 different observers each and 30+ reports across those seasons. First public reports are vulnerable to observation effort and sampling; poor-coverage regions display **dates withheld**. Rolling-origin median-date error is shown for seasons in or after 2024, provided 4+ earlier eligible springs. No temperature-driven arrival estimate is produced.

## Honest presentation

- Default regions: Central Michigan trillium (serves Saginaw Bay generally, but not a park-specific record); Saginaw Bay hummingbird.
- Visitors can change region and replay real dated held-out years.
- Annual report bands show the middle 60% of **submitted flowering** records; bird dots show first public reports. Chart does not imply flowering abundance.
- Only a region with passing history earns a historical-skill label. The visual always states historic reporting metrics and their limitations.
- The component does not overwrite or duplicate the existing specialist Trillium and Hummingbird tools.
- No new indexable URLs, new maps or changes to ad settings and canonical identity.

## Data/update path

The input archives are existing `data/trillium-flowering-history.json`, `data/trillium-thermal-history.json` and `data/hummingbird-history.json`. The generated artifact is `data/phenology-species-trials.json`. The `species-trials-refresh.yml` GitHub Action recomputes when relevant source files change on main, as a weekly safety net, or by manual dispatch. Python standard library only. The action commits a dated dataset with `[skip deploy]`. The homepage SSR reads the raw archive dynamically with a validated committed fallback, avoiding build redeploys for a data refresh. No future-year flowering observations are created.

```sh
python3 -m unittest discover -s scripts -p 'test_species_trials.py' -v
python3 scripts/build-species-trials.py --today 2026-11-03
npm test
npm run build
```

## Next scientific upgrade

Gather repeatedly visited, site-verified **first open flower** and first-leaf dates from the same individually tracked plants, with independent soil/ground conditions and geolocation. Only then can this historical reporting-centre trial support a genuinely site-calibrated botanical onset model. Until then, preserve fail-closed classifications and report actual errors rather than forecasting confidence.
