import crypto from 'node:crypto';
import { getBloomExperience } from './experience-layer.mjs';
import { BLOOM_SEASON_STATES, seasonalItemFor } from './seasonal-context.mjs';
import { bloomJevDecide } from './jev-harness.mjs';

const WRITER_MODEL = process.env.BLOOM_WRITER_MODEL || 'claude-haiku-4-5-20251001';

export const BLOOM_EDITORIAL_TREATMENTS = Object.freeze({
  PLACE_IN_SEASON: 'Make the physical experience of this bloom destination vivid and specific without restating the trip score.',
  WHAT_TO_WATCH: 'Explain what change would move this destination from seasonal anticipation to a real bloom trip.',
  WHY_NOW: 'Explain why the verified bloom state deserves attention now and what a visitor will actually experience there.',
  BLOOM_WAVE: 'Explain the geographic bloom progression and how a visitor should use it to choose where to look.',
  WEATHER_WINDOW: 'Explain how the short weather/durability window changes the practical bloom experience and timing.',
  SEASONAL_CONTEXT: 'Translate broad seasonal timing into realistic expectations for this place without pretending the calendar proves current bloom.',
});

function safe(value, max = 800) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function fallbackTreatment(entry, seasonItem) {
  const decision = entry?.decision || {};
  if (decision.decision === 'GO_BEFORE') return 'WEATHER_WINDOW';
  if (Array.isArray(entry?.zoneStatus) && entry.zoneStatus.length > 1) return 'BLOOM_WAVE';
  if (seasonItem?.state === BLOOM_SEASON_STATES.ACTIVE) return 'WHY_NOW';
  if (seasonItem?.state === BLOOM_SEASON_STATES.APPROACHING || seasonItem?.state === BLOOM_SEASON_STATES.WATCHING) return 'WHAT_TO_WATCH';
  return 'PLACE_IN_SEASON';
}

function evidenceFor(entry, seasonContext) {
  const decision = entry?.decision || {};
  const experience = getBloomExperience(entry.id);
  const seasonItem = seasonalItemFor(seasonContext, entry.id);
  return {
    destination: {
      id: entry.id,
      name: entry.name,
      region: entry.region,
      seasonState: seasonItem?.state || null,
      typicalPlanningWindow: seasonItem?.windowLabel || null,
    },
    live: {
      usable: Boolean(entry.usable),
      decision: decision.decision || 'UNKNOWN',
      currentStage: decision.currentStage || null,
      confidence: decision.confidence || null,
      reason: safe(decision.reason, 600),
      observationAgeDays: decision.observationAgeDays ?? entry.observationAgeDays ?? null,
      source: decision.source ? { label: safe(decision.source.label || decision.source.name || decision.source.id, 160), url: decision.source.url || null } : null,
      forecast: Array.isArray(decision.forecast) ? decision.forecast.slice(0, 5) : [],
      zones: Array.isArray(entry.zoneStatus) ? entry.zoneStatus : [],
    },
    place: experience ? {
      headline: experience.headline,
      whatYouWillSee: experience.whatYouWillSee,
      bestExperience: experience.bestExperience,
      lookFor: experience.lookFor,
      source: experience.experienceSource,
    } : null,
    truthRules: [
      'Typical planning windows are context only and do not prove current bloom.',
      'File photos are place/flower references and do not prove current bloom.',
      'Only the live observation/decision fields may be described as current conditions.',
    ],
  };
}

function evidenceHash(evidence, phase) {
  return crypto.createHash('sha256').update(JSON.stringify({ phase, evidence })).digest('hex').slice(0, 20);
}

