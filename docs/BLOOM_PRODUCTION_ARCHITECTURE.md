# Michigan Bloom Tracker — production architecture

## Product boundary

Michigan Phenology remains the broad "what is the natural year doing?" product. Bloom Tracker is a separate visitor decision product: "Where is the best bloom now, what will be best this weekend, and should I drive there?"

The Phenology repository is used as shared science/data plumbing because it already contains Open-Meteo, growing-degree-day, USA-NPN, source and scheduled-refresh infrastructure. The public Bloom Tracker should keep its own canonical search/product surface.

## Production decision contract

Every destination result must be traceable through this chain:

1. destination registry
2. current authoritative observation
3. observation freshness and authority
4. display-potential gate
5. seasonal prior / phenology context
6. calibrated development forecast
7. calibrated durability forecast
8. uncertainty / confidence cap
9. consumer decision
10. provenance

### Consumer states

DORMANT → EMERGING → BUILDING → NEAR_PEAK → PEAK → FADING → DONE

The public interface should prefer ranges over exact stage claims when the horizon or display type makes exactness unjustified.

### Decisions

- GO
- GO_BEFORE
- WAIT
- LIMITED
- UNKNOWN

`UNKNOWN` is a valid and important production state. Missing or stale evidence must not be filled with a model guess.

## Hard gates

- `SEVERELY_REDUCED` display potential suppresses normal GO/PEAK language.
- A stale observation cannot produce a high-confidence trip recommendation.
- A pre-peak point forecast cannot skip through PEAK directly into FADING/DONE.
- Once PEAK is observed, durability is modeled separately; PEAK cannot jump directly to DONE.
- 6–7 day output is a stage/window range, not a precise peak date.
- `staggered_mixed` displays (Holland tulips, Mackinac lilacs) receive wider peak-duration ranges and stricter exact-stage limits.

## Initial production registry

1. Traverse City cherry blossoms — biological, zoned regional wave
2. Meijer Gardens cherry blossoms — biological
3. U-M Peony Garden — biological
4. Holland tulips — staggered mixed display
5. Mackinac Island lilacs — staggered mixed display

## Weather features already validated

The live weather adapter computes the same broad feature family used in the historical validation:

- GDD base 5C
- GDD base 10C
- mean/min/max temperature
- freeze/frost hours
- warm/hot hours
- precipitation
- maximum gust

Forecast windows: 3, 5 and 7 days.

## Observation adapter requirement

Observation adapters are deliberately not faked in the core. Each adapter must return:

- destination / zone
- observed stage
- observed timestamp
- display potential
- source name + URL
- source type / authority
- optional biological detail such as percent open or bud stage
- notes describing abnormal conditions

No adapter should silently convert an undated tourism statement into a current observation.

## Confidence

Confidence is constrained by the weakest material input. Observation age is a hard cap. Longer forecast horizons reduce the maximum publishable confidence. Source disagreements should degrade confidence rather than be averaged away.

## Next implementation slice

1. Build observation adapters for the five registry destinations.
2. Port the calibrated development/durability model behind the stable contract in `lib/bloom/engine.mjs`.
3. Produce one server-side aggregate snapshot every refresh cycle.
4. Only then build the mobile-first public Bloom Tracker surface around GO / WAIT / GO BEFORE.
