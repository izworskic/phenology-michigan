# Michigan Bloom Tracker — calibrated forecast model

## Frozen production version

`corrected-velocity-ridge-v1`

This model is intentionally small, transparent and observation-anchored. It predicts coarse stage progression over 3, 5 and 7 days from the current observed stage, recent observed stage velocity, destination family and archived/live weather features.

It is not a biological constant and it does not publish a probability of peak bloom.

## Feature vector

1. intercept
2. horizon / 7
3. recent observed stage velocity × horizon
4. current stage index / 5
5. cherry-family indicator
6. forecast GDD base 5C / 40
7. forecast GDD base 10C / 25
8. freeze hours / 24
9. precipitation mm / 25
10. maximum gust km/h / 60
11. hot hours >=27C / 24

The production coefficients are versioned in `lib/bloom/model.mjs`.

## Velocity correction before production freeze

The exploratory research harness contained an indexing error in its recent-velocity calculation: the transition feature remained zero until a series had four observations. The production implementation fixes the indexing and uses the actual recent transitions, with the most recent transition double-weighted when multiple transitions are available.

The model was fully rerun after this correction before the production coefficients were frozen.

## Corrected leave-one-year-out validation

Original three-target corpus: U-M Peony Garden, Meijer Gardens cherries and Northwest Michigan Montmorency cherries.

| Horizon | N | Within one stage | Exact stage | Mean stage error |
|---|---:|---:|---:|---:|
| 3 days | 14 | 100.0% | 42.9% | 0.571 |
| 5 days | 15 | 100.0% | 20.0% | 0.800 |
| 7 days | 16 | 100.0% | 37.5% | 0.625 |
| Overall | 45 | 100.0% | 33.3% | 0.667 |

The lower exact-stage accuracy after the correction is not treated as a defect. It reinforces the product decision to publish stage windows rather than fake point precision.

## Frozen external validation

The corrected model was then trained on the original 45 cases and tested without coefficient changes on the strict Holland tulip and Mackinac lilac cases.

| External set | N | Within one stage | Exact stage | Mean stage error |
|---|---:|---:|---:|---:|
| Holland tulips | 5 | 100.0% | 80.0% | 0.200 |
| Mackinac lilacs | 31 | 100.0% | 64.5% | 0.355 |
| Combined | 36 | 100.0% | 66.7% | 0.333 |

Holland and Mackinac did not enter coefficient fitting.

## Production interpretation

The point estimate obeys the hard physical split:

- pre-peak development cannot have a point state later than PEAK
- an observed PEAK cannot have a point state later than FADING

The published output is an uncertainty band around that point. At 5–7 days, the band is allowed to cross the PEAK boundary into a durability tail when the validated model says the display can plausibly pass through peak inside the forecast window. This is how the May 2026 Northwest Michigan cherry case is represented: the development point reaches PEAK, while the late-window range can include FADING.

The calibrated model only assigns `medium` automated durability risk. `high` or `severe` durability risk—and therefore an automatic `GO_BEFORE` decision—must come from a separately validated durability rule or trustworthy current-source evidence. This prevents the small historical durability sample from generating aggressive trip advice.

## Guardrails

- Current observation remains the anchor.
- Stale observations cap or suppress the decision in the decision engine.
- DORMANT is outside the calibrated state space and receives only low-confidence directional output.
- 6–7 day outputs remain ranges, never exact peak dates.
- Missing weather features fail closed.
- Model version and range provenance travel with every forecast window.
