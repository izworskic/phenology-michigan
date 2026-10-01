import { DISPLAY_POTENTIAL } from '../../lib/bloom/contracts.mjs';
import { BLOOM_DESTINATIONS, getBloomDestination } from '../../lib/bloom/destinations.mjs';
import { readBloomOverrides } from '../../lib/bloom/history-store.mjs';
import { runBloomLiveCycle } from '../../lib/bloom/live-pipeline.mjs';
import { normalizeVerifiedOverride } from '../../lib/bloom/observation-ingestion.mjs';
import { removeBloomOverride, upsertBloomOverride } from '../../lib/bloom/operator-store.mjs';

function operatorSecret() {
  return process.env.BLOOM_OPERATOR_SECRET || process.env.CRON_SECRET || '';
}

function authorized(req) {
  const secret = operatorSecret();
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

function destinationMetadata() {
  return BLOOM_DESTINATIONS.map((d) => ({
    id: d.id,
    name: d.name,
    region: d.region,
    zones: d.zones,
    displayType: d.displayType,
  }));
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    const result = await readBloomOverrides({ fetchImpl: fetch });
    if (!result.ok) return res.status(503).json({ error: result.reason || 'override store unavailable' });
    return res.status(200).json({
      destinations: destinationMetadata(),
      observations: result.value?.observations || [],
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'upsert';
  const now = new Date();

  if (action === 'remove') {
    if (!getBloomDestination(body.destinationId)) return res.status(400).json({ error: 'unknown destination' });
    const write = await removeBloomOverride({ destinationId: body.destinationId, zone: body.zone || null }, { fetchImpl: fetch, now });
    if (!write.ok) return res.status(503).json({ error: write.reason || 'remove failed' });
    const cycle = await runBloomLiveCycle({ now, fetchImpl: fetch, persist: true });
    return res.status(cycle.ok ? 200 : 207).json({ ok: cycle.ok, action: 'remove', write, refresh: cycle.ok ? 'ok' : cycle.failures });
  }

  const destination = getBloomDestination(body.destinationId);
  if (!destination) return res.status(400).json({ error: 'unknown destination' });
  if (!Object.values(DISPLAY_POTENTIAL).includes(body.displayPotential || DISPLAY_POTENTIAL.NORMAL)) {
    return res.status(400).json({ error: 'invalid displayPotential' });
  }

  const observedAt = new Date(body.observedAt);
  const validThrough = new Date(body.validThrough);
  if (!Number.isFinite(observedAt.getTime()) || !Number.isFinite(validThrough.getTime()) || validThrough < observedAt) {
    return res.status(400).json({ error: 'observedAt and validThrough are required; validThrough must be after observedAt' });
  }

  const authority = Math.max(1, Math.min(100, Number(body.source?.authority || 95)));
  const normalized = normalizeVerifiedOverride({
    destinationId: destination.id,
    zone: body.zone || null,
    stage: body.stage,
    observedAt: observedAt.toISOString(),
    validThrough: validThrough.toISOString(),
    displayPotential: body.displayPotential || DISPLAY_POTENTIAL.NORMAL,
    source: {
      id: body.source?.id || `operator:${destination.id}`,
      name: body.source?.name,
      url: body.source?.url,
      authority,
    },
    evidenceText: body.evidenceText || null,
    notes: body.notes || null,
  }, now);

  if (!normalized) {
    return res.status(400).json({ error: 'verified observation is incomplete, expired, future-dated, or has an invalid bloom stage' });
  }

  const write = await upsertBloomOverride(normalized, { fetchImpl: fetch, now });
  if (!write.ok) return res.status(503).json({ error: write.reason || 'save failed' });

  const cycle = await runBloomLiveCycle({ now, fetchImpl: fetch, persist: true });
  const latest = cycle.latest?.destinations?.find((d) => d.id === destination.id) || null;
  return res.status(cycle.ok ? 200 : 207).json({
    ok: cycle.ok,
    action: 'upsert',
    saved: normalized,
    current: latest,
    refresh: cycle.ok ? 'ok' : cycle.failures,
  });
}
