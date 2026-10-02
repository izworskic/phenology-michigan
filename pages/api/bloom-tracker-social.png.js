import partA from '../../lib/bloom/social-card-a.mjs';
import partB from '../../lib/bloom/social-card-b.mjs';
import partC from '../../lib/bloom/social-card-c.mjs';

const IMAGE = Buffer.from(`${partA}${partB}${partC}`, 'base64');

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', String(IMAGE.length));
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(IMAGE);
}
