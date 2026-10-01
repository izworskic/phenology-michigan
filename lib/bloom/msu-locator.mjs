const MSU_FRUIT_NEWS = 'https://msu-prod.dotcms.cloud/fruit/news';
const UPDATE_TITLE_RE = /^Northwest Michigan fruit update\s*[–—-]\s*(.+)$/i;

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—');
}

function stripTags(html) {
  return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseTitleDate(title) {
  const match = String(title || '').match(UPDATE_TITLE_RE);
  if (!match) return null;
  const parsed = new Date(`${match[1]} 12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function absoluteUrl(href) {
  try {
    return new URL(href, MSU_FRUIT_NEWS).toString();
  } catch {
    return null;
  }
}

export function parseMsuFruitNewsIndex(html) {
  const candidates = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRe.exec(String(html || ''))) !== null) {
    const title = stripTags(match[2]);
    if (!UPDATE_TITLE_RE.test(title)) continue;
    const publishedAt = parseTitleDate(title);
    const url = absoluteUrl(match[1]);
    if (!publishedAt || !url) continue;
    candidates.push({ title, url, publishedAt: publishedAt.toISOString() });
  }

  const seen = new Set();
  return candidates
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function locateLatestMsuNorthwestFruitUpdate({
  fetchImpl = fetch,
  now = new Date(),
  maxPages = 12,
} = {}) {
  const cutoff = now.getTime() + 86400000;
  const diagnostics = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(MSU_FRUIT_NEWS);
    url.searchParams.set('contentTypeOption', 'Article');
    url.searchParams.set('page', String(page));

    let response;
    try {
      response = await fetchImpl(url.toString(), {
        headers: { 'User-Agent': 'michigan-bloom-tracker/1.0 (chrisizworski.com)' },
      });
    } catch (error) {
      diagnostics.push({ page, diagnostic: 'fetch_failed', error: error instanceof Error ? error.message : String(error) });
      continue;
    }

    if (!response.ok) {
      diagnostics.push({ page, diagnostic: `http_${response.status}` });
      continue;
    }

    const html = await response.text();
    const candidates = parseMsuFruitNewsIndex(html)
      .filter((item) => new Date(item.publishedAt).getTime() <= cutoff);

    diagnostics.push({ page, diagnostic: candidates.length ? 'match_found' : 'no_match', matches: candidates.length });
    if (candidates.length) {
      return {
        ok: true,
        article: candidates[0],
        pagesScanned: page,
        diagnostics,
      };
    }
  }

  return {
    ok: false,
    article: null,
    pagesScanned: maxPages,
    diagnostic: 'northwest_michigan_update_not_found',
    diagnostics,
  };
}