function treatmentBrief(treatment) {
  return {
    PLACE_IN_SEASON: 'Write 55 to 85 words that make this exact place tangible. Use the supplied physical setting, flower character and best way to move through the place. Give the reader a sense of scale, texture, color, fragrance only when supplied, and how the bloom sits in the landscape.',
    WHAT_TO_WATCH: 'Write 55 to 85 words that build anticipation without claiming bloom has arrived. Explain what this place becomes in season, the broad planning window, and the specific live evidence that still needs to appear before the calendar becomes a trip recommendation.',
    WHY_NOW: 'Write 55 to 90 words that connect the verified current bloom stage to the actual visitor experience. Lead with what is special about seeing this display at this stage, then give one concrete way to experience the place well.',
    BLOOM_WAVE: 'Write 60 to 95 words explaining the verified geographic progression. Make the movement across the landscape understandable and useful for choosing where to go. Never turn the progression into an invented ETA or exact peak date.',
    WEATHER_WINDOW: 'Write 55 to 90 words explaining why the display has a short-lived weather-sensitive window. Connect the verified durability risk to the experience without inventing damage, exact petal loss, or a future condition not in the evidence.',
    SEASONAL_CONTEXT: 'Write 55 to 85 words translating broad seasonal timing into a sense of place and anticipation. Be explicit that seasonal timing is a planning cue, not evidence that flowers are open now.',
  }[treatment] || '';
}

function editorialQuestion(entry, treatment) {
  const place = entry?.name || 'this destination';
  return {
    PLACE_IN_SEASON: `What makes the flower experience at ${place} different from merely knowing flowers exist there?`,
    WHAT_TO_WATCH: `What should someone picture about ${place} as its season nears, and what evidence would make it time to actually go?`,
    WHY_NOW: `Why does the verified bloom stage at ${place} matter to the experience right now?`,
    BLOOM_WAVE: `How is the bloom moving through ${place}, and how should a visitor use that geography?`,
    WEATHER_WINDOW: `How does the verified weather-sensitive window change when and how someone should experience ${place}?`,
    SEASONAL_CONTEXT: `Where does ${place} sit in Michigan's spring bloom sequence, without treating normal timing as current bloom evidence?`,
  }[treatment] || '';
}

async function chooseTreatment(entry, seasonContext, authToken) {
  const seasonItem = seasonalItemFor(seasonContext, entry.id);
  const fallbackId = fallbackTreatment(entry, seasonItem);
  const options = { ...BLOOM_EDITORIAL_TREATMENTS };
  if (!(Array.isArray(entry.zoneStatus) && entry.zoneStatus.length > 1)) delete options.BLOOM_WAVE;
  if (entry?.decision?.decision !== 'GO_BEFORE') delete options.WEATHER_WINDOW;
  if (seasonItem?.state === BLOOM_SEASON_STATES.ACTIVE) delete options.SEASONAL_CONTEXT;

  return bloomJevDecide({
    task: 'Choose the single additive editorial job for this Michigan Bloom Tracker destination. The deterministic bloom engine has already made the trip decision. Choose only what the writer should add so a person can feel the place and understand where it sits in the season.',
    options,
    context: {
      destination: entry.name,
      region: entry.region,
      seasonPhase: seasonContext?.phase || null,
      destinationSeasonState: seasonItem?.state || null,
      currentDecision: entry?.decision?.decision || 'UNKNOWN',
      currentStage: entry?.decision?.currentStage || null,
      hasGeographicProgression: Array.isArray(entry.zoneStatus) && entry.zoneStatus.length > 1,
    },
    constraints: [
      'Choose exactly one supplied treatment.',
      'Do not change or reinterpret the deterministic GO, WAIT, GO_BEFORE, LIMITED or UNKNOWN decision.',
      'Do not invent current bloom, a peak date, crowd level, access condition or weather outcome.',
      'Use BLOOM_WAVE only when zone-level progression is supplied.',
      'Use WEATHER_WINDOW only when the deterministic decision is GO_BEFORE.',
      'Use WHAT_TO_WATCH or SEASONAL_CONTEXT when the main value is anticipation rather than a current bloom claim.',
      'The writer receives only sealed supplied evidence after this choice.',
    ],
    evidence: [{ id: entry.id, source: 'sealed bloom candidate', text: JSON.stringify(evidenceFor(entry, seasonContext)) }],
    fallbackId,
    authToken,
    minConfidence: 0.55,
    timeoutMs: 2_700,
  });
}

function cleanDraft(text) {
  return safe(text, 1_200).replace(/\u2014/g, ', ').replace(/\s+/g, ' ').trim();
}

