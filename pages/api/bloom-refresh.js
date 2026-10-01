import bootstrapOverrides from '../../data/bloom-observation-overrides.json';
import { runBloomLiveCycle } from '../../lib/bloom/live-pipeline.mjs';

export default async function handler(req, res) {
  const auth = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const editorialAuthToken = req.headers['x-vercel-oidc-token']
      || process.env.VERCEL_OIDC_TOKEN
      || process.env.HARNESS_ACCESS_KEY
      || null;
    const result = await runBloomLiveCycle({
      now: new Date(),
      fetchImpl: fetch,
      bootstrapOverrides,
      persist: true,
      editorialAuthToken,
    });
    return res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Bloom refresh failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
