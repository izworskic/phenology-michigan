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


## v2: submit → human source review → durable movement archive

**Public form:** https://form.jotform.com/262884591479072
**Owner form editor:** https://www.jotform.com/build/262884591479072

The public-facing form is intentionally hosted in the site's connected Jotform workspace. Visitors submit a **broad Michigan region, observation date, event category and direct public evidence URL**. No name, email, phone, GPS, map point, files or precise crossing/pool details are required. The form response is NOT itself a documented migration event and is not auto-synchronized into any public site content. Submission records remain in the form service's private owner-accessible review inbox rather than being copied wholesale into this public GitHub repository.

**Publication procedure (owner only, explicit).**
1. Open the form's submissions and identify an alleged actual migration (not simply a salamander photographed). Read the original first-party institutional source, not merely the submission's narrative. The source must explicitly describe observed movement. Check event date, organization, broad region, and sensitivity.
2. Go to GitHub Actions → **Publish source-reviewed salamander migration evidence** → Run workflow. Enter the broad region ID, observed date, approved source URL, original organization, independently verified method, a short source excerpt that mentions actual movement (no site info) and a *non-geolocating* 25–240 character public summary. Check every owner/source/date/privacy attestation. No automatic approval exists.
3. A server-side-less source validator refuses unsupported URL hosts, malformed/future/non-spring dates, duplicates, missing attestation, weak original movement evidence, candidate details containing detectable coordinates/directions, invalid existing archives and records above capacity. Checks alone cannot reliably detect all sensitive detail: **human redaction is essential**.
4. The owner-only workflow reruns the full repository tests and build. It commits **only** \`data/salamander-migration-reports.json\` to main after success, triggering the existing Vercel deployment. No unreviewed submission becomes a public claim.
5. The reviewed report appears in the **historical evidence archive**, separate from current movement signals. Only a spring report observed within the most recent 21 days may appear under *Recent source-reviewed migration reports*. Thus October never displays an April event as migration "happening now."
6. The public API exposes only the generalized event date, broad region, organization and independently approved publicly available institutional link, plus derived archive counts. No form submissions, emails, exact coordinates, usernames, or original freeform reports are served.

The organization source allowlist is enforced in \`lib/salamander-observations.mjs\`. Legitimate new institutions must be explicitly inspected and added through code review rather than treated as verified by their domain alone. The Michigan Vernal Pools Partnership operates its **own** citizen science program; this tool is independent and has no partner commitment or data-sharing arrangement: https://mivernalpools.com/.

## Readiness to assess forecast accuracy

\`fieldEvidenceReadiness()\` reports years/regions/counts covered. Source-reviewed movement dates supply *positive-only* evidence. Lack of a report is **not a monitored negative night**. Reliable validation will require real standardized monitoring effort (including verified **no-movement** sampled nights), site privacy protections, adequate independent regional/seasonal coverage and held-out temporal evaluation before any claim that forecast levels predict probability or verified timing. The current predictor remains a **transparent editorial warm-rain/thaw heuristic**, not a calibrated forecast. Avoid retrofitting a threshold to a small set of high-visibility Big Nights.

## Cost & access

Jotform collects submission records in its existing workspace; this workflow adds no paid environmental API calls, no new data warehouse, no spam-prone public GitHub issues and no third-party webhook credentials. Review and publication are deliberately manual until durable source authentication and conservation review partnerships exist. Jotform plan submission limits may apply; no guarantee of unlimited intake is made. If form availability changes, disable the public CTA rather than silently dropping data.


## v3: completed repeat-survey monitoring (movement AND non-detection)

**Public retrospective monitoring log:** https://form.jotform.com/262892813306057
**Owner form editor:** https://www.jotform.com/build/262892813306057

This is a separate form from the existing institutional movement evidence submission. It is for documented **previously performed**, safe, authorized, repeatable monitoring only. This tool does not organize public night excursions, ask anyone to enter a road, reveal pools or seek out sensitive wildlife sites, and is not formally affiliated with Michigan Vernal Pools Partnership or the Vernal Pool Patrol.

### Why the model needs zero-encounter reports

A missing iNaturalist sighting or absent public migration report is **not** a zero. A reviewable *none encountered* observation must document a **completed** repeatable survey from known authorized monitoring habitat, with effort (20–180 minutes, 1–12 observers), broad region, species-relevant monitoring method, the start-of-evening date, and original public institutional evidence **explicitly describing the absence of observed movement or salamanders during that completed survey**. It does not prove animals were absent from the whole region, or even from the monitored site outside the survey interval. A brief sighting of one salamander does not by itself establish a migration-positive result. Mixed/unsafe/incomplete/unrepeatable reports remain candidates for editorial consideration only; do not publish as standardized labels.

### Editorial intake and archival policy

1. The public Jotform collects coarse location, outcome, effort, authorized repeated monitoring design, original institutional source and privacy attestation in the existing owner-accessible account. Jotform remains the owner-side private queue. No public webhook or auto-promotion is configured, and no submitter email/name/GPS/photo is requested.
2. Original institutional article/monitoring log must be independently opened and checked by the repository owner. The form submission is *not* its own evidence. Check outcome explicitly documented in original source, actual evening date, safe method, completion, repeated survey design, monitoring effort, program identity and privacy. No exact pool, crossing, route, coordinates, sensitive location, visitor name or on-page directional clues may be copied into publication.
3. GitHub Actions → **Publish reviewed salamander monitoring session** → Run workflow; choose region, evening date, movement seen vs. none encountered, method, completed effort, observers, approved original institutional URL, original excerpt, and all independent review attestation switches. The backend rejects missing checks, unsupported hostnames, ambiguous outcomes, dates outside Mar–May, insufficient effort, duplicate region+program+night+protocol and location-bearing details.
4. Full repository tests and site build must pass before the owner workflow commits only \`data/salamander-monitored-nights.json\` to \`main\`, triggering the existing Vercel production pipeline. An originally empty archive is **intentional**. Never seed fabricated zero or positive nights.
5. Server API serves **aggregate** reviewed sessions, zero encounters, observed movement, coverage years, sampled regions, observer-minutes and no specific nightly sites/URLs/observer identities. Never derive a regional negative label from a no-encounter session. Repeated surveys at individual habitats require independent sampling design; even multiple published zeros do not mean region-wide absence.
6. Existing \`data/salamander-migration-reports.json\` holds source-reviewed **positive-only public institutional movement reports**, and iNaturalist contains species sightings. These evidence classes remain distinct. \`fieldEvidenceReadiness\` now shows both ledgers without allowing positives-only cases to look like model calibration.

### What would be necessary for real prediction validation

Record the **forecast as issued before target night** (not reconstructed from hindsight), observation sampling design and repeated habitat protocols, zero-encounter effort and confirmed movement, sample selection and any opportunistic bias, and then evaluate on independent held-out seasons and sites with detection sensitivity. The new dashboard shows counts but **no predictive skill**. There is currently no archived, timestamped seven-night forecast history linked to monitored sessions. Even large records will not automatically declare the existing model calibrated.

### References

- Michigan Vernal Pools Partnership community-science monitoring: https://mivernalpools.com/
- Pool safety, hygiene and habitat protection: https://mivernalpools.com/menus/vp-management-and-protection-recommendations.html
- This tool is independent of the Partnership. Any actual participation or partner data arrangement requires explicit organization involvement, not just linking its website.


## v4: prospective frozen-as-issued seven-night forecasts

**Source of truth:** \`https://phenology.chrisizworski.com/api/salamanders\` (the same live NWS+ACIS assessment shown on the page).

**First eligible archive date:** the next spring date on which the GitHub Action actually runs (normally March 1, 2027; never backfill 2026 or earlier). Seasonal \`schedule\` is \`5 19 * 3-5 *\` UTC (14:05 EST before DST; 15:05 EDT after transition), which is *before* the site's 6 p.m.–3 a.m. Michigan migration-night window. GitHub Actions cron delivery is best-effort and may occasionally be delayed/skipped: **missing issue days stay missing**. \`workflow_dispatch\` can only take a fresh *same-day, before-6-p.m.* forecast and can never fill missed dates. Note the user-facing issue time comes from the live API's original \`generatedAt\`, while capture \`archivedAt\` is recorded independently. Reject stale API results over 90 minutes old, results from a different Michigan date, or any forecast generated after capture. Daily issues are append-only, one per Michigan calendar day; a repeat run never overwrites a previous forecast.

**Storage:** \`data/salamander-forecast-issues.json\` is an initially empty audited file in git. Each successfully captured issue contains issueDay, generatedAt, archivedAt, method tag, source URL, 6–9 complete forecast regions with station ID and seven dated nightly conditions each (original categorical forecast, temperature, precipitation chance, warm rainy hours, thaw-limit flag). Inadequate source coverage refuses capture; partial 6–8 of 9 records are explicitly flagged. Sensitive animal monitoring sites, source usernames, habitat GPS, visitor submissions, observations, and photos are not archived. A run fails closed rather than guessing missing regions or weather. Current archive capacity limit is 600 issued dates; after that, migrate by year through reviewed code rather than pruning/changing previous issues.

The scheduler executes full existing tests before capture, then fetches the live forecast once, freezes the response into the archive, and commits. Concurrent main changes are reconciled through git rebase and the test suite is rerun before push. Git history supplies the audit trail; "immutable" means the code refuses overwrite/reconstruction, not that repository administrators lack technical ability to edit history.

**Matching to reviewed standardized monitoring:**

- The first comparison is strictly **same-day issued forecast**, same **broad region**, same monitoring night, with \`unknown\` weather excluded. Later refreshed predictions or older multi-day forecasts are never substituted. Sessions reviewed later may still be compared with the earlier genuinely archived prediction.
- The UI and API expose *counts of aligned survey-night records* (and their reviewed movement vs. zero-encounter outcomes) and issued regional-forecast coverage only. No nightly monitored site or exact survey location is returned, and no confusion-matrix rates or "probability of migration" are claimed.
- A no-encounter session only means no salamander movement was observed during that standardized session; it cannot certify absence region-wide. Weather-fit \`strong/watch/dry\` classes are *not calibrated* and will stay so even if many archived forecast days exist, until representative survey effort, validated detection assumptions, independent years, holdout evaluation and confidence intervals are met.
- The daily forecast archive is separate from source-reviewed institutional positive-only migration reports and iNaturalist community species IDs.

**Ops:** GitHub Actions → *Archive salamander forecast as issued* permits same-day reruns, but will not backfill any prior date. Source reliability depends on the live NWS+ACIS endpoint being available and producing enough reliable regions. If the source is stale or an Action is missed, **the gap is preferable to a fabricated forecast**. The live spring tracker itself remains unaffected when archival capture fails. No extra paid data provider, token or database was added.
