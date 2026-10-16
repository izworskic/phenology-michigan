# Michigan Phenology

Real-time phenology dashboard for Saginaw Bay and northeastern Michigan: river flow and
water temperature, bird movement, insect hatches, ice and lake phase, and growing degree
days, in one view. SSR Next.js on Vercel. Live data from USGS, NWS, NOAA CO-OPS, and eBird.
Built and maintained by Chris Izworski.
\n\n## Firefly Emergence Tracker\n\nRoute: `/firefly-tracker` (API: `/api/fireflies`). Nine Michigan regional forecasts, an NWS seven-evening viewing-weather heuristic, ACIS growing-degree-day context and a map.\nNo sightings feed is integrated; neither weather fit nor the historical ~800 °C degree-day **adult-flight-peak** reference should be represented as confirmed emergence. The API intentionally avoids off-season weather calls and returns off-season statuses.\n\nValidation: `node scripts/check-fireflies.mjs` and `npm run build`. No map API key is required.\n
## Great Lakes Lake Smoke Predictor

Route: `/lake-smoke` (API `/api/lake-smoke`). NOAA GLSEA/ACSPO 24-hour satellite-analysis surface-water grid cells and NWS hourly forecast air/wind drive a transparent **steam fog setup** heuristic for 15 mapped shoreline locations across all five Great Lakes. The 5–10 a.m. local viewing windows are planning guidance, not an observation or probability; no score when sources fail or surface-water values are stale, missing or near the freezing/ice boundary. CARTO basemap falls back to OSM. Validation: `node scripts/check-lake-smoke.mjs` and `npm run build`.

### Lake smoke: ice guard and camera sources

From November through May the lake smoke API requests NOAA `GL_Ice_Concentration_GCS` local offshore ice concentration. Ice grid values above 0% limit the score (1–14.9% caps at 45; 15% or above blocks it); missing or 96h-old ice results block the score. In the other months no ice observation is claimed, and near-freezing/missing surface-water pixels remain excluded by the existing water gate. The camera verification panel uses curated operator links (not embeds, hotlinked images, computer vision, or claims of working streams); some listed operator cameras are seasonal, and not every location has a verified camera. `node scripts/check-lake-smoke.mjs` covers the winter fail-closed and camera contracts.

### Lake smoke shoreline drift V3

The /api/lake-smoke endpoint enriches ice-gated hourly NWS forecasts with wind FROM direction, 16-point compass notation, and an approximate bearing from each existing shore location toward its offshore GLSEA sample point. Shoreline guidance is qualitative: wind may sweep steam fog along the coast, toward the coast, or away over open water. This is not observed fog and not a plume transport model. Unknown/calm/variable wind and wind slower than 3 mph or faster than 16 mph cannot produce a ranked viewing recommendation. For each morning, a wind-qualified viewing hour needs a weather setup index of at least 50 and at most 15 points below that morning's highest weather hour. Fog setup scores and winter ice gates are unchanged; no view ranking is possible when water/air/ice observations fail. The dashboard includes a compass and two alternative rankings ("Best shoreline views" and "Strongest fog setup"). Field metadata and the notes make clear that the offshore-sample bearing is approximate, not a surveyed point-of-view vector or verified live camera visibility. Test coverage is incorporated in scripts/check-lake-smoke.mjs.


### Lake smoke historical issue archive (V4)

- Daily GitHub Action (11:23 UTC, subject to GitHub scheduling delays) records an **immutable** forecast issue from `/api/lake-smoke`. On first release the new history API triggers an initial archive capture through an isolated main-branch workflow; if the live API is unavailable, there is no fabricated backfill. The workflow is also manually dispatchable. It uses the repository's GITHUB_TOKEN and no database or additional paid provider.
- The stored `data/lake-smoke-forecast-issues.json` holds up to 120 actual issued dates, each preserving the next calendar morning's NOAA/NWS projected weather setup and viewing wind information per site. Daily reruns **do not revise** existing issues. No old dates are reconstructed.
- `pages/api/lake-smoke-history.js` reads the main-branch JSON archive dynamically from GitHub raw, including when the daily archive commit intentionally skips deployment. The frontend has 14/30/90-issue charts and explicit missing-data markers. GitHub source downtime yields an unavailable status, not an invented empty data history.
- `data/lake-smoke-observations.json` is an independent *reviewed* ledger, initially empty. The `.github/ISSUE_TEMPLATE/lake-smoke-observation.yml` template accepts **candidate evidence for manual review**, never automatic confirmation. Only dated original evidence, matched site/time, source link and reviewer may be curated into the ledger.
- **Do not call an archived forecast a measured fog day, a sighting, a calibration success, forecast accuracy, detection rate or a fog probability.** Comparing paired *prior-issued* forecasts and actual independently verified observations becomes possible only after there is enough defensible evidence; absence of a report cannot establish a non-event.
- Verification: `node scripts/check-lake-smoke.mjs`; the normal test/build workflow includes the new history and evidence source files. The recorder requires a fresh, complete live API response (15 sites), and aborts safely if sources are stale or missing.
