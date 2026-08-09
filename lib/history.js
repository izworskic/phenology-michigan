// Daily snapshot record stored as a JSON file in the project's own GitHub repo.
// Reads and writes go through the GitHub Contents API. Writes use a commit message
// containing [skip deploy] so Vercel's Ignored Build Step cancels the build, which
// means the daily snapshot never triggers a redeploy and never re-locks the site.

const GH = process.env.GH_TOKEN;
const REPO = "izworskic/phenology-michigan";
const FILE = "data/snapshots.json";
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
const HEADERS = () => ({ Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "phenology-michigan" });

export function historyConfigured() {
  return !!GH;
}

async function ghGet() {
  const r = await fetch(`${API}?ref=main`, { headers: HEADERS() });
  if (r.status === 404) return { arr: [], sha: null };
  if (!r.ok) throw new Error(`gh get ${r.status}`);
  const j = await r.json();
  let arr = [];
  try { arr = JSON.parse(Buffer.from(j.content || "", "base64").toString("utf8")); } catch (e) { arr = []; }
  return { arr: Array.isArray(arr) ? arr : [], sha: j.sha };
}

export async function readHistory() {
  if (!historyConfigured()) return [];
  try { const { arr } = await ghGet(); return arr; } catch (e) { return []; }
}

export async function appendSnapshot(snap) {
  if (!historyConfigured()) return { ok: false, reason: "GH_TOKEN not set" };
  try {
    const { arr, sha } = await ghGet();
    const next = arr.filter((x) => x.date !== snap.date);
    next.push(snap);
    next.sort((a, b) => (a.date < b.date ? -1 : 1));
    const trimmed = next.slice(-1500);
    const body = {
      message: `snapshot ${snap.date} [skip deploy]`,
      content: Buffer.from(JSON.stringify(trimmed)).toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const r = await fetch(API, { method: "PUT", headers: { ...HEADERS(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text(); return { ok: false, reason: `gh put ${r.status} ${t.slice(0, 120)}` }; }
    return { ok: true, count: trimmed.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// ---------------------------------------------------------------- almanac record
// The written notes are banked the same way the numbers are, in their own file, so the entries
// accumulate into a record rather than being overwritten each day. Leopold's phenology mattered
// because it was kept, not because any single day's note was remarkable.
const ALMANAC_FILE = "data/almanac.json";
const ALMANAC_API = `https://api.github.com/repos/${REPO}/contents/${ALMANAC_FILE}`;

async function ghGetAlmanac() {
  const r = await fetch(`${ALMANAC_API}?ref=main`, { headers: HEADERS() });
  if (r.status === 404) return { arr: [], sha: null };
  if (!r.ok) throw new Error(`gh get almanac ${r.status}`);
  const j = await r.json();
  let arr = [];
  try { arr = JSON.parse(Buffer.from(j.content || "", "base64").toString("utf8")); } catch (e) { arr = []; }
  return { arr: Array.isArray(arr) ? arr : [], sha: j.sha };
}

export async function readAlmanac() {
  if (!historyConfigured()) return [];
  try { const { arr } = await ghGetAlmanac(); return arr; } catch (e) { return []; }
}

export async function appendAlmanac(entry) {
  if (!historyConfigured()) return { ok: false, reason: "GH_TOKEN not set" };
  try {
    const { arr, sha } = await ghGetAlmanac();
    const next = arr.filter((x) => x.date !== entry.date);
    next.push(entry);
    next.sort((a, b) => (a.date < b.date ? -1 : 1));
    const trimmed = next.slice(-800);
    const body = {
      message: `almanac ${entry.date} [skip deploy]`,
      content: Buffer.from(JSON.stringify(trimmed)).toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const r = await fetch(ALMANAC_API, { method: "PUT", headers: { ...HEADERS(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text(); return { ok: false, reason: `gh put almanac ${r.status} ${t.slice(0, 120)}` }; }
    return { ok: true, count: trimmed.length };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
