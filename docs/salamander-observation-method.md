# Michigan salamander observation evidence (v1)

## Two distinct evidence lanes

1. **iNaturalist Research Grade species sightings**, in Michigan (place_id=29): `Ambystoma maculatum` and `Ambystoma laterale`, in a rolling 21-day spring window (March–May). Research Grade describes an identification supported by community evidence, not an observed migration. The tool **never** labels these as confirmed Big Nights. Two requests per three-hour cache refresh (separated to respect iNaturalist usage guidance); no queries outside March–May. Each taxon is filtered by exact binomial, Research Grade, and dates. Requests fetch no more than 200 results/taxon and label larger result sets as **sampled/lower bounds**, never complete counts. Missing one feed suppresses regional counts. API returns only aggregate species totals, coarse 7-day bins, and privacy-screened nine-region summaries. No observation IDs, users, individual dates, coordinates, notes, or photos are exposed. Open and non-obscured coordinates can be used inside the server to assign a coarse region; obscured/private observations are eligible for state-wide aggregation but are not region-attributed. A region count needs >=3 observations and >=2 distinct observers before display. Region polygons are approximations; do not represent crossing, vernal pool, or observed density locations. Counts follow observer effort and time spent photographing wildlife, so they cannot estimate abundance or migration intensity.

2. **Independent institutional movement reports**, which can qualify as *source-reviewed migration activity* only after a person checks the public first-party institutional source explicitly documenting movement and records an already-coarse Michigan region/date. The review ledger is `data/salamander-migration-reports.json`, initially **[]**. No predictions or iNaturalist sightings can write into this ledger. Reviewers must confirm: evidence is an observed mass movement/crossing (not predicted), the source is authoritative and publicly available, the observed date is supported, the region is general, summary contains no breeding location, no street/pool names, GPS, observer personal identifiers or directions to site, and the URL points to the organization rather than an individual observation detail. Minimal schema:

```json
{
  "type": "migration_observed",
  "regionId": "central-up",
  "observedOn": "YYYY-MM-DD",
  "reviewedOn": "YYYY-MM-DD",
  "organization": "Public institution or conservation group",
  "summary": "At least 25 characters of coarse non-geolocating review summary.",
  "sourceUrl": "https://approved-institution.example/statement"
}
```

Use an approved institutional hostname per code allowlist. Public movement reports are currently **zero** until vetted and committed. Site shows a factual empty state rather than fabricated counts.

## Safety, UX and failure gates

- Off-season state does not fetch observation data or assert recent activity. Confirmed historical events, if any, must use a clearly labelled dated archive, not an activity banner.
- Research Grade sightings do not affect predictive Big Night weather fit; remain an independent data layer.
- If iNaturalist is down, return explicit data unavailable without suppressing NWS/ACIS weather boards.
- Sampling, small sample sizes, multi-species outliers, regional uncertainty and source dates must be visible.
- Public view links go to the general Michigan species search, not individual observation links.
- Source: https://help.inaturalist.org/en/support/solutions/articles/151000169936-what-is-the-data-quality-assessment-dqa-and-how-do-observations-qualify-to-become-research-grade-
- Geoprivacy: https://help.inaturalist.org/en/support/solutions/articles/151000169938-what-is-geoprivacy-what-does-it-mean-for-an-observation-to-be-obscured-
- API recommendations: https://www.inaturalist.org/pages/api+recommended+practices
