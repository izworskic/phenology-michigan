# Experience Foundry pilot 01 — The First Freeze

**Owner:** `izworskic/phenology-michigan`  
**Canonical:** `https://phenology.chrisizworski.com/` (normal homepage contains a compact invitation; the visitor-requested full experience opens at `/?experience=first-freeze#first-freeze` and is `noindex,follow` with the original homepage canonical)  
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

## 2026-11-05 layout correction — no stacked full-length experience

The initial pilot rendered the entire immersive experience above `NaturalYearDispatch` during the winter months and beneath it at other times. That crowded a substantial homepage and contradicted the Foundry's distinctiveness purpose.

**Corrected layout:** The ordinary `/` homepage contains one restrained `.ff-invite` at `#first-freeze` and continues into the existing Natural Year Dispatch, Seasonal Field Read and other engines. **It does not render the long First Freeze component at all.** The native, keyboard-accessible link opens `/?experience=first-freeze#first-freeze`, which Next.js renders server-side as a single-purpose journey. It shows a return link and no unrelated homepage widgets or extra seasonal footer navigation. The site's existing opt-in focus-mode safeguard is applied; ordinary homepage ad loading and monetization behavior remain unchanged.

A query focus is not a second SEO page: its canonical stays `/` and the focus variant is `noindex,follow`. No new sitemap route, metadata ownership, analytics service, external fetch, or model was introduced.

Regression acceptance:
- The default page has a compact invite of no more than 180px at 360px and 390px and **zero** `.ff` immersive sections.
- Focus has exactly one interactive `#first-freeze` and **zero** `.ny-dispatch` elements.
- The 4 seasonal buttons and 4 site options still work, A→B→A remains reversible, NOAA evidence does not mutate, and official access warnings remain truthful.
- Native navigation plus no-JavaScript focus both retain visible source links and all written chapters.
- Browser screenshots at 360/390/768/1440 test each focused state, while the default homepage remains a clean phenology tool.

## Evidence-depth release (November 6, 2026)

The original November 5 pilot showed two empty NOAA cards and a single 7-day minimum, without the published local counts that make a migration trip meaningful. This version **moves the source-backed DNR survey ledger to the top** of the focused page and changes the field decision from generic agency referral into an evidence- and habitat-based visit plan.

**New visitor value:** Switch between Nayanquing Point and Fish Point and ducks/geese/swans to see dated weekly area surveys, change from the preceding survey, visual time series with accessible table, and species composition. Each number is a management-area survey count, not a live observation, single-spot view, regional population, or guarantee. Zero and missing values have separate meanings. No sums of the two areas are used because dates and survey methods may differ.

**Nayanquing official source** https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/nayanquing-point-swa/waterfowl-counts

**Fish Point official source** https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/fish-point-swa/waterfowl-counts

The initial bank is a directly source-checked 2026 set: Nayanquing ducks 12,000 on Nov 1; Fish Point ducks 18,325 on Oct 25; Fish Point swans 504 on Nov 1 including 450 tundra. These numbers are **dated historical counts, not current today**. In addition, the Bay City forecast now shows the available daily minimum for each of seven dates, the count of modeled lows at or below 32°F, wind and daylight where supplied. It does **not** infer freeze-up from air forecasts.

**NOAA GLERL caveat:** CoastWatch ERDDAP is serving Anubis automated-access restrictions as of this research. The ice dataset's public metadata lists a coverage end around February 2026 in a previous crawl; seasonal winter maps are not necessarily published in November. It would be dishonest to render missing ice or water temperature as zero. The NOAA section has been moved into a labeled science disclosure with links to the official daily GLSEA analysis and seasonal ice charts. No challenge bypass or substitute invented water measurement is attempted.

### Evergreen update protocol and test limits

- `data/first-freeze-waterfowl.json` is the local authoritative **DNR-source copy** for these two management areas only. `scripts/refresh-first-freeze-waterfowl.py` uses Python standard-library HTML parsing to fetch precisely the two official pages and parse dated numeric `Total ducks`, `Total geese`, `Total swans` tables.
- A new row is accepted only if the source provides a valid week-ending date, numeric nonnegative count, and date no later than today's calendar date. Future planning rows, NA, blocked pages and changed layouts are not converted into observations. The script logs unavailable sources and leaves previous verified bank values unchanged.
- `.github/workflows/first-freeze-counts.yml` runs twice weekly (Mon/Thu) plus manual invocation, commits a changed DNR bank and triggers the normal production rebuild. There is no visitor-time government scraping or new database. If source automation fails, the workflow reports failure and **keeps the last dated data**, which becomes visibly historical rather than silently current.
- `lib/first-freeze-depth.mjs` computes the current September–August waterfowl year. 2026 data remain in the archive when the 2027 season arrives, but will not be presented as 2027 observations. Dated source freshness is per species-group and place; same-day extrapolation and combination across sites are forbidden.
- GitHub CI runs Python parser fixtures and probes both real sources; `npm test` checks fixed-date numerical examples and season rollover, and real browser acceptance checks place and species switching, accessible survey table, no-JS, stable NOAA data, and mobile layout.

The immersive experience remains on `/?experience=first-freeze` as a noindex same-canonical focus. The default phenology homepage remains the compact invitation. **No change to ordinary homepage ad loading or indexable route structure.**

