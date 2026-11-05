# Michigan Phenology: Uninterrupted Time Machine & collection health

## Release scope

Enhancement to the **existing** `https://phenology.chrisizworski.com/` only.

The site-level Google Auto ads anchor can stay fixed above the Time Machine map and replay controls on desktop. Its source is the shared script loaded from `https://chrisizworski.com/assets/network-ads-v1.js`, which in turn loads Google's Auto ads. There is no locally placed sidebar or ad component to reposition. **Do not hide, move, restyle or intercept Google-rendered ad frames** with CSS/JavaScript.

Instead, the visitor can choose **Open uninterrupted field viewer**. This is an opt-in native navigation to `/?view=history&focus=1#living-season`. `pages/_app.js` only omits the shared network ad loader for that exact root page + both query values. The standard homepage, its other views and all specialist pages keep the existing ad loader. A native link returns to the original standard view. Canonical SEO is still the homepage root; no additional route, redirect, new ad network or page template.

This feature does **not** change the network ad placement configuration, publisher account, AdSense scripts, anchor controls or monetization behavior on ordinary pages. It offers a clearly designated uninterrupted research workspace on request.

## Biological collection health

`lib/phenophase-archive-health.mjs` reads the already-validated yearly archive index. It dates all evaluations in **America/Detroit**, not UTC. The latest immutable snapshot date is the source of truth; a successful but skipped GitHub Actions run is not evidence of a new collection.

- 0–1 elapsed Michigan calendar days: recently captured.
- 2 days without a new saved capture: overdue; show a warning.
- 3+ days without a new saved capture: stale; show a warning.
- Latest snapshot with a partial/failed iNaturalist coverage: show limited source coverage.
- A future-dated snapshot, absent index, or invalid index: unknown/invalid, never "healthy".

A missed snapshot **never** means absence of a plant, bird, animal or seasonal event. The Time Machine continues displaying genuine historical frames without inventing dates.

`.github/workflows/phenophase-archive-health.yml` runs at 04:25 UTC daily after both existing routine collection attempts. The job fails if data are overdue, stale, missing or future-dated, and reports partial coverage as a warning. Owners can inspect GitHub Actions/notifications without any paid monitor, Redis, Supabase, visitor report forms or scheduled user follow-ups.

## Verify

```sh
node scripts/check-phenophase-archive-health.mjs
node scripts/run-phenophase-archive-health.mjs
npm test
npm run build
```

Then verify production browser behavior:

1. Normal `/?view=history` retains the network ad loader.
2. Focused `/?view=history&focus=1` omits the site network-ad script in the rendered HTML and has no auto-ad obstruction after settling.
3. Native Return link preserves the selected archive date and year.
4. On the regular and focused pages, all nine regional map markers, archive timeline, source caveats, original canonical, and annual calendar still function.
5. Archived-source health shows November 4 as a recent capture on November 5, not a late day; simulated November 6 and 7 dates produce overdue/stale warnings.
6. No visitor submission or manual observation verification is introduced.

## Next validation

The current archive has only two real captures. Further historical comparisons need weeks to seasons of genuine records and adjustment for changing observer effort, not an inferred trend from adjacent overlapping report windows.
