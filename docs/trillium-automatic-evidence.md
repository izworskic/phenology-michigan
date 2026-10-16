# Automatic Trillium Bloom Evidence — Native Form

## What visitors use
**https://phenology.chrisizworski.com/michigan-trillium#tri-direct-report**

A native on-page form collects just a destination selection, a publicly accessible iNaturalist observation URL and a privacy acknowledgment. No account, photo upload, GPS entry, email address, or GitHub/Jotform login. Visitor provides no date or plant stage; those come from the source record.

## Automatic process
1. A same-origin JSON POST reaches `/api/trillium-source-report` (2 KB body limit). Invalid/unrecognized input, unsupported destination, non-iNaturalist links, a failed consent, or submissions from other origins are refused.
2. The site retrieves the **exact numeric iNaturalist observation ID**, rather than arbitrary URLs. The endpoint URL cannot be used to fetch other hosts.
3. The record must be **research grade**, species **Trillium grandiflorum**, have flowering phenotype annotation `term_id=12`, `term_value_id=13`, a real observed-on date between **March 1–July 15** of a year 2019 onward and not in the future, and include iNaturalist's Michigan place ID 29.
4. An accepted source is archived automatically via the pre-existing encrypted server-side `GH_TOKEN` to `data/trillium-automatic-reports.json`. GitHub contents SHA compare/retry prevents lost concurrent writes. One iNaturalist observation link can be counted only once across any preserve; duplicates are idempotent. Hard caps: 30 records/day and 250 records/archive pending future storage scaling.
5. The archived record contains no human-submitted description, visitor name, email, raw coordinates or image. Only a canonical public source URL, destination selected, observation date, stage = FLOWERING, and two distinct statuses: `species_date_flowering_checked` and `unverified_site`.
6. GitHub triggers the usual Vercel production deployment, so accepted evidence becomes visible without owner review in `/api/trillium-auto-reports` and the site's source-screened list. A failed source check or repository write never returns a success response.
7. The bloom-verified site ledger and seven-day current status remain **unmodified**. The record only establishes species and flowering at a Michigan iNaturalist observation. Visitors can choose any listed preserve, so **automated screening does not establish that the plant was physically inside that preserve**. Never call this “trilliums blooming now at the preserve” or feed it as preserve training truth.

## Legacy Jotform and independent site verification
The older Jotform https://form.jotform.com/262882681844066 still accepts sources that cannot be verified by this source-only automated route, such as a land-manager announcement or budding stage. The connected Jotform editing app could not programmatically enable its webhook integration, so **do not claim Jotform submissions are currently automatically ingested**. The secured webhook receiver `/api/trillium-autosubmit` is deployed for later Jotform Integration setup but not required for the fully automatic native form.

The separate `data/trillium-site-history.json` is intentionally stricter. It is only populated by independent, site-specific editorial evidence. A source-checked observation from this program is not automatically promoted into the verified site ledger. The archive thus supports honest phenology research without publishing a false peak or on-site bloom.

## Test coverage and operations
Run `npm test` and `npm run build`. The dedicated `scripts/check-trillium-auto-intake.mjs` covers form parsing, malicious links, exact taxon and flowering annotations, date and season gates, duplicate protection, privacy, and separate public-source status. The native form is under `components/TrilliumDirectReport.js`, source API is `pages/api/trillium-source-report.js`, and persistence is `lib/trillium-github-archive.mjs`.

Important: The production server's existing `GH_TOKEN` must have permission to update the repository content. Until a genuine qualifying visitor submission has been processed, the site tests and configuration demonstrate readiness, but not a witnessed end-to-end production write. Inspect Vercel server logs or GitHub commit history after the first real report to confirm the full path.
