import bootstrapOverrides from '../../data/bloom-observation-overrides.json';
import { readBloomLatest } from '../../lib/bloom/history-store.mjs';
import { runBloomLiveCycle } from '../../lib/bloom/live-pipeline.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stored = await readBloomLatest({ fetchImpl: fetch });
    if (stored.ok && stored.value) {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ ...stored.value, delivery: 'persisted' });
    }

    const live = await runBloomLiveCycle({
      now: new Date(),
      fetchImpl: fetch,
      bootstrapOverrides,
      persist: false,
    });
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ ...live.latest, delivery: 'live_fallback' });
  } catch (error) {
    return res.status(503).json({
      error: 'Bloom latest snapshot unavailable',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
