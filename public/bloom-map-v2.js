(() => {
  'use strict';

  const CARTO_KEY = 'cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
  const TILE_URL = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const HAS_FIXTURE = new URLSearchParams(window.location.search).has('fixture');

  const DESTINATIONS = {
    'meijer-gardens-cherries': { name: 'Meijer Gardens cherries', fullName: 'Meijer Gardens Cherry Blossoms', lat: 42.979, lon: -85.589, timing: 'April into early May', order: 1, seasonColor: '#ff7aa8' },
    'holland-tulips': { name: 'Holland tulips', fullName: 'Holland Tulips', lat: 42.7875, lon: -86.1089, timing: 'Late April into May', order: 2, seasonColor: '#ff4f91' },
    'traverse-city-cherries': { name: 'Traverse cherries', fullName: 'Traverse City Cherry Blossoms', lat: 44.7631, lon: -85.6206, timing: 'May', order: 3, seasonColor: '#ff8a34' },
    'um-peony-garden': { name: 'U-M peonies', fullName: 'University of Michigan Peony Garden', lat: 42.2816, lon: -83.7264, timing: 'Late May into June', order: 4, seasonColor: '#b06cff' },
    'mackinac-lilacs': { name: 'Mackinac lilacs', fullName: 'Mackinac Island Lilacs', lat: 45.8492, lon: -84.6189, timing: 'June', order: 5, seasonColor: '#7b4dff' },
  };

  const STAGE_STYLE = {
    PEAK: { color: '#ff2f8b', className: 'peak', label: 'Peak bloom', radius: 46000, energyRadius: 70000, energy: 1 },
    NEAR_PEAK: { color: '#ff5fb2', className: 'near-peak', label: 'Near peak', radius: 38000, energyRadius: 58000, energy: 0.82 },
    BUILDING: { color: '#ff8a34', className: 'building', label: 'Building', radius: 29000, energyRadius: 44000, energy: 0.56 },
    EMERGING: { color: '#ffd23f', className: 'emerging', label: 'Emerging', radius: 22000, energyRadius: 30000, energy: 0.34 },
    FADING: { color: '#9b5de5', className: 'fading', label: 'Fading', radius: 18000, energyRadius: 24000, energy: 0.22 },
    DONE: { color: '#92999b', className: 'done', label: 'Done', radius: 10000, energyRadius: 0, energy: 0 },
    UNKNOWN: { color: '#92999b', className: 'unknown', label: 'Uncertain', radius: 10000, energyRadius: 0, energy: 0 },
  };

  const DECISION_STAGE = {
    GO: 'PEAK',
    GO_BEFORE: 'NEAR_PEAK',
    WAIT: 'BUILDING',
    LIMITED: 'FADING',
    UNKNOWN: 'UNKNOWN',
    ACTIVE: 'NEAR_PEAK',
    APPROACHING: 'EMERGING',
    WATCHING: 'EMERGING',
    OFF_SEASON: 'UNKNOWN',
    DONE: 'DONE',
  };

  const ENERGY_RINGS = [
    { scale: 1, alpha: 0.035 },
    { scale: 0.80, alpha: 0.050 },
    { scale: 0.61, alpha: 0.075 },
    { scale: 0.44, alpha: 0.110 },
    { scale: 0.29, alpha: 0.165 },
    { scale: 0.16, alpha: 0.230 },
  ];

  let map = null;
  let mapHost = null;
  let latestSnapshot = null;
  let scheduled = false;
  let installing = false;
  let lastSignature = '';

  function slugStage(stage) {
    return String(stage || 'UNKNOWN').toUpperCase().replace(/[^A-Z]+/g, '_');
  }

  function cardId(card) {
    const details = card.querySelector('details[id^="details-"]');
    return details?.id?.replace(/^details-/, '') || null;
  }

  function stageFromText(text) {
    const value = String(text || '').toLowerCase();
    if (value.includes('near peak')) return 'NEAR_PEAK';
    if (value.includes('peak')) return 'PEAK';
    if (value.includes('building')) return 'BUILDING';
    if (value.includes('emerging')) return 'EMERGING';
    if (value.includes('fading')) return 'FADING';
    if (value.includes('done') || value.includes('dormant')) return 'DONE';
    return null;
  }

  function snapshotEntry(id) {
    return latestSnapshot?.destinations?.find((entry) => entry?.id === id || entry?.decision?.destinationId === id) || null;
  }

  function readCards() {
    return [...document.querySelectorAll('.opportunity-card')].map((card) => {
      const id = cardId(card);
      if (!id || !DESTINATIONS[id]) return null;
      const state = String(card.dataset.state || 'UNKNOWN').toUpperCase();
      const live = snapshotEntry(id);
      const stage = slugStage(live?.decision?.currentStage || stageFromText(card.querySelector('.opportunity-meta strong')?.textContent) || DECISION_STAGE[state] || 'UNKNOWN');
      return {
        id,
        state,
        stage,
        name: card.querySelector('h3')?.textContent?.trim() || DESTINATIONS[id].fullName,
        experience: card.querySelector('.opportunity-experience')?.textContent?.trim() || '',
        reason: card.querySelector('.opportunity-reason')?.textContent?.trim() || '',
        live,
      };
    }).filter(Boolean);
  }

  function isSeasonalMode() {
    return Boolean(document.querySelector('.season-route'));
  }

  function stageStyle(record, seasonal) {
    if (seasonal) {
      return {
        color: DESTINATIONS[record.id].seasonColor,
        className: record.state === 'WATCHING' ? 'watching' : record.state === 'APPROACHING' ? 'approaching' : 'off-season',
        label: DESTINATIONS[record.id].timing,
        radius: 13000,
        energyRadius: 0,
        energy: 0,
      };
    }
    // The deterministic decision is the truth gate. A stale PEAK observation must not keep the map glowing.
    if (record.state === 'UNKNOWN') return STAGE_STYLE.UNKNOWN;
    if (record.state === 'DONE') return STAGE_STYLE.DONE;
    return STAGE_STYLE[record.stage] || STAGE_STYLE[DECISION_STAGE[record.state]] || STAGE_STYLE.UNKNOWN;
  }

  function tripWorthy(record, seasonal) {
    if (seasonal) return false;
    return ['GO', 'GO_BEFORE'].includes(record.state);
  }

  function hasBloomEnergy(record) {
    return stageStyle(record, false).energy > 0;
  }

  function signature(records, seasonal) {
    const zoneSignature = records.map((record) => (record.live?.zoneStatus || []).map((zone) => `${zone.name}:${zone.stage}`).join(',')).join('|');
    return `${seasonal ? 'seasonal' : 'live'}|${records.map((record) => `${record.id}:${record.state}:${record.stage}:${record.reason}`).join('|')}|${zoneSignature}`;
  }

  function buildInsight(records, seasonal) {
    if (seasonal) {
      return {
        badge: 'How to read it',
        headline: 'Michigan’s flower season is a relay, not one statewide peak.',
        detail: 'Watch Grand Rapids and Holland first, Traverse City cherries next, then peonies and Mackinac lilacs. When live bloom returns, these quiet planning colors give way to a bloom-energy surface that strengthens and fades with fresh observations.',
      };
    }

    const worth = records.find((record) => ['GO', 'GO_BEFORE'].includes(record.state));
    const next = records.find((record) => (!worth || record.id !== worth.id) && record.state === 'WAIT' && hasBloomEnergy(record));
    if (worth) {
      const worthStyle = stageStyle(worth, false);
      const nextText = next ? ` ${DESTINATIONS[next.id].name} is ${stageStyle(next, false).label.toLowerCase()} and is the next place to watch.` : '';
      return {
        badge: 'Bloom energy',
        headline: `Michigan is brightest around ${DESTINATIONS[worth.id].name}.`,
        detail: `${worthStyle.label} drives the strongest color on the map.${nextText} The surface intensifies as verified bloom builds, then contracts and fades after the display passes.`,
      };
    }

    const building = records.find((record) => record.state === 'WAIT' && hasBloomEnergy(record));
    if (building) {
      return {
        badge: 'Bloom energy',
        headline: 'Spring color is starting to gather, but nothing is glowing “go” yet.',
        detail: `${DESTINATIONS[building.id].name} is ${stageStyle(building, false).label.toLowerCase()} and is the place to watch next. The map will saturate only as fresh evidence strengthens.`,
      };
    }

    return {
      badge: 'Bloom energy',
      headline: 'The map is quiet because the evidence is quiet.',
      detail: 'The CARTO basemap stays close to normal until fresh bloom observations justify color. Done and uncertain displays do not keep a false glow.',
    };
  }

  function upsertInsight(section, records, seasonal) {
    section.querySelector('.bloom-map-insight')?.remove();
    const insight = buildInsight(records, seasonal);
    const node = document.createElement('div');
    node.className = 'bloom-map-insight';
    node.innerHTML = `<span class="bloom-map-insight-badge">${insight.badge}</span><div class="bloom-map-insight-copy"><strong>${insight.headline}</strong><span>${insight.detail}</span></div>`;
    section.querySelector('.map-frame')?.before(node);
  }

  function popupHtml(record, seasonal) {
    const destination = DESTINATIONS[record.id];
    const style = stageStyle(record, seasonal);
    const status = seasonal ? destination.timing : style.label;
    const description = record.experience || record.reason || (seasonal ? `Typical viewing window: ${destination.timing}.` : 'Open the destination card for the full evidence read.');
    return `<div class="bloom-map-popup"><span class="eyebrow">${seasonal ? 'Typical timing' : 'Current bloom read'}</span><strong>${destination.fullName}</strong><em>${status}</em><p>${description}</p></div>`;
  }

  function markerHtml(style, record, seasonal) {
    const trip = tripWorthy(record, seasonal) ? ' is-tripworthy' : '';
    const inline = seasonal ? ` style="background:${style.color};--bloom-glow:${style.color}33"` : '';
    return `<div class="bloom-map-marker stage-${style.className}${trip}"${inline}></div>`;
  }

  function tooltipHtml(record, seasonal) {
    const destination = DESTINATIONS[record.id];
    const style = stageStyle(record, seasonal);
    return `<strong>${destination.name}</strong><span>${seasonal ? destination.timing : style.label}</span>`;
  }

  function addSeasonSequence(records) {
    const sequence = [...records].sort((a, b) => DESTINATIONS[a.id].order - DESTINATIONS[b.id].order);
    for (let index = 0; index < sequence.length - 1; index += 1) {
      const a = DESTINATIONS[sequence[index].id];
      const b = DESTINATIONS[sequence[index + 1].id];
      window.L.polyline([[a.lat, a.lon], [b.lat, b.lon]], {
        color: b.seasonColor,
        weight: 4,
        opacity: 0.55,
        dashArray: '7 8',
        interactive: false,
      }).addTo(map);
    }
  }

  function addEnergyPoint(latlng, style, radiusScale = 1) {
    if (!style?.energyRadius || !style?.energy) return;
    ENERGY_RINGS.forEach((ring, index) => {
      window.L.circle(latlng, {
        pane: 'bloomEnergyPane',
        radius: style.energyRadius * radiusScale * ring.scale,
        stroke: false,
        fill: true,
        fillColor: style.color,
        fillOpacity: ring.alpha * style.energy,
        interactive: false,
        className: `bloom-energy-ring bloom-energy-ring-${index}`,
      }).addTo(map);
    });
  }

  function addDestinationEnergy(record) {
    const style = stageStyle(record, false);
    const destination = DESTINATIONS[record.id];
    addEnergyPoint([destination.lat, destination.lon], style, 1);
  }

  function traverseZonePoints(record) {
    const zones = record?.live?.zoneStatus;
    if (!Array.isArray(zones) || zones.length < 2) return [];
    return zones
      .filter((zone) => Number.isFinite(Number(zone?.coordinates?.lat)) && Number.isFinite(Number(zone?.coordinates?.lon)))
      .map((zone) => ({
        zone,
        latlng: [Number(zone.coordinates.lat), Number(zone.coordinates.lon)],
        stage: slugStage(zone.stage || 'UNKNOWN'),
      }));
  }

  function addTraverseEnergyWave(record) {
    // Zone detail cannot bypass the destination truth gate. If the destination evidence is stale, stay quiet.
    if (!hasBloomEnergy(record)) return;
    const points = traverseZonePoints(record);
    if (points.length < 2) {
      addDestinationEnergy(record);
      return;
    }

    window.L.polyline(points.map((point) => point.latlng), {
      pane: 'bloomEnergyPane',
      color: '#755c68',
      weight: 2,
      opacity: 0.24,
      dashArray: '4 7',
      interactive: false,
    }).addTo(map);

    points.forEach(({ zone, latlng, stage }) => {
      const style = STAGE_STYLE[stage] || STAGE_STYLE.UNKNOWN;
      addEnergyPoint(latlng, style, 0.62);
      window.L.circleMarker(latlng, {
        radius: 5.5,
        color: '#fff',
        weight: 2,
        fillColor: style.color,
        fillOpacity: 0.96,
      }).bindTooltip(`${zone.name}: ${style.label}`, { direction: 'top' }).addTo(map);
    });
  }

  function addBloomEnergySurface(records) {
    records.forEach((record) => {
      if (record.id === 'traverse-city-cherries') addTraverseEnergyWave(record);
      else addDestinationEnergy(record);
    });
  }

  function addLegend(host, seasonal) {
    host.querySelectorAll('.bloom-map-v2-legend').forEach((node) => node.remove());
    const legend = document.createElement('div');
    legend.className = 'bloom-map-v2-legend';
    if (seasonal) {
      legend.innerHTML = '<span><i style="background:#ff7aa8"></i>Earlier in spring</span><span>→</span><span><i style="background:#7b4dff"></i>Later into June</span>';
    } else {
      legend.innerHTML = '<span><i style="background:#ff2f8b"></i>Peak</span><span><i style="background:#ff8a34"></i>Building</span><span><i style="background:#ffd23f"></i>Emerging</span><span><i style="background:#9b5de5"></i>Fading</span><span><i style="background:#92999b"></i>Quiet / uncertain</span>';
    }
    host.appendChild(legend);
  }

  function updateSupportingCopy(section, seasonal) {
    const source = section.querySelector('.map-source');
    if (source) source.textContent = `Basemap © OpenStreetMap contributors, © CARTO. ${seasonal ? 'Timing colors show the usual sequence, not current bloom.' : 'Bloom energy shows relative intensity around tracked displays and observed zones. It is not literal flower coverage.'}`;
    const seasonalRead = section.querySelector('.map-season-read');
    if (seasonalRead) {
      seasonalRead.innerHTML = '<strong>Read the season across the map:</strong><span><b>April into early May</b> Meijer Gardens cherries</span><span><b>Late April into May</b> Holland tulips</span><span><b>May</b> Traverse cherries</span><span><b>Late May into June</b> U-M peonies</span><span><b>June</b> Mackinac lilacs</span>';
    }
  }

  function destroyMap() {
    if (map) {
      try { map.remove(); } catch (_) { /* noop */ }
      map = null;
    }
    if (mapHost?.parentNode) mapHost.remove();
    mapHost = null;
  }

  function installMap(force = false) {
    if (installing || !window.L) return;
    const section = document.querySelector('.map-section');
    const frame = section?.querySelector('.map-frame');
    const records = readCards();
    if (!section || !frame || records.length !== Object.keys(DESTINATIONS).length) return;

    const seasonal = isSeasonalMode();
    const nextSignature = signature(records, seasonal);
    if (!force && nextSignature === lastSignature && map && document.body.contains(mapHost)) {
      updateSupportingCopy(section, seasonal);
      return;
    }

    installing = true;
    try {
      lastSignature = nextSignature;
      destroyMap();
      section.classList.add('bloom-map-enhanced');
      upsertInsight(section, records, seasonal);
      updateSupportingCopy(section, seasonal);

      mapHost = document.createElement('div');
      mapHost.className = 'bloom-carto-map';
      mapHost.setAttribute('aria-label', seasonal ? 'Interactive CARTO map showing the typical Michigan bloom sequence' : 'Interactive CARTO map showing current Michigan bloom energy');
      frame.prepend(mapHost);

      map = window.L.map(mapHost, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
        minZoom: 5,
        maxZoom: 14,
      });
      map.createPane('bloomEnergyPane');
      map.getPane('bloomEnergyPane').style.zIndex = '350';
      map.getPane('bloomEnergyPane').style.pointerEvents = 'none';
      map.getPane('bloomEnergyPane').style.mixBlendMode = 'multiply';
      window.L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 20, subdomains: 'abcd' }).addTo(map);

      if (seasonal) addSeasonSequence(records);
      else addBloomEnergySurface(records);

      records.forEach((record) => {
        const destination = DESTINATIONS[record.id];
        const style = stageStyle(record, seasonal);

        if (seasonal) {
          window.L.circle([destination.lat, destination.lon], {
            radius: style.radius,
            color: style.color,
            weight: 1,
            opacity: 0.22,
            fillColor: style.color,
            fillOpacity: 0.08,
            interactive: false,
          }).addTo(map);
        }

        const marker = window.L.marker([destination.lat, destination.lon], {
          icon: window.L.divIcon({
            className: 'bloom-map-marker-wrap',
            html: markerHtml(style, record, seasonal),
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          keyboard: true,
          title: `${destination.fullName}: ${seasonal ? destination.timing : style.label}`,
        });
        marker.bindTooltip(tooltipHtml(record, seasonal), { permanent: true, direction: 'top', offset: [0, -13], className: 'bloom-map-tooltip', opacity: 0.95 });
        marker.bindPopup(popupHtml(record, seasonal), { closeButton: true, maxWidth: 260 });
        marker.addTo(map);
      });

      addLegend(frame, seasonal);
      const bounds = window.L.latLngBounds(Object.values(DESTINATIONS).map((destination) => [destination.lat, destination.lon]));
      map.fitBounds(bounds.pad(0.20), { padding: [18, 18], maxZoom: 7 });
      setTimeout(() => map?.invalidateSize(false), 80);
    } finally {
      installing = false;
    }
  }

  function scheduleInstall(force = false) {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      installMap(force);
    }, 120);
  }

  async function loadLatest() {
    if (HAS_FIXTURE) return;
    try {
      const response = await fetch('/api/bloom-latest', { cache: 'no-store' });
      if (!response.ok) return;
      latestSnapshot = await response.json();
      scheduleInstall(true);
    } catch (_) {
      // DOM state remains the safe fallback if the live endpoint is unavailable.
    }
  }

  function boot(attempt = 0) {
    if (!window.L) {
      if (attempt < 80) window.setTimeout(() => boot(attempt + 1), 100);
      return;
    }
    scheduleInstall(true);
    loadLatest();
    const observer = new MutationObserver(() => scheduleInstall(false));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-state'] });
    window.addEventListener('resize', () => map?.invalidateSize(false), { passive: true });
    if (!HAS_FIXTURE) window.setInterval(loadLatest, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  else boot();
})();