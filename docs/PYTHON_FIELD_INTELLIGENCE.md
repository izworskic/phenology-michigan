# Python Field Intelligence v1: Michigan Phenology

**Owner:** izworskic/phenology-michigan. Canonical page remains https://phenology.chrisizworski.com/.

## What changed
A stdlib-only Python worker reads banked daily snapshots and the USA-NPN observation bundle. It produces an evidence-backed, dated field read at `data/phenology-field-read.json`. GitHub Actions runs it after the existing daily snapshot refresh. The homepage reads the generated file directly from raw GitHub at runtime, so no rebuild and no new database are required. If the file is missing or too old, the visitor receives no counterfeit live analysis.

### Scientific rules
- The Grayling Open-Meteo daily temperature archive is **gridded climate modeling**, not an observed Bay City garden measurement. It is not the USA-NPN gridded 1991–2020 reference series.
- A 7-day heat change requires eight **complete consecutive** archived dates, valid values, and **non-decreasing** cumulative GDD. A downward reset flags a source revision and **withholds** the week-on-week claim. The 2026-11-01 archived record is an example.
- Water temperature is a **banked USGS gauge measurement on the AuSable**, never Saginaw Bay. Seven-day comparisons require eight dated values.
- USA-NPN Nature's Notebook phenophases currently come from a **statewide Michigan query**. Never label these local observations, confirmed Bay City blooms, or absence of species. Only show reports dated no more than eight days before the archived record.
- The archived dataset began June 1, 2026, so **there is no multi-year baseline** here. The engine does not make climate anomaly or species-emergence forecasts.
- Heat phase is a spring / early-summer *heuristic* and **cannot be inverted into "days late" in autumn**, when the normal GDD curve plateaus. Generic calendar events must not be shifted by the Grayling heat sum.
- Always distinguish calendar windows, direct reports, gridded climate, and sensor measurements.
- No new vendor, Supabase, Redis, or credential.

## Source references
- USA-NPN data: https://usanpn.org/data
- USA-NPN AGDD and interpretation: https://usanpn.org/data/maps/AGDD
- USGS water data: https://waterdata.usgs.gov/
- Open-Meteo historical gridded temperature: https://open-meteo.com/en/docs/historical-weather-api

## Test
```
python3 -m unittest discover -s scripts -p 'test_field_intelligence.py' -v
node scripts/check-phenology-model.mjs
python3 scripts/build-phenology-field-read.py --today 2026-11-03
npm test
npm run build
```

The worker's 15:30 UTC cadence follows the original 13:00 UTC refresh but GitHub scheduled actions are not guaranteed to run exactly on time. The field desk always displays the archived date, never a fabricated observation time. Independently verify production after release.

## Future investment
Introduce spatially matched, species-specific, independently evaluated phenophase models (first leaf/flower, migration, insect emergence). Keep these separate from the general seasonal GDD clock, and require source/coverage/accuracy checks before publishing visitor predictions.
