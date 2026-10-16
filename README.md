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