function deterministicDraft(entry, seasonContext, treatment) {
  const experience = getBloomExperience(entry.id);
  const seasonItem = seasonalItemFor(seasonContext, entry.id);
  const decision = entry?.decision || {};
  if (!experience) return null;
  if (treatment === 'WHAT_TO_WATCH' || treatment === 'SEASONAL_CONTEXT') {
    return `${experience.headline} ${seasonItem?.windowLabel ? `Its broad planning window is ${seasonItem.windowLabel}, but that is only the time to start watching.` : ''} Fresh on-the-ground evidence is what turns anticipation into a trip call.`.replace(/\s+/g, ' ').trim();
  }
  if (treatment === 'BLOOM_WAVE' && Array.isArray(entry.zoneStatus)) {
    return `${experience.headline} This display is a moving landscape, so one citywide peak date is less useful than the zone progression. Use the live south-to-north stages to find the part of the orchard country that is actually showing best, then experience it from public roads and pull-offs.`;
  }
  if (treatment === 'WEATHER_WINDOW') {
    return `${experience.headline} The bloom is worth attention now, but the verified durability risk makes timing part of the experience. Use the live trip window above first, then use the place itself the way it is meant to be seen: ${experience.bestExperience}`;
  }
  if (decision.currentStage) return `${experience.headline} ${experience.whatYouWillSee} ${experience.bestExperience}`;
  return `${experience.headline} ${experience.whatYouWillSee}`;
}

async function anthropicDraft({ evidence, treatment, question }) {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: 'ANTHROPIC_API_KEY not set' };
  const system = [
    'You write short editorial context for the Michigan Bloom Tracker.',
    'The bloom engine, not you, decides whether anyone should go. Your job is to make place and season understandable and vivid.',
    'Write with concrete sensory detail from the supplied evidence: landscape, flower form, color, scale, movement, fragrance only when explicitly supplied.',
    'Never invent an observation, bloom amount, exact peak date, crowd, access condition, forecast outcome, or current visual from a file photo.',
    'A typical planning window is not proof that flowers are open.',
    'Do not mention AI, models, prompts, scores, or the writing process.',
    'No hype, no tourism-brochure clichés, no exclamation marks, no em dashes.',
    'One paragraph only. Return only the paragraph.',
  ].join(' ');
  const prompt = [
    `Assigned editorial job: ${treatment}.`,
    `Brief: ${treatmentBrief(treatment)}`,
    `Question to answer: ${question}`,
    'Sealed evidence:',
    JSON.stringify(evidence),
  ].join('\n');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: WRITER_MODEL,
        max_tokens: 260,
        temperature: 0.45,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) return { ok: false, reason: `anthropic ${response.status}` };
    const payload = await response.json();
    const text = cleanDraft((payload.content || []).map((item) => item.text || '').join(' '));
    const words = text ? text.split(/\s+/).length : 0;
    if (!text || words < 35 || words > 120) return { ok: false, reason: `writer length ${words}` };
    return { ok: true, text, model: WRITER_MODEL, words };
  } catch (error) {
    return { ok: false, reason: safe(error instanceof Error ? error.message : error, 220) };
  }
}

function deterministicEvidenceGate(entry, seasonItem, draft) {
  if (!draft) return { ok: false, reason: 'empty draft' };
  const lower = draft.toLowerCase();
  const live = Boolean(entry?.usable);
  const stage = String(entry?.decision?.currentStage || '').toUpperCase();
  if (!live && /\b(now|right now|currently)\b/.test(lower) && /\b(bloom|flower|petal|display)\b/.test(lower)) {
    return { ok: false, reason: 'current bloom language without usable live evidence' };
  }
  if (!['PEAK', 'NEAR_PEAK'].includes(stage) && /\bat peak\b|\bpeak now\b|\bpeak bloom\b/.test(lower)) {
    return { ok: false, reason: 'unsupported peak claim' };
  }
  if (seasonItem?.state === BLOOM_SEASON_STATES.WATCHING && /\bflowers are open\b|\bis blooming\b|\bare blooming\b/.test(lower)) {
    return { ok: false, reason: 'calendar promoted into bloom observation' };
  }
  return { ok: true, reason: null };
}

