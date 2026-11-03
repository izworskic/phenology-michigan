# Natural-Year Dispatch v1 — enhancement to the existing Michigan Phenology homepage

## Outcome

The **existing** `https://phenology.chrisizworski.com/` receives a compact, interactive Field Dispatch immediately after the established live conditions strip. It connects existing specialist tools into a decision-oriented visitor journey without creating a new product, replacing the 71-event calendar, removing the observed-condition data, or reducing the independent scientific observatory.

Three visitor lenses:
1. **Right now:** dated USA-NPN Nature's Notebook phenophase reports from a **statewide Michigan query**, next to relevant editorial seasonal windows that deep-link into each established specialist tracker.
2. **Next on the calendar:** next specialist experiences in annual order, with actual calendar start-of-window labels rather than unsupported species emergence dates or forecasts.
3. **Compare Michigan regions:** historic submitted flowering weeks for `Trillium grandiflorum` and first public Ruby-throated Hummingbird reporting dates. Seven presentation regions map to existing *different* biological sampling regions and disclose their limitations. Withhold if reporting history is insufficient.

Existing pages kept: Trillium, Hummingbird, Frog Chorus, Salamander Migration, Woodcock Sky Dance, Fireflies, Michigan Bloom Tracker, Frosty Mornings and Lake Smoke. The existing turning-year calendar remains and is linked from leaf change. The external Birding Report is already linked from the main site's footer.

## Scientific source contracts

- `data/natural-year-connections.json`: editorial, audited catalog of **existing** URLs and broad watch windows. `startDoy` and `endDoy` are not biological predictions; some seasons (lake smoke) correctly wrap across January. A specialist retains authority for its own live conditions.
- `data/signals.json`: same USA-NPN statewide phenophase bundle the homepage already uses, no extra API call. The Python worker excludes malformed, future, duplicate and more-than-8-day-old observations, and suppresses **all** apparent current reports if the source bundle is older than three days.
- `data/phenology-species-trials.json`: exactly the two existing independently evaluated species trial histories; historical regional windows are not a plant-specific onset forecast or a local first bird arrival.
- `scripts/build-natural-year-dispatch.py`: Python standard library and zoneinfo only. It ranks editorial windows by their normal season; it does **not** convert a weather-suitability index into an observation, combine bird and flower phenology into one season offset, or invent geographic precision.
- `data/natural-year-dispatch.json`: the versioned, precomputed visitor read, with `asOfDate`, observation-source date, source provenance, geographic scope, and explicit historical and editorial classifications. No personal data or precise sensitive-plant coordinates.
- `lib/natural-year-dispatch.mjs`: SSR validation allows only existing audited deep links, known source types and dated output. More than three-day-old precomputed summaries are not shown as current. The static fallback remains useful as navigation without evidence claims.
- `components/NaturalYearDispatch.js`: purposeful field-journal style, keyboard-accessible selectors, source links, source-scope explanations and responsive compact cards.
- `pages/index.js`: preserves canonical/ads/live field desk/seasonal calendar. The detailed species-science observatory remains available in a clearly labeled disclosure instead of pushing the visitor's next decision further down the page.

USA National Phenology Network explains that Spring Indices are synthetic temperature-derived measures rather than verified species-specific local blooms: https://usanpn.org/data/maps/spring . Nature's Notebook distinguishes Yes / No / Uncertain observations, and an unchecked event is **not** a No: https://www.usanpn.org/node/223 .

## Refresh and reliability

`.github/workflows/natural-year-dispatch.yml` runs after the existing daily signals refresh, on commits to source archives or catalog, and on manual dispatch. It executes Python regression tests and writes the new precomputed dated JSON via [skip deploy]; no Supabase, Redis, new API key or per-visitor expensive Python process. Data freshness / GitHub failures do not produce false live reports.

The Python analysis is an **evidence and navigation layer**. It does not claim to improve actual biological forecasts until independently measured observations and backtests support such an improvement. The homepage's preexisting direct USGS/NOAA/forecast sources remain unchanged.

## Verification

```sh
python3 -m unittest discover -s scripts -p 'test_natural_year_dispatch.py' -v
python3 scripts/build-natural-year-dispatch.py --as-of 2026-11-03
node scripts/check-natural-year-dispatch.mjs
npm test
npm run build
```

Check the live desktop and 390px viewport, all three dispatch modes, seasonal deep links, reports geography, historical region selection, scientific observatory disclosure, NPN source link, and freshness fallback. Confirm `/` canonical stays unchanged.

## Future genuine scientific investments

Obtain geographically precise *reviewed, repeat-observation* histories across several biological families. Add observation effort and uncertainty before attempting a single cross-tool inference model. Regional side-by-side historical comparisons are a first connection, not a shared biological clock.
