# Site-level first-open-flower calibration — Michigan Trillium

**Implemented November 3, 2026** in `izworskic/phenology-michigan`. Public experience: `/michigan-trillium#tri-site-science`.

## What is known now
The preexisting reviewed preserve-bloom archive has **zero independently reviewed, explicitly site-tied historical confirmations**. The new repeat-monitoring and soil archives begin empty. A previously checked regional flowering photograph, a weather grid, or an automatic source URL cannot be promoted into a first-open-flower measurement for any of the ten preserves.

This release therefore **builds the actual experimental protocol and evidence pipeline**, rather than inventing a site bloom forecast. All ten preserves appear with honest evidence readiness, and the existing single-sighting report system remains separate and unchanged. The tool makes no current site-level onset prediction.

## Authoritative biological method
USA-NPN's Nature's Notebook is the scientific starting point:
- https://www.usanpn.org/node/223 — report observed yes/no/uncertain per visit and **do not** treat an unchecked phase as no; record site/snow where possible.
- https://www.usanpn.org/nn/faq — preferably monitor one to three recognizable *individual plants or patches*, inspect every 2–3 days as conditions change, and retain “no” observations to bound onset.
- https://www.usanpn.org/nn/faq/Nugget1 — a fresh open flower requires visible reproductive structures; a bud is not an open flower; an open flower implies buds/flowers yes.
- https://data.usanpn.org/observations/ — individual and site phenometrics describe *first positive observations*, not a biological moment known to the minute. Existing NPN data are not silently imported as verified visitors' preserves.

Follow public land-manager rules. Select only plants that can be monitored from an authorized public path. **Never** publish precise rare/sensitive plant positions, off-trail directions, personal identities, or hidden site coordinates.

## Archival evidence
`data/trillium-monitoring-visits.json` stores only **reviewer-approved** records, each with:
- one canonical preserve ID (from the existing ten);
- anonymous stable patch code **A** (predesignated anchor), optionally B or C, reused in later visits and seasons;
- actual observation date (March 15–June 30);
- separately evaluated `openFlowers`, `buds` and `snow` statuses: `yes`, `no` or `uncertain`;
- optional spot field-probe soil temperature in Fahrenheit **with measured depth in centimeters**;
- owner/reviewer identity, date, public source issue and a private-by-design provenance rationale, never rendered in the public summary.

The workflow begins from a public, privacy-warned GitHub issue:
`https://github.com/izworskic/phenology-michigan/issues/new?template=trillium-repeat-visit.yml`.
This intake requires a GitHub account. A field submission **does not** become evidence just because someone submitted it. The owner independently verifies the preserve, species and consistent monitored patch, then explicitly dispatches the `Publish owner-reviewed trillium monitoring visit` workflow. The workflow validates and tests the archive before committing. It does not change the existing `trillium-site-history.json` or mark any preserve “blooming now.”

## First onset is an interval, not an instant
For each **same site, same patch, same year**:
1. Find the **first reviewed yes** for open flowers.
2. Find the latest reviewed **no before that yes**. A later “no” might indicate flowers have finished and **cannot** bound the start retroactively.
3. The actual onset is in the open/closed interval `(last no, first yes]`, not automatically on the first yes date.
4. For a *tight* calibration bracket require **at least two no visits before the first yes** and **no more than four days** from latest no to first yes. A wide bracket stays visible as uncertain, not as a point onset.
5. A first yes with no preceding no is **left-censored**. Only negative visits mean **no positive reported so far**, *not* flowers absent at the whole preserve. Uncertain and missed visits never become “no.”

This is intentionally strict to avoid reverse-engineering a falsely precise first-bloom date from a calendar window or a photograph.

## Actual site microclimate vs modeled weather
`data/trillium-monitoring-soil.json` stores reviewed **complete March 1–June 30 (122-day)** annual sequences of daily mean on-site soil temperatures, identified by canonical preserve, stable patch, measured **depth**, instrument code, review, and public source evidence. Never replace them with an Open-Meteo regional grid or another plant's sensor.

The spring warmth index is a research trial: `sum(max(0, measured daily soil °F - 40°F))`. **40°F is not asserted to be a validated Trillium grandiflorum soil threshold**. A single probe reading is contextual only and is never filled forward into a missing logger day. Different logger depths are not pooled. Missing daily data fail closed.

## Site-specific, temporally honest model gate
A site has only one anchor unit **A** for calibration, so patch B and C do not turn one season into multiple supposedly independent years. Each training example must have **both** a tightly bounded onsite first-open-flower interval and **complete paired measured soil history**, same plot/depth.

For each chronological held-out year:
- Fit a single soil-heat reference on **prior** eligible site years only;
- Fit a calendar median date on those same prior years;
- Compare both predictions to the actual interval using the **distance to interval**. A date *inside* `(last-no, first-yes]` scores zero. A date earlier/later scores its calendar distance to the nearest allowed date. An unreached heat reference scores a 30-day failure penalty.
- Never use the held-out year, its date, or later years for training its own prediction.

**Publication gate (product acceptance rules, not a biological constant):** at least eight qualifying paired site-years, three chronological holdouts, average interval-distance error at most three days, at least 20% improvement over the calendar comparator, and no held-out distance over seven days. Failure withholds the site heat-date reference, and even passing this gate means **retrospective skill against a bounded observation interval**, not confirmed real-time bloom probability.

Repeated same-site observations are likely to take several years to accumulate. If this method is impractical in the chosen preserves, seek reviewed long-term individual-plant records from a trusted monitoring program rather than relaxing the gate or synthesizing samples. Broader pooled and hierarchical ecological models require a separate preregistered validation method, not silent mixing of sites.

## Visitor experience and source truth
`components/TrilliumSiteScience.js` shows:
- One research status per public preserve; all ten follow canonical names and existing publicly documented habitat metadata;
- An evidence ladder: repeated verified visits → bounded patch-years → paired logger seasons → independently checked site model;
- The actual research onset interval for qualifying visits, or an explicit absence-of-evidence message;
- A **separately labeled illustrative** date experiment showing how two observations bound onset;
- Field instructions that encourage consistently checked phenophases and preserve plant protection.

`pages/api/trillium-site-onset.js` reads only the generated public audit `data/trillium-site-onset-summary.json`. This exposes no private coordinates, visitor identities, source review notes, or individual-trail directions. The API validates schema, ten canonical site identities, dates, and model statuses, and falls back to the last reviewed bundled record on transient GitHub errors. No real-time forecast becomes a site-bloom claim. The original canonical Trillium Tracker URL, ads, and map interactions remain intact.

## Operator runbook
```sh
# Verify false-positive controls and real site archive
python3 -m unittest discover -s scripts -p 'test_trillium_site_onset.py' -v
node scripts/check-trillium-monitoring.mjs
# Regenerate public site report from ONLY reviewed evidence
python3 scripts/build-trillium-site-onset.py
npm test
npm run build
```

Manual review requires all owner booleans checked, a substantive evidence note and an existing open issue. Review commits both source and generated summary with `[skip deploy]`, and dynamic API reads the updated version. `trillium-site-onset-rebuild.yml` validates/recalculates after input archive changes and as a weekly safety net. None of this creates an unattended scraper, unreviewed bloom promotion, new database, Redis, Supabase or a paid inference provider.

## Next verification that requires real people
Coordinate with a consenting public preserve/land manager and establish at least one lawful accessible recurring patch, an A code recorded privately by trained reviewers, regular *yes/no/uncertain* visits, and if feasible a documented logger. Validate identity and observation methodology before any record is accepted. The lack of such data is an explicit unresolved research dependency, **not** a reason to create imagined measurements.
