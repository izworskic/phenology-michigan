import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Clock3, Flower2, LocateFixed, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { BLOOM_DESTINATIONS } from '../lib/bloom/destinations.mjs';
import { getBloomExperience, photoFitLabel } from '../lib/bloom/experience-layer.mjs';
import { selectWeekendForecast, sortPublicDestinations, stageLabel, stageRangeLabel } from '../lib/bloom/public-presentation.mjs';
import { decisionCounts, evidenceStrength, freshnessLabel, goBeforeWindow, humanDecisionLabel, shortDecisionLabel } from '../lib/bloom/tracker-product.mjs';

const SITE = 'https://phenology.chrisizworski.com';
const PAGE_URL = `${SITE}/bloom-tracker`;
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

const MAP = Object.freeze({
  west: -90.7,
  east: -82.05,
  south: 41.55,
  north: 48.2,
  width: 1000,
  height: 760,
  pad: 26,
});

function mercatorY(lat) {
  const radians = (Math.max(-85, Math.min(85, Number(lat))) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function projectCoordinate(lon, lat) {
  const innerWidth = MAP.width - MAP.pad * 2;
  const innerHeight = MAP.height - MAP.pad * 2;
  const x = MAP.pad + ((Number(lon) - MAP.west) / (MAP.east - MAP.west)) * innerWidth;
  const northY = mercatorY(MAP.north);
  const southY = mercatorY(MAP.south);
  const y = MAP.pad + ((northY - mercatorY(lat)) / (northY - southY)) * innerHeight;
  return [x, y];
}

function ringToPath(ring = []) {
  if (!Array.isArray(ring) || ring.length < 2) return '';
  return ring.map(([lon, lat], index) => {
    const [x, y] = projectCoordinate(lon, lat);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function geometryPaths(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates.map(ringToPath).join(' ')];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon.map(ringToPath).join(' '));
  }
  return [];
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

function ExperiencePhoto({ photo }) {
  return (
    <figure className={`experience-photo experience-photo-${photo.kind}`}>
      <div className="experience-image-wrap">
        <img src={photo.imageUrl} alt={photo.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        <span className="experience-photo-fit">{photoFitLabel(photo.kind)}</span>
      </div>
      <figcaption>
        <span className="experience-file-label">File photo — not live</span>
        <span>{photo.caption}</span>
        <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.creator} · {photo.license} <ArrowUpRight size={11} /></a>
      </figcaption>
    </figure>
  );
}

function ExperienceCard({ entry }) {
  const experience = getBloomExperience(entry.id);
  if (!experience) return null;
  const state = entry?.decision?.decision || 'UNKNOWN';
  return (
    <article className="experience-card">
      <div className="experience-card-head">
        <div>
          <span className="region">{entry.region}</span>
          <h3>{entry.name}</h3>
        </div>
        <DecisionPill value={state} compact />
      </div>
      <p className="experience-headline">{experience.headline}</p>
      <div className={`experience-media experience-media-${experience.photos.length}`}>
        {experience.photos.map((photo) => <ExperiencePhoto key={`${entry.id}-${photo.sourceUrl}`} photo={photo} />)}
      </div>
      <div className="experience-copy">
        <div>
          <span className="eyebrow">What you’ll actually experience</span>
          <p>{experience.whatYouWillSee}</p>
        </div>
        <div>
          <span className="eyebrow">Best way to see it</span>
          <p>{experience.bestExperience}</p>
        </div>
        <div className="experience-look-for"><strong>Look for:</strong> {experience.lookFor}</div>
      </div>
      <a className="experience-source-link" href={experience.experienceSource.url} target="_blank" rel="noreferrer">
        Local experience source: {experience.experienceSource.label} <ArrowUpRight size={13} />
      </a>
    </article>
  );
}

function ExperienceSection({ destinations }) {
  return (
    <section className="experience-section" aria-labelledby="experience-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Experience layer</span>
          <h2 id="experience-title">What will the trip actually feel like?</h2>
        </div>
        <span className="count">Swipe destinations →</span>
      </div>
      <p className="section-intro">The ranking above answers whether to go. This layer makes that decision tangible: what the flowers look like, how the place feels, and where to spend your time once you arrive.</p>
      <div className="experience-trust"><ShieldCheck size={15} /><span><strong>Decision first.</strong> These are reference/file photos, not current-condition evidence. The live bloom call above is still the source of truth for whether to make the drive.</span></div>
      <div className="experience-grid">
        {destinations.map((entry) => <ExperienceCard key={entry.id} entry={entry} />)}
      </div>
    </section>
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
  const [selectedId, setSelectedId] = useState(null);
  const [geography, setGeography] = useState(null);
  const [mapState, setMapState] = useState('loading');
  const selected = destinations.find((entry) => entry.id === selectedId) || null;
  const waveEntry = destinations.find((entry) => Array.isArray(entry.zoneStatus) && entry.zoneStatus.length > 1) || null;

  useEffect(() => {
    let cancelled = false;
    fetch('/maps/great-lakes-context.geojson', { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setGeography(data);
        setMapState('ready');
      })
      .catch(() => {
        if (!cancelled) setMapState('error');
      });
    return () => { cancelled = true; };
  }, []);

  const wavePath = useMemo(() => {
    if (!waveEntry) return '';
    return waveEntry.zoneStatus.map((zone, index) => {
      const [x, y] = projectCoordinate(zone.coordinates.lon, zone.coordinates.lat);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [waveEntry]);

  return (
    <section className="map-section" aria-labelledby="map-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Geographic comparison</span>
          <h2 id="map-title">Where is the bloom happening?</h2>
        </div>
        <span className="map-hint"><MapPin size={14} /> Tap one marker</span>
      </div>
      <p className="section-intro">Use the map for the question geography actually changes: what is blooming north versus south, where active opportunities cluster, and — when evidence supports it — how a bloom wave is moving.</p>
      <div className="map-frame census-map-frame">
        {mapState === 'loading' && <div className="map-loading">Loading Michigan geography…</div>}
        {mapState === 'error' && (
          <div className="map-fallback">
            <MapPin size={22} />
            <strong>Map unavailable.</strong>
            <span>The trip rankings above remain usable. No substitute silhouette is shown.</span>
          </div>
        )}
        {mapState === 'ready' && geography && (
          <svg className="census-map" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="img" aria-label="Michigan and neighboring states with current bloom destinations">
            <rect width={MAP.width} height={MAP.height} fill="#dbe8e5" />
            <g aria-hidden="true">
              {geography.features?.flatMap((feature) => geometryPaths(feature.geometry).map((path, index) => (
                <path
                  key={`${feature.properties?.geoid || feature.properties?.name}-${index}`}
                  d={path}
                  fill={feature.properties?.geoid === '26' ? '#f3efe2' : '#e7e2d6'}
                  stroke={feature.properties?.geoid === '26' ? '#72877b' : '#a8afa8'}
                  strokeWidth={feature.properties?.geoid === '26' ? '2.2' : '1.3'}
                  vectorEffect="non-scaling-stroke"
                />
              )))}
              <text x={projectCoordinate(-87.25, 46.65)[0]} y={projectCoordinate(-87.25, 46.65)[1]} className="map-region-label">UPPER PENINSULA</text>
              <text x={projectCoordinate(-84.65, 44.15)[0]} y={projectCoordinate(-84.65, 44.15)[1]} className="map-region-label">LOWER PENINSULA</text>
            </g>

            {waveEntry && (
              <g aria-label="Traverse City regional bloom progression">
                <path d={wavePath} fill="none" stroke="#53695a" strokeWidth="4" strokeDasharray="9 8" opacity="0.65" vectorEffect="non-scaling-stroke" />
                {waveEntry.zoneStatus.map((zone) => {
                  const [x, y] = projectCoordinate(zone.coordinates.lon, zone.coordinates.lat);
                  return (
                    <g key={zone.name} transform={`translate(${x} ${y})`}>
                      <circle r="12" fill="#fffdf8" stroke="#ffffff" strokeWidth="4" />
                      <circle r="8" fill={STAGE_TONE[zone.stage] || '#777d78'} />
                      <title>{zone.name}: {stageLabel(zone.stage)}</title>
                    </g>
                  );
                })}
              </g>
            )}

            {destinations.map((entry) => {
              const destination = DESTINATION_BY_ID[entry.id];
              if (!destination?.coordinates) return null;
              const [x, y] = projectCoordinate(destination.coordinates.lon, destination.coordinates.lat);
              const state = entry?.decision?.decision || 'UNKNOWN';
              const tone = DECISION_TONE[state] || DECISION_TONE.UNKNOWN;
              const selectedMarker = selectedId === entry.id;
              const activate = () => setSelectedId(entry.id);
              return (
                <g
                  key={entry.id}
                  transform={`translate(${x} ${y})`}
                  role="button"
                  tabIndex="0"
                  aria-label={`${entry.name}: ${humanDecisionLabel(state)}`}
                  onClick={activate}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      activate();
                    }
                  }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  <circle r="28" fill="transparent" />
                  <circle r={selectedMarker ? '19' : '17'} fill="#fffdf8" stroke={selectedMarker ? '#263b2c' : tone.border} strokeWidth={selectedMarker ? '4' : '3'} />
                  <circle r="9" fill={tone.dot} />
                  <title>{entry.name}: {humanDecisionLabel(state)}</title>
                </g>
              );
            })}
          </svg>
        )}
        <MapSelectedPanel entry={selected} generatedAt={generatedAt} onClose={() => setSelectedId(null)} />
      </div>
      <div className="map-legend" aria-label="Map decision legend">
        {Object.entries({ GO: 'Worth the drive', GO_BEFORE: 'Go soon', WAIT: 'Wait', LIMITED: 'Limited', UNKNOWN: 'Uncertain' }).map(([state, label]) => (
          <span key={state}><i style={{ background: DECISION_TONE[state].dot }} />{label}</span>
        ))}
      </div>
      {waveEntry && (
        <div className="wave-legend" aria-label="Bloom wave stage legend">
          <span className="wave-note"><LocateFixed size={14} /> Traverse City wave:</span>
          {waveEntry.zoneStatus.map((zone) => (
            <span key={zone.name}><i style={{ background: STAGE_TONE[zone.stage] || '#777d78' }} />{zone.name.replace('Northern Leelanau / ', '')}: {stageLabel(zone.stage)}</span>
          ))}
        </div>
      )}
      <p className="map-source">Geography: U.S. Census Bureau TIGERweb. Markers use destination coordinates from the bloom model.</p>
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
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Michigan Bloom Tracker',
    url: PAGE_URL,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    description: 'Live Michigan flower bloom conditions and weekend trip decisions using fresh observations, forecast progression, display durability risk, and destination experience context.',
  };

  return (
    <>
      <Head>
        <title>Michigan Bloom Tracker — Best Blooms This Weekend</title>
        <meta name="description" content="See the best Michigan flower blooms right now and this weekend, including Traverse City cherries, Holland tulips, Mackinac lilacs, U-M peonies and Meijer Gardens — with destination photos and what the trip actually feels like." />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Michigan Bloom Tracker — Best Blooms This Weekend" />
        <meta property="og:description" content="A decision-first Michigan bloom tracker: what is worth the drive, what you will actually see, and where the bloom is happening." />
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

            <ExperienceSection destinations={destinations} />

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
        :global(a){color:inherit}
        .page-shell{width:min(100%,1040px);margin:0 auto;padding:0 16px 56px}
        .topbar{min-height:52px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #d8d3c4;font-size:13px;color:#657065}.brand{text-decoration:none}.brand:hover{text-decoration:underline}.brand-divider{color:#b5ae9f}.topbar strong{color:#29362b}.fixture-badge{font-size:9px;font-weight:900;letter-spacing:.08em;color:#725713;background:#fff4c9;border:1px solid #dbc675;border-radius:999px;padding:4px 7px}.refresh{margin-left:auto;border:1px solid #c8c9be;background:#fbfaf5;color:#425045;border-radius:999px;padding:7px 10px;display:flex;align-items:center;gap:6px;font:inherit;font-weight:700;cursor:pointer}.refresh:disabled{opacity:.55}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .intro-block{padding:20px 2px 13px}.kicker{display:flex;align-items:center;gap:7px;color:#5a744f;font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.intro-block h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,6.5vw,48px);line-height:1.01;letter-spacing:-.03em;margin:8px 0 8px;max-width:760px;color:#1f2e22}.intro-block p{font-size:14px;line-height:1.45;color:#626b61;margin:0;max-width:680px}.updated{margin-top:10px;display:flex;align-items:center;gap:7px;color:#777f76;font-size:11.5px}.live-dot{width:7px;height:7px;border-radius:50%;background:#4c8a5b;box-shadow:0 0 0 3px rgba(76,138,91,.12)}
        .featured{border:1px solid #abcaae;border-radius:15px;background:#f8fbf6;padding:15px 16px;margin:4px 0 10px}.featured-quiet{border-color:#d2ccbf;background:#faf8f2}.featured-topline{display:flex;align-items:center;justify-content:space-between;gap:10px}.featured-label,.eyebrow{display:block;font-size:10px;font-weight:850;letter-spacing:.09em;text-transform:uppercase;color:#7c8679;margin-bottom:4px}.featured-place{font-size:13px;font-weight:850;color:#3b5941;margin:7px 0 3px}.featured h2{font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:1.25;margin:0;color:#273229}.featured p{font-size:13px;color:#667066;margin:8px 0 0}.featured-bottom{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;color:#657064;font-size:12px}
        .status-strip{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d5d2c7;border-radius:12px;background:#fbfaf5;margin-bottom:17px;overflow:hidden}.status-strip div{padding:9px 7px;text-align:center;border-right:1px solid #e2ded3}.status-strip div:last-child{border-right:0}.status-strip strong{display:block;font:700 19px Georgia,"Times New Roman",serif;color:#2e3b31}.status-strip span{display:block;font-size:9px;line-height:1.15;color:#777f76;margin-top:2px}
        .section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:7px}.section-heading h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:23px;color:#263329}.count{font-size:11px;color:#778078;white-space:nowrap}.opportunity-section{margin:0 0 20px}.opportunity-list{border-top:1px solid #d7d2c5}
        .details-section{margin:0 0 24px}.details-list{border-top:1px solid #d5d1c5}
        .trust-block{display:flex;gap:12px;margin:25px 0 10px;border-top:1px solid #d9d4c8;padding-top:20px}.trust-icon{width:38px;height:38px;border-radius:10px;background:#e8efe7;color:#476149;display:grid;place-items:center;flex:0 0 auto}.trust-block h2{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:0 0 5px}.trust-block p{margin:0;color:#667066;font-size:12.5px;line-height:1.5;max-width:760px}
        footer{margin-top:30px;padding-top:16px;border-top:1px solid #d9d4c8;display:flex;flex-direction:column;gap:7px;font-size:11.5px;color:#7c837a}footer a{color:#506552}
        @media(min-width:720px){.page-shell{padding-left:24px;padding-right:24px}.intro-block{padding-top:28px}.featured{padding:17px 19px}.featured h2{font-size:22px}}
        @media(max-width:430px){.topbar .brand-divider,.topbar .brand{display:none}.intro-block h1{font-size:31px}.status-strip span{font-size:8.5px}.fixture-badge{display:none}}
        @media(prefers-reduced-motion:reduce){:global(html){scroll-behavior:auto}.spin{animation:none}}
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
