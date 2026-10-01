import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Clock3, Flower2, LocateFixed, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import { selectWeekendForecast, sortPublicDestinations, stageLabel, stageRangeLabel } from '../lib/bloom/public-presentation.mjs';
import { decisionCounts, evidenceStrength, freshnessLabel, goBeforeWindow, humanDecisionLabel, shortDecisionLabel } from '../lib/bloom/tracker-product.mjs';

const SITE = 'https://phenology.chrisizworski.com';
const PAGE_URL = `${SITE}/bloom-tracker`;
const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const DESTINATION_BY_ID = Object.freeze(Object.fromEntries(BLOOM_DESTINATIONS.map((d) => [d.id, d])));

const DECISION_TONE = {
  GO_BEFORE: { fg: '#8b3d16', bg: '#fff0e7', border: '#e6a37d', dot: '#bd5520' },
  GO: { fg: '#245934', bg: '#eaf6ed', border: '#9fcbaa', dot: '#3f8a55' },
  WAIT: { fg: '#705315', bg: '#fbf4df', border: '#d9c27e', dot: '#aa8427' },
  LIMITED: { fg: '#73513f', bg: '#f5ede8', border: '#d3b2a2', dot: '#95634c' },
  UNKNOWN: { fg: '#5b615d', bg: '#f1f3f1', border: '#c7ccc8', dot: '#848b86' },
};

const STAGE_TONE = {
  EMERGING: '#9e8b49',
  BUILDING: '#718b4f',
  NEAR_PEAK: '#4e8952',
  PEAK: '#247a4c',
  FADING: '#9a6b50',
  DONE: '#777d78',
  DORMANT: '#777d78',
};

let mapLibrePromise;

function loadMapLibre() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser only'));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;

  mapLibrePromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${MAPLIBRE_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.maplibregl), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = MAPLIBRE_JS;
    script.async = true;
    script.onload = () => resolve(window.maplibregl);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mapLibrePromise;
}

function formatUpdated(dateLike) {
  const date = new Date(dateLike);
  if (!Number.isFinite(date.getTime())) return 'waiting for first live snapshot';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

function friendlyConfidence(value) {
  if (value === 'HIGH') return 'High confidence';
  if (value === 'MEDIUM') return 'Medium confidence';
  return 'Low confidence';
}

function weekendCopy(decision, generatedAt) {
  const state = decision?.decision || 'UNKNOWN';
  const goBefore = goBeforeWindow(decision, generatedAt);
  if (goBefore) return goBefore;
  const window = selectWeekendForecast(decision?.forecast, generatedAt);
  if (!window) return state === 'UNKNOWN' ? 'No trustworthy weekend call yet' : 'Weekend outlook is not available yet';
  const range = stageRangeLabel(window.stageLow, window.stageHigh);
  const risk = window.durabilityRisk && window.durabilityRisk !== 'low' ? ` · ${window.durabilityRisk} weather risk` : '';
  return `Weekend: ${range}${risk}`;
}

function DecisionPill({ value, compact = false }) {
  const tone = DECISION_TONE[value] || DECISION_TONE.UNKNOWN;
  return (
    <span className={`decision-pill ${compact ? 'compact' : ''}`} style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}>
      <span className="decision-dot" style={{ background: tone.dot }} />
      {compact ? shortDecisionLabel(value) : humanDecisionLabel(value)}
    </span>
  );
}

function EvidenceFreshness({ decision }) {
  const strength = evidenceStrength(decision);
  return <span className={`freshness freshness-${strength}`}>{freshnessLabel(decision)}</span>;
}

