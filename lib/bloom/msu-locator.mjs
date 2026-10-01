const DEFAULT_LISTING_ORIGIN = 'https://msu-prod.dotcmscloud.com';
const MONTHS = Object.freeze({
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
});

function absoluteUrl(href, origin = DEFAULT_LISTING_ORIGIN) {
  try { return new URL(href, origin).toString(); } catch { return null; }
}

export function parseNorthwestMichiganFruitUpdateDate(url) {
  const pathname = (() => { try { return new URL(url).pathname; } catch { return String(url || ''); } })();
  const match = pathname.match(/northwest-michigan-fruit-update-([a-z]+)-(\d{1,2})-(20\d{2})/i);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  const date = new Date(Date.UTC(year, month, day, 16, 0, 0));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day || date.getUTCFullYear() !== year) return null;
  return date;
}

export function extractNorthwestMichiganFruitUpdateLinks(html, origin = DEFAULT_LISTING_ORIGIN) {
  const found = new Map();
  const source = String(html || '');
  const re = /href=["']([^"']*\/news\/northwest-michigan-fruit-update-[^"'#?]+)["']/gi;
  let match;
  while ((match = re.exec(source)) !== null) {
    const url = absoluteUrl(match[1], origin);
    const publishedAt = url ? parseNorthwestMichiganFruitUpdateDate(url) : null;
    if (!url || !publishedAt) continue;
    found.set(url, { url, publishedAt: publishedAt.toISOString() });
  }
  return [...found.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

function listingUrl(page, origin = DEFAULT_LISTING_ORIGIN) {
  const params = new URLSearchParams({
    contentTypeOption: 'Article',
    hideHomePage: '',
    page: String(page),
    siteContext: '',
    tag: 'fruit ',
    tagUsage: 'or',
  });
  return `${origin}/fruit/news?${params.toString()}`;
}

export async function locateLatestNorthwestMichiganFruitUpdate({
  now = new Date(),
  fetchImpl = fetch,
  origin = DEFAULT_LISTING_ORIGIN,
  maxPages = 6,
  seasonYear = now.getFullYear(),
} = {}) {
  const diagnostics = [];
  const candidates = new Map();

  for (let page = 1; page <= maxPages; page += 1) {
    const url = listingUrl(page, origin);
    let response;
    try {
      response = await fetchImpl(url, { headers: { 'User-Agent': 'michigan-bloom-tracker/1.0 (chrisizworski.com)' } });
    } catch (error) {
      diagnostics.push({ page, url, status: 'fetch_failed', error: error instanceof Error ? error.message : String(error) });
      continue;
    }
    if (!response.ok) {
      diagnostics.push({ page, url, status: `http_${response.status}` });
      continue;
    }
    const html = await response.text();
    const links = extractNorthwestMichiganFruitUpdateLinks(html, origin);
    diagnostics.push({ page, url, status: 'ok', candidates: links.length });
    for (const candidate of links) {
      const published = new Date(candidate.publishedAt);
      if (published.getFullYear() !== seasonYear) continue;
      if (published.getTime() > now.getTime() + 6 * 3600000) continue;
      candidates.set(candidate.url, candidate);
    }
    if (candidates.size && page >= 2) break;
  }

  const sorted = [...candidates.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return {
    ok: Boolean(sorted[0]),
    article: sorted[0] || null,
    diagnostics,
    candidates: sorted,
  };
}
