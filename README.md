# Michigan Phenology

Real-time phenology dashboard for Saginaw Bay and northeastern Michigan: river flow and
water temperature, bird movement, insect hatches, ice and lake phase, and growing degree
days, in one view. SSR Next.js on Vercel. Live data from USGS, NWS, NOAA CO-OPS, and eBird.
Built and maintained by Chris Izworski.
\n\n## Firefly Emergence Tracker\n\nRoute: `/firefly-tracker` (API: `/api/fireflies`). Nine Michigan regional forecasts, an NWS seven-evening viewing-weather heuristic, ACIS growing-degree-day context and a map.\nNo sightings feed is integrated; neither weather fit nor the historical ~800 °C degree-day **adult-flight-peak** reference should be represented as confirmed emergence. The API intentionally avoids off-season weather calls and returns off-season statuses.\n\nValidation: `node scripts/check-fireflies.mjs` and `npm run build`. No map API key is required.\n
## Great Lakes Lake Smoke Predictor

Route: `/lake-smoke` (API `/api/lake-smoke`). NOAA GLSEA/ACSPO 24-hour satellite-analysis surface-water grid cells and NWS hourly forecast air/wind drive a transparent **steam fog setup** heuristic for 15 mapped shoreline locations across all five Great Lakes. The 5–10 a.m. local viewing windows are planning guidance, not an observation or probability; no score when sources fail or surface-water values are stale, missing or near the freezing/ice boundary. CARTO basemap falls back to OSM. Validation: `node scripts/check-lake-smoke.mjs` and `npm run build`.
