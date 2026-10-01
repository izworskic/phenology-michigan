from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, got {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def assert_absent(path, needle):
    if needle in Path(path).read_text():
        raise SystemExit(f"{path}: unexpected text remains: {needle!r}")


# --- Map behavior: remove route-like lines entirely. ---
replace_once(
    'public/bloom-map-v2.js',
    """  function addSeasonSequence(records) {
    const sequence = [...records].sort((a, b) => DESTINATIONS[a.id].order - DESTINATIONS[b.id].order);
    for (let index = 0; index < sequence.length - 1; index += 1) {
      const a = DESTINATIONS[sequence[index].id];
      const b = DESTINATIONS[sequence[index + 1].id];
      window.L.polyline([[a.lat, a.lon], [b.lat, b.lon]], { color: b.seasonColor, weight: 4, opacity: 0.55, dashArray: '7 8', interactive: false }).addTo(map);
    }
  }

""",
    '',
)
replace_once(
    'public/bloom-map-v2.js',
    "    window.L.polyline(points.map((point) => point.latlng), { pane: 'bloomEnergyPane', color: '#755c68', weight: 2, opacity: 0.24, dashArray: '4 7', interactive: false }).addTo(map);\n",
    '',
)
replace_once(
    'public/bloom-map-v2.js',
    """    const closest = closestWorthGoing(records);
    if (closest) {
      const destination = DESTINATIONS[closest.id];
      window.L.polyline([[origin.lat, origin.lon], [destination.lat, destination.lon]], { color: '#233bff', weight: 2, opacity: 0.52, dashArray: '6 7', interactive: false }).addTo(map);
    }
""",
    '',
)
replace_once(
    'public/bloom-map-v2.js',
    """      if (seasonal) addSeasonSequence(records);
      else addBloomIntensitySurface(records);
""",
    "      if (!seasonal) addBloomIntensitySurface(records);\n",
)

# Nine names on a phone obscure the map. Desktop retains permanent labels; mobile gets them on interaction.
replace_once(
    'public/bloom-map-v2.js',
    "        marker.bindTooltip(tooltipHtml(record, seasonal), { permanent: true, direction: 'top', offset: [0, -13], className: 'bloom-map-tooltip', opacity: 0.95 });\n",
    "        marker.bindTooltip(tooltipHtml(record, seasonal), { permanent: window.innerWidth > 600, direction: 'top', offset: [0, -13], className: 'bloom-map-tooltip', opacity: 0.95 });\n",
)

# Origin input is causal only when live evidence can make a trip recommendation.
replace_once(
    'public/bloom-map-v2.js',
    """  function upsertControls(section, seasonal) {
    section.querySelector('.bloom-map-decision-controls')?.remove();
    const controls = document.createElement('div');
""",
    """  function upsertControls(section, seasonal) {
    section.querySelector('.bloom-map-decision-controls')?.remove();
    if (seasonal) return;
    const controls = document.createElement('div');
""",
)

# Seasonal framing now matches the actual April-to-September network.
replace_once(
    'public/bloom-map-v2.js',
    "      legend.innerHTML = '<span><i style=\"background:#ff7aa8\"></i>Spring starts</span><span>→</span><span><i style=\"background:#e6a52d\"></i>Late summer</span>';\n",
    "      legend.innerHTML = '<span><i style=\"background:#ff7aa8\"></i>April</span><span>→</span><span><i style=\"background:#e6a52d\"></i>September</span>';\n",
)
replace_once(
    'public/bloom-map-v2.js',
    "      mapHost.setAttribute('aria-label', seasonal ? 'Interactive CARTO map showing the typical tracked Michigan bloom sequence' : `Interactive CARTO map showing Michigan tracked bloom intensity: ${activeView}`);\n",
    "      mapHost.setAttribute('aria-label', seasonal ? 'Interactive CARTO map showing typical Michigan flower-season timing from April into September' : `Interactive CARTO map showing Michigan tracked bloom intensity: ${activeView}`);\n",
)

# Static fallback: keep Traverse zone points, remove the route-like connector.
replace_once(
    'pages/bloom-tracker.js',
    """  const wavePath = useMemo(() => {
    if (!waveEntry) return '';
    return waveEntry.zoneStatus.map((zone, index) => {
      const [x, y] = projectCoordinate(zone.coordinates.lon, zone.coordinates.lat);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [waveEntry]);

""",
    '',
)
replace_once(
    'pages/bloom-tracker.js',
    "                <path d={wavePath} fill=\"none\" stroke=\"#53695a\" strokeWidth=\"4\" strokeDasharray=\"9 8\" opacity=\"0.65\" vectorEffect=\"non-scaling-stroke\" />\n",
    '',
)

# Product copy and metadata: this is not an April-June spring-only product anymore.
replace_once(
    'pages/bloom-tracker.js',
    """    <section className="season-route" aria-label="Typical Michigan spring bloom sequence">
      <div className="season-route-label">Typical spring sequence <span>planning context, not live bloom</span></div>
""",
    """    <section className="season-route" aria-label="Typical Michigan flower-season sequence">
      <div className="season-route-label">Typical flower-season sequence <span>planning context, not live bloom</span></div>
""",
)
replace_once(
    'pages/bloom-tracker.js',
    "          <svg className=\"census-map\" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role=\"img\" aria-label={seasonalMode ? 'Michigan bloom destinations labeled by typical spring timing' : 'Michigan and neighboring states with current bloom destinations'}>\n",
    "          <svg className=\"census-map\" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role=\"img\" aria-label={seasonalMode ? 'Michigan flower destinations labeled by typical April-to-September timing' : 'Michigan and neighboring states with current bloom destinations'}>\n",
)
replace_once(
    'pages/bloom-tracker.js',
    """        <title>Michigan Bloom Tracker — Blooms Now & Spring Timing</title>
        <meta name="description" content="Track Michigan spring blooms from April through June: Holland tulips, Traverse City cherry blossoms, U-M peonies, Meijer Gardens cherries and Mackinac lilacs, with live trip calls in season and clear off-season timing." />
""",
    """        <title>Michigan Bloom Tracker — What’s Blooming & When to Go</title>
        <meta name="description" content="Track Michigan flower season from April into September: cherries, tulips, peonies, lilacs, lavender and major sunflower fields, with live trip calls, weekend outlooks and clear seasonal timing." />
""",
)
replace_once(
    'pages/bloom-tracker.js',
    """        <meta property="og:title" content="Michigan Bloom Tracker — Blooms Now & Spring Timing" />
        <meta property="og:description" content="See where Michigan spring is in the bloom season, what is worth the drive when flowers are active, and how the season moves from April into June." />
""",
    """        <meta property="og:title" content="Michigan Bloom Tracker — What’s Blooming & When to Go" />
        <meta property="og:description" content="See which tracked Michigan flower display is strongest now, what is worth the drive, and how the season moves from April cherries and tulips into September sunflowers." />
""",
)
replace_once(
    'pages/bloom-tracker.js',
    "          <p>Follow Michigan spring from the first garden color through orchard bloom, peonies and island lilacs. In season, fresh evidence turns that progression into a trip decision.</p>\n",
    "          <p>Follow Michigan’s flower season from April cherries and tulips through summer lavender and sunflower fields into September. Fresh evidence turns that progression into a trip decision.</p>\n",
)
replace_once(
    'pages/bloom-tracker.js',
    """              <div className="section-heading"><div><span className="eyebrow">{seasonalMode ? 'Michigan spring, place by place' : 'Statewide opportunity desk'}</span><h2 id="where-title">{seasonalMode ? 'What does each stop feel like?' : 'Where should I go?'}</h2></div><span className="count">{destinations.length} tracked displays</span></div>
              <p className="opportunity-intro">{seasonalMode ? 'The season has a geography as well as a calendar. These are the places the tracker will wake up in, in roughly the order spring tends to reach their main display.' : 'The live decision stays primary. Each place gets just enough visual context to show what you are driving toward; expand only the destinations you care about.'}</p>
""",
    """              <div className="section-heading"><div><span className="eyebrow">{seasonalMode ? 'Michigan flower season, place by place' : 'Statewide opportunity desk'}</span><h2 id="where-title">{seasonalMode ? 'What does each stop feel like?' : 'Where should I go?'}</h2></div><span className="count">{destinations.length} tracked displays</span></div>
              <p className="opportunity-intro">{seasonalMode ? 'The season has a geography as well as a calendar. These are the places the tracker wakes up in from April into September, ordered by their broad planning windows.' : 'The live decision stays primary. Each place gets just enough visual context to show what you are driving toward; expand only the destinations you care about.'}</p>
""",
)
replace_once(
    'pages/bloom-tracker.js',
    """            <section className="trust-block"><div className="trust-icon"><ShieldCheck size={21} /></div><div><h2>{seasonalMode ? 'Why the calendar never becomes a bloom claim' : 'Why the tracker can say “not enough evidence”'}</h2><p>{seasonalMode ? 'The April-to-June sequence is a planning frame built from destination guidance and normal seasonal order. It helps explain where spring goes next, but only fresh observations can switch a destination into GO, WAIT, GO_BEFORE or LIMITED. File photos are never treated as current evidence.' : 'Observations anchor the forecast. Weather can change development or shorten a display, but it cannot create bloom that has not been observed. Stale observations lower confidence, abnormal-year evidence overrides normal timing, and long-range output stays a range rather than a fake peak date.'}</p></div></section>
""",
    """            <section className="trust-block"><div className="trust-icon"><ShieldCheck size={21} /></div><div><h2>{seasonalMode ? 'Why the calendar never becomes a bloom claim' : 'Why the tracker can say “not enough evidence”'}</h2><p>{seasonalMode ? 'The April-to-September sequence is a planning frame built from destination guidance and broad seasonal order. It helps explain what tends to come next, but only fresh observations can switch a destination into GO, WAIT, GO_BEFORE or LIMITED. File photos are never treated as current evidence.' : 'Observations anchor the forecast. Weather can change development or shorten a display, but it cannot create bloom that has not been observed. Stale observations lower confidence, abnormal-year evidence overrides normal timing, and long-range output stays a range rather than a fake peak date.'}</p></div></section>
""",
)
replace_once(
    'pages/bloom-tracker.js',
    """          <span><b>June</b> Mackinac lilacs</span>
        </div>
""",
    """          <span><b>June</b> Mackinac lilacs</span>
          <span><b>Late June–August</b> Milan lavender</span>
          <span><b>Late July–August</b> Frankenmuth + Gull Meadow sunflowers</span>
          <span><b>Late August–September</b> Blake’s sunflowers</span>
        </div>
""",
)

# Do not hide a line after drawing it. Stop drawing it.
replace_once(
    'public/bloom-map-v2.css',
    '.bloom-carto-map path[stroke-dasharray="7 8"],.bloom-carto-map path[stroke-dasharray="7, 8"],.bloom-carto-map path[stroke-dasharray="4 7"],.bloom-carto-map path[stroke-dasharray="4, 7"]{display:none!important}\n\n',
    '',
)

# Extend regression checks around the persona decisions.
p = Path('scripts/check-bloom-map-v2.mjs')
text = p.read_text()
needle = "const originApi = await fs.readFile(new URL('../pages/api/bloom-origin.js', import.meta.url), 'utf8');\n"
if needle not in text:
    raise SystemExit('map check: page-read anchor missing')
text = text.replace(needle, needle + "const page = await fs.readFile(new URL('../pages/bloom-tracker.js', import.meta.url), 'utf8');\n", 1)
text = text.replace(
    "assert.ok(enhancer.includes('Spring starts') && enhancer.includes('Late summer'), 'seasonal legend must communicate the expanded spring-to-late-summer arc');",
    "assert.ok(enhancer.includes('>April</span>') && enhancer.includes('>September</span>'), 'seasonal legend must communicate the April-to-September arc');",
    1,
)
needle = "assert.ok(enhancer.includes('HAS_FIXTURE'), 'preview fixtures must remain deterministic and not be overwritten by production live data');\n"
if needle not in text:
    raise SystemExit('map check: live-data anchor missing')
text = text.replace(
    needle,
    needle
    + "assert.ok(!enhancer.includes('addSeasonSequence'), 'seasonal destinations must not be connected by route-like lines');\n"
    + "assert.ok(!enhancer.includes('dashArray:'), 'map renderer must not create dotted route/progression lines');\n"
    + "assert.ok(enhancer.includes('permanent: window.innerWidth > 600'), 'mobile map must not render nine permanent destination labels');\n"
    + "assert.ok(enhancer.includes('if (seasonal) return;'), 'off-season map must not expose non-causal origin controls');\n",
    1,
)
needle = "assert.ok(css.includes('.bloom-carto-map .leaflet-tile{width:256px!important;height:256px!important}'), 'CARTO raster tiles must retain native Leaflet dimensions during pan and zoom');\n"
if needle not in text:
    raise SystemExit('map check: css anchor missing')
text = text.replace(
    needle,
    needle
    + "assert.ok(!css.includes('stroke-dasharray'), 'CSS must not rely on hiding dotted lines after they are rendered');\n"
    + "assert.ok(!page.includes('strokeDasharray'), 'static fallback must not draw route-like dotted lines');\n"
    + "assert.ok(page.includes('April-to-September sequence'), 'trust copy must describe the full tracked season');\n"
    + "assert.ok(page.includes('summer lavender and sunflower fields into September'), 'intro must explain the extended flower season');\n"
    + "assert.ok(page.includes('Michigan Bloom Tracker — What’s Blooming & When to Go'), 'metadata must describe the decision product instead of spring-only timing');\n"
    + "assert.ok(!page.includes('Track Michigan spring blooms from April through June'), 'spring-only metadata must not survive the summer expansion');\n",
    1,
)
p.write_text(text)

assert_absent('public/bloom-map-v2.js', 'dashArray:')
assert_absent('pages/bloom-tracker.js', 'strokeDasharray')

print('Bloom persona pass applied.')
