# Experience Foundry pilot 01 — The First Freeze

**Owner:** `izworskic/phenology-michigan`  
**Canonical:** `https://phenology.chrisizworski.com/` (existing homepage section `#first-freeze`)  
**Date researched:** 2026-11-05  
**Scope:** Source-qualified autumn → spring field journey around Saginaw Bay. No new indexable page, provider, map/geolocation, realtime wildlife model, Python task, or infrastructure.

## Visitor decision and originality

The visitor asks **"Which stage of the changing shoreline should I explore, what has actually been measured, and what public viewing destination can I investigate?"**

First-screen interaction: a distinct interpretive field-journal masthead with horizon artwork, four sequential season chapters, a synchronized evidence interpretation and a selector for four agency-described viewing destinations. A visitor choosing another chapter changes the biological/landscape explanation, not the measurements. Choosing a site changes habitat, the land-manager source, and the specific access decision.

Existing comparators:

1. `NaturalYearDispatch` on this homepage: a statewide cross-season phenophase map/time machine with calendar window connections. Purposeful reuse: research standards and honest statewide/local distinctions. **Difference:** one coastal landscape and its transition, two-dimensional chapter and *public approach* decision; no generic Michigan-wide phenophase dashboard or repeated card grid.
2. `/waterfowl-freeze-line/` on chrisizworski.com: a Midwest cold-pressure and migratory bird observation map. Purposeful reuse: NOAA/NWS/eBird interpretation and access safeguards. **Difference:** Saginaw Bay's documented marsh habitats, interpretive seasonal storyline and agency-specific public approach; no ranked regional waterfowl forecast or duplicate map.

Composition, interaction and decision each differ materially. No image is asserted to be an actual destination photograph: the horizon is decorative CSS artwork. No invented parking coordinates or route lines.

### External design research

