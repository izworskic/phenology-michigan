import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Flower2, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import {
  decisionLabel,
  selectWeekendForecast,
  sortPublicDestinations,
  stageLabel,
  stageRangeLabel,
} from '../lib/bloom/public-presentation.mjs';

const SITE = 'https://phenology.chrisizworski.com';
const PAGE_URL = `${SITE}/bloom-tracker`;

const DECISION_TONE = {
  GO_BEFORE: { fg: '#8b3d16', bg: '#fff0e7', border: '#f0b28e', dot: '#c75d20' },
  GO: { fg: '#245934', bg: '#eaf6ed', border: '#a9d2b2', dot: '#3f8a55' },
  WAIT: { fg: '#7a5a17', bg: '#fbf4df', border: '#dec889', dot: '#b58b2a' },
  LIMITED: { fg: '#77523f', bg: '#f6eee9', border: '#d6b7a8', dot: '#9e6b51' },
  UNKNOWN: { fg: '#5d625f', bg: '#f1f3f1', border: '#c9ceca', dot: '#8a918c' },
};

const MAP_BOUNDS = Object.freeze({ west: -90.7, east: -82.05, north: 48.45, south: 41.55 });
const DESTINATION_BY_ID = Object.freeze(Object.fromEntries(BLOOM_DESTINATIONS.map((d) => [d.id, d])));

function pct(value) {
  return `${Math.max(2, Math.min(98, value)).toFixed(2)}%`;
}

