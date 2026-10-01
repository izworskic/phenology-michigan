const DEFAULT_HARNESS_URL = process.env.HARNESS_URL || 'https://agentbase-registry-izworski-gmailcoms-projects.vercel.app/api/harness';

function safe(value, max = 220) {
  return String(value == null ? '' : value)
    .replace(/[<>\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function tokenFor(authToken) {
  return String(authToken || process.env.HARNESS_ACCESS_KEY || process.env.VERCEL_OIDC_TOKEN || '').trim();
}

export async function bloomJevDecide({
  task,
  options,
  context = {},
  constraints = [],
  evidence = [],
  fallbackId = null,
  authToken = null,
  timeoutMs = 3_000,
  minConfidence = 0.55,
} = {}) {
  const ids = Object.keys(options || {});
  if (!ids.length) return { mode: 'deterministic', choiceId: fallbackId, confidence: 0, reason: 'No candidates' };
  const fallback = ids.includes(fallbackId) ? fallbackId : ids[0];
  const token = tokenFor(authToken);
  if (!token) return { mode: 'deterministic', choiceId: fallback, confidence: 0, reason: 'Shared JEV auth unavailable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(DEFAULT_HARNESS_URL, {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ action: 'decide', task, options, context, constraints, evidence }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.result) throw new Error(`Harness HTTP ${response.status}`);
    const choice = data.result?.choice || {};
    const choiceId = choice.choice;
    const confidence = Number(choice.confidence) || 0;
    const injectionDependency = Number(data.result?.injection_dependency);
    const valid = ids.includes(choiceId)
      && confidence >= minConfidence
      && !(Number.isFinite(injectionDependency) && injectionDependency >= 0.45);
    if (!valid) {
      return {
        mode: 'deterministic',
        choiceId: fallback,
        confidence,
        reason: 'JEV output did not pass closed-set confidence/security gates',
        model: data.result?.model || 'jev-latest',
        injectionDependency: Number.isFinite(injectionDependency) ? injectionDependency : null,
      };
    }
    return {
      mode: 'shared-harness-jev',
      choiceId,
      confidence,
      reason: null,
      model: data.result?.model || 'jev-latest',
      injectionDependency: Number.isFinite(injectionDependency) ? injectionDependency : null,
    };
  } catch (error) {
    return {
      mode: 'deterministic',
      choiceId: fallback,
      confidence: 0,
      reason: `JEV unavailable: ${safe(error instanceof Error ? error.message : error)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