- [BirdCast Migration Dashboard](https://dashboard.birdcast.org/region) (checked 2026-11-05): county/date exploration and explicit unavailable migration nights are useful patterns. **Not copied:** radar migration counts or estimated birds at Saginaw Bay viewing sites. BirdCast radar measures flight aloft and cannot confirm ducks at a marsh.
- [NOAA GLERL Ice Cover](https://www.glerl.noaa.gov/data/ice/) (checked 2026-11-05): separate current-season mapped analysis from long-term archived charts, with dates and interpretive method. **Not copied:** lake-wide coverage numbers as a percentage of Saginaw Bay, or official ice safety conclusions.

## Source data and scope

| Source | Existing signal | Valid interpretation | Hard limitation |
|---|---|---|---|
| NOAA GLERL ERDDAP, via existing `data/signals.json` daily bank | `bayDaily.iceConc`, `iceDate` at ~43.9N 83.4W | Dated **single offshore grid-cell reference**, up to 3 days old and backed by a <=2-day bank | Never bay-wide coverage; never trail, marina or marsh ice; never safe ice |
| NOAA GLSEA, same bank | `glseaF`, `glseaDate` | Dated satellite-analyzed offshore surface reference | Not nearshore/local sensor; no current claim from stale or missing data |
| Existing Bay City daily minima model, returned by `fetchForecast()` | `forecast.lows` | Lowest modeled minimum in next seven days, no freeze-up forecast | Not observed frost, water ice, migration or access; current model retrieval time is page render, not forecast issue |
| Existing `fetchBirds()` eBird Bay County `US-MI-017` notable feed | Species names and observation dates, 10-day subset | Dated recent *reported checklist* context; review flag displayed when explicitly true | Not observed at selected viewpoint; not a count of individual animals; silence is not absence |
| Site-specific DNR and FWS records | Four documented public viewing locations | Visitor can inspect official access and land-management rules | No open-now claim. Hunting/seasonal/flood restrictions remain site/date specific |

The banked NOAA record was **unavailable** in the November 5 source snapshot (`iceConc` and `glseaF` null). That is an allowed, expected first-season state. Do not backfill false numbers or replace missing grid data with inferred frost conditions.

## Official visitor sources (checked 2026-11-05)

- [Michigan DNR Bay City State Park](https://www.michigan.gov/recsearch/parks/baycity): Tobico Marsh, boardwalk, viewing structures. Campground may have unrelated construction closure.
- [Michigan DNR Nayanquing Point SWA](https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa): Kitchen Road observation platform, hunting permits; **office address is not platform directions**.
- [Michigan DNR Fish Point SWA](https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/fish-point-swa): birding is a listed activity, but daily hunt units and public access require manager rules.
- [USFWS Shiawassee refuge trails](https://www.fws.gov/refuge/shiawassee/visit-us/trails): Ferguson Bayou Trail observation decks, year-round except hunt and other restrictions.
- [USFWS refuge 2026 closures](https://www.fws.gov/locations/shiawassee-national-wildlife-refuge): specific Ferguson Bayou hunt closures include **October 30–November 5** and multiple November/December intervals. These are represented as **2026-specific**, never extrapolated to 2027.

## State machine and failure contracts

| Scenario | Chapter | Site | What must change | What must remain true |
|---|---|---|---|---|
| First visit in November | late autumn | Bay City | Natural seasonal chapter initially selected | NOAA/eBird are separately sourced; all access unverified |
| Select first freeze | first freeze | Bay City | Marsh interpretation, questions and field focus | NOAA values and bird reports do not change when chapter changes |
| Select Nayanquing | first freeze | Nayanquing | Habitat, Kitchen Road note, DNR link and cautious next step | No reported bird is associated with that specific viewing platform |
| Select Ferguson Nov 5 2026 | first freeze | Ferguson | FWS dated-closure warning; **no visit recommendation** | Current source still required for subsequent notices |
| Select Ferguson Nov 5 2027 | first freeze | Ferguson | Generic source verification, no inherited 2026 closure | Never assert open |
| Missing NOAA, stale archive, empty eBird | any | any | Unknown/stale labels, useful official links | No false no-birds/no-ice, no success score or optimistic verdict |
| JS disabled | default server chapter | Bay City | First SSR answer + static disclosure of all chapters and links | Actual site sources and caveats remain visible; no blank shell |

The chapter buttons and native site select both retain keyboard access, visible focus and aria-live updates. There is no asynchronous photo selection or map tile race. No third-party basemap dependency is needed for this first pilot.

## Technical integration

- `lib/first-freeze.mjs` owns independently testable source freshness, chapter state and dated access closure contract.
- `components/FirstFreezeJourney.js` owns original visitor presentation and two-dimensional selection.
- `public/first-freeze.css` is isolated under `.ff`; no changes to existing global styles, ads or canonical.
- `pages/index.js` passes existing server-side data into the model with no extra fetch. November–March appears before Natural Year Dispatch; other months appear after it. Exactly one runtime component is mounted.
- `scripts/check-first-freeze.mjs` is included in `npm test`.
- Existing source rights, API costs, weather interpretation and eBird license obligations remain authoritative; no additional republishing or external source call introduced.

## Acceptance and unverified claims

Required: `npm test`, `npm run build`, deployment preview smoke, mobile screenshots at 360/390/768/1440, switching A→B→A chapters/sites, keyboard/no-JS, reduced motion, stale source and FWS closure tests. If external design comparison remains unreviewed, do not claim full Experience OS release acceptance.

**Release stages:** source implemented (when merged), local regression test as CI confirms, deployment preview (when verified), production (only after owning-repo merge and public smoke), outcome measured (after GSC and non-PII engagement evidence). Source/link checks are not official access opening times or field observations.

The pilot's purpose is to test **composition across independent specialist data sources and a legally informed visitor decision**, not to generate another public Saginaw Bay URL or promise a migration forecast. Follow-on success condition: the Foundry produces a distinctly different, real-data maritime experience using comparable evidence/quality contracts without a common page skin.