async function reviewDraft(entry, seasonContext, treatment, evidence, draft, authToken) {
  const seasonItem = seasonalItemFor(seasonContext, entry.id);
  const gate = deterministicEvidenceGate(entry, seasonItem, draft);
  if (!gate.ok) return { accepted: false, mode: 'deterministic-evidence-gate', confidence: 1, reason: gate.reason };

  const result = await bloomJevDecide({
    task: 'Decide whether this Bloom Tracker paragraph earns space. ACCEPT only if it adds a vivid, useful sense of place or seasonal timing beyond the visible deterministic card and all factual claims stay inside the sealed evidence.',
    options: {
      ACCEPT: 'Specific, useful, evidence-grounded place/season writing that answers the assigned editorial job.',
      REJECT: 'Generic, repetitive, brochure-like, misleading about current bloom, or unsupported by the sealed evidence.',
    },
    context: { destination: entry.name, treatment, seasonPhase: seasonContext?.phase || null },
    constraints: [
      'Choose exactly ACCEPT or REJECT.',
      'Reject if a planning window is presented as proof of current bloom.',
      'Reject invented current conditions, peak dates, crowds, access, weather outcomes, or visual claims from a file photo.',
      'Reject generic travel encouragement that could describe another destination.',
      'Do not rewrite the paragraph.',
    ],
    evidence: [{ id: entry.id, source: 'sealed evidence plus draft', text: JSON.stringify({ evidence, draft }) }],
    fallbackId: 'REJECT',
    authToken,
    minConfidence: 0.58,
    timeoutMs: 2_700,
  });

  if (result.mode !== 'shared-harness-jev') {
    return { accepted: true, mode: 'deterministic-review-fallback', confidence: result.confidence || 0, reason: result.reason || 'JEV review unavailable; deterministic evidence gate passed.' };
  }
  return { accepted: result.choiceId === 'ACCEPT', mode: result.mode, confidence: result.confidence || 0, reason: result.reason || null };
}

async function buildOne(entry, seasonContext, previousItem, authToken) {
  const seasonItem = seasonalItemFor(seasonContext, entry.id);
  const evidence = evidenceFor(entry, seasonContext);
  const hash = evidenceHash(evidence, seasonContext?.phase);
  if (previousItem?.evidenceHash === hash && previousItem?.text) {
    return { ...previousItem, reused: true };
  }

  const choice = await chooseTreatment(entry, seasonContext, authToken);
  const treatment = BLOOM_EDITORIAL_TREATMENTS[choice.choiceId] ? choice.choiceId : fallbackTreatment(entry, seasonItem);
  const question = editorialQuestion(entry, treatment);
  const written = await anthropicDraft({ evidence, treatment, question });
  const fallback = deterministicDraft(entry, seasonContext, treatment);
  const candidateText = written.ok ? written.text : fallback;
  const review = await reviewDraft(entry, seasonContext, treatment, evidence, candidateText, authToken);
  const text = review.accepted ? candidateText : fallback;
  const finalGate = deterministicEvidenceGate(entry, seasonItem, text);

  return {
    destinationId: entry.id,
    treatment,
    text: finalGate.ok ? text : null,
    evidenceHash: hash,
    selectionMode: choice.mode,
    selectionConfidence: choice.confidence || 0,
    writerMode: written.ok ? 'haiku' : 'deterministic',
    writerModel: written.ok ? written.model : null,
    writerReason: written.ok ? null : written.reason,
    review,
    reused: false,
  };
}

export async function buildBloomEditorial({
  destinations = [],
  seasonContext,
  previousEditorial = null,
  authToken = null,
} = {}) {
  if (!seasonContext || [BLOOM_SEASON_STATES.OFF_SEASON, BLOOM_SEASON_STATES.DONE].includes(seasonContext.phase)) {
    return { mode: 'seasonal-copy-only', generatedAt: new Date().toISOString(), items: [] };
  }

  const relevant = destinations.filter((entry) => {
    const state = seasonalItemFor(seasonContext, entry.id)?.state;
    return [BLOOM_SEASON_STATES.WATCHING, BLOOM_SEASON_STATES.APPROACHING, BLOOM_SEASON_STATES.ACTIVE, BLOOM_SEASON_STATES.FADING].includes(state);
  });
  const prior = new Map((previousEditorial?.items || []).map((item) => [item.destinationId, item]));
  const items = await Promise.all(relevant.map((entry) => buildOne(entry, seasonContext, prior.get(entry.id), authToken)));
  const modes = new Set(items.map((item) => item.writerMode));
  return {
    mode: modes.size === 1 ? [...modes][0] : 'mixed',
    generatedAt: new Date().toISOString(),
    items,
  };
}
