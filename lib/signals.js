// Daily-cadence signal bundle stored as a single JSON object in the repo via the GitHub Contents API.
// The cron refreshes it once a day; the page reads it at runtime with one cheap fetch instead of
// hitting six slow external APIs on every cache miss. Writes carry [skip deploy] so they never redeploy.

import { fetchSpringIndex, fetchObservations, fetchInaturalist, fetchDrought, fetchBayDaily } from "./sources";

const GH = process.env.GH_TOKEN;
const REPO = "izworskic/phenology-michigan";
const FILE = "data/signals.json";
const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/main/${FILE}`;
const HEADERS = () => ({ Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "phenology-michigan" });

export function signalsConfigured() {
  return !!GH;
}

// Default-shaped empty bundle so the page always has the right structure to read.
export function emptySignals() {
  return {
    generatedAt: null,
    springIndex: { leafDoy: null, leafAnom: null, bloomAnom: null, agddAnom: null },
    observations: [],
    inat: [],
    drought: null,
    bayDaily: { iceConc: null, iceDate: null, glseaF: null, glseaDate: null },
  };
}

// Fetch every daily-cadence signal in parallel and return one bundle with a timestamp.
export async function gatherSignals() {
  const [springIndex, observations, inat, drought, bayDaily] = await Promise.all([
    fetchSpringIndex(),
    fetchObservations(),
    fetchInaturalist(),
    fetchDrought(),
    fetchBayDaily(),
  ]);
  return { generatedAt: new Date().toISOString(), springIndex, observations, inat, drought, bayDaily };
}

// Read the banked bundle at runtime. Tries the raw CDN first (fast), falls back to the API, then empty.
export async function readSignals() {
  try {
    const r = await fetch(`${RAW}?t=${Math.floor(Date.now() / 60000)}`, { headers: { "User-Agent": "phenology-michigan" } });
    if (r.ok) {
      const j = await r.json();
      if (j && typeof j === "object") return j;
    }
  } catch (e) {}
  if (GH) {
    try {
      const r = await fetch(`${API}?ref=main`, { headers: HEADERS() });
      if (r.ok) {
        const j = await r.json();
        return JSON.parse(Buffer.from(j.content || "", "base64").toString("utf8"));
      }
    } catch (e) {}
  }
  return null;
}

// Overwrite the bundle (single object, not appended).
export async function writeSignals(bundle) {
  if (!GH) return { ok: false, reason: "GH_TOKEN not set" };
  try {
    let sha = null;
    const g = await fetch(`${API}?ref=main`, { headers: HEADERS() });
    if (g.ok) sha = (await g.json()).sha;
    const body = {
      message: `signals ${(bundle.generatedAt || "").slice(0, 10)} [skip deploy]`,
      content: Buffer.from(JSON.stringify(bundle)).toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const r = await fetch(API, { method: "PUT", headers: { ...HEADERS(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, reason: `gh put ${r.status} ${t.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
