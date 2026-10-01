const DAY_MS = 86_400_000;

export const BLOOM_SEASON_STATES = Object.freeze({
  OFF_SEASON: 'OFF_SEASON',
  WATCHING: 'WATCHING',
  APPROACHING: 'APPROACHING',
  ACTIVE: 'ACTIVE',
  FADING: 'FADING',
  DONE: 'DONE',
});

// These are deliberately broad trip-planning windows, not predicted peak dates.
// Live observations always outrank these windows once the season starts.
export const BLOOM_PLANNING_WINDOWS = Object.freeze({
  'meijer-gardens-cherries': Object.freeze({
    start: [4, 5], end: [5, 5], watchLeadDays: 24,
    shortLabel: 'Early April', windowLabel: 'April into early May',
    mapLabel: 'Early April · Grand Rapids', order: 1,
    sourceLabel: 'Frederik Meijer Gardens blossom tracker',
    sourceUrl: 'https://www.meijergardens.org/blossoms/',
  }),
  'holland-tulips': Object.freeze({
    start: [4, 15], end: [5, 20], watchLeadDays: 28,
    shortLabel: 'Late April into May', windowLabel: 'late April into May',
    mapLabel: 'Late April into May · Holland', order: 2,
    sourceLabel: 'City of Holland Tulip Tracker',
    sourceUrl: 'https://www.cityofholland.com/1022/Tulip-Tracker',
  }),
  'traverse-city-cherries': Object.freeze({
    start: [5, 1], end: [5, 31], watchLeadDays: 28,
    shortLabel: 'May', windowLabel: 'May',
    mapLabel: 'May · Traverse City', order: 3,
    sourceLabel: 'Traverse City Tourism blossom tour',
    sourceUrl: 'https://www.traversecity.com/things-to-do/tours/cherry-blossom-tours/',
  }),
  'um-peony-garden': Object.freeze({
    start: [5, 10], end: [6, 22], watchLeadDays: 28,
    shortLabel: 'Late May into June', windowLabel: 'late May into June for the main herbaceous display',
    mapLabel: 'Late May into June · Ann Arbor', order: 4,
    sourceLabel: 'U-M Peony Garden visit guide',
    sourceUrl: 'https://mbgna.umich.edu/when-visit-peony-garden',
  }),
  'mackinac-lilacs': Object.freeze({
    start: [5, 25], end: [6, 28], watchLeadDays: 30,
    shortLabel: 'June', windowLabel: 'June',
    mapLabel: 'June · Mackinac Island', order: 5,
    sourceLabel: 'Mackinac Island Lilac Festival guide',
    sourceUrl: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/',
  }),
});

function detroitParts(dateLike = new Date()) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const row = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(row.year), month: Number(row.month), day: Number(row.day) };
}

