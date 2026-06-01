// Daily snapshot record stored in Upstash Redis over the REST API. No external dependency.
// One key holds the whole array; writes happen once a day from the cron, so a read,
// append, write cycle is safe and simple.

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "pheno:history";

export function historyConfigured() {
  return !!(REDIS_URL && REDIS_TOKEN);
}

async function cmd(args) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const j = await r.json();
  return j.result;
}

export async function readHistory() {
  if (!historyConfigured()) return [];
  try {
    const raw = await cmd(["GET", KEY]);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export async function appendSnapshot(snap) {
  if (!historyConfigured()) return { ok: false, reason: "storage not configured" };
  try {
    const arr = await readHistory();
    const next = arr.filter((x) => x.date !== snap.date);
    next.push(snap);
    next.sort((a, b) => (a.date < b.date ? -1 : 1));
    const trimmed = next.slice(-1500); // keep about four years
    await cmd(["SET", KEY, JSON.stringify(trimmed)]);
    return { ok: true, count: trimmed.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