function OpportunityRow({ entry, rank, generatedAt }) {
  const decision = entry?.decision || {};
  const state = decision.decision || 'UNKNOWN';
  return (
    <article className="opportunity-row">
      <div className="rank" aria-hidden="true">{rank}</div>
      <div className="opportunity-main">
        <div className="opportunity-titleline">
          <div>
            <span className="region">{entry.region}</span>
            <h3>{entry.name}</h3>
          </div>
          <DecisionPill value={state} compact />
        </div>
        <p className="opportunity-reason">{decision.reason || 'A trustworthy current trip call is not available yet.'}</p>
        <div className="opportunity-meta">
          <strong>{stageLabel(decision.currentStage)} now</strong>
          <span>·</span>
          <span>{weekendCopy(decision, generatedAt)}</span>
          <span>·</span>
          <EvidenceFreshness decision={decision} />
        </div>
      </div>
      <a className="detail-link" href={`#details-${entry.id}`}>Details <ChevronDown size={14} /></a>
    </article>
  );
}

function MapSelectedPanel({ entry, generatedAt, onClose }) {
  if (!entry) return null;
  const decision = entry.decision || {};
  return (
    <div className="map-selected-panel" aria-live="polite">
      <button type="button" className="map-panel-close" onClick={onClose} aria-label="Close map detail"><X size={17} /></button>
      <div className="map-panel-top">
        <div>
          <span className="region">{entry.region}</span>
          <strong>{entry.name}</strong>
        </div>
        <DecisionPill value={decision.decision || 'UNKNOWN'} compact />
      </div>
      <p>{decision.reason || humanDecisionLabel(decision.decision || 'UNKNOWN')}</p>
      <div className="map-panel-meta">
        <span>{stageLabel(decision.currentStage)} now</span>
        <span>·</span>
        <span>{weekendCopy(decision, generatedAt)}</span>
      </div>
      <EvidenceFreshness decision={decision} />
    </div>
  );
}

function MichiganBloomMap({ destinations, generatedAt }) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mapState, setMapState] = useState('loading');
  const selected = destinations.find((entry) => entry.id === selectedId) || null;

  useEffect(() => {
    let cancelled = false;
    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapNodeRef.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: mapNodeRef.current,
        center: [-85.55, 44.5],
        zoom: 4.75,
        minZoom: 4.1,
        maxZoom: 10,
        maxBounds: [[-91.4, 40.7], [-81.2, 49.3]],
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => {
        if (cancelled) return;
        map.fitBounds([[-90.7, 41.55], [-82.05, 48.2]], { padding: 24, duration: 0 });
        setMapState('ready');
      });
      map.on('error', () => {
        if (!cancelled) setMapState('error');
      });
      mapRef.current = map;
    }).catch(() => {
      if (!cancelled) setMapState('error');
    });

    return () => {
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready' || !window.maplibregl) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    destinations.forEach((entry) => {
      const destination = DESTINATION_BY_ID[entry.id];
      if (!destination?.coordinates) return;
      const state = entry?.decision?.decision || 'UNKNOWN';
      const tone = DECISION_TONE[state] || DECISION_TONE.UNKNOWN;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bloom-map-marker';
      button.style.setProperty('--marker', tone.dot);
      button.style.setProperty('--ring', tone.border);
      button.setAttribute('aria-label', `${entry.name}: ${humanDecisionLabel(state)}`);
      button.innerHTML = '<span></span>';
      button.addEventListener('click', () => setSelectedId(entry.id));
      const marker = new window.maplibregl.Marker({ element: button, anchor: 'center' })
        .setLngLat([destination.coordinates.lon, destination.coordinates.lat])
        .addTo(map);
      markerRefs.current.push(marker);

      if (Array.isArray(entry.zoneStatus)) {
        entry.zoneStatus.forEach((zone) => {
          if (!zone?.coordinates) return;
          const zoneButton = document.createElement('button');
          zoneButton.type = 'button';
          zoneButton.className = 'bloom-zone-marker';
          zoneButton.style.setProperty('--stage', STAGE_TONE[zone.stage] || '#777d78');
          zoneButton.setAttribute('aria-label', `${zone.name}: ${stageLabel(zone.stage)}`);
          zoneButton.title = `${zone.name} · ${stageLabel(zone.stage)}`;
          const zoneMarker = new window.maplibregl.Marker({ element: zoneButton, anchor: 'center' })
            .setLngLat([zone.coordinates.lon, zone.coordinates.lat])
            .addTo(map);
          markerRefs.current.push(zoneMarker);
        });
      }
    });
  }, [destinations, mapState]);

  return (
    <section className="map-section" aria-labelledby="map-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Geographic comparison</span>
          <h2 id="map-title">Where is the bloom happening?</h2>
        </div>
        <span className="map-hint"><MapPin size={14} /> Tap one marker</span>
      </div>
      <p className="section-intro">Use the map for the question geography actually changes: what is blooming north versus south, and where the active opportunities cluster.</p>
      <div className="map-frame">
        <div ref={mapNodeRef} className="map-canvas" aria-label="Interactive Michigan bloom map" />
        {mapState === 'loading' && <div className="map-loading">Loading Michigan geography…</div>}
        {mapState === 'error' && (
          <div className="map-fallback">
            <MapPin size={22} />
            <strong>Map unavailable.</strong>
            <span>The trip rankings above remain usable. No substitute silhouette is shown.</span>
          </div>
        )}
        <MapSelectedPanel entry={selected} generatedAt={generatedAt} onClose={() => setSelectedId(null)} />
      </div>
      <div className="map-legend" aria-label="Map legend">
        {Object.entries({ GO: 'Worth the drive', GO_BEFORE: 'Go soon', WAIT: 'Wait', LIMITED: 'Limited', UNKNOWN: 'Uncertain' }).map(([state, label]) => (
          <span key={state}><i style={{ background: DECISION_TONE[state].dot }} />{label}</span>
        ))}
      </div>
      {destinations.some((entry) => Array.isArray(entry.zoneStatus)) && (
        <p className="wave-note"><LocateFixed size={14} /> Smaller dots show the Traverse City bloom wave where zone-level evidence is available.</p>
      )}
    </section>
  );
}