function utcDay(year, month, day) {
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function dayNumber(parts) {
  return utcDay(parts.year, parts.month, parts.day);
}

function windowForYear(id, year) {
  const plan = BLOOM_PLANNING_WINDOWS[id];
  if (!plan) return null;
  return {
    ...plan,
    startDay: utcDay(year, plan.start[0], plan.start[1]),
    endDay: utcDay(year, plan.end[0], plan.end[1]),
  };
}

function globalSeasonBounds(year) {
  return {
    watchStart: utcDay(year, 3, 1),
    seasonEnd: utcDay(year, 7, 15),
  };
}

function currentLiveState(entry) {
  if (!entry?.decision || entry?.usable === false) return null;
  const hasLiveSignal = entry?.usable === true
    || Number.isFinite(Number(entry?.decision?.observationAgeDays))
    || Boolean(entry?.observation?.source);
  if (!hasLiveSignal) return null;
  const stage = String(entry.decision.currentStage || '').toUpperCase();
  const decision = String(entry.decision.decision || '').toUpperCase();
  if (stage === 'DONE') return BLOOM_SEASON_STATES.DONE;
  if (stage === 'FADING' || decision === 'LIMITED') return BLOOM_SEASON_STATES.FADING;
  if (['PEAK', 'NEAR_PEAK', 'BUILDING'].includes(stage) || ['GO', 'GO_BEFORE'].includes(decision)) return BLOOM_SEASON_STATES.ACTIVE;
  if (stage === 'EMERGING' || decision === 'WAIT') return BLOOM_SEASON_STATES.APPROACHING;
  return null;
}

export function destinationSeasonState(entry, now = new Date()) {
  const id = entry?.id || entry?.destinationId || entry?.decision?.destinationId;
  const parts = detroitParts(now);
  const today = dayNumber(parts);
  const bounds = globalSeasonBounds(parts.year);
  const plan = windowForYear(id, parts.year);
  if (!plan) return { state: BLOOM_SEASON_STATES.OFF_SEASON, plan: null, daysUntilWindow: null };

  // Never let a banked spring snapshot masquerade as current bloom in autumn/winter.
  if (today < bounds.watchStart || today > bounds.seasonEnd) {
    const nextYear = today > bounds.seasonEnd ? parts.year + 1 : parts.year;
    const next = windowForYear(id, nextYear);
    return {
      state: BLOOM_SEASON_STATES.OFF_SEASON,
      plan: next,
      daysUntilWindow: Math.max(0, next.startDay - today),
    };
  }

  const liveState = currentLiveState(entry);
  if (liveState) return { state: liveState, plan, daysUntilWindow: Math.max(0, plan.startDay - today) };

  if (today > plan.endDay + 10) return { state: BLOOM_SEASON_STATES.DONE, plan, daysUntilWindow: null };
  if (today >= plan.startDay && today <= plan.endDay + 10) {
    return { state: BLOOM_SEASON_STATES.WATCHING, plan, daysUntilWindow: 0 };
  }
  const daysUntilWindow = plan.startDay - today;
  if (daysUntilWindow <= plan.watchLeadDays) {
    return { state: BLOOM_SEASON_STATES.WATCHING, plan, daysUntilWindow };
  }
  return { state: BLOOM_SEASON_STATES.OFF_SEASON, plan, daysUntilWindow };
}

function orderedDestinations(destinations = [], now = new Date()) {
  return destinations
    .map((entry) => ({ entry, ...destinationSeasonState(entry, now) }))
    .sort((a, b) => (a.plan?.order || 99) - (b.plan?.order || 99));
}

function offSeasonStory(nextYear) {
  return {
    eyebrow: 'Off season',
    title: 'The flowers are quiet. Michigan’s bloom season returns in waves.',
    text: 'Different displays wake up on different clocks: garden cherries and Holland tulips first, Traverse City orchard bloom next, then peonies and Mackinac lilacs. The map shows that sequence so you can see what comes next instead of treating Michigan as one statewide peak.',
    note: `Planning view for spring ${nextYear}. Timing windows are context, not current bloom evidence.`,
  };
}

export function buildBloomSeasonContext(destinations = [], now = new Date()) {
  const parts = detroitParts(now);
  const today = dayNumber(parts);
  const bounds = globalSeasonBounds(parts.year);
  const items = orderedDestinations(destinations, now);
  const states = items.map((item) => item.state);

  let phase;
  if (today < bounds.watchStart || today > bounds.seasonEnd) phase = BLOOM_SEASON_STATES.OFF_SEASON;
  else if (states.includes(BLOOM_SEASON_STATES.ACTIVE)) phase = BLOOM_SEASON_STATES.ACTIVE;
  else if (states.includes(BLOOM_SEASON_STATES.APPROACHING)) phase = BLOOM_SEASON_STATES.APPROACHING;
  else if (states.includes(BLOOM_SEASON_STATES.WATCHING)) phase = BLOOM_SEASON_STATES.WATCHING;
  else if (states.includes(BLOOM_SEASON_STATES.FADING)) phase = BLOOM_SEASON_STATES.FADING;
  else phase = BLOOM_SEASON_STATES.DONE;

  const nextCandidates = items.filter((item) => [BLOOM_SEASON_STATES.WATCHING, BLOOM_SEASON_STATES.APPROACHING, BLOOM_SEASON_STATES.ACTIVE].includes(item.state));
  const next = nextCandidates[0] || items.find((item) => item.daysUntilWindow != null && item.daysUntilWindow >= 0) || items[0] || null;
  const nextYear = today > bounds.seasonEnd ? parts.year + 1 : parts.year;

  const copy = phase === BLOOM_SEASON_STATES.OFF_SEASON ? offSeasonStory(nextYear)
    : phase === BLOOM_SEASON_STATES.WATCHING ? {
      eyebrow: 'Watching spring',
      title: 'The bloom season is getting close.',
      text: next?.entry?.name
        ? `${next.entry.name} is entering its planning window soon. We are watching for fresh on-the-ground evidence before turning a typical spring window into a trip recommendation.`
        : 'Michigan bloom season is nearing, but a live trip call still needs fresh on-the-ground evidence.',
      note: 'Seasonal timing tells us where to watch. Observations decide whether to go.',
    }
    : phase === BLOOM_SEASON_STATES.APPROACHING ? {
      eyebrow: 'Season approaching',
      title: 'The first displays are beginning to wake up.',
      text: 'Fresh evidence is starting to replace the calendar. Watch the individual destinations for the first places that cross from emerging into a trip-worthy display.',
      note: 'Live observations now outrank the typical seasonal windows.',
    }
    : phase === BLOOM_SEASON_STATES.ACTIVE ? {
      eyebrow: 'Bloom season is on',
      title: 'Michigan’s bloom season is unfolding place by place.',
      text: 'The useful question is no longer when spring usually happens. It is where the strongest display is now, what weather may change it, and which place earns the drive.',
      note: 'Rankings are based on fresh bloom evidence and short-range durability, not the calendar.',
    }
    : phase === BLOOM_SEASON_STATES.FADING ? {
      eyebrow: 'Season winding down',
      title: 'The bloom run is closing, but the last good windows still matter.',
      text: 'Some displays are fading while later northern or long-lived displays may still be worth the trip. The tracker will keep current evidence ahead of seasonal expectations.',
      note: 'Fading is a real trip answer, not a reason to stretch the season.',
    }
    : {
      eyebrow: 'Season complete',
      title: 'This spring bloom run is effectively over.',
      text: 'The tracker is shifting back to planning context until Michigan starts the sequence again next spring.',
      note: 'No stale spring observation is promoted as a current trip recommendation.',
    };

  return {
    phase,
    generatedFor: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    copy,
    next: next ? {
      destinationId: next.entry?.id || next.entry?.destinationId || next.entry?.decision?.destinationId || null,
      name: next.entry?.name || next.entry?.decision?.destinationName || null,
      state: next.state,
      windowLabel: next.plan?.windowLabel || null,
      shortLabel: next.plan?.shortLabel || null,
      daysUntilWindow: next.daysUntilWindow,
    } : null,
    items: items.map((item) => ({
      destinationId: item.entry?.id || item.entry?.destinationId || item.entry?.decision?.destinationId || null,
      name: item.entry?.name || item.entry?.decision?.destinationName || null,
      state: item.state,
      windowLabel: item.plan?.windowLabel || null,
      shortLabel: item.plan?.shortLabel || null,
      mapLabel: item.plan?.mapLabel || null,
      order: item.plan?.order || null,
      daysUntilWindow: item.daysUntilWindow,
      sourceLabel: item.plan?.sourceLabel || null,
      sourceUrl: item.plan?.sourceUrl || null,
    })),
    map: {
      mode: phase === BLOOM_SEASON_STATES.OFF_SEASON || phase === BLOOM_SEASON_STATES.WATCHING ? 'SEASONAL_SEQUENCE' : 'LIVE_BLOOM',
      title: phase === BLOOM_SEASON_STATES.OFF_SEASON || phase === BLOOM_SEASON_STATES.WATCHING
        ? 'How Michigan’s bloom season unfolds'
        : 'Where is the strongest bloom right now?',
      intro: phase === BLOOM_SEASON_STATES.OFF_SEASON || phase === BLOOM_SEASON_STATES.WATCHING
        ? 'This is timing plus place, not a claim that flowers are blooming now. Follow the sequence from early spring into June to see which destinations usually wake up first and which carry color later.'
        : 'Read the map as a moving bloom season, not a directory. Bright color shows the strongest current display; quieter markers show what is building, fading, or still uncertain.',
    },
  };
}

export function seasonalItemFor(context, destinationId) {
  return context?.items?.find((item) => item.destinationId === destinationId) || null;
}
