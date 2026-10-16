# Trillium Field Evidence Program — Operating Manual

## What is operational

The site now has a **public field-report submission route** through GitHub Issues, an **owner-only manual publication action**, and a **permanent versioned site-observation archive**. No third-party paid scraper, database, new API key or email collection is needed.

- Intake: [Submit a Trillium field report](https://github.com/izworskic/phenology-michigan/issues/new?template=trillium-field-report.yml). Visitors must sign into a **free GitHub account**. Issue contents and reporter GitHub usernames are public; the site collects no separate account data.
- Editorial data store: `data/trillium-site-history.json`. Initially **zero** verified reports; never seed fictional examples into production.
- Public read-only endpoint: `/api/trillium-site-history` and `?site=trillium-trail`.
- User-facing UI: per-preserve reviewed-history timeline, source links, multi-year counters, reporting CTA, explanatory privacy and evidence requirements.
- Owner-only publisher: GitHub Actions **Publish reviewed trillium field evidence**, `workflow_dispatch`. A field report does not automatically promote itself to a live site status.

## Field report eligibility

1. The actual observation date is known and occurs between March 1 and July 15 in the year observed.
2. There is a direct **public, dated observation URL**, either a Michigan land-management agency/conservancy site from the approved domain list or an existing public iNaturalist observation URL.
3. A maintainer can **positively identify the exact named preserve** from the evidence: a manager's dated statement of a named site, clearly verified trail sign, or another independent on-site clue. The approximate map pin or “five kilometers from a point” **never establishes** preserve membership.
4. The observation shows `Trillium grandiflorum`, an appropriate phenology stage and a reproducible source. For iNaturalist, the live API check requires the exact observation ID and date, **research grade**, correct species, and an annotated flowering record. Peak/near-peak labels need explicit evidence of that site-wide stage, not one blossom.
5. The reviewer confirms stage, site membership, and source date and writes a positive, specific identity note. Generic land-manager nature guides without a dated on-site report must be rejected.
6. No individual plant GPS, sensitive access coordinates, visitor contact details, private names, photos or reporter identities are copied into the site archive. The GitHub issue itself is already public, so submissions must avoid such material.

## How the editor publishes a valid report

1. Open the visitor's **[Trillium field report]** GitHub Issue and independently inspect its source link, exact preserve, observation date, species and flower stage. Do not copy a reporter's unverifiable claim into the archive.
2. In the repo Actions tab select **Publish reviewed trillium field evidence** → Run workflow. The workflow **requires the repo owner account** (`github.actor === github.repository_owner`).
3. Enter the GitHub issue number, stage **you verified**, and a written statement identifying **what in the evidence confirms this preserve** (at least 24 characters). For iNaturalist, check the explicit annotation/location checkbox after your review. Peak/near-peak cases require a separate source-specific peak justification.
4. The action fetches the actual issue body, checks that it is an open field-report intake, verifies all dates/domains/field lengths, and rechecks matching species/flower annotation from iNaturalist when applicable. Then it rejects duplicate source links/issue numbers and appends only approved, sanitized evidence to `data/trillium-site-history.json`.
5. It runs all site tests and a Next.js build **before pushing** the versioned archive to `main`. GitHub/Vercel deploy the change automatically. If checks, access, or upstream evidence fail, **nothing publishes**.
6. Close the handled issue manually with an explanation and link to the updated site. No automation is triggered by opening an issue or submitting the form.

If an approved entry is later found to be in error, revert or correct its **JSON archive commit** through GitHub and run the normal tests. Do not hide uncertainty or quietly overwrite observation dates.

## Fresh site status versus independent historical evidence

The permanent archive survives year to year. A submitted and approved record enters the site **history** immediately. Only a dated record observed and reviewed within the **last seven Michigan calendar days** can support a current on-site signal during the March–June tracking period. Older accepted reports display only as *historical evidence*, never “blooming now.”

Nearby iNaturalist observations remain separate in the map and state the five-kilometer uncertainty. Weather models, forest/microclimate classifications, and regional timing bands **cannot promote themselves** to a site-confirmed flower report.

## Why this is a prerequisite, not a calibrated prediction

A site with one recent observation still has only one dated observation. Seasonal flowering can have many days of open blossoms and reporting dates are observer-dependent. Three or more spring years with actual linked flowering evidence is only an **exploratory coverage milestone**, not a sufficient calibration or causal result.

Before making preserve-level days-to-bloom predictions, require independent source records spanning several years, weather observations and leave-one-year-out testing against a calendar-only site baseline. Prevent source duplicates, assess observer coverage, report held-out date errors, and *withhold the proposed forecast if the weather model does not improve timing*. No validation loss/accuracy is claimed from an empty archive.

## Budget and access

GitHub Issues and Actions run within the repository's plan and quota, and GitHub Actions writes to the already connected public repo using its ephemeral repository token. This is not a service promise of unlimited free capacity. No paid Context.dev/other scraping requests are consumed by this workflow. Existing live Open-Meteo and iNaturalist endpoints remain as before. Real publication awaits independent field submissions **and owner review**.

Automated checks: `npm test` includes `scripts/check-trillium-site-history.mjs`, which exercises review validation, duplicate/replay rejection, source URL allowlists, iNaturalist species/flower annotations, archive summaries, and seven-day live expiry.
