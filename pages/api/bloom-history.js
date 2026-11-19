import COMMITTED from '../../data/bloom-observation-history.json';
import { readBloomObservationHistory, mergeObservationHistory } from '../../lib/bloom/history-store.mjs';
import { buildBloomHistoryDesk } from '../../lib/bloom/field-history.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET only' });
  }

  let records = COMMITTED;
  let source = 'committed verified archive';
  try {
    // The GitHub-backed store contains new, source-reviewed observations without
    // requiring a Vercel rebuild. The committed file is a documented fallback.
    const latest = await readBloomObservationHistory();
    if (latest.ok && latest.configured) {
      records = mergeObservationHistory(COMMITTED, latest.value);
      source = 'live versioned observation archive';
    } else if (latest.configured) {
      source = 'committed archive; live history temporarily unavailable';
    }
  } catch {
    source = 'committed archive; live history temporarily unavailable';
  }

  const desk = buildBloomHistoryDesk(records, { archiveSource: source });
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
  return res.status(200).json(desk);
}
