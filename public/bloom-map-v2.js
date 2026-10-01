(() => {
  'use strict';

  const CARTO_KEY = 'cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88';
  const TILE_URL = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
  const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const HAS_FIXTURE = new URLSearchParams(window.location.search).has('fixture');

  const DESTINATIONS = {
    'meijer-gardens-cherries': {
      name: 'Meijer Gardens cherries', fullName: 'Meijer Gardens Cherry Blossoms', lat: 42.979, lon: -85.589,
      timing: 'April into early May', order: 1, seasonColor: '#ff7aa8',
      officialUrl: 'https://www.meijergardens.org/blossoms/', officialLabel: 'Official blossom update',
    },
    'holland-tulips': {
      name: 'Holland tulips', fullName: 'Holland Tulips', lat: 42.7875, lon: -86.1089,
      timing: 'Late April into May', order: 2, seasonColor: '#ff4f91',
      officialUrl: 'https://www.cityofholland.com/1022/Tulip-Tracker', officialLabel: 'Official live tracker + cameras',
    },
    'traverse-city-cherries': {
      name: 'Traverse cherries', fullName: 'Traverse City Cherry Blossoms', lat: 44.7631, lon: -85.6206,
      timing: 'May', order: 3, seasonColor: '#ff8a34',
      officialUrl: 'https://msu-prod.dotcms.cloud/fruit/news', officialLabel: 'MSU Northwest Michigan fruit updates',
    },
    'um-peony-garden': {
      name: 'U-M peonies', fullName: 'University of Michigan Peony Garden', lat: 42.2816, lon: -83.7264,
      timing: 'Late May into June', order: 4, seasonColor: '#b06cff',
      officialUrl: 'https://mbgna.umich.edu/whats-bloom-peony-garden', officialLabel: 'Official Peony Garden bloom update',
    },
    'mackinac-lilacs': {
      name: 'Mackinac lilacs', fullName: 'Mackinac Island Lilacs', lat: 45.8492, lon: -84.6189,
      timing: 'June', order: 5, seasonColor: '#7b4dff',
      officialUrl: 'https://www.mackinacisland.org/mackinac-island-lilac-festival/', officialLabel: 'Official Mackinac lilac visitor update',
      travelNote: 'Mackinac Island requires ferry travel beyond the mainland drive.',
    },
    'milan-lavender': {
      name: 'Milan lavender', fullName: 'Milan Lavender Lane', lat: 42.083747, lon: -83.670218,
      timing: 'Late June into early August', order: 6, seasonColor: '#8b5cf6',
      officialUrl: 'https://lavenderlanemi.com/local/', officialLabel: 'Official Lavender Lane seasonal update',
    },
    'frankenmuth-sunflowers': {
      name: 'Frankenmuth sunflowers', fullName: 'Frankenmuth Flower Festival Sunflowers', lat: 43.340413, lon: -83.741230,
      timing: 'Late July into early August', order: 7, seasonColor: '#f2b43f',
      officialUrl: 'https://www.grandpatinys.com/frankenmuth-flower-festival', officialLabel: 'Official Grandpa Tiny’s flower update',
    },
    'gull-meadow-sunflowers': {
      name: 'Gull Meadow sunflowers', fullName: 'Gull Meadow Sunflower Days', lat: 42.36758, lon: -85.46417,
      timing: 'Late July into mid-August', order: 8, seasonColor: '#f5c542',
      officialUrl: 'https://gullmeadowfarms.com/pages/sunflower-days', officialLabel: 'Official Gull Meadow sunflower update',
    },
    'blakes-sunflowers': {
      name: 'Blake’s sunflowers', fullName: "Blake's Sunflower Festival", lat: 42.849784, lon: -82.951413,
      timing: 'Late August into early September', order: 9, seasonColor: '#e6a52d',
      officialUrl: 'https://blakefarms.com/sunflower-festival/', officialLabel: 'Official Blake’s sunflower update',
    },
  };

  const STAGE_ORDER = ['DORMANT', 'EMERGING', 'BUILDING', 'NEAR_PEAK', 'PEAK', 'FADING', 'DONE'];
  const STAGE_STYLE = {
    DORMANT: { color: '#92999b', className: 'dormant', label: 'Dormant', radius: 10000, energyRadius: 0, energy: 0 },
    PEAK: { color: '#ff2f8b', className: 'peak', label: 'Peak bloom', radius: 46000, energyRadius: 70000, energy: 1 },
    NEAR_PEAK: { color: '#ff5fb2', className: 'near-peak', label: 'Near peak', radius: 38000, energyRadius: 58000, energy: 0.82 },
    BUILDING: { color: '#ff8a34', className: 'building', label: 'Building', radius: 29000, energyRadius: 44000, energy: 0.56 },
    EMERGING: { color: '#ffd23f', className: 'emerging', label: 'Emerging', radius: 22000, energyRadius: 30000, energy: 0.34 },
    FADING: { color: '#9b5de5', className: 'fading', label: 'Fading', radius: 18000, energyRadius: 24000, energy: 0.22 },
    DONE: { color: '#92999b', className: 'done', label: 'Done', radius: 10000, energyRadius: 0, energy: 0 },
    UNKNOWN: { color: '#92999b', className: 'unknown', label: 'Uncertain', radius: 10000, energyRadius: 0, energy: 0 },
  };

  const DECISION_STAGE = {
    GO: 'PEAK', GO_BEFORE: 'NEAR_PEAK', WAIT: 'BUILDING', LIMITED: 'FADING', UNKNOWN: 'UNKNOWN',
    ACTIVE: 'NEAR_PEAK', APPROACHING: 'EMERGING', WATCHING: 'EMERGING', OFF_SEASON: 'UNKNOWN', DONE: 'DONE',
  };

  const ENERGY_RINGS = [
    { scale: 1, alpha: 0.035 }, { scale: 0.80, alpha: 0.050 }, { scale: 0.61, alpha: 0.075 },
    { scale: 0.44, alpha: 0.110 }, { scale: 0.29, alpha: 0.165 }, { scale: 0.16, alpha: 0.230 },
  ];

  const VIEW = Object.freeze({ NOW: 'now', WEEKEND: 'weekend', NEXT: 'next', FROM_ME: 'from-me' });

  let map = null;
  let mapHost = null;
  let latestSnapshot = null;
  let scheduled = false;
  let installing = false;
  let lastSignature = '';
  let activeView = VIEW.NOW;
  let origin = null;
  let originError = '';

  function injectStyles() {
    if (document.getElementById('bloom-map-decision-styles')) return;
    const style = document.createElement('style');
    style.id = 'bloom-map-decision-styles';
    style.textContent = `
      .bloom-map-decision-controls{display:grid;gap:10px;margin:12px 0 14px;padding:12px;border:1px solid rgba(48,60,55,.13);border-radius:16px;background:rgba(255,255,255,.84);backdrop-filter:blur(8px)}
      .bloom-time-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
      .bloom-time-tab{appearance:none;border:1px solid rgba(48,60,55,.16);border-radius:999px;background:#fff;padding:9px 8px;font:700 12px/1.1 inherit;color:#34443d;cursor:pointer}
      .bloom-time-tab[aria-pressed="true"]{background:#263b32;color:#fff;border-color:#263b32}
      .bloom-origin-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center}
      .bloom-origin-row input{min-width:0;border:1px solid rgba(48,60,55,.2);border-radius:10px;padding:9px 10px;font:600 13px/1.2 inherit;background:#fff}
      .bloom-origin-row button{border:1px solid rgba(48,60,55,.16);border-radius:10px;background:#fff;padding:9px 10px;font:700 12px/1.1 inherit;color:#34443d;cursor:pointer;white-space:nowrap}
      .bloom-origin-row button.primary{background:#f6e8ef;border-color:#ebc9da;color:#6b2848}
      .bloom-origin-status{font:600 12px/1.35 inherit;color:#596860}
      .bloom-origin-status.error{color:#9b2f44}
      .bloom-map-popup .bloom-source-link,.bloom-map-popup .bloom-directions-link{display:block;margin-top:8px;font-weight:800;text-decoration:none;color:#8f285a}
      .bloom-map-popup .bloom-trust-line{display:block;margin-top:6px;font-size:11px;line-height:1.3;color:#65716c}
      .bloom-origin-marker{width:18px;height:18px;border-radius:50%;background:#233bff;border:3px solid #fff;box-shadow:0 0 0 2px rgba(35,59,255,.24)}
      .bloom-map-view-note{font-size:11px;line-height:1.35;color:#65716c;margin-top:6px}
      @media(max-width:560px){.bloom-origin-row{grid-template-columns:minmax(0,1fr) auto}.bloom-origin-row .use-location{grid-column:1/-1}.bloom-time-tab{font-size:11px;padding:9px 4px}}
    `;
    document.head.appendChild(style);
  }

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
        id, state, stage,
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

  function confidenceFactor(value) {
    if (value === 'HIGH') return 1;
    if (value === 'MEDIUM') return 0.76;
    return 0.50;
  }

  function freshnessFactor(ageDays) {
    const age = Number(ageDays);
    if (!Number.isFinite(age)) return 0.55;
    if (age <= 1) return 1;
    if (age <= 2) return 0.91;
    if (age <= 4) return 0.76;
    if (age <= 5) return 0.63;
    if (age <= 7) return 0.42;
    return 0.20;
  }

  function rangePenalty(window) {
    if (!window) return 1;
    const low = STAGE_ORDER.indexOf(slugStage(window.stageLow));
    const high = STAGE_ORDER.indexOf(slugStage(window.stageHigh));
    if (low < 0 || high < 0) return 0.62;
    const spread = Math.abs(high - low);
    if (spread === 0) return 1;
    if (spread === 1) return 0.88;
    if (spread === 2) return 0.72;
    return 0.56;
  }

  function currentEvidenceFactor(record) {
    const decision = record.live?.decision || {};
    if (record.state === 'UNKNOWN' || decision.decision === 'UNKNOWN') return 0;
    return confidenceFactor(decision.confidence) * freshnessFactor(decision.observationAgeDays);
  }

  function daysUntilSaturday(dateLike) {
    const date = new Date(dateLike || Date.now());
    if (!Number.isFinite(date.getTime())) return 3;
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', weekday: 'short' }).format(date);
    return ({ Sun: 0, Mon: 5, Tue: 4, Wed: 3, Thu: 2, Fri: 1, Sat: 0 })[weekday] ?? 3;
  }

  function forecastWindows(record) {
    return Array.isArray(record.live?.decision?.forecast)
      ? record.live.decision.forecast.filter((item) => Number.isFinite(Number(item?.horizonDays))).sort((a, b) => a.horizonDays - b.horizonDays)
      : [];
  }

  function weekendWindow(record) {
    const windows = forecastWindows(record);
    if (!windows.length) return null;
    const target = Math.max(1, daysUntilSaturday(latestSnapshot?.generatedAt || Date.now()));
    return [...windows].sort((a, b) => Math.abs(a.horizonDays - target) - Math.abs(b.horizonDays - target) || a.horizonDays - b.horizonDays)[0] || null;
  }

  function nextWindow(record) {
    const windows = forecastWindows(record);
    return windows.length ? windows[windows.length - 1] : null;
  }

  function representativeStage(window) {
    if (!window) return 'UNKNOWN';
    const low = STAGE_ORDER.indexOf(slugStage(window.stageLow));
    const high = STAGE_ORDER.indexOf(slugStage(window.stageHigh));
    if (low < 0 && high < 0) return 'UNKNOWN';
    if (low < 0) return STAGE_ORDER[high] || 'UNKNOWN';
    if (high < 0) return STAGE_ORDER[low] || 'UNKNOWN';
    return STAGE_ORDER[Math.floor((low + high) / 2)] || 'UNKNOWN';
  }

  function stageRangeLabel(window) {
    if (!window) return 'No useful forecast';
    const low = STAGE_STYLE[slugStage(window.stageLow)]?.label || 'Unknown';
    const high = STAGE_STYLE[slugStage(window.stageHigh)]?.label || 'Unknown';
    return low === high ? low : `${low} → ${high}`;
  }

  function projectedRecord(record, view) {
    if (![VIEW.WEEKEND, VIEW.NEXT].includes(view)) {
      return { ...record, displayStage: record.stage, intensityFactor: currentEvidenceFactor(record), forecastWindow: null, projected: false };
    }
    const window = view === VIEW.WEEKEND ? weekendWindow(record) : nextWindow(record);
    if (!window || record.state === 'UNKNOWN') {
      return { ...record, displayStage: 'UNKNOWN', intensityFactor: 0, forecastWindow: window, projected: true };
    }
    const projectedAge = Number(record.live?.decision?.observationAgeDays || 0) + Number(window.horizonDays || 0);
    const factor = confidenceFactor(window.confidence || record.live?.decision?.confidence) * freshnessFactor(projectedAge) * rangePenalty(window);
    return { ...record, displayStage: representativeStage(window), intensityFactor: factor, forecastWindow: window, projected: true };
  }

  function projectRecords(records, seasonal) {
    if (seasonal) return records.map((record) => ({ ...record, displayStage: record.stage, intensityFactor: 0, forecastWindow: null, projected: false }));
    const mode = activeView === VIEW.FROM_ME ? VIEW.NOW : activeView;
    return records.map((record) => projectedRecord(record, mode));
  }

  function stageStyle(record, seasonal) {
    if (seasonal) {
      return {
        color: DESTINATIONS[record.id].seasonColor,
        className: record.state === 'WATCHING' ? 'watching' : record.state === 'APPROACHING' ? 'approaching' : 'off-season',
        label: DESTINATIONS[record.id].timing,
        radius: 13000, energyRadius: 0, energy: 0,
      };
    }
    if (record.state === 'UNKNOWN' || record.displayStage === 'UNKNOWN') return STAGE_STYLE.UNKNOWN;
    if (record.state === 'DONE' || record.displayStage === 'DONE') return STAGE_STYLE.DONE;
    const base = STAGE_STYLE[record.displayStage || record.stage] || STAGE_STYLE[DECISION_STAGE[record.state]] || STAGE_STYLE.UNKNOWN;
    const factor = Math.max(0, Math.min(1, Number(record.intensityFactor ?? 1)));
    return {
      ...base,
      energy: base.energy * factor,
      energyRadius: base.energyRadius ? base.energyRadius * (0.70 + (0.30 * factor)) : 0,
    };
  }

  function tripWorthy(record, seasonal) {
    if (seasonal || record.projected) return false;
    return ['GO', 'GO_BEFORE'].includes(record.state);
  }

  function hasBloomIntensity(record) {
    return stageStyle(record, false).energy > 0;
  }

  function signature(records, seasonal) {
    const zoneSignature = records.map((record) => (record.live?.zoneStatus || []).map((zone) => `${zone.name}:${zone.stage}`).join(',')).join('|');
    const originSignature = origin ? `${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}` : 'none';
    return `${seasonal ? 'seasonal' : 'live'}|${activeView}|${originSignature}|${records.map((record) => `${record.id}:${record.state}:${record.displayStage}:${record.intensityFactor}:${record.reason}`).join('|')}|${zoneSignature}`;
  }

  function milesBetween(aLat, aLon, bLat, bLon) {
    const rad = (value) => value * Math.PI / 180;
    const earthMiles = 3958.8;
    const dLat = rad(bLat - aLat);
    const dLon = rad(bLon - aLon);
    const lat1 = rad(aLat);
    const lat2 = rad(bLat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earthMiles * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function distanceFor(record) {
    if (!origin) return null;
    const destination = DESTINATIONS[record.id];
    return milesBetween(origin.lat, origin.lon, destination.lat, destination.lon);
  }

  function strongest(records) {
    return [...records].filter(hasBloomIntensity).sort((a, b) => stageStyle(b, false).energy - stageStyle(a, false).energy)[0] || null;
  }

  function strongestBuilding(records, excludeId) {
    return [...records]
      .filter((record) => record.id !== excludeId && hasBloomIntensity(record))
      .sort((a, b) => stageStyle(b, false).energy - stageStyle(a, false).energy)[0] || null;
  }

  function closestWorthGoing(records) {
    if (!origin) return null;
    const candidates = records.filter((record) => ['GO', 'GO_BEFORE'].includes(record.state) && hasBloomIntensity(record));
    const pool = candidates.length ? candidates : records.filter((record) => hasBloomIntensity(record));
    return [...pool].sort((a, b) => (distanceFor(a) ?? Infinity) - (distanceFor(b) ?? Infinity))[0] || null;
  }

  function buildInsight(records, seasonal) {
    if (seasonal) {
      return {
        badge: 'How to read it',
        headline: 'Michigan’s tracked flower season unfolds in stages, not one statewide peak.',
        detail: 'Cherries and tulips lead the tracked season, followed by Traverse cherries, peonies and Mackinac lilacs. Milan lavender then hands the season to major sunflower fields in Frankenmuth, Richland and Armada. Live intensity returns only when fresh observations support it.',
      };
    }

    if (activeView === VIEW.FROM_ME) {
      if (!origin) return { badge: 'From me', headline: 'Add a starting city or ZIP to make “worth the drive” personal.', detail: 'We rank the closest strong tracked display using transparent map distance, then link to exact directions instead of inventing drive times.' };
      const closest = closestWorthGoing(records);
      if (!closest) return { badge: 'From me', headline: `No tracked display has a strong enough current signal from ${origin.label}.`, detail: 'The map stays quiet rather than recommending a trip from stale or weak evidence.' };
      const miles = Math.round(distanceFor(closest));
      const qualifier = ['GO', 'GO_BEFORE'].includes(closest.state) ? 'strong current' : 'best developing';
      return {
        badge: 'From me',
        headline: `${DESTINATIONS[closest.id].name} is the closest ${qualifier} tracked display from ${origin.label}.`,
        detail: `About ${miles} map miles away. Road distance will be longer${closest.id === 'mackinac-lilacs' ? ', and Mackinac also requires a ferry' : ''}. Tap the marker for exact directions and the official update.`,
      };
    }

    if ([VIEW.WEEKEND, VIEW.NEXT].includes(activeView)) {
      const lead = strongest(records);
      if (!lead) return { badge: activeView === VIEW.WEEKEND ? 'This weekend' : 'What’s next', headline: 'The forecast is not strong enough to light up a tracked display.', detail: 'Future color is suppressed when the forecast window or underlying observation is too uncertain.' };
      const next = strongestBuilding(records, lead.id);
      const horizon = lead.forecastWindow?.horizonDays;
      const when = activeView === VIEW.WEEKEND ? 'For this weekend' : `Looking about ${horizon || 'several'} days out`;
      const nextText = next ? ` ${DESTINATIONS[next.id].name} is the next strongest developing signal.` : '';
      return {
        badge: activeView === VIEW.WEEKEND ? 'This weekend' : 'What’s next',
        headline: `${when}, ${DESTINATIONS[lead.id].name} has the strongest bloom signal among the displays we track.`,
        detail: `${stageRangeLabel(lead.forecastWindow)} is the modeled range.${nextText} Forecast color is deliberately dimmed as confidence falls or the observation ages.`,
      };
    }

    const worth = records.find((record) => ['GO', 'GO_BEFORE'].includes(record.state) && hasBloomIntensity(record)) || strongest(records);
    const next = worth ? strongestBuilding(records, worth.id) : null;
    if (worth) {
      const worthStyle = stageStyle(worth, false);
      const nextText = next && ['WAIT', 'APPROACHING', 'WATCHING'].includes(next.state) ? ` ${DESTINATIONS[next.id].name} is ${stageStyle(next, false).label.toLowerCase()} and is the next place to watch.` : '';
      return {
        badge: 'Bloom intensity',
        headline: `${DESTINATIONS[worth.id].name} is the strongest display we’re tracking right now.`,
        detail: `${worthStyle.label} drives the strongest verified color among these tracked displays.${nextText} Intensity strengthens with fresh, confident evidence and fades as the display or evidence weakens.`,
      };
    }

    const building = records.find((record) => record.state === 'WAIT' && hasBloomIntensity(record));
    if (building) {
      return {
        badge: 'Bloom intensity',
        headline: 'Color is starting to gather among the displays we track, but nothing is glowing “go” yet.',
        detail: `${DESTINATIONS[building.id].name} is ${stageStyle(building, false).label.toLowerCase()} and is the place to watch next. The map saturates only as fresh evidence strengthens.`,
      };
    }

    return {
      badge: 'Bloom intensity',
      headline: 'The map is quiet because the evidence is quiet.',
      detail: 'The CARTO basemap stays close to normal until fresh observations justify color. Done, stale and uncertain displays do not keep a false glow.',
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

  function officialSource(record) {
    const destination = DESTINATIONS[record.id];
    const liveSource = record.live?.decision?.source || record.live?.observation?.source;
    return {
      url: liveSource?.url || destination.officialUrl,
      label: liveSource?.label || liveSource?.name || destination.officialLabel,
    };
  }

  function trustLine(record) {
    if (record.projected) {
      const confidence = String(record.forecastWindow?.confidence || record.live?.decision?.confidence || 'LOW').toLowerCase();
      return `${confidence} forecast confidence · ${stageRangeLabel(record.forecastWindow)} · projected view`;
    }
    const decision = record.live?.decision || {};
    const confidence = String(decision.confidence || 'LOW').toLowerCase();
    const age = Number(decision.observationAgeDays);
    const freshness = Number.isFinite(age) ? (age < 0.8 ? 'observed today' : age < 1.8 ? 'observed about 1 day ago' : `observed ${Math.round(age)} days ago`) : 'freshness unknown';
    return `${confidence} confidence · ${freshness}`;
  }

  function directionsUrl(record) {
    if (!origin) return null;
    const destination = DESTINATIONS[record.id];
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin.lat},${origin.lon}`)}&destination=${encodeURIComponent(`${destination.lat},${destination.lon}`)}`;
  }

  function popupHtml(record, seasonal) {
    const destination = DESTINATIONS[record.id];
    const style = stageStyle(record, seasonal);
    const status = seasonal ? destination.timing : style.label;
    const description = record.experience || record.reason || (seasonal ? `Typical viewing window: ${destination.timing}.` : 'Open the destination card for the full evidence read.');
    const source = officialSource(record);
    const sourceLink = source?.url ? `<a class="bloom-source-link" href="${source.url}" target="_blank" rel="noopener noreferrer">${destination.officialLabel} ↗</a>` : '';
    const directions = directionsUrl(record);
    const directionsLink = directions ? `<a class="bloom-directions-link" href="${directions}" target="_blank" rel="noopener noreferrer">Exact directions from ${origin.label} ↗</a>` : '';
    const viewLabel = record.projected ? (activeView === VIEW.WEEKEND ? 'Weekend forecast' : 'What’s next') : (seasonal ? 'Typical timing' : 'Current bloom read');
    return `<div class="bloom-map-popup"><span class="eyebrow">${viewLabel}</span><strong>${destination.fullName}</strong><em>${status}</em><p>${description}</p><span class="bloom-trust-line">${seasonal ? 'Planning timing, not a current bloom claim' : trustLine(record)}</span>${sourceLink}${directionsLink}${destination.travelNote ? `<span class="bloom-trust-line">${destination.travelNote}</span>` : ''}</div>`;
  }

  function markerHtml(style, record, seasonal) {
    const trip = tripWorthy(record, seasonal) ? ' is-tripworthy' : '';
    const inline = seasonal ? ` style="background:${style.color};--bloom-glow:${style.color}33"` : ` style="opacity:${Math.max(0.55, Math.min(1, record.intensityFactor || 0.55))}"`;
    return `<div class="bloom-map-marker stage-${style.className}${trip}"${inline}></div>`;
  }

  function tooltipHtml(record, seasonal) {
    const destination = DESTINATIONS[record.id];
    const style = stageStyle(record, seasonal);
    return `<strong>${destination.name}</strong><span>${seasonal ? destination.timing : style.label}</span>`;
  }

  function addEnergyPoint(latlng, style, radiusScale = 1) {
    if (!style?.energyRadius || !style?.energy) return;
    ENERGY_RINGS.forEach((ring, index) => {
      window.L.circle(latlng, {
        pane: 'bloomEnergyPane', radius: style.energyRadius * radiusScale * ring.scale, stroke: false, fill: true,
        fillColor: style.color, fillOpacity: ring.alpha * style.energy, interactive: false,
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
    return zones.filter((zone) => Number.isFinite(Number(zone?.coordinates?.lat)) && Number.isFinite(Number(zone?.coordinates?.lon))).map((zone) => ({
      zone, latlng: [Number(zone.coordinates.lat), Number(zone.coordinates.lon)], stage: slugStage(zone.stage || 'UNKNOWN'),
    }));
  }

  function addTraverseEnergyWave(record) {
    if (!hasBloomIntensity(record)) return;
    if (record.projected) {
      addDestinationEnergy(record);
      return;
    }
    const points = traverseZonePoints(record);
    if (points.length < 2) {
      addDestinationEnergy(record);
      return;
    }
    points.forEach(({ zone, latlng, stage }) => {
      const zoneBase = STAGE_STYLE[stage] || STAGE_STYLE.UNKNOWN;
      const factor = currentEvidenceFactor(record);
      const style = { ...zoneBase, energy: zoneBase.energy * factor, energyRadius: zoneBase.energyRadius * (0.70 + 0.30 * factor) };
      addEnergyPoint(latlng, style, 0.62);
      window.L.circleMarker(latlng, { radius: 5.5, color: '#fff', weight: 2, fillColor: style.color, fillOpacity: 0.96 }).bindTooltip(`${zone.name}: ${style.label}`, { direction: 'top' }).addTo(map);
    });
  }

  function addBloomIntensitySurface(records) {
    records.forEach((record) => {
      if (record.id === 'traverse-city-cherries') addTraverseEnergyWave(record);
      else addDestinationEnergy(record);
    });
  }

  function addOriginLayer(records) {
    if (!origin || activeView !== VIEW.FROM_ME) return;
    window.L.marker([origin.lat, origin.lon], {
      icon: window.L.divIcon({ className: 'bloom-origin-marker-wrap', html: '<div class="bloom-origin-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      title: `Starting point: ${origin.label}`,
    }).bindTooltip(`Leaving from ${origin.label}`, { direction: 'top' }).addTo(map);

  }

  function addLegend(host, seasonal) {
    host.querySelectorAll('.bloom-map-v2-legend').forEach((node) => node.remove());
    const legend = document.createElement('div');
    legend.className = 'bloom-map-v2-legend';
    if (seasonal) {
      legend.innerHTML = '<span><i style="background:#ff7aa8"></i>April</span><span>→</span><span><i style="background:#e6a52d"></i>September</span>';
    } else {
      legend.innerHTML = '<span><i style="background:#ff2f8b"></i>Peak</span><span><i style="background:#ff8a34"></i>Building</span><span><i style="background:#ffd23f"></i>Emerging</span><span><i style="background:#9b5de5"></i>Fading</span><span><i style="background:#92999b"></i>Quiet / uncertain</span>';
    }
    host.appendChild(legend);
  }

  function updateSupportingCopy(section, seasonal) {
    const source = section.querySelector('.map-source');
    if (source) source.textContent = `Basemap © OpenStreetMap contributors, © CARTO. ${seasonal ? 'Timing colors show the usual sequence, not current bloom.' : 'Bloom intensity shows relative strength around tracked displays and observed zones. It is not literal geographic flower coverage; confidence, freshness and forecast uncertainty can dim the color.'}`;
    const seasonalRead = section.querySelector('.map-season-read');
    if (seasonalRead) {
      seasonalRead.innerHTML = '<strong>Read the tracked season across the map:</strong><span><b>April into early May</b> Meijer Gardens cherries</span><span><b>Late April into May</b> Holland tulips</span><span><b>May</b> Traverse cherries</span><span><b>Late May into June</b> U-M peonies</span><span><b>June</b> Mackinac lilacs</span><span><b>Late June–early August</b> Milan lavender</span><span><b>Late July–early August</b> Frankenmuth sunflowers</span><span><b>Late July–mid August</b> Gull Meadow sunflowers</span><span><b>Late August–early September</b> Blake’s sunflowers</span>';
    }
  }

  async function resolveOrigin(query) {
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('Enter a city or ZIP.');
    const response = await fetch(`/api/bloom-origin?q=${encodeURIComponent(trimmed)}`, { cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isFinite(Number(body.lat)) || !Number.isFinite(Number(body.lon))) throw new Error(body.error || 'Starting place not found.');
    return { lat: Number(body.lat), lon: Number(body.lon), label: body.label || trimmed };
  }

  function useBrowserLocation() {
    originError = '';
    if (!navigator.geolocation) {
      originError = 'Location is not available in this browser.';
      scheduleInstall(true);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      origin = { lat: position.coords.latitude, lon: position.coords.longitude, label: 'your location' };
      activeView = VIEW.FROM_ME;
      scheduleInstall(true);
    }, () => {
      originError = 'Location permission was not available. Enter a city or ZIP instead.';
      scheduleInstall(true);
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 });
  }

  function upsertControls(section, seasonal) {
    section.querySelector('.bloom-map-decision-controls')?.remove();
    if (seasonal) return;
    const controls = document.createElement('div');
    controls.className = 'bloom-map-decision-controls';
    if (!seasonal) {
      const tabs = document.createElement('div');
      tabs.className = 'bloom-time-tabs';
      [[VIEW.NOW, 'Now'], [VIEW.WEEKEND, 'This weekend'], [VIEW.NEXT, 'What’s next']].forEach(([value, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bloom-time-tab';
        button.textContent = label;
        button.setAttribute('aria-pressed', String((activeView === VIEW.FROM_ME ? VIEW.NOW : activeView) === value));
        button.addEventListener('click', () => { activeView = value; scheduleInstall(true); });
        tabs.appendChild(button);
      });
      controls.appendChild(tabs);
    }

    const row = document.createElement('div');
    row.className = 'bloom-origin-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'text';
    input.autocomplete = 'postal-code';
    input.placeholder = 'Leaving from city or ZIP';
    input.setAttribute('aria-label', 'Starting city or ZIP');
    const setButton = document.createElement('button');
    setButton.type = 'button';
    setButton.className = 'primary';
    setButton.textContent = 'Set';
    const locationButton = document.createElement('button');
    locationButton.type = 'button';
    locationButton.className = 'use-location';
    locationButton.textContent = 'Use my location';
    const submit = async () => {
      setButton.disabled = true;
      originError = '';
      try {
        origin = await resolveOrigin(input.value);
        activeView = VIEW.FROM_ME;
      } catch (error) {
        originError = error?.message || 'Starting place not found.';
      } finally {
        setButton.disabled = false;
        scheduleInstall(true);
      }
    };
    setButton.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });
    locationButton.addEventListener('click', useBrowserLocation);
    row.append(input, setButton, locationButton);
    controls.appendChild(row);

    const status = document.createElement('div');
    status.className = `bloom-origin-status${originError ? ' error' : ''}`;
    if (originError) status.textContent = originError;
    else if (origin) status.textContent = `Starting point: ${origin.label}. Distance is map distance; use marker directions for actual road/ferry routing.`;
    else status.textContent = seasonal ? 'Optional: add a starting place to compare travel burden when live bloom returns.' : 'Optional: make “worth the drive” personal. City lookup defaults to Michigan.';
    controls.appendChild(status);

    const note = document.createElement('div');
    note.className = 'bloom-map-view-note';
    note.textContent = seasonal ? 'In season, this map adds Now / This weekend / What’s next views.' : 'Future views use the existing calibrated bloom forecast; they are not new AI predictions.';
    controls.appendChild(note);

    section.querySelector('.bloom-map-insight')?.before(controls);
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
    const rawRecords = readCards();
    if (!section || !frame || rawRecords.length < 1) return;

    const seasonal = isSeasonalMode();
    const records = projectRecords(rawRecords, seasonal);
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
      upsertControls(section, seasonal);
      updateSupportingCopy(section, seasonal);

      mapHost = document.createElement('div');
      mapHost.className = 'bloom-carto-map';
      mapHost.setAttribute('aria-label', seasonal ? 'Interactive CARTO map showing typical Michigan flower-season timing from April into September' : `Interactive CARTO map showing Michigan tracked bloom intensity: ${activeView}`);
      frame.prepend(mapHost);

      map = window.L.map(mapHost, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: 5, maxZoom: 14 });
      map.createPane('bloomEnergyPane');
      map.getPane('bloomEnergyPane').style.zIndex = '350';
      map.getPane('bloomEnergyPane').style.pointerEvents = 'none';
      map.getPane('bloomEnergyPane').style.mixBlendMode = 'multiply';
      window.L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 20, subdomains: 'abcd' }).addTo(map);

      if (!seasonal) addBloomIntensitySurface(records);

      records.forEach((record) => {
        const destination = DESTINATIONS[record.id];
        const style = stageStyle(record, seasonal);
        if (seasonal) {
          window.L.circle([destination.lat, destination.lon], { radius: style.radius, color: style.color, weight: 1, opacity: 0.22, fillColor: style.color, fillOpacity: 0.08, interactive: false }).addTo(map);
        }
        const marker = window.L.marker([destination.lat, destination.lon], {
          icon: window.L.divIcon({ className: 'bloom-map-marker-wrap', html: markerHtml(style, record, seasonal), iconSize: [24, 24], iconAnchor: [12, 12] }),
          keyboard: true,
          title: `${destination.fullName}: ${seasonal ? destination.timing : style.label}`,
        });
        marker.bindTooltip(tooltipHtml(record, seasonal), { permanent: window.innerWidth > 600, direction: 'top', offset: [0, -13], className: 'bloom-map-tooltip', opacity: 0.95 });
        marker.bindPopup(popupHtml(record, seasonal), { closeButton: true, maxWidth: 280 });
        marker.addTo(map);
      });

      addOriginLayer(records);
      addLegend(frame, seasonal);
      const boundsPoints = records.map((record) => {
        const destination = DESTINATIONS[record.id];
        return [destination.lat, destination.lon];
      });
      if (origin && activeView === VIEW.FROM_ME) boundsPoints.push([origin.lat, origin.lon]);
      const bounds = window.L.latLngBounds(boundsPoints);
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
    injectStyles();
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