function DestinationDetails({ entry, generatedAt }) {
  const decision = entry.decision || {};
  const source = decision.source || entry?.observation?.source || null;
  const weekend = selectWeekendForecast(decision.forecast, generatedAt);
  const state = decision.decision || 'UNKNOWN';
  return (
    <details className="destination-detail" id={`details-${entry.id}`}>
      <summary>
        <div>
          <span className="region">{entry.region}</span>
          <strong>{entry.name}</strong>
        </div>
        <DecisionPill value={state} compact />
        <ChevronDown className="detail-chevron" size={18} />
      </summary>
      <div className="detail-body">
        <div className="detail-answer">
          <span className="eyebrow">Trip answer</span>
          <h3>{humanDecisionLabel(state)}</h3>
          <p>{decision.reason || 'A trustworthy current trip decision is not available yet.'}</p>
        </div>
        <dl className="detail-grid">
          <div><dt>Now</dt><dd>{stageLabel(decision.currentStage)}</dd></div>
          <div><dt>This weekend</dt><dd>{weekend ? stageRangeLabel(weekend.stageLow, weekend.stageHigh) : 'No reliable forecast'}</dd></div>
          <div><dt>Confidence</dt><dd>{friendlyConfidence(decision.confidence)}</dd></div>
          <div><dt>Evidence</dt><dd><EvidenceFreshness decision={decision} /></dd></div>
        </dl>
        {decision.decision === 'GO_BEFORE' && <div className="weather-callout"><Clock3 size={16} /> {weekendCopy(decision, generatedAt)}</div>}
        {Array.isArray(entry.zoneStatus) && (
          <div className="zone-progress">
            <span className="eyebrow">Geographic progression</span>
            {entry.zoneStatus.map((zone) => (
              <div className="zone-row" key={zone.name}><span>{zone.name}</span><strong>{stageLabel(zone.stage)}</strong></div>
            ))}
          </div>
        )}
        <div className="detail-footer">
          <span>The model does not manufacture bloom from weather alone.</span>
          {source?.url && <a href={source.url} target="_blank" rel="noreferrer">View evidence <ArrowUpRight size={14} /></a>}
        </div>
      </div>
    </details>
  );
}

