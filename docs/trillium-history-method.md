# Michigan trillium: historic flowering reporting calibration (Phase 3)

## Scope
The tool uses real iNaturalist **Trillium grandiflorum** plant-phenology flowering annotations (`term_id=12&term_value_id=13`), research-grade, filtered to place 29 (Michigan). The archive covers 2019–2026, organized by observed Monday-start reporting weeks and seven nonoverlapping editorial regional geographic areas. The 2019–2026 snapshot contains 1,885 regional report counts. It does **not** establish first bloom, true botanical peak, or bloom at a listed preserve.

The archive lives in `data/trillium-flowering-history.json`. It includes aggregate regional week/count pairs and the geographic sampling rectangles. No observer identity, individual photo or observation coordinates are stored in this archive. This history is a record of participating observers, not a probability model or a measured plant census. Missing observations can mean nobody reported flowering—not that flowers were absent.

## Historical method
1. For every calendar spring year, aggregate weekly research-grade annotated *flowering* records in each region.
2. A year is **eligible** only with at least six reports on at least two distinct weeks. Excluded years stay visible as thin-coverage years.
3. Within each eligible year, use the cumulative counts to find the observed flowering reporting **20th, 50th and 80th percentile reporting weeks**. Use each week’s midpoint for display.
4. Take the **median of each statistic across eligible years**. This gives every spring **one equal vote**, regardless of how many more iNaturalist users reported in some years.
5. Do not show a benchmark until there are at least four qualifying springs. Year-to-year variation is the median absolute difference between annual report centers and the benchmark center; it is descriptive scatter, not a forecast confidence interval.

Displayed “typical reporting window” means middle 60% of flowering **reports**, not first flower or peak bloom. This is explicitly labeled on the public page.

## Current-year comparison
- The `/api/trillium-history?region=west` endpoint fetches live **one weekly histogram per defined rectangle** when Michigan local month is March–June, **two only for Southeast**. It uses shared 12-hour caching.
- No network call for annual histogram outside March–June, but historic dates remain available from the committed snapshot.
- Live reports below six across two weeks get an **insufficient evidence** label.
- Even with enough reports, the current season remains **developing** until seven days after the historical 80th-percentile reporting date. This prevents a small number of early reports from being mistaken for an early entire bloom season.
- Only a mature, adequately observed reporting season gets an early/typical/late label, using an 8-day threshold from historical reporting midpoint. This compares **reporting dates**, not site flowering.
- No “late” verdict can come from zero or missing flowering reports.
- The separate 7-day Open-Meteo regional weather context and manual site verification remain independent and unchanged.

## Geographic approximation
Rectangles partition Michigan's existing editorial categories, intersected with the iNaturalist Michigan place ID. These are **not official botanical districts** and may have edge effects. The archived regional counts do not verify a specific trail. Preserve confirmations require the independent site-verification ledger and review process.

## Provenance and refresh
- iNaturalist's documented `/v1/observations/histogram` endpoint, `interval=week`, `date_field=observed`.
- Archive period initially sampled March 15–July 15, 2019–2026; production query parameters remain reproducible in `lib/trillium-history.mjs`.
- Refresh with `npm run history:trillium-refresh` after July of a completed spring season. Optional `--year=YYYY` can rebuild one completed season when needed.
- GitHub Actions `trillium-history-refresh.yml` schedules an automatic update on July 20, 11:20 UTC, using eight API calls. The workflow commits only the aggregate archive. No paid scraping service, browser automation, photo downloading or extra map key is required.
- Before final deployment the main repo verification workflow runs the history acceptance test and Next.js production build.
- Use the existing public `/api/trillium` for regional windows and site states and `/api/trillium-history` for historical graphic + live reporting comparison.

## Known limitations and roadmap
- Citizen-reporting effort varies by region, year, weekday, and trail popularity. An observation may be uploaded or annotated later. A flower annotated as flowering does not mean that all nearby flowers were open.
- Search windows are based on observations, not reconstructed soil temperatures, so the model cannot predict emergence before both source records and spring-weather data exist.
- The 2027 season can be compared with the archive, but do **not** make early/late claims before the source coverage and timing gates are met. A future validated degree-day model would require independent year- and site-specific records, cross-validation, and published error metrics.
