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

function preferredPhoto(experience) {
  const photos = experience?.photos || [];
  return photos.find((photo) => photo.kind === 'exact-bloom')
    || photos.find((photo) => photo.kind === 'location-setting')
    || photos[0]
    || null;
}

function ExperienceThumbnail({ photo, eager = false }) {
  if (!photo) return null;
  return (
    <figure className="opportunity-thumb" title={`${photoFitLabel(photo.kind)} · file photo, not live`}>
      <img src={photo.imageUrl} alt={photo.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" />
      <figcaption>File photo</figcaption>
    </figure>
  );
}

function ExperienceGallery({ experience }) {
  const photos = experience?.photos || [];
  if (!photos.length) return null;
  return (
    <div className={`trip-gallery trip-gallery-${photos.length}`}>
      {photos.map((photo) => (
        <figure className="trip-photo" key={photo.sourceUrl}>
          <div className="trip-photo-frame">
            <img src={photo.imageUrl} alt={photo.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            <span>{photoFitLabel(photo.kind)}</span>
          </div>
          <figcaption>
            <strong>File photo — not live.</strong> {photo.caption}
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.creator} · {photo.license} <ArrowUpRight size={11} /></a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function OpportunityCard({ entry, rank, generatedAt }) {
  const decision = entry?.decision || {};
  const state = decision.decision || 'UNKNOWN';
  const experience = getBloomExperience(entry.id);
  const photo = preferredPhoto(experience);
  const weekend = selectWeekendForecast(decision.forecast, generatedAt);
  const source = decision.source || entry?.observation?.source || null;

  return (
    <article className="opportunity-card" data-state={state}>
      <div className="opportunity-card-summary">
        <div className="rank" aria-hidden="true">{rank}</div>
        <div className="opportunity-main">
          <div className="opportunity-titleline">
            <div>
              <span className="region">{entry.region}</span>
              <h3>{entry.name}</h3>
            </div>
            <DecisionPill value={state} compact />
          </div>
          {experience?.headline && <p className="opportunity-experience">{experience.headline}</p>}
          <p className="opportunity-reason">{decision.reason || 'A trustworthy current trip call is not available yet.'}</p>
          <div className="opportunity-meta">
            <strong>{stageLabel(decision.currentStage)} now</strong>
            <span>·</span>
            <span>{weekendCopy(decision, generatedAt)}</span>
            <span>·</span>
            <EvidenceFreshness decision={decision} />
          </div>
        </div>
        <ExperienceThumbnail photo={photo} eager={rank <= 2} />
      </div>

      <details className="opportunity-more" id={`details-${entry.id}`}>
        <summary>
          <span>See the place + evidence</span>
          <ChevronDown className="opportunity-chevron" size={16} />
        </summary>
        <div className="opportunity-expanded">
          {experience && (
            <div className="trip-story">
              <ExperienceGallery experience={experience} />
              <div className="trip-copy">
                <span className="eyebrow">What the trip feels like</span>
                <p>{experience.whatYouWillSee}</p>
                <p><strong>Best move:</strong> {experience.bestExperience}</p>
                <p className="trip-look"><strong>Look for:</strong> {experience.lookFor}</p>
              </div>
            </div>
          )}

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

          <div className="trip-links">
            {experience?.experienceSource?.url && (
              <a href={experience.experienceSource.url} target="_blank" rel="noreferrer">Visitor context: {experience.experienceSource.label} <ArrowUpRight size={13} /></a>
            )}
            {source?.url && <a href={source.url} target="_blank" rel="noreferrer">Live bloom evidence <ArrowUpRight size={13} /></a>}
          </div>
          <p className="photo-truth"><ShieldCheck size={13} /> Photos help you picture the place. They are not used as current bloom evidence.</p>
        </div>
      </details>
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
  const featuredExperience = featured ? getBloomExperience(featured.id) : null;
  const featuredPhoto = preferredPhoto(featuredExperience);

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
    description: 'Live Michigan flower bloom conditions and weekend trip decisions using fresh observations, forecast progression, display durability risk, and restrained destination photo context.',
  };

  return (
    <>
      <Head>
        <title>Michigan Bloom Tracker — Best Blooms This Weekend</title>
        <meta name="description" content="See the best Michigan flower blooms right now and this weekend, including Traverse City cherries, Holland tulips, Mackinac lilacs, U-M peonies and Meijer Gardens, with photos and trip context built into each live decision." />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:title" content="Michigan Bloom Tracker — Best Blooms This Weekend" />
        <meta property="og:description" content="A decision-first Michigan bloom tracker: what is worth the drive, what the place is actually like, and where the bloom is happening." />
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
                <div className="featured-grid">
                  <div className="featured-copy">
                    <div className="featured-place">{featured.name}</div>
                    <h2>{featured.decision?.reason || humanDecisionLabel(featured.decision?.decision || 'UNKNOWN')}</h2>
                    {featuredExperience?.headline && <p className="featured-experience">{featuredExperience.headline}</p>}
                    <div className="featured-bottom">
                      <span><strong>{stageLabel(featured.decision?.currentStage)}</strong> now</span>
                      <span>·</span><span>{weekendCopy(featured.decision, generatedAt)}</span>
                      <span>·</span><EvidenceFreshness decision={featured.decision} />
                    </div>
                  </div>
                  {featuredPhoto && (
                    <figure className="featured-photo">
                      <img src={featuredPhoto.imageUrl} alt={featuredPhoto.alt} loading="eager" decoding="async" referrerPolicy="no-referrer" />
                      <figcaption>{photoFitLabel(featuredPhoto.kind)} · file photo</figcaption>
                    </figure>
                  )}
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
              <p className="opportunity-intro">The live decision stays primary. Each place gets just enough visual context to show what you are driving toward; expand only the destinations you care about.</p>
              <div className="opportunity-list">
                {destinations.map((entry, index) => <OpportunityCard key={entry.id} entry={entry} rank={index + 1} generatedAt={generatedAt} />)}
              </div>
            </section>

            <MichiganBloomMap destinations={destinations} generatedAt={generatedAt} />

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
        .section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:7px}.section-heading h2{font-family:Georgia,"Times New Roman",serif;margin:0;font-size:23px;color:#263329}.count{font-size:11px;color:#778078;white-space:nowrap}.opportunity-section{margin:0 0 22px}.opportunity-intro{font-size:12.5px;line-height:1.45;color:#697269;margin:0 0 10px;max-width:760px}.opportunity-list{display:grid;gap:9px}
        .trust-block{display:flex;gap:12px;margin:25px 0 10px;border-top:1px solid #d9d4c8;padding-top:20px}.trust-icon{width:38px;height:38px;border-radius:10px;background:#e8efe7;color:#476149;display:grid;place-items:center;flex:0 0 auto}.trust-block h2{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:0 0 5px}.trust-block p{margin:0;color:#667066;font-size:12.5px;line-height:1.5;max-width:760px}
        footer{margin-top:30px;padding-top:16px;border-top:1px solid #d9d4c8;display:flex;flex-direction:column;gap:7px;font-size:11.5px;color:#7c837a}footer a{color:#506552}
        @media(min-width:720px){.page-shell{padding-left:24px;padding-right:24px}.intro-block{padding-top:28px}.featured{padding:17px 19px}.featured h2{font-size:22px}}
        @media(max-width:430px){.topbar .brand-divider,.topbar .brand{display:none}.intro-block h1{font-size:31px}.status-strip span{font-size:8.5px}.fixture-badge{display:none}}
        @media(prefers-reduced-motion:reduce){:global(html){scroll-behavior:auto}.spin{animation:none}}
      `}</style>

      <style jsx global>{`
        .featured-grid{display:grid;grid-template-columns:minmax(0,1fr) 104px;gap:12px;align-items:start}.featured-copy{min-width:0}.featured-experience{font:600 12.5px/1.38 Georgia,"Times New Roman",serif!important;color:#4b5a4d!important;margin-top:7px!important}.featured-photo{margin:7px 0 0;border:1px solid #d2d8cf;border-radius:10px;overflow:hidden;background:#eef1eb}.featured-photo img{display:block;width:100%;height:86px;object-fit:cover}.featured-photo figcaption{padding:5px 6px;color:#7b837b;font-size:8px;line-height:1.2;background:#fbfaf5}
        .opportunity-card{border:1px solid #d7d3c7;border-radius:14px;background:#fbfaf5;overflow:hidden}.opportunity-card[data-state="GO"],.opportunity-card[data-state="GO_BEFORE"]{border-color:#b8cdbb;background:#fcfdf9}.opportunity-card-summary{display:grid;grid-template-columns:27px minmax(0,1fr) 92px;gap:9px;align-items:start;padding:11px}.opportunity-card .rank{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#e7ece4;color:#536052;font-size:11px;font-weight:850;margin-top:1px}.opportunity-card .region{display:block;font-size:9.5px;font-weight:850;text-transform:uppercase;letter-spacing:.075em;color:#858a82}.opportunity-card h3{font-family:Georgia,"Times New Roman",serif;font-size:17px;line-height:1.14;margin:2px 0 0;color:#29342b}.opportunity-titleline{display:flex;align-items:flex-start;gap:8px}.opportunity-titleline>div{min-width:0}.opportunity-titleline .decision-pill{margin-left:auto}.opportunity-experience{font:600 12.5px/1.35 Georgia,"Times New Roman",serif;color:#516052;margin:6px 0 4px}.opportunity-reason{font-size:12px;line-height:1.38;color:#4f5951;margin:0 0 5px}.opportunity-meta{display:flex;flex-wrap:wrap;gap:4px;color:#727b72;font-size:10px;line-height:1.35}.opportunity-meta strong{color:#4d5b4f}.opportunity-thumb{position:relative;margin:0;border-radius:9px;overflow:hidden;border:1px solid #d1d4cc;background:#e5e8e1;aspect-ratio:1/1}.opportunity-thumb img{display:block;width:100%;height:100%;object-fit:cover}.opportunity-thumb figcaption{position:absolute;left:5px;bottom:5px;background:rgba(33,43,35,.78);color:#fff;border-radius:999px;padding:3px 5px;font-size:7.5px;font-weight:800;line-height:1;backdrop-filter:blur(4px)}
        .opportunity-more{border-top:1px solid #e0ddd3}.opportunity-more>summary{list-style:none;display:flex;align-items:center;justify-content:flex-end;gap:5px;padding:8px 11px;color:#526554;font-size:10.5px;font-weight:800;cursor:pointer}.opportunity-more>summary::-webkit-details-marker{display:none}.opportunity-chevron{transition:transform .16s ease}.opportunity-more[open] .opportunity-chevron{transform:rotate(180deg)}.opportunity-expanded{padding:2px 11px 13px}.trip-story{display:grid;gap:11px}.trip-gallery{display:grid;gap:5px}.trip-gallery-2{grid-template-columns:1fr 1fr}.trip-photo{margin:0;min-width:0;border:1px solid #dedbd1;border-radius:10px;overflow:hidden;background:#fffdf8}.trip-photo-frame{position:relative;aspect-ratio:4/3;overflow:hidden;background:#e8e7e0}.trip-photo-frame img{display:block;width:100%;height:100%;object-fit:cover}.trip-photo-frame>span{position:absolute;left:6px;top:6px;background:rgba(31,42,34,.82);color:#fff;border-radius:999px;padding:4px 6px;font-size:8px;font-weight:850;line-height:1.1}.trip-photo figcaption{padding:7px 8px;color:#717971;font-size:9px;line-height:1.35}.trip-photo figcaption strong{color:#566158}.trip-photo figcaption a{display:flex;align-items:center;gap:3px;margin-top:4px;width:max-content;max-width:100%;color:#536756;font-weight:750;text-decoration:none}.trip-copy{padding:2px 1px}.trip-copy .eyebrow{display:block;font-size:9px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#7c8679;margin-bottom:4px}.trip-copy p{font-size:12px;line-height:1.48;color:#4d584f;margin:0 0 8px}.trip-copy strong{color:#35463a}.trip-look{padding-top:7px;border-top:1px dotted #d7d3c8}.trip-links{display:flex;flex-wrap:wrap;gap:7px 14px;margin-top:10px}.trip-links a{display:inline-flex;align-items:center;gap:4px;color:#4e6652;font-size:10.5px;font-weight:800;text-decoration:none}.photo-truth{display:flex;align-items:flex-start;gap:6px;color:#7c837b;font-size:9.5px;line-height:1.35;margin:9px 0 0}.photo-truth svg{flex:0 0 auto;margin-top:1px}
        @media(min-width:720px){.featured-grid{grid-template-columns:minmax(0,1fr) 178px;gap:18px}.featured-photo img{height:118px}.opportunity-card-summary{grid-template-columns:32px minmax(0,1fr) 132px;gap:12px;padding:13px 14px}.opportunity-thumb{aspect-ratio:4/3}.opportunity-card h3{font-size:18px}.opportunity-experience{font-size:13px}.opportunity-reason{font-size:12.5px}.opportunity-more>summary{padding:8px 14px}.opportunity-expanded{padding:4px 14px 15px}.trip-story{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:start}.trip-copy{padding:2px 5px}.trip-copy p{font-size:12.5px}}
        @media(max-width:430px){.featured-grid{grid-template-columns:minmax(0,1fr) 96px;gap:10px}.featured-photo img{height:82px}.featured-photo figcaption{font-size:7.5px}.opportunity-card-summary{grid-template-columns:24px minmax(0,1fr) 82px;gap:8px;padding:10px}.opportunity-titleline{display:block}.opportunity-titleline .decision-pill{margin-top:5px}.opportunity-card h3{font-size:16px}.opportunity-experience{font-size:12px}.opportunity-reason{font-size:11.5px}.opportunity-meta{font-size:9.5px}.trip-gallery-2{grid-template-columns:1fr 1fr}.trip-photo figcaption{font-size:8.5px}.trip-photo-frame>span{font-size:7px}.trip-copy p{font-size:11.5px}.opportunity-more>summary{justify-content:flex-start;padding-left:42px}}
        @media(prefers-reduced-motion:reduce){.opportunity-chevron{transition:none}}
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
