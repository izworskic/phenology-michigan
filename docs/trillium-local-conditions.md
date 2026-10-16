# Michigan Trillium — Destination Microclimate Context (Phase 5)

## Why this exists

A regional weather point does not describe every woodlot. Michigan's Great Lakes shorelines, sheltered ravines, back-dune forests, floodplains, forest canopy, aspect and local snow retention mean that two walking destinations can experience different spring conditions. The site can expose real environmental differences without promising a biologically calibrated “bloom X days earlier” forecast.

The original regional bloom calendar, historical flowering-report calibration, seven-day heat index, map, and strict human-reviewed on-site flowering evidence remain separate.

## Signals and sources

A single Open-Meteo forecast call, requested only March–June, supplies **17 grid points** in ordered arrays:
- Ten approximate preserve/destination coordinates already sourced in `lib/trillium.mjs`
- Seven representative regional coordinates already used by the spring heat engine.

The public route is `/api/trillium-local`. It returns data for the full state once every six hours via shared CDN caching; no individual per-stop network call is made.

Weather inputs: `daily.temperature_2m_mean/min/max`, `daily.snowfall_sum` (cm), and `current.snow_depth` (meters converted to cm). All grids use `timezone=America/Detroit`, `temperature_unit=fahrenheit`, `forecast_days=7`. Data is obtained from Open-Meteo's public forecast service. The model's current snow depth is **not** a snow survey or hiking-trail sensor. Zero modeled depth is described as “model suggests little or no snow” rather than “trail is snow-free.”

Comparison: the 7-day average mean air temperature at the approximate destination point minus the same forecast's seven-day average at the region's representative grid point. A difference of **2°F or greater** receives a warmer/cooler descriptive label; smaller differences say “grid near regional temperatures.” The cutoff only improves readability; it is not a biological threshold. “Warmer” does not imply blooms, a better hike, or guaranteed lake cooling. Weather suitability is NOT reduced to a fictional bloom probability score.

Habitat/exposure context comes from the already linked preserve descriptions and geography: e.g. coastal dune woodland, sheltered ravine, back-dune forest, hardwoods and rocky upland. Habitat notes are editorial, stable and not measured conditions. They are deliberately NOT used to numerically adjust flowering dates.

## Missing data and off season

- The local API makes no weather requests outside March–June, and returns habitat context with `state='off'`. October has no simulated snow, flowering or forecast readings.
- Seven-day daily arrays must all be present and date-aligned, with valid numerical mean/max/min temperatures; a wrong date, missing day or mismatch is rejected.
- `snow_depth=null` is **unknown**, not zero; old timestamp or invalid snow depth is discarded.
- The batched response must have the exact expected 17 entries, or it is entirely rejected to prevent erroneously labeling one preserve with another one's weather.
- If a region's weather fails, that preserve can still show its own temperature trend, but its “vs region” difference stays unknown.
- Failure of the forecast upstream must not affect visitor links, historical regional windows, on-site flowering proof, or other tools.
- No observed plant coordinates or private location data is sent to the weather API.

## Presentation

- A compact 10-stop comparison board in the *Where to see Michigan trilliums* section, filtered by existing region controls and clickable to jump to each destination card.
- Seven-day mean, delta vs corresponding regional point, modeled snow status and linked landscape type.
- Each destination's existing source-backed access card gains its own weather details and “not trail measurements” disclaimer.
- Existing CARTO pin colors continue to encode verified/nearby flowering reports, not the local weather ranking.

## Test and operating budget

`node scripts/check-trillium-local.mjs` validates 17-point batching, the 10 habitat notes, out-of-date or incomplete inputs, future snow handling, missing/null distinction, equal/warmer/cooler comparisons, no manufactured date shifts, component hooks, and responsive styles. `npm test` runs it within the existing site gate; production builds are separately verified.

Source: https://open-meteo.com/en/docs

Open-Meteo forecasts can have local terrain, snow and lake-effect biases. A site-specific blooming-date model would require independent detailed site flower-stage observations and measured microclimate data before it could be validated. No such precision is claimed here.