function mapPosition(destination) {
  const { lat, lon } = destination.coordinates;
  const x = ((lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return { left: pct(x), top: pct(y) };
}

function formatUpdated(dateLike) {
  const date = new Date(dateLike);
  if (!Number.isFinite(date.getTime())) return 'waiting for first live snapshot';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function friendlyConfidence(value) {
  if (value === 'HIGH') return 'High confidence';
  if (value === 'MEDIUM') return 'Medium confidence';
  return 'Low confidence';
}

function displayTypeCopy(entry) {
  if (entry?.displayType === 'staggered_mixed') return 'Mixed display · varieties can overlap';
  return 'Biological display · stage anchored';
}

function weekendCopy(window) {
  if (!window) return 'No usable weekend forecast yet';
  const range = stageRangeLabel(window.stageLow, window.stageHigh);
  const risk = window.durabilityRisk && window.durabilityRisk !== 'low'
    ? ` · ${window.durabilityRisk} petal-loss risk`
    : '';
  return `${window.horizonDays}-day outlook: ${range}${risk}`;
}

function DecisionPill({ value }) {
  const tone = DECISION_TONE[value] || DECISION_TONE.UNKNOWN;
  return (
    <span className="decision-pill" style={{ color: tone.fg, background: tone.bg, borderColor: tone.border }}>
      <span className="decision-dot" style={{ background: tone.dot }} />
      {decisionLabel(value)}
    </span>
  );
}

function Freshness({ decision }) {
  if (decision?.observationAgeDays == null) return <span>Freshness unknown</span>;
  const age = decision.observationAgeDays;
  if (age < 0.8) return <span>Observed today</span>;
  if (age < 1.8) return <span>Observed about 1 day ago</span>;
  return <span>Observed {Math.round(age)} days ago</span>;
}

function DestinationCard({ entry, generatedAt, onMap }) {
  const decision = entry?.decision || {};
  const weekend = selectWeekendForecast(decision.forecast, generatedAt);
  const source = decision.source || entry?.observation?.source || null;
  const state = decision.decision || 'UNKNOWN';
  const tone = DECISION_TONE[state] || DECISION_TONE.UNKNOWN;

  return (
    <article className="destination-card" id={`destination-${entry.id}`}>
      <div className="card-topline">
        <div>
          <div className="region">{entry.region}</div>
          <h3>{entry.name}</h3>
        </div>
        <DecisionPill value={state} />
      </div>

      <div className="stage-row">
        <div>
          <span className="eyebrow">Now</span>
          <strong>{stageLabel(decision.currentStage)}</strong>
        </div>
        <div>
          <span className="eyebrow">Confidence</span>
          <strong>{friendlyConfidence(decision.confidence)}</strong>
        </div>
      </div>

      <p className="reason">{decision.reason || 'A trustworthy current trip decision is not available yet.'}</p>

      <div className="weekend-line">
        <Clock3 size={15} />
        <span>{weekendCopy(weekend)}</span>
      </div>

      <div className="evidence-row">
        <span><Freshness decision={decision} /></span>
        <span>·</span>
        <span>{displayTypeCopy(entry)}</span>
      </div>

      <div className="card-actions">
        <button type="button" onClick={() => onMap(entry.id)}>
          <MapPin size={15} /> Show on map
        </button>
        {source?.url && (
          <a href={source.url} target="_blank" rel="noreferrer">
            Evidence <ArrowUpRight size={14} />
          </a>
        )}
      </div>

      {decision.displayPotential && decision.displayPotential !== 'normal' && decision.displayPotential !== 'unknown' && (
        <div className="display-warning" style={{ borderColor: tone.border, background: tone.bg, color: tone.fg }}>
          Display potential: {String(decision.displayPotential).replaceAll('_', ' ')}
        </div>
      )}
    </article>
  );
}

function MichiganBloomMap({ destinations, selectedId, onSelect }) {
  return (
    <section className="map-card" aria-labelledby="map-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Drive decision</span>
          <h2 id="map-title">Michigan bloom map</h2>
        </div>
        <span className="map-hint">Tap a marker</span>
      </div>

      <div className="map-stage">
        <div className="state-outline" aria-hidden="true" />
        {destinations.map((entry) => {
          const destination = DESTINATION_BY_ID[entry.id];
          if (!destination) return null;
          const state = entry?.decision?.decision || 'UNKNOWN';
          const tone = DECISION_TONE[state] || DECISION_TONE.UNKNOWN;
          const pos = mapPosition(destination);
          const selected = selectedId === entry.id;
          return (
            <button
              type="button"
              key={entry.id}
              className={`map-marker ${selected ? 'selected' : ''}`}
              style={{ ...pos, '--marker': tone.dot, '--ring': tone.border }}
              onClick={() => onSelect(entry.id)}
              aria-label={`${entry.name}: ${decisionLabel(state)}`}
            >
              <span className="marker-core" />
              <span className="marker-label">{entry.name.replace(' Cherry Blossoms', '').replace('University of Michigan ', 'U-M ')}</span>
            </button>
          );
        })}
      </div>

      <p className="map-note">Markers are tied to the same live decision state as the list below. The map is for destination choice, not turn-by-turn navigation.</p>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="data-empty">
      <Flower2 size={22} />
      <div>
        <strong>Bloom status is loading.</strong>
        <p>The tracker will not substitute a calendar guess for missing live evidence.</p>
      </div>
    </div>
  );
}

export default function BloomTracker({ initialSnapshot = null }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(initialSnapshot?.destinations?.[0]?.id || null);
  const [pageLoadedAt] = useState(() => new Date().toISOString());

  const generatedAt = snapshot?.generatedAt || pageLoadedAt;
  const destinations = useMemo(
    () => sortPublicDestinations(snapshot?.destinations || [], generatedAt),
    [snapshot, generatedAt]
  );
  const useful = destinations.filter((entry) => ['GO', 'GO_BEFORE'].includes(entry?.decision?.decision));
  const allQuiet = destinations.length > 0 && destinations.every((entry) => ['LIMITED', 'UNKNOWN'].includes(entry?.decision?.decision));
  const featured = useful[0] || destinations.find((entry) => entry?.decision?.decision === 'WAIT') || destinations[0] || null;

  useEffect(() => {
    if (!selectedId && destinations[0]?.id) setSelectedId(destinations[0].id);
  }, [destinations, selectedId]);

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch('/api/bloom-latest', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const next = await response.json();
      setSnapshot(next);
      if (!selectedId && next?.destinations?.[0]?.id) setSelectedId(next.destinations[0].id);
    } catch {
      // Keep the last trustworthy snapshot on screen rather than blanking the product.
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!initialSnapshot) refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(timer);
    // This effect is intentionally mounted once; refresh always preserves the last trustworthy snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectOnMap(id) {
    setSelectedId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 760) {
      document.getElementById('bloom-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Michigan Bloom Tracker',
    url: PAGE_URL,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    description: 'Live Michigan flower bloom conditions and weekend viewing decisions using fresh observations, forecast progression, and display durability risk.',
  };

  return (
    <>
      <Head>
        <title>Michigan Bloom Tracker — What’s Blooming Now & This Weekend</title>
        <meta name="description" content="See where Michigan flowers are blooming now, what may peak this weekend, and whether to go or wait for Traverse City cherries, Holland tulips, Mackinac lilacs, peonies and more." />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Michigan Bloom Tracker — What’s Blooming Now" />
        <meta property="og:description" content="Live bloom decisions for Michigan flower destinations: what’s good now, what’s next, and whether the trip is worth it." />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </Head>

      <main className="page-shell">
        <header className="topbar">
          <a className="brand" href="/">Michigan Phenology</a>
          <span className="brand-divider">/</span>
          <strong>Bloom Tracker</strong>
          <button type="button" className="refresh" onClick={refresh} disabled={refreshing} aria-label="Refresh bloom status">
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </header>

        <section className="intro-block">
          <div className="kicker"><Flower2 size={15} /> Michigan Bloom Tracker</div>
          <h1>Where is the best bloom in Michigan right now?</h1>
          <p>Fresh observations + forecast progression + weather durability. No calendar-only peak guesses.</p>
          <div className="updated"><span className="live-dot" /> Updated {formatUpdated(snapshot?.generatedAt)} · {snapshot?.delivery === 'persisted' ? 'banked live snapshot' : snapshot ? 'live check' : 'checking live sources'}</div>
        </section>

        {!snapshot?.destinations?.length ? <EmptyState /> : (
          <>
            {allQuiet ? (
              <section className="featured quiet">
                <div className="featured-label">Current trip verdict</div>
                <h2>No active bloom trip is justified by fresh evidence right now.</h2>
                <p>That can be correct outside the main bloom season. The tracker will move destinations into GO or WAIT only when fresh observations support it.</p>
              </section>
            ) : featured && (
              <section className="featured">
                <div className="featured-label">Best current opportunity</div>
                <div className="featured-grid">
                  <div>
                    <div className="featured-place">{featured.name}</div>
                    <h2>{featured.decision?.reason || 'Current bloom evidence is being evaluated.'}</h2>
                  </div>
                  <DecisionPill value={featured.decision?.decision || 'UNKNOWN'} />
                </div>
                <div className="featured-bottom">
                  <span>{stageLabel(featured.decision?.currentStage)} now</span>
                  <span>·</span>
                  <span>{weekendCopy(selectWeekendForecast(featured.decision?.forecast, generatedAt))}</span>
                </div>
              </section>
            )}

            <div id="bloom-map">
              <MichiganBloomMap destinations={destinations} selectedId={selectedId} onSelect={setSelectedId} />
            </div>

            {selectedId && (
              <section className="selected-strip" aria-live="polite">
                {(() => {
                  const selected = destinations.find((item) => item.id === selectedId);
                  if (!selected) return null;
                  return (
                    <>
                      <div>
                        <span className="eyebrow">Selected on map</span>
                        <strong>{selected.name}</strong>
                      </div>
                      <DecisionPill value={selected.decision?.decision || 'UNKNOWN'} />
                      <button type="button" onClick={() => document.getElementById(`destination-${selected.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>View decision</button>
                    </>
                  );
                })()}
              </section>
            )}

            <section className="decision-list" aria-labelledby="decision-list-title">
              <div className="section-heading list-heading">
                <div>
                  <span className="eyebrow">All tracked displays</span>
                  <h2 id="decision-list-title">What should I do?</h2>
                </div>
                <span className="count">{destinations.length} destinations</span>
              </div>
              <div className="cards">
                {destinations.map((entry) => (
                  <DestinationCard key={entry.id} entry={entry} generatedAt={generatedAt} onMap={selectOnMap} />
                ))}
              </div>
            </section>

            <section className="trust-block">
              <div className="trust-icon"><ShieldCheck size={21} /></div>
              <div>
                <h2>Why this is different from a bloom calendar</h2>
                <p>The tracker starts with a dated observation. Weather can move the expected progression or shorten an existing display, but it cannot manufacture bloom that has not been observed. If the evidence is stale, the answer becomes UNKNOWN.</p>
              </div>
            </section>
          </>
        )}

        <footer>
          <span>Michigan Bloom Tracker</span>
          <a href="/">Explore the natural year in Michigan Phenology</a>
        </footer>
      </main>

      <style jsx>{`
        :global(*){box-sizing:border-box}
        :global(html){scroll-behavior:smooth}
        :global(body){margin:0;background:#f4f1e8;color:#1f291f;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        :global(a){color:inherit}
        .page-shell{width:min(100%,1040px);margin:0 auto;padding:0 16px 56px}
        .topbar{min-height:54px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #d8d3c4;font-size:13px;color:#657065}
        .brand{text-decoration:none}.brand:hover{text-decoration:underline}.brand-divider{color:#b5ae9f}.topbar strong{color:#29362b}
        .refresh{margin-left:auto;border:1px solid #c8c9be;background:#fbfaf5;color:#425045;border-radius:999px;padding:7px 10px;display:flex;align-items:center;gap:6px;font:inherit;font-weight:650;cursor:pointer}.refresh:disabled{opacity:.65}.spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .intro-block{padding:24px 2px 16px}.kicker{display:flex;align-items:center;gap:7px;color:#5a744f;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .intro-block h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(31px,7vw,54px);line-height:.99;letter-spacing:-.035em;margin:10px 0 12px;max-width:790px;color:#1f2e22}
        .intro-block p{font-size:15px;line-height:1.5;color:#626b61;margin:0;max-width:660px}.updated{margin-top:12px;display:flex;align-items:center;gap:7px;color:#7a8178;font-size:12px}.live-dot{width:7px;height:7px;border-radius:50%;background:#4c8a5b;box-shadow:0 0 0 3px rgba(76,138,91,.12)}
        .featured{border:1px solid #b8cfb9;border-radius:16px;background:#f7fbf6;padding:16px;margin:6px 0 16px}.featured.quiet{border-color:#d4cec0;background:#faf8f2}.featured-label,.eyebrow{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7c8679;margin-bottom:5px}
        .featured-grid{display:flex;align-items:flex-start;gap:12px}.featured-place{font-size:13px;font-weight:800;color:#3b5941;margin-bottom:4px}.featured h2{font-size:20px;line-height:1.25;margin:0;font-family:Georgia,"Times New Roman",serif;color:#273229}.featured-grid .decision-pill{margin-left:auto;flex-shrink:0}.featured-bottom{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;color:#667165;font-size:12.5px}
        .decision-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid;border-radius:999px;padding:6px 9px;font-size:9.5px;font-weight:900;letter-spacing:.055em;white-space:nowrap}.decision-dot{width:7px;height:7px;border-radius:50%}
        .map-card{background:#eef4ee;border:1px solid #cbd7cc;border-radius:18px;padding:14px;margin:0 0 12px;overflow:hidden}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:10px}.section-heading h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:23px;color:#263329}.map-hint,.count{font-size:11.5px;color:#788177;white-space:nowrap}
        .map-stage{position:relative;width:100%;aspect-ratio:1.6/1;border-radius:14px;overflow:hidden;background:#dce8e5 url('https://geomapsuite.com/maps/blank/michigan.svg') center/92% auto no-repeat;border:1px solid #c5d2cd;isolation:isolate}.map-stage:after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.35),rgba(210,226,219,.08));pointer-events:none;z-index:1}.state-outline{position:absolute;inset:0;box-shadow:inset 0 0 70px rgba(55,82,68,.08);pointer-events:none}
        .map-marker{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;padding:0;z-index:4;cursor:pointer;display:flex;align-items:center;gap:5px}.marker-core{width:15px;height:15px;border-radius:50%;background:var(--marker);border:3px solid #fff;box-shadow:0 0 0 3px var(--ring),0 2px 8px rgba(25,45,34,.22);transition:transform .15s ease}.map-marker.selected .marker-core{transform:scale(1.28)}.marker-label{background:rgba(253,252,247,.92);border:1px solid rgba(126,145,132,.4);border-radius:6px;padding:3px 5px;font-size:9px;line-height:1.05;font-weight:800;color:#344438;max-width:95px;text-align:left;box-shadow:0 1px 4px rgba(20,40,30,.08)}.map-note{font-size:11.5px;color:#738078;line-height:1.4;margin:9px 2px 0}
        .selected-strip{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #d3d4c7;border-radius:12px;background:#fbfaf5;padding:10px 12px;margin-bottom:18px}.selected-strip strong{display:block;font-size:13.5px}.selected-strip button{grid-column:1/-1;border:0;background:#e9eee8;border-radius:8px;padding:8px;font:inherit;font-size:12px;font-weight:750;color:#35503d;cursor:pointer}
        .decision-list{padding-top:4px}.list-heading{margin:0 2px 10px}.cards{display:grid;grid-template-columns:1fr;gap:10px}.destination-card{background:#fffdf8;border:1px solid #dad5c8;border-radius:15px;padding:15px;scroll-margin-top:16px;box-shadow:0 2px 10px rgba(42,52,43,.035)}.card-topline{display:flex;align-items:flex-start;gap:10px}.region{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.075em;color:#8a8e83}.destination-card h3{font-family:Georgia,"Times New Roman",serif;font-size:19px;line-height:1.15;margin:3px 0 0;color:#29332b}.card-topline .decision-pill{margin-left:auto;flex-shrink:0}.stage-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #ece7dc;border-bottom:1px solid #ece7dc;margin:13px 0 11px;padding:10px 0}.stage-row strong{display:block;font-size:13px;color:#354137}.reason{font-size:14px;line-height:1.45;color:#48534a;margin:0 0 10px}.weekend-line{display:flex;align-items:flex-start;gap:7px;color:#4a644e;background:#f1f6ef;border-radius:9px;padding:9px 10px;font-size:12.5px;line-height:1.35}.weekend-line svg{flex:0 0 auto;margin-top:1px}.evidence-row{display:flex;flex-wrap:wrap;gap:6px;color:#7b8278;font-size:11px;margin-top:9px}.card-actions{display:flex;gap:8px;margin-top:12px}.card-actions button,.card-actions a{display:inline-flex;align-items:center;gap:5px;border-radius:8px;padding:8px 10px;font:inherit;font-size:11.5px;font-weight:800;text-decoration:none;cursor:pointer}.card-actions button{border:1px solid #c7d2c8;background:#f6faf5;color:#3d5943}.card-actions a{border:1px solid #ddd5c5;background:#fffaf0;color:#635a48}.display-warning{margin-top:10px;border:1px solid;border-radius:8px;padding:7px 9px;font-size:11.5px;text-transform:capitalize}
        .trust-block{display:flex;gap:12px;margin:24px 0 10px;border-top:1px solid #d9d4c8;padding-top:20px}.trust-icon{width:38px;height:38px;border-radius:10px;background:#e8efe7;color:#476149;display:grid;place-items:center;flex:0 0 auto}.trust-block h2{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:0 0 5px}.trust-block p{margin:0;color:#667066;font-size:13px;line-height:1.5;max-width:730px}.data-empty{display:flex;gap:11px;border:1px solid #d5cec0;background:#fbf8f1;border-radius:14px;padding:16px;color:#5a625a}.data-empty strong{display:block}.data-empty p{margin:4px 0 0;font-size:13px;line-height:1.4}
        footer{margin-top:30px;padding-top:16px;border-top:1px solid #d9d4c8;display:flex;flex-direction:column;gap:7px;font-size:11.5px;color:#7c837a}footer a{color:#506552}
        @media(min-width:720px){.page-shell{padding-left:24px;padding-right:24px}.intro-block{padding-top:34px}.featured{padding:19px 20px}.cards{grid-template-columns:1fr 1fr}.map-card{padding:17px}.marker-label{font-size:10px;max-width:120px}.selected-strip{grid-template-columns:1fr auto auto}.selected-strip button{grid-column:auto}.destination-card{padding:17px}}
        @media(max-width:430px){.topbar .brand-divider,.topbar .brand{display:none}.intro-block h1{font-size:34px}.featured-grid{display:block}.featured-grid .decision-pill{margin-top:10px}.map-stage{aspect-ratio:1.28/1;background-size:112% auto}.marker-label{display:none}.map-marker.selected .marker-label{display:block;position:absolute;left:18px;top:-7px;width:100px}.card-topline{display:block}.card-topline .decision-pill{margin-top:9px}.stage-row{margin-top:11px}.decision-pill{font-size:9px}.card-actions{flex-wrap:wrap}}
        @media(prefers-reduced-motion:reduce){:global(html){scroll-behavior:auto}.spin{animation:none}.marker-core{transition:none}}
      `}</style>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const { readBloomLatest } = await import('../lib/bloom/history-store.mjs');
    const stored = await readBloomLatest({ fetchImpl: fetch });
    if (stored.ok && stored.value) {
      return { props: { initialSnapshot: { ...stored.value, delivery: 'persisted' } } };
    }
  } catch {
    // SSR should never block the public product on live source acquisition.
  }
  return { props: { initialSnapshot: null } };
}