function EmptyState() {
  return (
    <div className="data-empty"><Flower2 size={22} /><div><strong>Bloom status is loading.</strong><p>The tracker will not substitute a calendar guess for missing live evidence.</p></div></div>
  );
}

export default function BloomTracker({ initialSnapshot = null, fixtureName = null }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [pageLoadedAt] = useState(() => new Date().toISOString());
  const generatedAt = snapshot?.generatedAt || pageLoadedAt;
  const destinations = useMemo(() => sortPublicDestinations(snapshot?.destinations || [], generatedAt), [snapshot, generatedAt]);
  const counts = decisionCounts(destinations);
  const useful = destinations.filter((entry) => ['GO', 'GO_BEFORE'].includes(entry?.decision?.decision));
  const featured = useful[0] || destinations.find((entry) => entry?.decision?.decision === 'WAIT') || destinations[0] || null;
  const allWeak = destinations.length > 0 && destinations.every((entry) => ['UNKNOWN', 'LIMITED'].includes(entry?.decision?.decision));

  async function refresh() {
    if (fixtureName) return;
    setRefreshing(true);
    try {
      const response = await fetch('/api/bloom-latest', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSnapshot(await response.json());
    } catch {
      // Preserve the last trustworthy snapshot rather than replacing evidence with an error state.
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (fixtureName) return undefined;
    if (!initialSnapshot) refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const structuredData = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Michigan Bloom Tracker', url: PAGE_URL,
    applicationCategory: 'TravelApplication', operatingSystem: 'Any',
    description: 'Live Michigan flower bloom conditions and weekend trip decisions using fresh observations, forecast progression, and display durability risk.',
  };

  return (
    <>
      <Head>
        <title>Michigan Bloom Tracker — Best Blooms This Weekend</title>
        <meta name="description" content="See the best Michigan flower blooms right now and this weekend, including Traverse City cherries, Holland tulips, Mackinac lilacs, U-M peonies and Meijer Gardens." />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Michigan Bloom Tracker — Best Blooms This Weekend" />
        <meta property="og:description" content="A decision-first Michigan bloom tracker: what is worth the drive, what should wait, and where the bloom is happening." />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>

      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="/">Michigan Phenology</a><span className="brand-divider">/</span><strong>Bloom Tracker</strong>
          {fixtureName && <span className="fixture-badge">TEST · {fixtureName}</span>}
          <button type="button" className="refresh" onClick={refresh} disabled={refreshing || Boolean(fixtureName)} aria-label="Refresh bloom status"><RefreshCw size={15} className={refreshing ? 'spin' : ''} /><span>{refreshing ? 'Refreshing' : 'Refresh'}</span></button>
        </header>

        <section className="intro-block">
          <div className="kicker"><Flower2 size={15} /> Michigan Bloom Tracker</div>
          <h1>What is worth the drive this weekend?</h1>
          <p>Current bloom evidence, weekend progression, and weather durability — translated into a trip decision.</p>
          <div className="updated"><span className="live-dot" /> Updated {formatUpdated(snapshot?.generatedAt)} · {snapshot?.delivery === 'persisted' ? 'banked live snapshot' : fixtureName ? 'product test fixture' : snapshot ? 'live check' : 'checking live sources'}</div>
        </section>

        {!snapshot?.destinations?.length ? <EmptyState /> : (
          <>
            {allWeak ? (
              <section className="featured featured-quiet">
                <span className="featured-label">Best this weekend</span>
                <h2>No statewide bloom trip is justified by fresh evidence yet.</h2>
                <p>That is a valid answer. Stale evidence is not promoted into a recommendation.</p>
              </section>
            ) : featured && (
              <section className="featured">
                <div className="featured-topline"><span className="featured-label">Best this weekend</span><DecisionPill value={featured.decision?.decision || 'UNKNOWN'} /></div>
                <div className="featured-place">{featured.name}</div>
                <h2>{featured.decision?.reason || humanDecisionLabel(featured.decision?.decision || 'UNKNOWN')}</h2>
                <div className="featured-bottom">
                  <span><strong>{stageLabel(featured.decision?.currentStage)}</strong> now</span>
                  <span>·</span><span>{weekendCopy(featured.decision, generatedAt)}</span>
                  <span>·</span><EvidenceFreshness decision={featured.decision} />
                </div>
              </section>
            )}

            <section className="status-strip" aria-label="Statewide bloom summary">
              <div><strong>{counts.GO + counts.GO_BEFORE}</strong><span>Worth considering</span></div>
              <div><strong>{counts.WAIT}</strong><span>Wait</span></div>
              <div><strong>{counts.LIMITED}</strong><span>Past best</span></div>
              <div><strong>{counts.UNKNOWN}</strong><span>Uncertain</span></div>
            </section>

            <section className="opportunity-section" aria-labelledby="where-title">
              <div className="section-heading"><div><span className="eyebrow">Statewide opportunity desk</span><h2 id="where-title">Where should I go?</h2></div><span className="count">{destinations.length} tracked displays</span></div>
              <div className="opportunity-list">
                {destinations.map((entry, index) => <OpportunityRow key={entry.id} entry={entry} rank={index + 1} generatedAt={generatedAt} />)}
              </div>
            </section>

            <MichiganBloomMap destinations={destinations} generatedAt={generatedAt} />

            <section className="details-section" aria-labelledby="details-title">
              <div className="section-heading"><div><span className="eyebrow">Destination checker</span><h2 id="details-title">Check a specific bloom</h2></div></div>
              <p className="section-intro">Already thinking about Holland, Traverse City, Mackinac, Ann Arbor, or Meijer Gardens? The answer is visible before you expand; open only the evidence you need.</p>
              <div className="details-list">{destinations.map((entry) => <DestinationDetails key={entry.id} entry={entry} generatedAt={generatedAt} />)}</div>
            </section>

            <section className="trust-block"><div className="trust-icon"><ShieldCheck size={21} /></div><div><h2>Why the tracker can say “not enough evidence”</h2><p>Observations anchor the forecast. Weather can change development or shorten a display, but it cannot create bloom that has not been observed. Stale observations lower confidence, abnormal-year evidence overrides normal timing, and long-range output stays a range rather than a fake peak date.</p></div></section>
          </>
        )}

        <footer><span>Michigan Bloom Tracker</span><a href="/">Explore the natural year in Michigan Phenology</a></footer>
      </main>

      <style jsx>{`
        :global(*){box-sizing:border-box}
        :global(html){scroll-behavior:smooth}
        :global(body){margin:0;background:#f4f1e8;color:#202a21;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        :global(a){color:inherit}.page-shell{width:min(100%,1040px);margin:0 auto;padding:0 16px 56px}
        .topbar{min-height:52px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #d8d3c4;font-size:13px;color:#657065}.brand{text-decoration:none}.brand:hover{text-decoration:underline}.brand-divider{color:#b5ae9f}.topbar strong{color:#29362b}.fixture-badge{font-size:9px;font-weight:900;letter-spacing:.08em;color:#725713;background:#fff4c9;border:1px solid #dbc675;border-radius:999px;padding:4px 7px}.refresh{margin-left:auto;border:1px solid #c8c9be;background:#fbfaf5;color:#425045;border-radius:999px;padding:7px 10px;display:flex;align-items:center;gap:6px;font:inherit;font-weight:700;cursor:pointer}.refresh:disabled{opacity:.55}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .intro-block{padding:20px 2px 13px}.kicker{display:flex;align-items:center;gap:7px;color:#5a744f;font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.intro-block h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,6.5vw,48px);line-height:1.01;letter-spacing:-.03em;margin:8px 0 8px;max-width:760px;color:#1f2e22}.intro-block p{font-size:14px;line-height:1.45;color:#626b61;margin:0;max-width:680px}.updated{margin-top:10px;display:flex;align-items:center;gap:7px;color:#777f76;font-size:11.5px}.live-dot{width:7px;height:7px;border-radius:50%;background:#4c8a5b;box-shadow:0 0 0 3px rgba(76,138,91,.12)}
        .featured{border:1px solid #abcaae;border-radius:15px;background:#f8fbf6;padding:15px 16px;margin:4px 0 10px}.featured-quiet{border-color:#d2ccbf;background:#faf8f2}.featured-topline{display:flex;align-items:center;justify-content:space-between;gap:10px}.featured-label,.eyebrow{display:block;font-size:10px;font-weight:850;letter-spacing:.09em;text-transform:uppercase;color:#7c8679;margin-bottom:4px}.featured-place{font-size:13px;font-weight:850;color:#3b5941;margin:7px 0 3px}.featured h2{font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:1.25;margin:0;color:#273229}.featured p{font-size:13px;color:#667066;margin:8px 0 0}.featured-bottom{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;color:#657064;font-size:12px}.decision-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid;border-radius:999px;padding:6px 9px;font-size:9.5px;font-weight:900;letter-spacing:.04em;white-space:nowrap}.decision-pill.compact{padding:5px 8px;font-size:9px}.decision-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
        .status-strip{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d5d2c7;border-radius:12px;background:#fbfaf5;margin-bottom:17px;overflow:hidden}.status-strip div{padding:9px 7px;text-align:center;border-right:1px solid #e2ded3}.status-strip div:last-child{border-right:0}.status-strip strong{display:block;font:700 19px Georgia,"Times New Roman",serif;color:#2e3b31}.status-strip span{display:block;font-size:9px;line-height:1.15;color:#777f76;margin-top:2px}
        .section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:7px}.section-heading h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:23px;color:#263329}.count,.map-hint{font-size:11px;color:#778078;white-space:nowrap}.map-hint{display:flex;align-items:center;gap:4px}.section-intro{font-size:12.5px;line-height:1.45;color:#697269;margin:0 0 10px;max-width:720px}
        .opportunity-section{margin:0 0 20px}.opportunity-list{border-top:1px solid #d7d2c5}.opportunity-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;align-items:start;padding:12px 0;border-bottom:1px solid #ddd8cc}.rank{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#e7ece4;color:#536052;font-size:11px;font-weight:850;margin-top:2px}.opportunity-titleline{display:flex;align-items:flex-start;gap:8px}.opportunity-titleline>div{min-width:0}.region{display:block;font-size:9.5px;font-weight:850;text-transform:uppercase;letter-spacing:.075em;color:#858a82}.opportunity-row h3{font-family:Georgia,"Times New Roman",serif;font-size:17px;line-height:1.15;margin:2px 0 0;color:#29342b}.opportunity-titleline .decision-pill{margin-left:auto}.opportunity-reason{font-size:13px;line-height:1.4;color:#48534a;margin:6px 0 5px}.opportunity-meta{display:flex;flex-wrap:wrap;gap:5px;color:#747d73;font-size:10.5px;line-height:1.35}.opportunity-meta strong{color:#4d5b4f}.detail-link{align-self:center;display:inline-flex;align-items:center;gap:3px;text-decoration:none;font-size:10.5px;font-weight:800;color:#526554;padding:6px 0}.freshness{white-space:nowrap}.freshness-fresh{color:#4d7557}.freshness-aging{color:#80681e}.freshness-weak{color:#8b5b49}
        .map-section{margin:0 0 24px}.map-frame{position:relative;height:410px;border:1px solid #c7d1ca;border-radius:16px;overflow:hidden;background:#dce5df}.map-canvas{position:absolute;inset:0}.map-loading,.map-fallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:6px;background:#e7eee9;color:#5f6d63;font-size:12px;text-align:center;padding:20px;z-index:3}.map-fallback strong{font-size:14px;color:#39463c}.map-fallback span{max-width:290px}.map-selected-panel{position:absolute;z-index:5;left:10px;right:10px;bottom:10px;background:rgba(255,253,248,.97);border:1px solid #cfd4cc;border-radius:12px;padding:12px 38px 11px 12px;box-shadow:0 7px 24px rgba(30,50,38,.17);backdrop-filter:blur(8px)}.map-panel-close{position:absolute;right:9px;top:9px;border:0;background:#ecefe9;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;color:#586359;cursor:pointer}.map-panel-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.map-panel-top strong{display:block;font:700 16px Georgia,"Times New Roman",serif}.map-selected-panel p{font-size:12.5px;line-height:1.4;margin:7px 0 6px;color:#465149}.map-panel-meta{display:flex;flex-wrap:wrap;gap:5px;font-size:10.5px;color:#6c766e;margin-bottom:5px}.map-legend{display:flex;flex-wrap:wrap;gap:8px 12px;margin:8px 2px 0;font-size:10px;color:#68736b}.map-legend span{display:flex;align-items:center;gap:4px}.map-legend i{width:8px;height:8px;border-radius:50%}.wave-note{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#68736b;margin:7px 2px 0}
        :global(.bloom-map-marker){width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 7px rgba(25,45,34,.3);padding:0}:global(.bloom-map-marker span){width:17px;height:17px;border-radius:50%;background:var(--marker);border:3px solid white;box-shadow:0 0 0 3px var(--ring)}:global(.bloom-map-marker:focus-visible){outline:3px solid #1d4f35;outline-offset:3px}:global(.bloom-zone-marker){width:12px;height:12px;border:2px solid white;border-radius:50%;background:var(--stage);box-shadow:0 0 0 1px rgba(45,58,49,.28),0 2px 5px rgba(30,40,34,.2);padding:0}:global(.maplibregl-ctrl-attrib){font-size:9px!important}:global(.maplibregl-ctrl-group button){width:31px!important;height:31px!important}
        .details-section{margin:0 0 24px}.details-list{border-top:1px solid #d5d1c5}.destination-detail{border-bottom:1px solid #d5d1c5;scroll-margin-top:12px}.destination-detail summary{list-style:none;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:12px 0;cursor:pointer}.destination-detail summary::-webkit-details-marker{display:none}.destination-detail summary strong{display:block;font:700 16px Georgia,"Times New Roman",serif}.detail-chevron{color:#707a72;transition:transform .16s ease}.destination-detail[open] .detail-chevron{transform:rotate(180deg)}.detail-body{padding:0 0 15px 0}.detail-answer{background:#fbfaf5;border:1px solid #ddd8cc;border-radius:11px;padding:11px 12px}.detail-answer h3{font:700 18px Georgia,"Times New Roman",serif;margin:0 0 5px}.detail-answer p{font-size:13px;line-height:1.45;color:#4e584f;margin:0}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ddd8cc;border:1px solid #ddd8cc;border-radius:10px;overflow:hidden;margin:9px 0 0}.detail-grid div{background:#fffdf8;padding:9px}.detail-grid dt{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#838980;font-weight:850}.detail-grid dd{font-size:12px;font-weight:750;color:#414c43;margin:3px 0 0}.weather-callout{display:flex;align-items:center;gap:7px;margin-top:9px;background:#fff0e7;border:1px solid #e7ae8d;color:#7b421e;border-radius:9px;padding:9px 10px;font-size:12px;font-weight:750}.zone-progress{margin-top:10px;border-top:1px solid #ded9cd;padding-top:10px}.zone-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;font-size:11.5px;border-bottom:1px dotted #ddd8cc}.zone-row:last-child{border-bottom:0}.zone-row strong{color:#4f5d50}.detail-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:10px;font-size:10.5px;color:#7b8279}.detail-footer a{display:inline-flex;align-items:center;gap:4px;font-weight:800;color:#4b624f;text-decoration:none}
        .trust-block{display:flex;gap:12px;margin:25px 0 10px;border-top:1px solid #d9d4c8;padding-top:20px}.trust-icon{width:38px;height:38px;border-radius:10px;background:#e8efe7;color:#476149;display:grid;place-items:center;flex:0 0 auto}.trust-block h2{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:0 0 5px}.trust-block p{margin:0;color:#667066;font-size:12.5px;line-height:1.5;max-width:760px}.data-empty{display:flex;gap:11px;border:1px solid #d5cec0;background:#fbf8f1;border-radius:14px;padding:16px;color:#5a625a}.data-empty strong{display:block}.data-empty p{margin:4px 0 0;font-size:13px;line-height:1.4}footer{margin-top:30px;padding-top:16px;border-top:1px solid #d9d4c8;display:flex;flex-direction:column;gap:7px;font-size:11.5px;color:#7c837a}footer a{color:#506552}
        @media(min-width:720px){.page-shell{padding-left:24px;padding-right:24px}.intro-block{padding-top:28px}.featured{padding:17px 19px}.featured h2{font-size:22px}.opportunity-row{grid-template-columns:32px minmax(0,1fr) 58px;padding:13px 2px}.map-frame{height:500px}.map-selected-panel{left:16px;right:auto;width:420px;bottom:16px}.detail-grid{grid-template-columns:repeat(4,1fr)}}
        @media(max-width:430px){.topbar .brand-divider,.topbar .brand{display:none}.intro-block h1{font-size:31px}.status-strip span{font-size:8.5px}.opportunity-row{grid-template-columns:26px minmax(0,1fr)}.detail-link{grid-column:2;justify-self:start;padding-top:0}.opportunity-titleline{display:block}.opportunity-titleline .decision-pill{margin-top:6px}.map-frame{height:390px}.map-selected-panel{padding-right:38px}.map-panel-top{display:block}.map-panel-top .decision-pill{margin-top:6px}.destination-detail summary{grid-template-columns:minmax(0,1fr) auto}.destination-detail summary .decision-pill{grid-column:1;justify-self:start}.detail-chevron{grid-column:2;grid-row:1/3}.detail-grid{grid-template-columns:1fr 1fr}.fixture-badge{display:none}}
        @media(prefers-reduced-motion:reduce){:global(html){scroll-behavior:auto}.spin{animation:none}.detail-chevron{transition:none}}
      `}</style>
    </>
  );
}

export async function getServerSideProps(context) {
  const fixtureName = typeof context?.query?.fixture === 'string' ? context.query.fixture : null;
  if (fixtureName && process.env.VERCEL_ENV !== 'production') {
    const { getBloomTrackerFixture } = await import('../lib/bloom/tracker-fixtures.mjs');
    const fixture = getBloomTrackerFixture(fixtureName);
    if (fixture) return { props: { initialSnapshot: fixture, fixtureName } };
  }

  try {
    const { readBloomLatest } = await import('../lib/bloom/history-store.mjs');
    const stored = await readBloomLatest({ fetchImpl: fetch });
    if (stored.ok && stored.value) return { props: { initialSnapshot: { ...stored.value, delivery: 'persisted' }, fixtureName: null } };
  } catch {
    // SSR should never block the public product on live source acquisition.
  }
  return { props: { initialSnapshot: null, fixtureName: null } };
}
