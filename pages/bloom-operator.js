import Head from 'next/head';
import { useMemo, useState } from 'react';

const DESTINATIONS = {
  'holland-tulips': {
    name: 'Holland Tulips',
    sourceLabel: 'City of Holland Tulip Tracker / verified camera review',
    ttlHours: 48,
  },
  'mackinac-lilacs': {
    name: 'Mackinac Island Lilacs',
    sourceLabel: 'Mackinac Island Tourism Bureau / verified island observation',
    ttlHours: 72,
  },
  'traverse-city-cherries': {
    name: 'Traverse City Cherry Blossoms',
    sourceLabel: 'Verified local cherry-blossom observation',
    ttlHours: 36,
  },
  'meijer-gardens-cherries': {
    name: 'Meijer Gardens Cherry Blossoms',
    sourceLabel: 'Frederik Meijer Gardens / verified blossom observation',
    ttlHours: 36,
  },
  'um-peony-garden': {
    name: 'U-M Peony Garden',
    sourceLabel: 'University of Michigan Peony Garden / verified observation',
    ttlHours: 36,
  },
};

const STAGES = ['DORMANT', 'EMERGING', 'BUILDING', 'NEAR_PEAK', 'PEAK', 'FADING', 'DONE'];
const POTENTIALS = ['normal', 'reduced', 'severely_reduced', 'unknown'];

function localInput(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultValidThrough(destinationId, observed = new Date()) {
  const hours = DESTINATIONS[destinationId]?.ttlHours || 48;
  return localInput(new Date(observed.getTime() + hours * 3600000));
}

export default function BloomOperator() {
  const [secret, setSecret] = useState('');
  const [destinationId, setDestinationId] = useState('holland-tulips');
  const [stage, setStage] = useState('PEAK');
  const [observedAt, setObservedAt] = useState(localInput());
  const [validThrough, setValidThrough] = useState(defaultValidThrough('holland-tulips'));
  const [displayPotential, setDisplayPotential] = useState('normal');
  const [zone, setZone] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [current, setCurrent] = useState([]);
  const [busy, setBusy] = useState(false);

  const destination = useMemo(() => DESTINATIONS[destinationId], [destinationId]);

  function changeDestination(next) {
    setDestinationId(next);
    const observed = new Date(observedAt || Date.now());
    setValidThrough(defaultValidThrough(next, Number.isFinite(observed.getTime()) ? observed : new Date()));
  }

  async function api(body = null) {
    if (!secret) throw new Error('Enter the operator secret first.');
    const response = await fetch('/api/bloom-operator', {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json();
    if (!response.ok && response.status !== 207) throw new Error(json.error || `HTTP ${response.status}`);
    return json;
  }

  async function loadCurrent() {
    setBusy(true);
    setStatus('Loading current verified observations…');
    try {
      const json = await api();
      setCurrent(json.observations || []);
      setStatus(`Loaded ${json.observations?.length || 0} active verified observations.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveObservation(event) {
    event.preventDefault();
    setBusy(true);
    setStatus('Saving and refreshing statewide bloom decisions…');
    try {
      const json = await api({
        action: 'upsert',
        destinationId,
        zone: zone || null,
        stage,
        observedAt: new Date(observedAt).toISOString(),
        validThrough: new Date(validThrough).toISOString(),
        displayPotential,
        evidenceText,
        notes,
      });
      const decision = json.current?.decision?.decision || 'saved';
      setStatus(`Saved. Live decision is now ${decision}.`);
      await loadCurrent();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeObservation(item) {
    setBusy(true);
    setStatus('Removing observation and refreshing…');
    try {
      await api({ action: 'remove', destinationId: item.destinationId, zone: item.zone || null });
      setStatus('Removed.');
      await loadCurrent();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>Bloom Tracker Operator</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>
      <main className="wrap">
        <h1>Bloom Tracker Operator</h1>
        <p className="intro">Post a verified field or camera observation. Saves immediately update the live statewide snapshot.</p>

        <label>Operator secret<input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="current-password" /></label>
        <button type="button" onClick={loadCurrent} disabled={busy}>Load current observations</button>

        <form onSubmit={saveObservation}>
          <h2>Verified observation</h2>
          <label>Destination<select value={destinationId} onChange={(e) => changeDestination(e.target.value)}>{Object.entries(DESTINATIONS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}</select></label>
          <div className="provenance"><strong>Verified against</strong><div>{destination.sourceLabel}</div><small>Source identity and authority are attached automatically and cannot be edited here.</small></div>
          <label>Stage<select value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Observed at<input type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} /></label>
          <label>Valid through<input type="datetime-local" value={validThrough} onChange={(e) => setValidThrough(e.target.value)} /></label>
          <label>Display potential<select value={displayPotential} onChange={(e) => setDisplayPotential(e.target.value)}>{POTENTIALS.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Zone / area<input value={zone} onChange={(e) => setZone(e.target.value)} placeholder={destination?.name === 'Holland Tulips' ? 'Centennial Park' : 'Optional'} /></label>
          <label>What you observed<textarea required minLength={8} value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} rows={4} placeholder="Example: Centennial Park camera shows widespread full color; later beds still opening." /></label>
          <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></label>
          <button type="submit" disabled={busy}>Save + refresh live tracker</button>
        </form>

        {status && <div className="status">{status}</div>}

        {current.length > 0 && <section><h2>Active verified observations</h2>{current.map((item) => <article key={`${item.destinationId}|${item.zone || ''}`} className="card"><strong>{DESTINATIONS[item.destinationId]?.name || item.destinationId}</strong><div>{item.stage} · expires {new Date(item.validThrough).toLocaleString()}</div><div className="muted">{item.source?.name || 'Approved source'} · {item.evidenceText || 'No evidence note'}</div><button type="button" className="danger" disabled={busy} onClick={() => removeObservation(item)}>Remove</button></article>)}</section>}
      </main>
      <style jsx>{`
        :global(body){margin:0;background:#f5f4ef;color:#1d2a20;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .wrap{max-width:680px;margin:0 auto;padding:24px 18px 64px}
        h1{font-size:30px;margin:0 0 8px} h2{font-size:21px;margin:28px 0 12px}.intro{color:#536056;line-height:1.5}
        form{margin-top:22px;padding-top:8px;border-top:1px solid #d8ddd7}label{display:block;font-weight:650;margin:14px 0 6px}
        input,select,textarea{box-sizing:border-box;width:100%;margin-top:6px;border:1px solid #b8c2b9;border-radius:9px;background:white;padding:12px;font:inherit;color:#172119}
        textarea{resize:vertical}button{margin-top:12px;border:0;border-radius:9px;background:#244d32;color:white;padding:12px 15px;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.55;cursor:default}
        .provenance{margin:14px 0;padding:12px;border:1px solid #d7ddd7;border-radius:9px;background:#eef1ec;line-height:1.45}.provenance small{display:block;color:#647067;margin-top:4px}
        .status{margin-top:20px;padding:12px;border-radius:9px;background:#e7ece7}.card{margin:12px 0;padding:14px;background:white;border:1px solid #d7ddd7;border-radius:10px}.muted{color:#647067;margin-top:5px;line-height:1.4}.danger{background:#6b2f2b;padding:8px 11px}
      `}</style>
    </>
  );
}
