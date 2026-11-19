# Experience Investment: Michigan Bloom Tracker flower-season timeline

**Mode:** IMPLEMENT. **Owner:** `izworskic/phenology-michigan`. **Canonical:** https://phenology.chrisizworski.com/bloom-tracker. **Date:** 2026-11-19.

## Visitor job and baseline
A visitor planning a Michigan flower trip needs to see *which month offers the kinds of flowers they want*, find matching destinations in the selected region, and check actual bloom evidence and operator access before driving.

The existing product already tracks 19 registered displays with a truthful March-October month dropdown, flower/region filters, state map, photo dossiers and historical stage records. The static `SeasonRouteStrip` contains the seasonal narrative, while the one-at-a-time month select hides the breadth of the season. Source inspection, not claimed phone screenshot evidence, supports that diagnosis. The archive contains only a small number of source-linked stage records; sparse history cannot become a peak-date chart. Historical iNaturalist/trillium and USA-NPN visualizations are context, not a site-specific confirmed bloom feed.

Two external patterns examined: USA-NPN's seasonal calendar and date slider (https://www.usanpn.org/data/visualizations), which use time as a causal explorer; Nature's Notebook (https://www.usanpn.org/nn), which distinguishes actual citizen observations from a typical seasonal expectation. Closest internal tools: Trillium historical report timeline (real data with explicit uncertainty) and Michigan Snow Totals (comparative recent measured magnitude). This flower calendar must not imitate their charts or scored tables.

## Three opportunities investigated
1. **Make the flower year navigable**: reveal every month at a glance and let selection update the existing destinations and map. Reuses the 19 planning windows, type and region filters. Medium-small code change, low evidence risk.
2. **Provenance before recommendation**: extend the newly added historical field archive with more verified operator observations. High scientific value, but coverage is sparse; do not manufacture observation dates.
3. **Exact-place photographic story**: a large gallery of what flowers at each site actually look like. Existing licensed photos support some locations, but the photo inventory is incomplete and large scenery can hide the decision. Defer until exact-subject coverage is verified.

## Two credible experience concepts
- **A. Photo-led flower atlas:** a visual essay with large exact-place images for spring, summer and autumn and a location selector. 390px first screen would give one flower photo plus an accessible jump to the destination. Useful for inspiring a trip, but cannot cover all sites reliably today, risks slow first paint and repeats visual map/card exploration.
- **B. Seasonal reading line (selected):** a restrained March-to-October horizontal strip with visible **registered destination counts**, a selected-month narrative and a single jump to matching places. The same state controls the existing month select, flower/region filters, map and destination cards; clicking a selected month restores the full calendar. Mobile scroll stays within the timeline, not the document. Unknown bloom is explicitly unknown.

Selection B delivers a temporal navigator, not a new generic hero or 56px vanity number. It differs from the Birding habitat departure board in both information dimension (month progression versus birding habitat) and interaction outcome (all window-matched destinations versus bird migration corridors). Counts refer to *planning windows* only; one operator window overlapping a month counts as one destination, never as a confirmed flower report or biological peak.

## State matrix and integrity
- Any month -> May -> October -> May: the 19-source registry remains unchanged and the original May planned choices return.
- Flower type or Michigan region change: month counts recompute from the same filtered set, not global unrelated counts.
- October + all flowers: includes Meijer Gardens **autumn mums** as a separate operator-promoted display.
- October + orchard cherries: does **not** present Meijer Gardens' spring cherry stages as October cherry evidence.
- October + mums: only the genuine distinct mum event at that destination.
- May + mums: no October mum stage is manufactured.
- Zero matches: explain the missing combination and offer another month/filter, not a false trip result.
- API stale/offline: month window counts remain static context, and the original evidence system continues withholding a live recommendation.
- Keyboard/no JS: the native month select and server-rendered cards remain the baseline; ribbon uses native buttons and aria-pressed/focus. Without hydration the SSR content is still a useful list, but timeline interactions are not claimed to work.
- Responsive/reduced-motion: horizontal scroll is contained; no automatic animation, 3D, new map, map tiles or third-party dependencies. Existing accredited media, AdSense, canonical and JSON-LD remain untouched.

**Visual grammar:** an editorial botanical seasonal line and evidence-led field dossier, rather than the numeric grid of Snow Totals or the bird migration field-departure board. A selected month changes the actual list, not merely the accent color.

## Verification and release boundaries
Targeted tests: `node scripts/check-bloom-month-wave.mjs` and full `npm test && npm run build`. Confirm 360/390/768/1280/1440 viewport behavior and month A/B/A interactions with actual browser screenshot proof before release. Foundry improve/assess/prove was **NOT EXECUTED** without a local owning-repository source checkout and a reviewed replay adapter; source/test assertions do not certify visual fidelity. No CTR, revenue or trip-outcome gains measured. PR remains unmerged for owner review.
