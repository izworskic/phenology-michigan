import overrides from '../../data/bloom-observation-overrides.json';
import { buildBloomObservationSnapshot } from '../../lib/bloom/snapshot.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const snapshot = await buildBloomObservationSnapshot({ overrides, fetchImpl: fetch, now: new Date() });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(snapshot);
  } catch (error) {
    return res.status(503).json({
      error: 'Bloom observation snapshot unavailable',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
