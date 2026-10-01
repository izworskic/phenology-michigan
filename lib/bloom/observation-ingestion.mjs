import { DISPLAY_POTENTIAL, isValidStage } from './contracts.mjs';
import { locateLatestMsuNorthwestFruitUpdate } from './msu-locator.mjs';
import { BLOOM_SOURCE_MODES } from './source-registry.mjs';
import { verifiedBloomSourceFor } from './verified-source-policy.mjs';

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const DATE_RE = new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2}),\\s+(20\\d{2})\\b`, 'g');

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—');
}

export function htmlToBloomText(html) {
  return decodeEntities(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:h1|h2|h3|h4|p|li|div|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function dateFromMatch(match) {
  const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]} 12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function extractLatestDatedBlock(text, now = new Date()) {
  const matches = [];
  DATE_RE.lastIndex = 0;
  let match;
  while ((match = DATE_RE.exec(text)) !== null) {
    const date = dateFromMatch(match);
    if (!date || date.getTime() > now.getTime() + 86400000) continue;
    matches.push({ index: match.index, end: DATE_RE.lastIndex, date, label: match[0] });
  }
  if (!matches.length) return null;
  matches.sort((a, b) => b.date - a.date || a.index - b.index);
  const latest = matches[0];
  const nextIndex = [...matches]
    .filter((m) => m.index > latest.index)
    .sort((a, b) => a.index - b.index)[0]?.index ?? text.length;
  return {
    observedAt: latest.date.toISOString(),
    dateLabel: latest.label,
    text: text.slice(latest.end, nextIndex).trim(),
  };
}

function percentBloom(text) {
  const m = text.match(/(?:about|at least|around|approximately)?\s*(\d{1,3})\s*%\s*(?:herbaceous\s+)?(?:peonies?\s+)?(?:in\s+)?bloom/i);
  return m ? Number(m[1]) : null;
}

function classifyPercent(pct) {
  if (pct == null) return null;
  if (pct >= 75) return 'PEAK';
  if (pct >= 40) return 'NEAR_PEAK';
  if (pct >= 8) return 'BUILDING';
  if (pct > 0) return 'EMERGING';
  return 'DORMANT';
}

function classifyPeony(text) {
  const lower = text.toLowerCase();
  if (/shifted into green foliage|season(?:'s| is) (?:over|finished)|largely past bloom/.test(lower)) return 'DONE';
  if (/past peak|beginning to fade|lose petals|petals dropping|weathering/.test(lower)) return 'FADING';
  if (/at peak bloom|we are at peak|most of the garden is in bloom|thousands of flowers are now open/.test(lower)) return 'PEAK';
  if (/rapidly nearing peak|at least half/.test(lower)) return 'NEAR_PEAK';
  const pct = percentBloom(text);
  const pctStage = classifyPercent(pct);
  if (pctStage) return pctStage;
  if (/first bloom is open|starting to pop open|few herbaceous.*bloom|beginning to open|first .* buds|pushing up|out of the ground/.test(lower)) return 'EMERGING';
  return null;
}

function classifyMeijerCherry(text) {
  const lower = text.toLowerCase();
  if (/past peak|most .* dropping|petal fall|dropping their flowers/.test(lower) && !/entering peak|at peak/.test(lower)) return 'FADING';
  if (/entering peak|at peak|peak bloom|full bloom/.test(lower)) return 'PEAK';
  if (/50%|half.*bloom|near(?:ing)? peak/.test(lower)) return 'NEAR_PEAK';
  if (/blooming|open blossoms|stage 5/.test(lower)) return 'BUILDING';
  if (/buds|stage 3|stage 4|first bloom/.test(lower)) return 'EMERGING';
  return null;
}

function classifyMsuTartCherry(text) {
  const lower = text.toLowerCase();
  if (/montmorency[^.]{0,180}(?:\d+(?:\.\d+)?\s*(?:millimeters?|mm)|fruit (?:is|are) sizing|harvest|ripen|coloring)/.test(lower)
      || /(?:tart cherries|cherry)[^.]{0,120}(?:harvest|fruit sizing|beginning to color)/.test(lower)) return 'DONE';
  if (/montmorency[^.]{0,180}(?:full petal fall|petal fall)/.test(lower) || /tart cherry bloom so fast[^.]{0,180}petal fall/.test(lower)) return 'FADING';
  if (/montmorency[^.]{0,120}(?:100% bloom|full bloom)/.test(lower)) return 'PEAK';
  if (/montmorency[^.]{0,120}(?:50% bloom|75% bloom)/.test(lower)) return 'NEAR_PEAK';
  if (/montmorency[^.]{0,120}(?:first bloom|40% bloom|bloom)/.test(lower)) return 'BUILDING';
  if (/montmorency[^.]{0,120}(?:white bud|early white bud|late bud burst|green tip|bud swell)/.test(lower)) return 'EMERGING';
  return null;
}

export function classifyBloomText(parser, text) {
  if (parser === 'um_peony') return classifyPeony(text);
  if (parser === 'meijer_cherry') return classifyMeijerCherry(text);
  if (parser === 'msu_tart_cherry') return classifyMsuTartCherry(text);
  return null;
}

export function parseDatedTrackerObservation({ destinationId, source, html, now = new Date() }) {
  const text = htmlToBloomText(html);
  const block = extractLatestDatedBlock(text, now);
  if (!block) return { observation: null, diagnostic: 'no_explicit_observation_date' };
  const stage = classifyBloomText(source.parser, block.text);
  if (!stage) return { observation: null, diagnostic: 'dated_block_not_classifiable', block };
  return {
    observation: {
      destinationId,
      stage,
      observedAt: block.observedAt,
      displayPotential: DISPLAY_POTENTIAL.NORMAL,
      source: { id: source.id, name: source.name, url: source.url, authority: source.authority, mode: source.mode },
      evidenceText: block.text.slice(0, 500),
      ingestion: 'automatic_dated_source',
    },
    diagnostic: 'ok',
  };
}

export function parseDatedArticleObservation({ destinationId, source, text, observedAt }) {
  const date = new Date(observedAt);
  if (!Number.isFinite(date.getTime())) return { observation: null, diagnostic: 'article_observation_date_required' };
  const stage = classifyBloomText(source.parser, text);
  if (!stage) return { observation: null, diagnostic: 'article_not_classifiable' };
  return {
    observation: {
      destinationId,
      stage,
      observedAt: date.toISOString(),
      displayPotential: DISPLAY_POTENTIAL.NORMAL,
      source: { id: source.id, name: source.name, url: source.url, authority: source.authority, mode: source.mode },
      evidenceText: String(text).slice(0, 500),
      ingestion: 'automatic_dated_article',
    },
    diagnostic: 'ok',
  };
}

export function normalizeVerifiedOverride(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.destinationId || !isValidStage(raw.stage)) return null;
  const approvedSource = verifiedBloomSourceFor(raw.destinationId);
  if (!approvedSource) return null;
  const observedAt = new Date(raw.observedAt);
  const validThrough = new Date(raw.validThrough);
  if (!Number.isFinite(observedAt.getTime()) || !Number.isFinite(validThrough.getTime())) return null;
  if (observedAt.getTime() > now.getTime() + 3600000) return null;
  if (validThrough.getTime() < now.getTime()) return null;
  return {
    destinationId: raw.destinationId,
    zone: raw.zone || null,
    stage: raw.stage,
    observedAt: observedAt.toISOString(),
    validThrough: validThrough.toISOString(),
    displayPotential: raw.displayPotential || DISPLAY_POTENTIAL.NORMAL,
    source: {
      ...approvedSource,
      mode: BLOOM_SOURCE_MODES.VERIFIED_OVERRIDE,
    },
    evidenceText: raw.evidenceText || null,
    notes: raw.notes || null,
    ingestion: 'verified_override',
  };
}

function candidateScore(observation, now) {
  const authority = Number(observation.source?.authority || 0);
  const ageHours = Math.max(0, (now.getTime() - new Date(observation.observedAt).getTime()) / 3600000);
  return authority * 100 - ageHours;
}

export function selectBestObservation(destinationId, candidates, now = new Date()) {
  return (candidates || [])
    .filter((candidate) => candidate?.destinationId === destinationId && isValidStage(candidate.stage))
    .filter((candidate) => Number.isFinite(new Date(candidate.observedAt).getTime()))
    .sort((a, b) => candidateScore(b, now) - candidateScore(a, now))[0] || null;
}

async function fetchLocatedMsuObservation(destinationId, source, fetchImpl, now) {
  const located = await locateLatestMsuNorthwestFruitUpdate({ fetchImpl, now });
  if (!located.ok || !located.article) {
    return { observation: null, diagnostic: located.diagnostic || 'msu_article_not_found', locator: located };
  }

  const response = await fetchImpl(located.article.url, {
    headers: { 'User-Agent': 'michigan-bloom-tracker/1.0 (chrisizworski.com)' },
  });
  if (!response.ok) return { observation: null, diagnostic: `article_http_${response.status}`, locator: located };
  const html = await response.text();
  const articleSource = { ...source, url: located.article.url };
  const parsed = parseDatedArticleObservation({
    destinationId,
    source: articleSource,
    text: htmlToBloomText(html),
    observedAt: located.article.publishedAt,
  });
  return {
    ...parsed,
    locator: {
      pagesScanned: located.pagesScanned,
      article: located.article,
    },
  };
}

export async function fetchAutomaticObservation(destinationId, source, fetchImpl = fetch, now = new Date()) {
  if (!source) return { observation: null, diagnostic: 'source_missing' };

  if (source.mode === BLOOM_SOURCE_MODES.DATED_ARTICLE && source.locator === 'msu_nw_fruit_update') {
    return fetchLocatedMsuObservation(destinationId, source, fetchImpl, now);
  }

  if (!source.url || source.mode !== BLOOM_SOURCE_MODES.DATED_TRACKER) {
    return { observation: null, diagnostic: 'source_requires_locator_or_verified_override' };
  }
  const response = await fetchImpl(source.url, {
    headers: { 'User-Agent': 'michigan-bloom-tracker/1.0 (chrisizworski.com)' },
  });
  if (!response.ok) return { observation: null, diagnostic: `http_${response.status}` };
  const html = await response.text();
  return parseDatedTrackerObservation({ destinationId, source, html, now });
}
