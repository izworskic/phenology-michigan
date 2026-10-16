# Michigan trillium — spring warmth engine (Phase 4)

## What is real versus what is estimated
The new March–June spring-heat signal uses **40°F as a descriptive base temperature**, calculates daily `max(0, mean_air_temperature_F - 40)`, and accumulates those units from March 1. This number is NOT a botanically established degree-day threshold for *Trillium grandiflorum*, soil temperature, bloom likelihood, or bloom-percentage metric. Forest canopy, snow, lake effects, elevation and observer reporting behavior can make conditions vary substantially within the same region.

Two authoritative independent historical sources underpin the tool:
- **Open-Meteo ERA5 historical weather**: daily mean air temperatures March 1–June 30, 2019–2026, at the existing seven regional representative grid coordinates. Snapshot in `data/trillium-thermal-history.json` contains 56 spring daily sequences (122 days each); no user identifiers or individual plant locations.
- **iNaturalist**: research-grade observations annotated plant phenology flowering, archived by weekly geographic bins `data/trillium-flowering-history.json`. Reporting dates are NOT measurements of first or peak bloom.

Open-Meteo forecast API provides daily modeled means for the previous 16 days and the current day + 7 days. Open-Meteo ERA5 archive provides current-season March 1 through 11 days before today. The seven-day overlap avoids holes caused by reanalysis lag. Missing data, wrong region, incomplete overlap, or unavailable services must result in **unavailable** rather than extrapolated warming.

## Validation / decision gates
For each region, use only historical years that:
- Have >=6 independently counted annotated flowering reports across >=2 distinct reporting weeks;
- Have complete daily ERA5 temperatures from March 1–June 30;
- Have a flowering-report median occurring within that spring window.

For each qualifying season, calculate the cumulative base-40°F heat at the historical report midpoint. Fit the median threshold for one year using **every other qualified year**, then find the threshold-crossing date in the held-out season. Compare absolute errors to the equal-year-median calendar benchmark also fitted without the held-out year.

Allow any forecast-style heat reference only when:
1. At least 5 complete qualifying seasons exist;
2. All leave-one-year-out threshold estimates are reachable;
3. Mean held-out absolute timing error <=9 days;
4. That error is at least 10% better than the historical calendar-only MAE.

These empirical limits are **product quality gates**, not biological facts. Only Southeast Michigan currently passes (3.9 days versus 5.1 days for the calendar; 8 qualifying years); six other regions keep weather-context-only statuses. Test and publication must recalculate gate results after an archive refresh; avoid freezing regional exceptions into code.

A crossing within the seven-day forecast displays only `heat reference may be reached`, never `trilliums will bloom`. An already-crossed threshold likewise does NOT confirm open flowers. Site-confirmed reports remain separate with their own strict editorial review rules.

## Public UI
A simple chart shows three distinct curves: mean-air warmth to date (modeled/reanalyzed), forecast warmth up to seven days, and the median corresponding cumulative warmth of historical springs. The current value is compared to the 25th–75th percentile of historic warmth at the same day to classify **weather ahead/typical/behind**, with no flowering percentage. The chart, report, and model accuracy follow the selected region. The next sections provide the 2019–2026 flowering-report timeline and 10 public viewing areas.

In October, the thermal API intentionally returns `off` and makes zero external weather calls. The page still displays source-backed historical accuracy so visitors understand why a specific region's bloom-date approximation is withheld.

## Operations and costs
- The one-time 2019–2026 backfill runs from GitHub Actions by `scripts/refresh-trillium-thermal.mjs`, querying Open-Meteo directly, not a paid scraping plugin.
- The existing July 20 GitHub Actions historical archive workflow also refreshes the completed spring's ERA5 temperatures each year, alongside iNaturalist flowering observation counts.
- The on-demand spring region API uses at most **2 Open-Meteo calls** per requested region, shared-cache TTL **6 hours**. Historical weather archive, model evaluation and full curves are committed; they do not trigger 56 weather lookups on a user visit.
- `npm test` validates archives, all seven regional fit gates, 16-day weather model overlap, bad data, off-season behavior, UI hooks and fail-closed conditions.
- Scope excludes predictive soil physics, near-real-time flower photographs, or official on-site bloom confirmation; none are inferred from thermal data.

## Improvement criteria
A subsequent phase can improve robustness with truly independent multi-site bloom logs, soil temperature measurements and measured year-ahead error, potentially changing the threshold model. Never lower the publication quality gate simply to show a forecast in every region.
