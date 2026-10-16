# Michigan woodcock spring event refresh

## Purpose
The woodcock sky-dance tool has a site-owned scheduled GitHub Actions refresh for official spring walk dates. This is separate from the real-time NWS weather forecast (which already refreshes on page requests).

## Cadence and cost
`.github/workflows/woodcock-spring-events.yml` runs **every Tuesday in January–June at 13:27 UTC**, annually. It can also be started manually with a read-only dry run. It uses public organizer webpages and (where available) the Ruffed Grouse Society's public event JSON API. It requires no commercial search/scraping service, API key or paid credits. Each run has bounded event-link discovery, a size cap, timeouts and explicit source failures.

## Official source coverage
- Ruffed Grouse Society / American Woodcock Society: March, April, May calendar pages and their public events feed.
- Dahlem Environmental Education Center: monthly official event calendar.
- Little Traverse Conservancy: official event listing.
- Belle Isle Nature Center: official event listing.
- City of Portage Parks: official programs page.

This is an intentionally small allowlist. A source's inability to provide a current event date is displayed as *not announced*, not filled using a prior-year date.

## Publication rules
Only dated **March 1–June 15 Michigan woodcock viewing walks/sky dances** from the official organizer can enter `data/woodcock-spring-events.json`. The parser requires a 4-digit matching year, a spring date, a woodcock courtship-walk title, same-domain source link, and Michigan evidence for the national Ruffed Grouse Society calendar. General hunts, banquets, fundraisers, postponed/canceled titled events, older spring dates and out-of-state events are rejected.

A newly discovered organizer event not tied to a separately verified venue can appear as a dated event card, **but does not gain a guessed map pin**. Existing site parking, access hours and safety disclaimers remain independent; a listed event never authorizes an unscheduled night visit.

Every run writes the time sources were checked and their per-organizer status. If all organizers fail, the job aborts without overwriting the last successful dataset. If some fail, prior organizer-listed events from the same target year are retained temporarily and visitors are told to verify the linked organizer; past dates always disappear. This is intentionally *not* a comprehensive guaranteed event listing.

## Running an inspection
The GitHub Actions workflow has a **Run workflow** action, with `dry_run=true` by default. The `target_year` input is intended for inspecting historical fixtures in dry-run mode. Non-dry-run mode always publishes only the current or upcoming spring year.

Run `npm test` and `npm run build` after changes. The regression suite includes `scripts/check-woodcock-events.mjs`, which tests the date, Michigan, false-hunt, unverified-pin, broken-year and scheduler guards. Site updates deploy on Vercel after a GitHub Actions commit to main.

## Known limits
Event venues can change, registration can close, and organizer calendars may be temporarily unavailable. The visitor should always follow the event's original link to confirm registration, meeting point and nighttime access. No automatic change to historical site-specific access permissions is ever inferred.
