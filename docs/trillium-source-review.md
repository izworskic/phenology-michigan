# Trillium destination bloom evidence — reviewer runbook

## What this adds
The public route `/michigan-trillium` returns **three different evidence states**:
- **Site-confirmed** only from recent, reviewed, explicitly site-specific evidence in `data/trillium-site-reports.json`.
- **Flowering nearby** from properly annotated, research-grade iNaturalist observations within approximately **5 km** of the destination's approximate map point; these are **not** considered inside the preserve.
- **No site report** when evidence is absent, expired, inaccessible, or outside the observation season. This is **not a claim of no flowers**.

Weather and regional historical bloom windows are independent signals. The API and UI never automatically convert proximity, warm days, or calendar dates into a verified site bloom.

## How to add a genuinely verified site update
1. Inspect a dated report on the **official land-manager source** or personally inspect a **public iNaturalist flowering observation** that can be unambiguously tied to the named destination (land-manager confirmation, official trail label or other positive on-site evidence). Do not infer membership in a preserve using a point-radius check: the map pins are approximate and parks have irregular boundaries.
2. Confirm the species (*Trillium grandiflorum*), site name, **date observed** (not solely published), stage and whether the content really shows open flowers. 'Peak' requires an explicit peak statement about that site from the source; one photo is insufficient to infer peak.
3. Add one object to the `reports` array in `data/trillium-site-reports.json`, review the source, and commit. Example **template only**, not an actual report:

```json
{
  "siteId": "trillium-trail",
  "siteName": "Trillium Trail Nature Sanctuary",
  "stage": "FLOWERING",
  "observedAt": "2027-05-10",
  "reviewedAt": "2027-05-11",
  "reviewedBy": "Reviewer full name",
  "sourceKind": "land_manager",
  "sourceUrl": "https://www.michigannature.org/index.cfm?action=listing&fuseaction=locationgallery&listing=74",
  "sourceExcerpt": "A dated, site-specific statement from the linked source must describe actual flowers."
}
```

Allowed `stage`: `BUDDING`, `FLOWERING`, `NEAR_PEAK`, `PEAK`, `FADING`, `DONE`.
Allowed `sourceKind`: `land_manager`, `reviewed_observation`. A reviewed iNaturalist individual observation additionally requires `observationFloweringReviewed: true` and a public `https://www.inaturalist.org/observations/NNN` source URL. Mark it true **only** when location-to-site identity and flowering stage were manually checked—not solely because the coordinate is near the point. The direct link and review date are displayed; private observer contact information is not collected.

4. A report becomes stale after seven calendar days, and a review must also be seven days old or less. Freshness uses Michigan local calendar days. The API automatically downgrades without manual intervention.
5. Run `npm test` and `npm run build`; verify the card and map show the appropriate status, visible source link and observed date.

## Privacy and reliability rules
- Never print or store observer coordinates in public JSON. Observation links and dates, not point locations or names, are shown.
- Auto-discovery uses only *Trillium grandiflorum*, `research` grade with plant phenology `12/13` (flowering), open, unobscured coordinates, stated positional accuracy ≤500 m, and a 10-day age limit.
- An observation's positional accuracy circle must fit inside a 5 km radius from the approximate destination marker. This remains **nearby**, not confirmed in the preserve.
- Site provenance must be explicit; do not use unrelated land-manager articles merely because they are hosted on an allowed domain.
- No extrapolation to statewide peak, no synthetic confidence percentage, and no October bloom activity.
- The public API uses six-hour shared caching in normal operation and queries iNaturalist only during spring to avoid unnecessary requests.
- If the source can't be verified or feed is down, leave the site status unverified, preserve the official directions links, and show the feed issue.

## Verification gate
`scripts/check-trillium-sites.mjs` tests expired, future, obscured, imprecise, missing annotation, wrong species, wrong preserve, unreviewed and invalid-domain records. The existing general trillium acceptance test also remains active.
