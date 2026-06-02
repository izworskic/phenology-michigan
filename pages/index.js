import Head from "next/head";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { Bird, Fish, Flower2, Waves, Thermometer, Sprout, Egg, TreePine, Feather, Compass, Droplets, X, Sunrise, Snowflake, Sparkles, Link2, BarChart3, ArrowRight, Target, Check, Clock } from "lucide-react";
import {
  dayOfYear, normalMeanF, gddSeries, EVENTS, CAT, seasonOf, classify, RIVERS, moonPhase,
  MID_MONTH_DOY, MONTH_ABBR, cToF, hatchThresholds, projectOnset, doyToDate, activeIndicators, coOccurring, emergenceForecast, gardenWindow, LAST_FROST_DOY, FIRST_FROST_DOY, huntingForecast, rutClock,
} from "../lib/phenology";
import { fetchRegional, fetchRivers, fetchGddActual, fetchBirds, fetchAusableStats, fetchForecast, fetchGddHistory, fetchBuoy, fetchAlerts, fetchRiverForecast, fetchAurora, withTimeout } from "../lib/sources";
import { readHistory } from "../lib/history";
import { readSignals, emptySignals } from "../lib/signals";
import { skyTonight } from "../lib/sky";

const SITE = "https://phenology.chrisizworski.com";
const CAT_ICON = { water: Waves, fish: Fish, hatch: Egg, bird: Bird, bloom: Flower2, garden: Sprout, wild: Feather };
const fmtDate = (doy) => doyToDate(doy).toLocaleDateString("en-US", { month: "long", day: "numeric" });
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const degToCompass = (d) => { if (d == null) return ""; const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]; return dirs[Math.round(d / 22.5) % 16]; };

// Activity groups for the toggles. Each maps to the relevant categories plus any tagged events.
// An angler's "Fishing" lights up the hatches and trout; a hunter's "Hunting" lights up deer and turkey.
const ALL_GROUPS = ["hunt", "fish", "garden", "water", "bird"];
const GROUP_LABEL = { hunt: "Hunting", fish: "Fishing", garden: "Garden", water: "Water/winds", bird: "Birds" };
const GROUPS = {
  hunt: (ev) => !!(ev.tags && ev.tags.includes("hunt")),
  fish: (ev) => ev.cat === "fish" || ev.cat === "hatch" || !!(ev.tags && ev.tags.includes("fish")),
  garden: (ev) => ev.cat === "garden" || ev.cat === "bloom" || !!(ev.tags && ev.tags.includes("garden")),
  water: (ev) => ev.cat === "water" || !!(ev.tags && ev.tags.includes("water")),
  bird: (ev) => ev.cat === "bird",
};
const eventGroups = (ev) => ALL_GROUPS.filter((g) => GROUPS[g](ev));
// An event shows if it belongs to an active group, or to no group at all (seasonal ambiance like fireflies).
const eventMatches = (ev, active) => { const gs = eventGroups(ev); return gs.length === 0 || gs.some((g) => active.includes(g)); };

function doyAngle(doy) { return (doy / 365) * 360 - 90; }
function polar(cx, cy, r, a) { const t = (a * Math.PI) / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }

