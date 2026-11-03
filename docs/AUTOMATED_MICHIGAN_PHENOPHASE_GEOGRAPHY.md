# Michigan Phenophase Geography, automated regional observation engine

## Mission

Enhance the **existing** `https://phenology.chrisizworski.com/` with a meaningful geographic interpretation of real biological observations. This release requires **no new visitor submissions or volunteer verification**.

The “Across Michigan” lens sits in the existing Natural-Year Dispatch. Its nine CARTO pins mark broad regional reference centers, not sensitive plant or wildlife locations. Visitors can choose a region and filter reported plants, insects or birds; each report is dated and labeled by source and contributor/site coverage. It complements the two-species independent historical observatory and existing specialist experiences.

## Authoritative source basis

- **USA National Phenology Network (USA-NPN), Nature’s Notebook:** `https://services.usanpn.org/npn_portal/observations/getObservations.json` using Michigan and a 14-day date window. Source records include explicit `phenophase_status=1`, date, species, phenophase, site ID and latitude/longitude. We count only positive phase status as *submitted positive evidence*. A `no`, `uncertain`, missing or unchecked entry **never** becomes proof of regional absence.
  - Official portal: https://data.usanpn.org/observations/
  - Status vs onset: https://www.usanpn.org/node/223
  - Programmatic API: https://www.usanpn.org/data/code
- **iNaturalist v1 public research-grade observations:** `https://api.inaturalist.org/v1/observations`, bounded to Michigan (place_id=29) and region-radius queries. Only vetted *public, un-obscured coordinates*, noncaptive records, plausible positional accuracy, recorded observation date, and explicit staff-controlled annotation matching the requested phase are eligible.
  - Official annotation meanings: https://help.inaturalist.org/en/support/solutions/articles/151000170738
  - Research grade concerns and observer effort: https://www.inaturalist.org/pages/api+recommended+practices
  - This is **community-reviewed species identification**, not proof that a phase first appeared on a particular day.
  - Annotation IDs: 12/13 open flowers, 12/14 fruits, 36/37 breaking leaf buds, 36/39 colored leaves, 1/2 adult insects (only an actual Insecta taxon).
  - Explicitly **do not** equate iNaturalist “No Live Leaves” with USA-NPN “Falling leaves.” The latter can only derive from a direct NPN positive phase report.

## Data pipeline

`scripts/build-michigan-phenophase-geography.py` uses Python's standard library only. It executes a daily 14-day-window USA-NPN response and a limited, rate-throttled set of iNaturalist region/annotation queries, avoids exposing observer identities and exact coordinates, and deduplicates within the private processing run. The generator **never** fabricates or imports user-supplied local sightings.

`data/michigan-observation-regions.json` specifies nine existing regional reference points reused from the Hummingbird Tracker. Every eligible point must be in Michigan's broad envelope and within 135 km of the nearest established reference center. The output identifies which broad area receives submitted evidence. These areas are nearest-reference catchments, **not county boundaries or complete sampling units**. iNaturalist observations with obscured, private, taxon-protected or inaccurate public coordinates are dropped outright. No reported field-site coordinates or raw observer/site IDs go into the public JSON.

`data/michigan-phenophase-geography.json` contains only the nine reference centers, report-phase groups, latest underlying observation date, qualifying source-specific record counts, counts of separate public NPN sites / iNaturalist observers, up to four common-name examples, and source/coverage integrity. Source counts are **samples of submitted reports**, never relative species abundance, biological probability, independent site truth or evidence of a species' absence from sparsely reported places.

A report group earns “multiple reporting sites or observers” when a NPN phase has at least two reporting sites, an iNat phase has at least two distinct observers, or both independent networks submitted the same broad phase type. This is a **breadth-of-coverage screen**, not independent verification of first onset, prevalence, or migration.

An iNaturalist `total_results` larger than the bounded API sample results in a capped-query diagnostic; we do not pretend a complete count or compare total abundance across areas. A query failure remains a documented unavailable category, never zero biological activity.

`.github/workflows/michigan-phenophase-geography.yml` runs automatically every day after the existing USA-NPN signal refresh, whenever scientific source files change, and by manual dispatch. It tests the science before ingestion, fetches the public sources and verifies the privacy-clean artifact, then commits it with `[skip deploy]` so the normal homepage does not rebuild daily. On a transient source outage the old public file is preserved instead of filling fabricated reports.

The server-side reader `lib/michigan-phenophase-geography.mjs` validates the entire archive and fixed region anchors, with a 3.5-second network timeout. Archives older than two Michigan calendar days automatically suppress all positive report phases, leaving a neutral map with an evidence-expiration explanation. The fallback cannot turn an old observation into today's activity.

## Visitor experience

The existing home visitor journey now has four lenses:
- **Right now:** source-scoped statewide recent observations and specialist seasonal windows;
- **Across Michigan:** the new CARTO map of automatic region-level reports, with plant/insect/bird filters and dated species examples;
- **Next on the calendar:** existing annual windows into established specialist trackers;
- **Compare regions:** historically evaluated report timing for trillium and hummingbirds.

Map selection is keyboard accessible and usable via a regional select even if CARTO, Leaflet, or the outline fails. Pins are all the same size so counts cannot be mistaken for population density. Pin colors reflect reporting coverage only. The map shows familiar regional reference centers rather than real field sites. No geolocation permission is requested from visitors. The full site canonicals, existing live data/SEO, and dedicated scientific/history tools remain unchanged.

## Verification

```sh
python3 -m unittest discover -s scripts -p 'test_michigan_phenophase_geography.py' -v
node scripts/check-michigan-phenophase-geography.mjs
npm test
npm run build
```

The Pull Request also runs the real source-ingestion workflow in a non-writing context. Only passing tests and a successful production build authorize merging. After merge, ensure `sourceStatus.usaNpn = ok` on the new output, check the iNaturalist query-success fraction, and inspect real observed phase data under each reported region on desktop and mobile.

## Scientific next stage

This is deliberately descriptive regional evidence, not a validated “season movement” prediction. Building predictive emergence fronts requires comparable effort-adjusted observation histories, consistent species/stage definitions, independent historical backtests, and geospatial uncertainty. The automated archives can accumulate those records over future years **without asking visitors to submit anything**.