function Wheel({ doy, accent, onSelect, activeTags }) {
  const size = 340, cx = size / 2, cy = size / 2, R = 150;
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const seasons = [
    { from: 335, to: 445, color: "#5b7286" }, { from: 80, to: 152, color: "#5a8a4a" },
    { from: 152, to: 266, color: "#c79a2e" }, { from: 266, to: 335, color: "#a85a2c" },
  ];
  const arc = (from, to, r) => {
    const [x0, y0] = polar(cx, cy, r, doyAngle(from)); const [x1, y1] = polar(cx, cy, r, doyAngle(to));
    return `M ${x0} ${y0} A ${r} ${r} 0 ${to - from > 182.5 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  const [nx, ny] = polar(cx, cy, R - 8, doyAngle(doy));
  const matches = (ev) => !activeTags || eventMatches(ev, activeTags);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      {seasons.map((s, i) => <path key={i} d={arc(s.from, s.to, R + 14)} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" opacity="0.55" />)}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#cdbfa3" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={R - 30} fill="none" stroke="#e3d8bf" strokeWidth="1" />
      {months.map((m, i) => {
        const d = MID_MONTH_DOY[i];
        const [tx, ty] = polar(cx, cy, R + 1, doyAngle(d - 15)); const [ix, iy] = polar(cx, cy, R - 9, doyAngle(d - 15)); const [lx, ly] = polar(cx, cy, R - 46, doyAngle(d));
        return (<g key={i}><line x1={ix} y1={iy} x2={tx} y2={ty} stroke="#bdae90" strokeWidth="1" /><text x={lx} y={ly + 4} textAnchor="middle" style={{ fontSize: 11, fill: "#8a7d62", fontFamily: "Georgia, serif" }}>{m}</text></g>);
      })}
      {EVENTS.map((ev, i) => {
        const [ex, ey] = polar(cx, cy, R - 30, doyAngle(ev.p % 365));
        const on = matches(ev);
        return (
          <g key={i} style={{ cursor: on ? "pointer" : "default", pointerEvents: on ? "auto" : "none" }} onClick={on ? () => onSelect(ev) : undefined}>
            {on && <circle cx={ex} cy={ey} r="11" fill="transparent" />}
            <circle cx={ex} cy={ey} r={on ? "3.6" : "2.6"} fill={CAT[ev.cat].color} stroke="#fff" strokeWidth="0.6" opacity={on ? 1 : 0.18} />
          </g>
        );
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={accent.color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={nx} cy={ny} r="5" fill={accent.color} stroke="#fff" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="4" fill="#5b5238" />
    </svg>
  );
}

function Instrument({ Icon, label, value, unit, sub, live, accent }) {
  return (
    <div style={{ border: "1px solid #e4dcc8", borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.55)", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={accent} />
        <span style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8a7d62", fontFamily: "Georgia, serif" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: live ? "#5a8a4a" : "#b08828", border: `1px solid ${live ? "#bcd3ad" : "#e3d2a6"}`, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>{live ? "live" : "modeled"}</span>
      </div>
      <div><span style={{ fontSize: 28, color: "#2b2a1f", fontWeight: 600, fontFamily: "Fraunces, Georgia, serif" }}>{value}</span><span style={{ fontSize: 13, color: "#8a7d62", marginLeft: 4 }}>{unit}</span></div>
      <div style={{ fontSize: 11.5, color: "#9a8f76", marginTop: 2, overflowWrap: "anywhere" }}>{sub}</div>
    </div>
  );
}

function EventRow({ ev, doy, state }) {
  const C = CAT[ev.cat]; const Icon = CAT_ICON[ev.cat];
  const tag = state === "active" ? "now" : state === "imminent" ? `${ev.s - doy} d` : `${doy - ev.e} d ago`;
  const tagColor = state === "active" ? "#5a8a4a" : state === "imminent" ? "#b08828" : "#a89c83";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid #ece4d2" }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: C.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}><Icon size={15} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f", overflowWrap: "anywhere" }}>{ev.name}</span><span style={{ marginLeft: "auto", fontSize: 11, color: tagColor, whiteSpace: "nowrap" }}>{tag}</span></div>
        <div style={{ fontSize: 12, color: "#9a8f76", lineHeight: 1.35 }}>{ev.note}</div>
      </div>
    </div>
  );
}

function EventPopout({ ev, doy, actualTotal, thresholds, season, onClose }) {
  if (!ev) return null;
  const C = CAT[ev.cat]; const Icon = CAT_ICON[ev.cat];
  const within = ev.e > 365 ? (doy >= ev.s || doy <= ev.e % 365) : (doy >= ev.s && doy <= ev.e);
  const status = within ? "Active now" : ev.s - doy > 0 ? `Begins in about ${ev.s - doy} days` : `Ended about ${doy - ev.e} days ago`;
  let projLine = null;
  if (ev.cat === "hatch" && actualTotal != null) {
    const thr = thresholds[ev.name];
    if (thr != null) {
      if (actualTotal >= thr) projLine = `Degree days have passed the ${thr} mark this year, so this hatch is on or imminent rather than projected.`;
      else {
        const pd = projectOnset(thr, actualTotal, doy);
        projLine = pd ? `Projected onset around ${fmtDate(pd)}, about ${pd - doy} days out, once degree days reach roughly ${thr}. The site is at ${actualTotal} now and accumulating at this season's pace.` : `Degree days are not projected to reach the ${thr} threshold within the year at the current pace.`;
      }
    }
  }
  const co = coOccurring(ev);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(43,42,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#f7f3ea", border: `1px solid ${C.color}`, borderRadius: 16, maxWidth: 440, width: "100%", padding: "20px 22px", boxShadow: "0 18px 50px rgba(43,42,31,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={17} color="#fff" /></div>
          <h2 style={{ margin: 0, fontSize: 19, color: "#2b2a1f" }}>{ev.name}</h2>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#9a8f76" }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: C.color, marginBottom: 8 }}>{CAT[ev.cat].label}</div>
        <div style={{ fontSize: 14, color: "#5a5240", marginBottom: 4 }}><strong style={{ color: season.color }}>{status}.</strong> Typical window {fmtDate(ev.s)} to {fmtDate(ev.e)}, peak near {fmtDate(ev.p)}.</div>
        <p style={{ fontSize: 14, color: "#5a5240", lineHeight: 1.5, margin: "8px 0 0" }}>{ev.note}</p>
        {projLine && <p style={{ fontSize: 13.5, color: "#5a5240", lineHeight: 1.5, margin: "12px 0 0", padding: "10px 12px", background: "rgba(176,136,40,0.1)", borderRadius: 10, borderLeft: `3px solid #b08828` }}>{projLine}</p>}
        {ev.signal && (
          <div style={{ margin: "12px 0 0", padding: "10px 12px", background: "rgba(90,138,74,0.1)", borderRadius: 10, borderLeft: "3px solid #5a8a4a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5a8a4a", marginBottom: 4 }}><Link2 size={13} /> This is a signal</div>
            <div style={{ fontSize: 13.5, color: "#5a5240", lineHeight: 1.5 }}>{ev.signal}</div>
          </div>
        )}
        {co.length > 0 && (
          <div style={{ margin: "14px 0 0" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8a7d62", marginBottom: 6 }}>Runs with, in the same stretch</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {co.map((c, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#5a5240", background: "rgba(255,255,255,0.6)", border: `1px solid ${CAT[c.cat].color}`, borderRadius: 999, padding: "3px 10px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT[c.cat].color }} />{c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Which folk correlations can be checked against a live sensor, and the threshold that confirms them.
// Only the ones with a defensible measurable; the rest stand on their phenological text alone.
const SIGNAL_CHECKS = {
  "Forsythia bloom": { kind: "soil", min: 55 },
  "Lilac first bloom": { kind: "soil", min: 57 },
  "Dandelion bloom": { kind: "soil", min: 50 },
  "Oak leaf-out, squirrel's ear": { kind: "soil", min: 55 },
  "Flowering dogwood bloom": { kind: "soil", min: 60 },
  "Walleye spring spawn": { kind: "water", min: 42, max: 52 },
  "Brook and brown trout spawn": { kind: "water", max: 49 },
  "Fireflies emerge": { kind: "water", min: 62 },
  "Walleye summer lows": { kind: "water", min: 70 },
  "First hard frost": { kind: "frost" },
};

export default function Home({ regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, riverForecast, sky, aurora, springIndex, observations, bay, inat, drought, alerts, doy, season, normToday, dateStr, generatedAt }) {
  const [mounted, setMounted] = useState(false);
  const [riverId, setRiverId] = useState("ausable");
  const [sel, setSel] = useState(null);
  useEffect(() => { setMounted(true); }, []);

  const normal = useMemo(() => gddSeries(), []);
  const gddNow = normal[Math.min(364, doy - 1)].gdd;
  const thresholds = useMemo(() => hatchThresholds(), []);
  const river = rivers.find((r) => r.id === riverId) || rivers[0];
  const { active, imminent, recent } = useMemo(() => classify(doy, river ? river.hatchOffset : 0), [doy, river]);

  const chart = useMemo(() => {
    const am = {}; (gddActual?.series || []).forEach((p) => { am[p.doy] = p.gdd; });
    return normal.map((n) => ({ doy: n.doy, normal: n.gdd, actual: am[n.doy] != null ? am[n.doy] : null }));
  }, [normal, gddActual]);
  const actualTotal = gddActual?.total ?? null;
  const gddAnom = actualTotal != null ? actualTotal - gddNow : null;
  const dailyRate = Math.max(1, Math.round(normalMeanF(doy) - 50));
  const daysApprox = gddAnom != null ? Math.round(gddAnom / dailyRate) : null;
  const airF = regional.air.tempF;

  // ---- The read: deterministic synthesis across the streams ----
  const read = useMemo(() => {
    const a = rivers.find((r) => r.id === "ausable") || {};
    const parts = [];
    // river hydrology and temperature
    if (a.flow != null) {
      let flowCtx = "";
      if (stats?.medianFlow) {
        const ratio = a.flow / stats.medianFlow;
        flowCtx = ratio > 1.3 ? `, running high against the ${stats.medianFlow} cfs median for the date` : ratio < 0.7 ? `, thin against the ${stats.medianFlow} cfs median for the date` : `, near the ${stats.medianFlow} cfs median for the date`;
      }
      let tempCtx = "";
      if (a.temp != null) {
        const f = cToF(a.temp);
        tempCtx = f < 50 ? " The water is still cold, so fish are sluggish and midday is your window." : f < 58 ? " The water is warming into the trout window." : f <= 65 ? " The water sits in the prime window, so hatches and rises should come on the evening." : f <= 68 ? " The water is on the warm edge; fish early and late and handle fish quickly." : " The water is stressfully warm; back off the trout and consider cooler tailwater or a different target.";
      }
      parts.push(`The AuSable is at ${a.flow} cfs${flowCtx}${a.trend && a.trend !== "steady" ? `, ${a.trend} over the past two days` : ""}, and ${a.temp != null ? Math.round(cToF(a.temp)) + " degrees F." : "no live water temperature is posting."}${tempCtx}`);
    }
    // NWS river forecast, only when one is active (high-water events)
    if (riverForecast && riverForecast.active) {
      const day = riverForecast.crestTime ? new Date(riverForecast.crestTime).toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Detroit" }) : null;
      if (riverForecast.cresting && riverForecast.crestFt != null) {
        parts.push(`The Weather Service has the AuSable at Mio cresting near ${riverForecast.crestFt} feet${day ? ` ${day}` : ""}, then easing.`);
      } else if (riverForecast.trend !== "steady") {
        parts.push(`The Weather Service forecast has the AuSable at Mio ${riverForecast.trend}${riverForecast.crestFt != null ? ` toward ${riverForecast.crestFt} feet` : ""} over the coming days.`);
      }
    }
    // snow on the ground, the winter signal
    if (forecast && forecast.snowDepthIn != null && forecast.snowDepthIn >= 0.5) {
      parts.push(`There are ${forecast.snowDepthIn} inches of snow on the ground.`);
    }
    // season pace
    if (gddAnom != null) {
      const pace = Math.abs(daysApprox) <= 2 ? "essentially on schedule" : daysApprox > 2 ? `running about ${daysApprox} days early` : `running about ${Math.abs(daysApprox)} days late`;
      parts.push(`Degree days stand at ${actualTotal} against a normal of ${gddNow}, so the season is ${pace}.`);
    }
    // USA-NPN accumulated-heat anomaly: a year-round read on whether the season is ahead of or behind normal
    if (springIndex && springIndex.agddAnom != null && Math.abs(springIndex.agddAnom) >= 10 && doy >= 55 && doy <= 330) {
      parts.push(`Against the long-term normal, accumulated heat is ${springIndex.agddAnom > 0 ? "running ahead" : "lagging"} by ${Math.abs(Math.round(springIndex.agddAnom))} growing degree days.`);
    }
    // Spring index leaf-out, shown only while it is still seasonally fresh (late winter into early summer)
    if (springIndex && springIndex.leafDoy != null && doy <= 165) {
      const ld = doyToDate(springIndex.leafDoy).toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const anomTxt = springIndex.leafAnom == null || Math.abs(springIndex.leafAnom) < 1 ? "right on the long-term normal" : springIndex.leafAnom < 0 ? `${Math.abs(Math.round(springIndex.leafAnom))} days ahead of the normal` : `${Math.round(springIndex.leafAnom)} days behind the normal`;
      parts.push(`The national spring index put first leaf-out near ${ld} this year, ${anomTxt}.`);
    }
    // photoperiod and soil, the master clocks behind the calendar
    if (forecast?.daylightH != null) {
      const h = Math.floor(forecast.daylightH), m = Math.round((forecast.daylightH - h) * 60);
      const dir = forecast.daylightDeltaMin > 0.2 ? "still lengthening" : forecast.daylightDeltaMin < -0.2 ? "shortening" : "near its turn";
      let soilTxt = "";
      if (forecast.soilF != null) soilTxt = forecast.soilF < 50 ? `, and the soil at six inches is ${forecast.soilF} degrees, still too cold for warm-season planting` : `, and the soil at six inches is ${forecast.soilF} degrees, warm enough for morels and the warm-season garden`;
      parts.push(`Daylight is ${h} hours ${m} minutes, ${dir} about ${Math.abs(forecast.daylightDeltaMin)} minutes a day${soilTxt}.`);
    }
    // frost climatology: anchor the growing season in spring and again toward fall
    if (doy <= LAST_FROST_DOY + 22) {
      const d = Math.round(LAST_FROST_DOY - doy);
      if (d > 0) parts.push(`The region's average last frost is around mid-May, roughly ${d} days out, so hold tender transplants a little longer.`);
      else parts.push(`The region's average last frost, around mid-May, has passed.`);
    } else if (doy >= 235 && doy <= FIRST_FROST_DOY) {
      parts.push(`First frost here typically comes in early October, leaving about ${FIRST_FROST_DOY - doy} days of growing season.`);
    }
    // next hatch projection
    const upcoming = EVENTS.filter((e) => e.cat === "hatch").map((e) => {
      const thr = thresholds[e.name]; if (thr == null || actualTotal == null) return null;
      if (actualTotal >= thr && !(doy >= e.s && doy <= e.e)) return null;
      const pd = (doy >= e.s && doy <= e.e) ? doy : projectOnset(thr, actualTotal, doy);
      return pd ? { name: e.name, doy: pd, active: doy >= e.s && doy <= e.e } : null;
    }).filter(Boolean).sort((x, y) => x.doy - y.doy);
    const activeHatch = upcoming.find((u) => u.active);
    const nextHatch = upcoming.find((u) => !u.active);
    if (activeHatch && nextHatch) parts.push(`The ${activeHatch.name.replace(/ hatch.*/i, "")} is on now; the ${nextHatch.name.replace(/ hatch.*/i, "")} projects to ${fmtDate(nextHatch.doy)}, about ${nextHatch.doy - doy} days out.`);
    else if (nextHatch) parts.push(`The next hatch worth waiting for is the ${nextHatch.name.replace(/ hatch.*/i, "")}, projected around ${fmtDate(nextHatch.doy)}, about ${nextHatch.doy - doy} days out.`);
    else if (activeHatch) parts.push(`The ${activeHatch.name.replace(/ hatch.*/i, "")} is the hatch on the water now.`);
    // the indicator linkage worth acting on right now
    const ind = activeIndicators(doy).find((i) => i.state === "active");
    if (ind) parts.push(ind.signal);
    // frost in the near outlook
    if (forecast?.frost?.length) {
      const f = forecast.frost[0];
      const dt = new Date(f.date).toLocaleDateString("en-US", { weekday: "long" });
      parts.push(`Frost is in the outlook: ${f.low} degrees ${dt} night. Cover or bring in tender plants.`);
    }
    // birds
    if (birds.length) {
      const names = birds.slice(0, 2).map((b) => b.comName).join(" and ");
      parts.push(`On the bay, ${birds.length} notable ${birds.length === 1 ? "bird is" : "birds are"} being reported, including ${names}.`);
    }
    // Saginaw Bay ice (winter signal) and drought context, each only when it has something to say
    if (bay && bay.iceConc != null && bay.iceConc >= 5) {
      parts.push(`Saginaw Bay is ${Math.round(bay.iceConc)} percent ice covered.`);
    }
    if (drought && drought.label && drought.label !== "no drought") {
      parts.push(`Bay County is in ${drought.label} on the latest Drought Monitor.`);
    }
    return parts.join(" ");
  }, [rivers, stats, gddAnom, daysApprox, actualTotal, gddNow, thresholds, doy, birds, forecast, springIndex, bay, drought, riverForecast]);

  const indicators = useMemo(() => activeIndicators(doy).filter((i) => i.state !== "recent"), [doy]);

  // Computed hatch and emergence forecast: actual accumulated heat against known GDD thresholds,
  // cross-checked against the live AuSable water temperature for the aquatic insects.
  const emergence = useMemo(() => {
    const au = rivers.find((r) => r.id === "ausable");
    const auTempF = au && au.temp != null ? cToF(au.temp) : null;
    return emergenceForecast(actualTotal, doy, auTempF);
  }, [actualTotal, doy, rivers]);

  // Computed garden planting window: live soil temperature and the frost outlook against each crop's
  // soil-temperature need, with frost-sensitive crops gated on the average last frost having passed.
  const garden = useMemo(() => {
    const frostClear = !!forecast && (!forecast.frost || forecast.frost.length === 0);
    return gardenWindow(doy, forecast?.soilF ?? null, frostClear);
  }, [forecast, doy]);
  const showGarden = garden.length > 0;

  // Stage one of the at-a-glance redesign: a compact "moment" derived from values already computed.
  // A row of live chips plus a one-line highlight of what is hatching, plantable, and overhead.
  const moment = useMemo(() => {
    const chips = [];
    if (river && river.flow != null) {
      const arrow = river.trend === "rising" ? "\u2197" : river.trend === "dropping" ? "\u2198" : "\u2192";
      chips.push({ k: "river", label: river.name, value: `${river.flow}`, unit: "cfs", sub: river.trend && river.trend !== "steady" ? `${arrow} ${river.trend}` : "steady" });
    }
    const wTemp = river && river.temp != null ? Math.round(cToF(river.temp)) : (bay && bay.waterTempF != null ? bay.waterTempF : null);
    if (wTemp != null) chips.push({ k: "water", label: "Water", value: `${wTemp}`, unit: "\u00B0F", sub: river && river.temp != null ? "river" : "the bay" });
    if (daysApprox != null) {
      const pace = Math.abs(daysApprox) <= 2 ? "on time" : daysApprox > 0 ? `${daysApprox}d early` : `${Math.abs(daysApprox)}d late`;
      chips.push({ k: "heat", label: "Season", value: pace, unit: "", sub: actualTotal != null ? `${actualTotal} GDD` : "" });
    }
    if (sky && sky.moon) chips.push({ k: "moon", label: "Moon", value: `${sky.moon.illum}`, unit: "%", sub: sky.moon.name });
    if (forecast && forecast.frost && forecast.frost.length) {
      chips.push({ k: "frost", label: "Frost", value: `${forecast.frost[0].low}`, unit: "\u00B0F", sub: new Date(forecast.frost[0].date).toLocaleDateString("en-US", { weekday: "short" }) + " night" });
    } else if (forecast && forecast.daylightH != null) {
      const h = Math.floor(forecast.daylightH), m = Math.round((forecast.daylightH - h) * 60);
      chips.push({ k: "day", label: "Daylight", value: `${h}:${String(m).padStart(2, "0")}`, unit: "", sub: forecast.daylightDeltaMin != null ? `${forecast.daylightDeltaMin > 0 ? "+" : ""}${forecast.daylightDeltaMin} min/day` : "" });
    }
    const hatching = (emergence || []).filter((e) => e.phase === "on").slice(0, 3).map((e) => e.name);
    const planting = (garden || []).filter((g) => g.ready).slice(0, 3).map((g) => g.name);
    const overhead = sky && sky.constellations && sky.constellations.length ? sky.constellations[0].name : null;
    return { chips, hatching, planting, overhead };
  }, [river, bay, daysApprox, actualTotal, sky, forecast, emergence, garden]);

  // Stage two: tabbed detail deck. One panel shows at a time so each is a short screen.
  const [tab, setTab] = useState("water");
  useEffect(() => { try { const t = localStorage.getItem("phenoTab"); if (t) setTab(t); } catch (e) {} }, []);
  const pickTab = (t) => {
    setTab(t);
    try { localStorage.setItem("phenoTab", t); } catch (e) {}
    if (typeof document !== "undefined") { const el = document.getElementById("deck"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  // Live instruments, each tagged with the tab it belongs to, so the grid can be split by theme.
  const instruments = useMemo(() => {
    const a = [];
    a.push({ tab: "water", Icon: Droplets, label: `${river ? river.name : "River"} flow`, value: river && river.flow != null ? river.flow : "n/a", unit: "cfs", sub: river && river.flow != null ? `USGS gauge${river.trend && river.trend !== "steady" ? ", " + river.trend : ""}` : "no live reading", live: !!(river && river.flow != null), accent: CAT.water.color });
    a.push({ tab: "water", Icon: Fish, label: "River water", value: river && river.temp != null ? Math.round(cToF(river.temp)) : "n/a", unit: "deg F", sub: river && river.temp != null ? `${river.name}, USGS` : "no temperature sensor on this gauge", live: !!(river && river.temp != null), accent: CAT.fish.color });
    a.push({ tab: "water", Icon: Waves, label: "Lake Huron level", value: regional.level != null ? regional.level.toFixed(2) : "176.95", unit: "m IGLD", sub: regional.level != null ? "Saginaw Bay, NOAA" : "seasonal normal", live: regional.level != null, accent: CAT.water.color });
    if (bay && bay.windMph != null) a.push({ tab: "water", Icon: Compass, label: "Saginaw Bay wind", value: bay.windMph, unit: "mph", sub: `out of the ${degToCompass(bay.windDirDeg)}, buoy 45203${bay.waveFt != null ? `, ${bay.waveFt} ft seas` : ""}`, live: true, accent: CAT.water.color });
    if (bay && bay.waterTempF != null) a.push({ tab: "water", Icon: Waves, label: "Bay water, buoy", value: bay.waterTempF, unit: "deg F", sub: bay.waterTempF >= 43 && bay.waterTempF <= 50 ? "in the walleye spawn window" : "Saginaw Bay buoy 45203", live: true, accent: CAT.fish.color });
    if (bay && bay.iceConc != null && bay.iceConc >= 1) a.push({ tab: "water", Icon: Snowflake, label: "Bay ice cover", value: Math.round(bay.iceConc), unit: "percent", sub: `Saginaw Bay, GLERL satellite${bay.iceDate ? `, ${bay.iceDate}` : ""}`, live: true, accent: CAT.water.color });
    else if (bay && bay.glseaF != null) a.push({ tab: "water", Icon: Thermometer, label: "Lake surface, satellite", value: bay.glseaF, unit: "deg F", sub: `GLSEA whole-bay average${bay.glseaDate ? `, ${bay.glseaDate}` : ""}`, live: true, accent: CAT.fish.color });
    a.push({ tab: "garden", Icon: Sprout, label: "Soil, 6 inches", value: forecast?.soilF != null ? forecast.soilF : "n/a", unit: "deg F", sub: forecast?.soilF != null ? (forecast.soilF >= 50 ? "active; morels and warm-season planting" : "still cold for warm-season crops") : "unavailable", live: forecast?.soilF != null, accent: CAT.garden.color });
    a.push({ tab: "garden", Icon: Snowflake, label: "Frost watch", value: forecast?.frost?.length ? forecast.frost[0].low : (forecast?.coldest != null ? forecast.coldest : "n/a"), unit: "deg F low", sub: forecast?.frost?.length ? `frost ${new Date(forecast.frost[0].date).toLocaleDateString("en-US", { weekday: "short" })} night; protect tender plants` : (forecast?.coldest != null ? "no frost in the 7-day outlook" : "unavailable"), live: forecast?.coldest != null, accent: CAT.water.color });
    if (forecast && forecast.snowDepthIn != null && forecast.snowDepthIn >= 0.5) a.push({ tab: "garden", Icon: Snowflake, label: "Snow on ground", value: forecast.snowDepthIn, unit: "in", sub: "modeled, Open-Meteo", live: true, accent: CAT.water.color });
    a.push({ tab: "sky", Icon: Sunrise, label: "Daylight", value: forecast?.daylightH != null ? `${Math.floor(forecast.daylightH)}h ${Math.round((forecast.daylightH - Math.floor(forecast.daylightH)) * 60)}m` : "n/a", unit: "", sub: forecast?.daylightH != null ? `${forecast.daylightDeltaMin > 0 ? "+" : ""}${forecast.daylightDeltaMin} min/day${forecast.sunrise ? `, ${forecast.sunrise} to ${forecast.sunset}` : ""}` : "unavailable", live: forecast?.daylightH != null, accent: season.color });
    a.push({ tab: "trends", Icon: Thermometer, label: "Bay City air, now", value: airF != null ? airF : normToday, unit: "deg F", sub: airF != null ? `current observation${regional.air.forecast ? ", " + regional.air.forecast.toLowerCase() : ""}` : "seasonal normal", live: airF != null, accent: season.color });
    a.push({ tab: "trends", Icon: Sprout, label: "Degree days, actual", value: actualTotal != null ? actualTotal : gddNow, unit: "GDD50", sub: actualTotal != null ? "observed since Jan 1, Open-Meteo" : "modeled", live: actualTotal != null, accent: CAT.garden.color });
    a.push({ tab: "trends", Icon: TreePine, label: "Season anomaly", value: gddAnom != null ? (gddAnom >= 0 ? "+" : "") + gddAnom : "0", unit: "GDD vs normal", sub: gddAnom != null ? `about ${Math.abs(daysApprox)} days ${gddAnom >= 0 ? "ahead" : "behind"} normal` : "real degree days pending", live: gddAnom != null, accent: CAT.bird.color });
    return a;
  }, [river, airF, normToday, regional, actualTotal, gddNow, gddAnom, daysApprox, forecast, bay, season]);
  const InstrumentGrid = ({ which }) => {
    const items = instruments.filter((x) => x.tab === which);
    if (!items.length) return null;
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        {items.map((x, i) => <Instrument key={i} Icon={x.Icon} label={x.label} value={x.value} unit={x.unit} sub={x.sub} live={x.live} accent={x.accent} />)}
      </div>
    );
  };
  const TABS = [["water", "Water & fish"], ["hunting", "Hunting"], ["garden", "Garden"], ["sky", "Sky"], ["life", "Life"], ["trends", "Trends"]];

  // Hunting: Michigan season board, the rut clock, and today's legal shooting hours.
  const hunting = useMemo(() => huntingForecast(doy), [doy]);
  const rut = useMemo(() => rutClock(doy), [doy]);
  const legal = useMemo(() => {
    if (!forecast || !forecast.sunriseISO || !forecast.sunsetISO) return null;
    const shift = (iso, delta) => {
      const p = iso.slice(11, 16).split(":");
      let mins = (+p[0]) * 60 + (+p[1]) + delta;
      mins = (mins + 1440) % 1440;
      let h = Math.floor(mins / 60); const m = mins % 60; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, "0")} ${ap}`;
    };
    return { start: shift(forecast.sunriseISO, -30), end: shift(forecast.sunsetISO, 30) };
  }, [forecast]);

  // Aurora verdict for this latitude from the Kp index, OVATION probability, and tonight's moon.
  const auroraRead = useMemo(() => {
    if (!aurora) return null;
    const kp = Math.max(aurora.kpNow || 0, aurora.kpPeak || 0);
    const moonBright = sky && sky.moon && sky.moon.illum > 60;
    let level, verdict;
    if ((aurora.ovationBay != null && aurora.ovationBay >= 15) || kp >= 7) {
      level = "likely"; verdict = "Aurora is possible from the bay tonight. Get somewhere dark with an open view to the north.";
    } else if ((aurora.ovationNorth != null && aurora.ovationNorth >= 20) || kp >= 6) {
      level = "watch"; verdict = "A real chance over northern Michigan and the UP, with a low northern glow possible from the bay if it strengthens.";
    } else if (kp >= 5) {
      level = "watch"; verdict = "Minor storm levels. Worth watching the northern horizon from up north; a long shot this far south.";
    } else {
      level = "quiet"; verdict = "Geomagnetic activity is quiet. No aurora expected.";
    }
    return { level, verdict, kp, moonBright };
  }, [aurora, sky]);

  // Filter indicators by activity group (hunt, fish, garden, water, bird)
  const [activeTags, setActiveTags] = useState([...ALL_GROUPS]);
  const filteredIndicators = useMemo(
    () => indicators.filter((i) => eventMatches(i, activeTags)),
    [indicators, activeTags]
  );
  // For a given signal, test it against today's live sensor reading so a folk correlation can be
  // confirmed or shown as not-yet-there. Returns null when there is nothing measurable to check.
  const liveCheck = useMemo(() => {
    const soilF = forecast?.soilF ?? null;
    const waterF = bay && bay.waterTempF != null ? bay.waterTempF : (river && river.temp != null ? Math.round(cToF(river.temp)) : null);
    const frostN = forecast?.frost?.length || 0;
    return (name) => {
      const c = SIGNAL_CHECKS[name];
      if (!c) return null;
      if (c.kind === "soil") { if (soilF == null) return null; return { ok: soilF >= c.min, label: `soil ${soilF}\u00B0F`, want: `the cue is ${c.min}\u00B0F` }; }
      if (c.kind === "water") { if (waterF == null) return null; const ok = (c.min == null || waterF >= c.min) && (c.max == null || waterF <= c.max); const want = c.min != null && c.max != null ? `the window is ${c.min} to ${c.max}\u00B0F` : c.max != null ? `the cue is ${c.max}\u00B0F or cooler` : `the cue is ${c.min}\u00B0F or warmer`; return { ok, label: `water ${waterF}\u00B0F`, want }; }
      if (c.kind === "frost") { return { ok: frostN > 0, label: frostN > 0 ? "frost in the 7-day outlook" : "no frost in the 7-day outlook", want: "" }; }
      return null;
    };
  }, [forecast, bay, river]);
  const confirmedCount = useMemo(() => filteredIndicators.reduce((n, i) => { const c = liveCheck(i.name); return n + (c && c.ok ? 1 : 0); }, 0), [filteredIndicators, liveCheck]);
  const allTags = ALL_GROUPS;
  const tagLabels = GROUP_LABEL;

  // Detect correlations: events from two different active groups whose windows genuinely overlap right now
  const correlations = useMemo(() => {
    const inWindow = (e) => {
      const eMod = e.e % 365;
      return e.e > 365 ? (doy >= e.s || doy <= eMod) : (doy >= e.s && doy <= e.e);
    };
    const soon = (e) => e.s - doy > 0 && e.s - doy <= 21;
    const live = EVENTS.filter((e) => (inWindow(e) || soon(e)) && eventMatches(e, activeTags));
    const overlaps = (a, b) => !(Math.min(a.e, 365) < b.s || Math.min(b.e, 365) < a.s);
    // find the closest-peaking cross-group, cross-category pair
    let best = null, bestGap = Infinity;
    for (const a of live) {
      const ga = eventGroups(a).filter((g) => activeTags.includes(g));
      for (const b of live) {
        if (a.name >= b.name) continue; // unordered unique pairs
        if (a.cat === b.cat) continue;
        const gb = eventGroups(b).filter((g) => activeTags.includes(g));
        const differentGroups = ga.some((g) => !gb.includes(g)) || gb.some((g) => !ga.includes(g));
        if (ga.length && gb.length && differentGroups && overlaps(a, b)) {
          const gap = Math.abs((a.p % 365) - (b.p % 365));
          if (gap < bestGap) { bestGap = gap; best = [a, b]; }
        }
      }
    }
    if (!best) return null;
    const [a, b] = best;
    return `${a.name} and ${b.name} overlap on the calendar right now. Watch whether they track together as the years bank up.`;
  }, [doy, activeTags]);

  // banked daily record
  const auNow = rivers.find((r) => r.id === "ausable") || {};
  const lyKey = (() => { const d = doyToDate(doy); return `${d.getFullYear() - 1}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const lastYear = history.find((h) => h.date === lyKey) || null;
  const prettyDate = (s) => (s ? new Date(s + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "");
  const bankTrend = useMemo(() => history.filter((h) => h.gdd != null).slice(-60).map((h) => ({ doy: h.doy, gdd: h.gdd })), [history]);

  const personLd = {
    "@context": "https://schema.org", "@type": "WebSite", name: "Michigan Phenology", url: SITE,
    description: "A real-time phenology dashboard for Saginaw Bay and northeastern Michigan, with interpreted river, hatch, bird, and growing degree day conditions.",
    author: { "@type": "Person", name: "Chris Izworski", url: "https://chrisizworski.com", sameAs: ["https://chrisizworski.com", "https://michigantroutreport.com/chris-izworski/", "https://michiganbirdingreport.com/chris-izworski", "https://greatlakeslevels.org", "https://github.com/izworskic", "https://www.youtube.com/@izworskic", "https://www.wikidata.org/wiki/Q138283432"] },
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 70% -10%, #fbf7ec 0%, #f4eede 55%, #efe7d3 100%)", color: "#2b2a1f", padding: "0 0 40px" }}>
      <Head>
        <title>Michigan Phenology by Chris Izworski: Saginaw Bay and the AuSable in Real Time</title>
        <meta name="description" content="An interpreted real-time read on the natural year across Saginaw Bay and northeastern Michigan: live river conditions, projected hatches, bird movement, and growing degree days, by Chris Izworski." />
        <link rel="canonical" href={SITE + "/"} />
        <meta property="og:title" content="Michigan Phenology by Chris Izworski" />
        <meta property="og:description" content="The natural year of Saginaw Bay and the AuSable, interpreted in real time." />
        <meta property="og:url" content={SITE + "/"} /><meta property="og:type" content="website" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      </Head>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px" }}>
        <header style={{ paddingTop: 34, paddingBottom: 18, borderBottom: `2px solid ${season.color}` }}>
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <Compass size={22} color={season.color} style={{ position: "relative", top: 3 }} />
            <h1 style={{ margin: 0, fontSize: 32, letterSpacing: "0.01em", fontWeight: 600 }}>Michigan Phenology</h1>
            <span style={{ fontSize: 13, color: "#9a8f76", letterSpacing: "0.04em" }}>Saginaw Bay to the AuSable</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, color: season.color, textTransform: "uppercase", letterSpacing: "0.1em", border: `1px solid ${season.color}`, borderRadius: 8, padding: "3px 10px" }}>{season.name}</span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "#7a7058", fontStyle: "italic" }}>{dateStr}.</p>
        </header>

        {alerts && alerts.length > 0 && (
          <div style={{ marginTop: 16, border: "1px solid #e3c08a", background: "rgba(243, 224, 178, 0.45)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Snowflake size={15} color="#b08828" />
            <span style={{ fontSize: 12.5, color: "#7a5e1f", fontWeight: 600 }}>Active for the bay counties:</span>
            {alerts.map((a, i) => (
              <span key={i} style={{ fontSize: 12, color: "#7a5e1f", border: "1px solid #e3c08a", borderRadius: 999, padding: "2px 10px", background: "rgba(255,255,255,0.5)" }}>{a.event}</span>
            ))}
            <span style={{ fontSize: 11, color: "#9a8f76", marginLeft: "auto" }}>NWS</span>
          </div>
        )}

        {moment && moment.chips.length > 0 && (
          <section style={{ marginTop: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {moment.chips.map((c, i) => {
                const dest = { river: "water", water: "water", heat: "trends", moon: "sky", frost: "garden", day: "sky" }[c.k] || "water";
                return (
                <div key={i} onClick={() => pickTab(dest)} style={{ flex: "1 1 auto", minWidth: 90, border: "1px solid #e4dcc8", borderRadius: 12, padding: "8px 12px", background: "rgba(255,255,255,0.62)", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a8f76", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                  <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 19, color: "#2b2a1f", lineHeight: 1.2, whiteSpace: "nowrap" }}>{c.value}{c.unit ? <span style={{ fontSize: 11, color: "#7a7058" }}> {c.unit}</span> : null}</div>
                  <div style={{ fontSize: 10.5, color: "#8a7d62", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sub}</div>
                </div>
                );
              })}
            </div>
            {(moment.hatching.length > 0 || moment.planting.length > 0 || moment.overhead) && (
              <div style={{ marginTop: 9, fontSize: 13, color: "#5a513c", lineHeight: 1.6, display: "flex", flexWrap: "wrap", gap: "2px 16px" }}>
                {moment.hatching.length > 0 && <span onClick={() => pickTab("water")} style={{ cursor: "pointer" }}><Egg size={12} style={{ verticalAlign: "-1px" }} color={CAT.hatch.color} /> <strong style={{ color: "#3a3527" }}>Hatching:</strong> {moment.hatching.join(", ")}</span>}
                {moment.planting.length > 0 && <span onClick={() => pickTab("garden")} style={{ cursor: "pointer" }}><Sprout size={12} style={{ verticalAlign: "-1px" }} color={CAT.garden.color} /> <strong style={{ color: "#3a3527" }}>Plant now:</strong> {moment.planting.join(", ")}</span>}
                {moment.overhead && <span onClick={() => pickTab("sky")} style={{ cursor: "pointer" }}><Sparkles size={12} style={{ verticalAlign: "-1px" }} color="#7b6db0" /> <strong style={{ color: "#3a3527" }}>Overhead:</strong> {moment.overhead}</span>}
              </div>
            )}
          </section>
        )}

        {read && (
          <section style={{ marginTop: 18, background: "rgba(255,255,255,0.5)", border: "1px solid #e4dcc8", borderLeft: `4px solid ${season.color}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a7d62", marginBottom: 6 }}>The read</div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#3a3527", fontFamily: "Newsreader, Georgia, serif" }}>{read}</p>
            {correlations && <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.5, color: "#6a5f4a", fontFamily: "Newsreader, Georgia, serif", fontStyle: "italic", borderTop: "1px solid #e4dcc8", paddingTop: 12 }}>Correlation: {correlations}</p>}
          </section>
        )}

        <section className="pheno-2col" style={{ marginTop: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "18px 18px 8px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, justifyContent: "center" }}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: activeTags.includes(tag) ? 600 : 400,
                    background: activeTags.includes(tag) ? "#d4c8a8" : "#f5f0e8",
                    border: `1px solid ${activeTags.includes(tag) ? "#c4b898" : "#e4dcc8"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#5a5340",
                    transition: "all 0.2s"
                  }}
                >
                  {tagLabels[tag]}
                </button>
              ))}
            </div>
            <Wheel doy={doy} accent={season} onSelect={setSel} activeTags={activeTags} />
            <div style={{ textAlign: "center", fontSize: 11, color: "#a89c83", fontStyle: "italic", marginTop: -2 }}>Tap any dot for the detail and projection.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", padding: "8px 4px 12px" }}>
              {Object.entries(CAT).map(([k, c]) => (<span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a7d62" }}><span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, display: "inline-block" }} />{c.label}</span>))}
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: 17, margin: "2px 0 8px", color: season.color }}>Happening now</h2>
            {active.length ? active.map((ev, i) => <EventRow key={i} ev={ev} doy={doy} state="active" />) : <div style={{ fontSize: 13, color: "#9a8f76", padding: "8px 0" }}>A quiet stretch on the calendar.</div>}
            {imminent.length > 0 && <><h2 style={{ fontSize: 17, margin: "20px 0 8px", color: "#b08828" }}>Next three weeks</h2>{imminent.map((ev, i) => <EventRow key={i} ev={ev} doy={doy} state="imminent" />)}</>}
            {recent.length > 0 && <><h2 style={{ fontSize: 17, margin: "20px 0 8px", color: "#a89c83" }}>Just past</h2>{recent.map((ev, i) => <EventRow key={i} ev={ev} doy={doy} state="recent" />)}</>}
          </div>
        </section>

        {filteredIndicators.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Link2 size={16} color={CAT.bloom.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Connections in play</h2>
            </div>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>The signals nature is giving right now, and what each one points to on the rivers, in the woods, and in the garden.{confirmedCount > 0 ? ` ${confirmedCount} ${confirmedCount === 1 ? "is" : "are"} backed by today's readings.` : ""}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {filteredIndicators.map((ind, i) => {
                const tag = ind.state === "active" ? "active now" : `in about ${ind.days} days`;
                const tagColor = ind.state === "active" ? "#5a8a4a" : "#b08828";
                const chk = liveCheck(ind.name);
                return (
                  <div key={i} style={{ border: "1px solid #e4dcc8", borderLeft: `3px solid ${CAT[ind.cat].color}`, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,0.5)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: CAT[ind.cat].color, display: "inline-block", position: "relative", top: 1 }} />
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f", overflowWrap: "anywhere" }}>{ind.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, color: tagColor, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>{tag}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ArrowRight size={15} color={CAT[ind.cat].color} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: "#5a5240", lineHeight: 1.45 }}>{ind.signal}</span>
                    </div>
                    {chk && (
                      <div style={{ marginTop: 8, fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 8, padding: "3px 9px", background: chk.ok ? "rgba(228,243,221,0.75)" : "rgba(244,237,222,0.75)", color: chk.ok ? "#42702f" : "#9a7b3a", border: `1px solid ${chk.ok ? "#bcd3ad" : "#e3d2a6"}` }}>
                        {chk.ok ? <Check size={13} /> : <Clock size={13} />}
                        <span>{chk.ok ? `today's reading agrees: ${chk.label}` : `${chk.label}${chk.want ? `, ${chk.want}` : ""}`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <nav id="deck" style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", gap: 5, flexWrap: "wrap", margin: "28px 0 0", padding: "10px 0", background: "rgba(244,240,231,0.94)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", borderBottom: "1px solid #e4dcc8" }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => pickTab(id)} style={{ border: `1px solid ${tab === id ? season.color : "#ddd4be"}`, background: tab === id ? season.color : "transparent", color: tab === id ? "#fff" : "#6a5f4a", borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
          ))}
        </nav>

        <div style={{ marginTop: 18 }}>
          {tab === "water" && (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "0 0 12px" }}>
              <span style={{ fontSize: 12, color: "#9a8f76" }}>River:</span>
              {rivers.map((r) => (<button key={r.id} className="pheno-pill" data-on={r.id === riverId ? "1" : "0"} onClick={() => setRiverId(r.id)}>{r.name}</button>))}
              {river && <span style={{ fontSize: 12, color: "#9a8f76", fontStyle: "italic" }}>{river.note}</span>}
            </div>
          )}
          {tab === "water" && <InstrumentGrid which="water" />}
          {tab === "garden" && <InstrumentGrid which="garden" />}
          {tab === "sky" && <InstrumentGrid which="sky" />}
          {tab === "trends" && <InstrumentGrid which="trends" />}
          {tab === "trends" && (
            <p style={{ fontSize: 11.5, color: "#9a8f76", margin: "0 2px 18px", lineHeight: 1.55 }}>
              <strong style={{ color: "#7a7058" }}>GDD</strong>, growing degree days: a running tally of heat above 50 degrees F that paces plants and insects. The higher the number, the further along the season. <strong style={{ color: "#7a7058" }}>cfs</strong>: cubic feet per second, the river's flow. <strong style={{ color: "#7a7058" }}>IGLD</strong>: the official Great Lakes height datum, in meters above sea level.
            </p>
          )}
        </div>

        {tab === "water" && emergence && emergence.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Egg size={16} color={CAT.hatch.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Hatch and emergence forecast</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a7058", border: "1px solid #d8cca8", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>computed</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>This season's accumulated heat against known degree-day thresholds, with the aquatic hatches cross-checked against the live AuSable water temperature. Estimates, not promises; emergence shifts with the weather.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
              {emergence.map((e, i) => {
                const on = e.phase === "on";
                const aquatic = e.kind === "mayfly" || e.kind === "caddis";
                return (
                  <div key={i} style={{ border: "1px solid #e4dcc8", borderLeft: `3px solid ${aquatic ? CAT.fish.color : CAT.wild.color}`, borderRadius: 10, padding: "9px 12px", background: on ? "rgba(122,160,90,0.10)" : "rgba(255,255,255,0.5)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f" }}>{e.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: on ? "#3f6b2f" : "#7a7058", fontWeight: 600, whiteSpace: "nowrap" }}>{e.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6a5f4a", marginTop: 3 }}>{e.note}</div>
                    {e.waterNote && <div style={{ fontSize: 11, color: "#b08828", marginTop: 3 }}>{e.waterNote}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "hunting" && (
          <section style={{ marginTop: 18 }}>
            <div style={{ background: "rgba(255,255,255,0.5)", border: "1px solid #e4dcc8", borderLeft: "4px solid #8a6a2f", borderRadius: 14, padding: "16px 20px", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Target size={16} color="#8a6a2f" />
                <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>The rut</h2>
              </div>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: "#3a3527" }}>
                {rut.phase
                  ? <>Deer are in the <strong style={{ color: "#7a5a2f" }}>{rut.phase}</strong>.</>
                  : rut.days <= 250
                    ? <>Peak rut is about <strong style={{ color: "#7a5a2f" }}>{rut.days} days</strong> out, around mid-November.</>
                    : <>The rut is behind us for this year. Deer are back on a food-and-bed pattern.</>}
                {legal && <> Legal shooting hours today run <strong style={{ color: "#7a5a2f" }}>{legal.start}</strong> to <strong style={{ color: "#7a5a2f" }}>{legal.end}</strong>, a half hour either side of the sun.</>}
                {forecast && forecast.windSpeedMph != null && <> Wind near the bay is {forecast.windSpeedMph} mph out of the {degToCompass(forecast.windDirDeg)}.</>}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Michigan season board</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b08828", border: "1px solid #e3d2a6", borderRadius: 6, padding: "1px 6px" }}>verify DNR digest</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {hunting.map((h, i) => (
                <div key={i} style={{ border: `1px solid ${h.open ? "#bcd3ad" : "#e4dcc8"}`, background: h.open ? "rgba(228,243,221,0.55)" : "rgba(255,255,255,0.4)", borderRadius: 12, padding: "10px 13px" }}>
                  <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 16, color: "#2b2a1f" }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: h.open ? "#4f7a3f" : "#9a7b3a", margin: "2px 0" }}>{h.status}</div>
                  <div style={{ fontSize: 11.5, color: "#9a8f76", lineHeight: 1.45 }}>{h.note}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: "#9a8f76", margin: "12px 2px 0", lineHeight: 1.55, fontStyle: "italic" }}>
              Dates are typical statewide windows and shift each year and by zone or deer management unit. The current Michigan DNR hunting digest is the authority. The rut timing is photoperiod-driven and lands in mid-November most years; cold fronts and the days right around the peak put the most deer on their feet in daylight.
            </p>
          </section>
        )}

        {tab === "garden" && showGarden && (
          <section style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Sprout size={16} color={CAT.garden.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Garden planting window</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7a7058", border: "1px solid #d8cca8", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>computed</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>Planting windows anchored to the area average last spring frost (about May 15) and first fall frost (about October 5), the way the almanac sets them. Cool-season crops get a spring and a fall window; the tender ones wait for their window plus warm soil and no frost in the outlook.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {garden.map((g, i) => (
                <div key={i} style={{ border: "1px solid #e4dcc8", borderLeft: `3px solid ${g.ready ? CAT.garden.color : "#cdbf9a"}`, borderRadius: 10, padding: "9px 12px", background: g.ready ? "rgba(122,160,90,0.10)" : "rgba(255,255,255,0.5)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f" }}>{g.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: g.ready ? "#3f6b2f" : "#8a7058", fontWeight: 600, whiteSpace: "nowrap" }}>{g.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6a5f4a", marginTop: 3 }}>{g.note}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "sky" && auroraRead && (
          <section style={{ marginTop: 18, background: "linear-gradient(180deg, rgba(20,30,30,0.97), rgba(14,24,26,0.98))", border: "1px solid #1f4a44", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 8px" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: auroraRead.level === "likely" ? "#62e08a" : auroraRead.level === "watch" ? "#e3c08a" : "#5f7a76", boxShadow: auroraRead.level !== "quiet" ? `0 0 8px ${auroraRead.level === "likely" ? "#62e08a" : "#e3c08a"}` : "none" }} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aee0d2", margin: 0 }}>Aurora watch</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8bc4b6", border: "1px solid #2f7066", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>live, NOAA SWPC</span>
            </div>
            <p style={{ fontSize: 14, color: "#d4e8e2", margin: "0 0 8px", lineHeight: 1.5 }}>{auroraRead.verdict}{auroraRead.moonBright && auroraRead.level !== "quiet" ? " A bright moon tonight will mute the fainter color." : ""}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12.5, color: "#9fc4bc" }}>
              <span>Kp now <strong style={{ color: "#eef7f4" }}>{aurora.kpNow != null ? aurora.kpNow : "n/a"}</strong></span>
              {aurora.kpPeak != null && <span>forecast peak <strong style={{ color: "#eef7f4" }}>{aurora.kpPeak}</strong>{aurora.kpPeakTime ? ` ${new Date(aurora.kpPeakTime).toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Detroit" })}` : ""}</span>}
              {aurora.ovationBay != null && aurora.ovationBay > 0 && <span>overhead chance here <strong style={{ color: "#eef7f4" }}>{aurora.ovationBay}%</strong></span>}
              {aurora.ovationNorth != null && aurora.ovationNorth > 0 && <span>northern Michigan <strong style={{ color: "#eef7f4" }}>{aurora.ovationNorth}%</strong></span>}
            </div>
            <p style={{ fontSize: 11, color: "#6f928b", margin: "10px 2px 0", fontStyle: "italic" }}>From NOAA Space Weather Prediction Center. The bay needs roughly Kp 7 for a horizon view; northern Michigan and the UP, closer to Kp 5.</p>
          </section>
        )}

        {tab === "sky" && sky && sky.constellations && sky.constellations.length > 0 && (
          <section style={{ marginTop: 30, background: "linear-gradient(180deg, rgba(28,32,54,0.96), rgba(20,24,44,0.98))", border: "1px solid #2c3457", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Sparkles size={16} color="#cdd6ff" />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aeb8e0", margin: 0 }}>Night sky tonight</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b95c4", border: "1px solid #3a4470", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>computed</span>
            </div>
            <p style={{ fontSize: 13, color: "#c4cbe8", margin: "0 0 4px" }}>
              The moon is a <strong style={{ color: "#eef1ff" }}>{sky.moon.name}</strong>, {sky.moon.illum} percent lit. After dark, looking up from the bay:
            </p>
            {sky.meteor && (
              <div style={{ margin: "10px 0", padding: "9px 13px", borderRadius: 10, background: "rgba(120,140,220,0.16)", border: "1px solid #3a4470" }}>
                <span style={{ fontSize: 13, color: "#eef1ff", fontFamily: "Georgia, serif" }}>The {sky.meteor.name} meteor shower {sky.meteor.when}</span>
                <span style={{ fontSize: 12, color: "#bcc4e8" }}> &mdash; {sky.meteor.note}; {sky.meteor.moonNote}.</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8, marginTop: 12 }}>
              {sky.constellations.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#eef1ff", minWidth: 96 }}>{c.name}</span>
                  <span style={{ fontSize: 11.5, color: "#aeb8e0" }}>{c.where}{c.circumpolar ? ", circling the pole" : ""}. {c.note}.</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#7b85b4", margin: "12px 2px 0", fontStyle: "italic" }}>Positions computed for about 10 pm local from this date and latitude. Brighter moonlight dims the faintest stars.</p>
          </section>
        )}

        {tab === "trends" && gddHistory && (
          <section style={{ marginTop: 18, background: "rgba(255,255,255,0.5)", border: "1px solid #e4dcc8", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <BarChart3 size={16} color={CAT.garden.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>How this year ranks</h2>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#3a3527" }}>
              The season has banked {gddHistory.cur} growing degree days to today, the {ordinal(gddHistory.rank)} warmest of the last {gddHistory.count} years and {gddHistory.cur >= gddHistory.mean ? "above" : "below"} the {gddHistory.mean} average. The warmest run to this date was {gddHistory.max.year} at {gddHistory.max.gdd}; the coldest was {gddHistory.min.year} at {gddHistory.min.gdd}.
            </p>
            <div style={{ position: "relative", height: 10, background: "#eadfca", borderRadius: 6, marginTop: 14 }}>
              <div style={{ position: "absolute", left: `${Math.max(2, Math.min(98, ((gddHistory.cur - gddHistory.min.gdd) / Math.max(1, gddHistory.max.gdd - gddHistory.min.gdd)) * 100))}%`, top: -4, width: 4, height: 18, background: CAT.garden.color, borderRadius: 2, transform: "translateX(-2px)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#9a8f76", marginTop: 4 }}>
              <span>coldest {gddHistory.min.gdd}</span><span style={{ color: CAT.garden.color, fontWeight: 600 }}>this year {gddHistory.cur}</span><span>warmest {gddHistory.max.gdd}</span>
            </div>
          </section>
        )}

        {tab === "trends" && (
        <section style={{ marginTop: 18, background: "rgba(255,255,255,0.5)", border: "1px solid #e4dcc8", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Feather size={16} color={CAT.wild.color} />
            <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Banked record</h2>
          </div>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#5a5240" }}>
              The site keeps its own daily journal now: river flow and temperature, lake level, air, degree days, soil, and the day's notable birds, one snapshot every morning. As it fills, this is the record each date gets measured against in the years to come, your own history rather than a model's.
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#3a3527" }}>
                {history.length} {history.length === 1 ? "day" : "days"} on record since {prettyDate(history[0].date)}.
                {lastYear ? ` On this date last year the AuSable ran ${lastYear.ausableFlow != null ? lastYear.ausableFlow + " cfs" : "an unrecorded flow"}${lastYear.ausableTempF != null ? " at " + lastYear.ausableTempF + " degrees F" : ""}; today it is ${auNow.flow != null ? auNow.flow + " cfs" : "not posting"}${auNow.temp != null ? " at " + Math.round(cToF(auNow.temp)) + " degrees F" : ""}.` : " A full year of records unlocks the on-this-date comparison."}
              </p>
              {bankTrend.length >= 8 && (
                <div style={{ height: 130, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bankTrend} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                      <XAxis dataKey="doy" tick={{ fontSize: 10, fill: "#8a7d62" }} stroke="#cdbfa3" />
                      <YAxis tick={{ fontSize: 10, fill: "#8a7d62" }} stroke="#cdbfa3" width={36} />
                      <Tooltip formatter={(v) => [`${v} GDD`, "Banked"]} labelFormatter={(d) => `Day ${d}`} contentStyle={{ fontFamily: "Georgia, serif", fontSize: 12, borderRadius: 8, border: "1px solid #e4dcc8" }} />
                      <Line type="monotone" dataKey="gdd" stroke="#7a6a4f" strokeWidth={2.4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </section>
        )}

        {tab === "trends" && (
        <section style={{ marginTop: 30 }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "18px 14px 8px" }}>
            <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: "0 0 6px", paddingLeft: 6 }}>Degree day accumulation</h2>
            <div style={{ display: "flex", gap: 16, paddingLeft: 6, marginBottom: 8, fontSize: 11.5, color: "#9a8f76" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, height: 0, borderTop: "2.6px solid #9a5b3f", display: "inline-block" }} />Actual this year</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, height: 0, borderTop: "2px dashed #c2b291", display: "inline-block" }} />Normal</span>
            </div>
            <div style={{ height: 220 }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <XAxis dataKey="doy" ticks={MID_MONTH_DOY} tickFormatter={(d) => MONTH_ABBR[MID_MONTH_DOY.indexOf(d)] || ""} tick={{ fontSize: 11, fill: "#8a7d62" }} stroke="#cdbfa3" />
                    <YAxis tick={{ fontSize: 11, fill: "#8a7d62" }} stroke="#cdbfa3" width={42} />
                    <Tooltip formatter={(v, n) => [`${v} GDD`, n === "actual" ? "Actual" : "Normal"]} labelFormatter={(d) => `Day ${d}`} contentStyle={{ fontFamily: "Georgia, serif", fontSize: 12, borderRadius: 8, border: "1px solid #e4dcc8" }} />
                    <ReferenceLine x={doy} stroke={season.color} strokeWidth={2} strokeDasharray="4 3" label={{ value: "now", fill: season.color, fontSize: 11, position: "top" }} />
                    <Line type="monotone" dataKey="normal" stroke="#c2b291" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    <Line type="monotone" dataKey="actual" stroke="#9a5b3f" strokeWidth={2.6} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div style={{ height: "100%" }} />}
            </div>
          </div>
        </section>
        )}

        {tab === "life" && (
        <section style={{ marginTop: 30 }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Bird size={16} color={CAT.bird.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Notable sightings, Saginaw Bay</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: birds.length ? "#5a8a4a" : "#b08828", border: `1px solid ${birds.length ? "#bcd3ad" : "#e3d2a6"}`, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>{birds.length ? "live, eBird" : "no recent"}</span>
            </div>
            {birds.length ? birds.map((b, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #ece4d2" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f", overflowWrap: "anywhere" }}>{b.comName}{b.howMany ? <span style={{ color: "#9a8f76", fontSize: 12 }}>  x{b.howMany}</span> : null}</div>
                <div style={{ fontSize: 11.5, color: "#9a8f76", overflowWrap: "anywhere" }}>{b.locName}{b.obsDt ? `  .  ${b.obsDt.split(" ")[0]}` : ""}</div>
              </div>
            )) : <div style={{ fontSize: 12.5, color: "#9a8f76", padding: "6px 0" }}>No notable reports in the last ten days. Check back during a migration wave.</div>}
          </div>
        </section>
        )}

        {tab === "life" && inat && inat.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Feather size={16} color={CAT.wild.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Seen near Saginaw Bay</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a8a4a", border: "1px solid #bcd3ad", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>live, iNaturalist</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>Research-grade sightings within sixty kilometers of the bay, every kind of living thing, most recent first. The closest thing to a field notebook for the whole region.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {inat.map((o, i) => (
                <div key={i} style={{ border: "1px solid #e4dcc8", borderRadius: 999, padding: "5px 12px", background: "rgba(255,255,255,0.6)", fontSize: 13, color: "#2b2a1f" }}>
                  <span style={{ fontFamily: "Georgia, serif" }}>{o.name}</span>
                  {o.date ? <span style={{ color: "#a89c83", fontSize: 11, marginLeft: 6 }}>{new Date(o.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> : null}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "life" && observations && observations.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 4px" }}>
              <Sprout size={16} color={CAT.garden.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Logged across Michigan</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a8a4a", border: "1px solid #bcd3ad", borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>live, USA-NPN</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>What Nature's Notebook observers are actually seeing right now statewide, whatever the season: flowering, leaf color, fruit, and animal activity as it happens.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {observations.map((o, i) => (
                <div key={i} style={{ border: "1px solid #e4dcc8", borderLeft: `3px solid ${o.kingdom === "Plantae" ? CAT.bloom.color : CAT.wild.color}`, borderRadius: 10, padding: "9px 12px", background: "rgba(255,255,255,0.5)" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#2b2a1f" }}>{o.name}</div>
                  <div style={{ fontSize: 12, color: "#6a5f4a", marginTop: 2 }}>{o.phase}</div>
                  <div style={{ fontSize: 11, color: "#a89c83", marginTop: 3 }}>{o.date ? new Date(o.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #e4dcc8", fontSize: 12, color: "#9a8f76", lineHeight: 1.55 }}>
          One clock for the whole natural year, drawing on the <a href="https://michigantroutreport.com">Michigan Trout Report</a>, the <a href="https://michiganbirdingreport.com">Michigan Birding Report</a>, <a href="https://greatlakeslevels.org">Great Lakes Lake Levels</a>, and <a href="https://freighterviewfarms.com">Freighter View Farms</a>. Live data from USGS, NWS, NOAA CO-OPS and NDBC, GLERL CoastWatch, NOAA SWPC, eBird, iNaturalist, USA-NPN, US Drought Monitor, and Open-Meteo. Built and maintained by <a href="https://chrisizworski.com">Chris Izworski</a>. Updated {generatedAt}.
        </footer>
      </div>

      <EventPopout ev={sel} doy={doy} actualTotal={actualTotal} thresholds={thresholds} season={season} onClose={() => setSel(null)} />
    </div>
  );
}

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  const now = new Date();
  const doy = dayOfYear(now);
  const T = (p, fb) => withTimeout(p, 8000, fb);
  // Live sources change through the day and are fetched every load. Daily-cadence signals
  // (spring index, observations, iNaturalist, drought, ice, lake-surface temp) are read once
  // from the banked bundle the cron refreshes daily, so the page makes one cheap call for all of them.
  const [regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, buoy, alerts, signals] = await Promise.all([
    fetchRegional(), fetchRivers(), fetchGddActual(), fetchBirds(), fetchAusableStats(), fetchForecast(), fetchGddHistory(), readHistory(),
    T(fetchBuoy(), { windDirDeg: null, windMph: null, waterTempF: null, airTempF: null, waveFt: null }),
    T(fetchAlerts(), []),
    T(readSignals(), null),
  ]);
  const riverForecast = await T(fetchRiverForecast(), { active: false });
  const aurora = await T(fetchAurora(), { kpNow: null, kpPeak: null, kpPeakTime: null, ovationBay: null, ovationNorth: null });
  const sig = signals || emptySignals();
  const bay = { ...buoy, ...(sig.bayDaily || {}) };
  const sky = skyTonight(43.5945, -83.8889, now);
  return {
    props: {
      regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, riverForecast, sky, aurora,
      springIndex: sig.springIndex || emptySignals().springIndex,
      observations: sig.observations || [], inat: sig.inat || [], drought: sig.drought || null,
      bay, alerts, doy,
      season: seasonOf(doy), normToday: Math.round(normalMeanF(doy)),
      dateStr: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Detroit" }),
      generatedAt: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" }) + " ET",
    },
  };
}
