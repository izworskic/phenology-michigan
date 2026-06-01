import Head from "next/head";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { Bird, Fish, Flower2, Waves, Thermometer, Sprout, Egg, TreePine, Feather, Compass, Droplets, X, Sunrise, Snowflake, Sparkles, Link2, BarChart3, ArrowRight } from "lucide-react";
import {
  dayOfYear, normalMeanF, gddSeries, EVENTS, CAT, seasonOf, classify, RIVERS, moonPhase,
  MID_MONTH_DOY, MONTH_ABBR, cToF, hatchThresholds, projectOnset, doyToDate, activeIndicators, coOccurring,
} from "../lib/phenology";
import { fetchRegional, fetchRivers, fetchGddActual, fetchBirds, fetchAusableStats, fetchForecast, fetchGddHistory, fetchSpringIndex, fetchObservations } from "../lib/sources";
import { readHistory } from "../lib/history";

const SITE = "https://phenology.chrisizworski.com";
const CAT_ICON = { water: Waves, fish: Fish, hatch: Egg, bird: Bird, bloom: Flower2, garden: Sprout, wild: Feather };
const fmtDate = (doy) => doyToDate(doy).toLocaleDateString("en-US", { month: "long", day: "numeric" });
const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

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

export default function Home({ regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, springIndex, observations, doy, season, normToday, dateStr, generatedAt }) {
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
      parts.push(`The AuSable is at ${a.flow} cfs${flowCtx}, and ${a.temp != null ? Math.round(cToF(a.temp)) + " degrees F." : "no live water temperature is posting."}${tempCtx}`);
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
    return parts.join(" ");
  }, [rivers, stats, gddAnom, daysApprox, actualTotal, gddNow, thresholds, doy, birds, forecast, springIndex]);

  const indicators = useMemo(() => activeIndicators(doy).filter((i) => i.state !== "recent"), [doy]);

  // Filter indicators by activity group (hunt, fish, garden, water, bird)
  const [activeTags, setActiveTags] = useState([...ALL_GROUPS]);
  const filteredIndicators = useMemo(
    () => indicators.filter((i) => eventMatches(i, activeTags)),
    [indicators, activeTags]
  );
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

        {read && (
          <section style={{ marginTop: 22, background: "rgba(255,255,255,0.5)", border: "1px solid #e4dcc8", borderLeft: `4px solid ${season.color}`, borderRadius: 14, padding: "16px 20px" }}>
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
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 12px", fontStyle: "italic" }}>The signals nature is giving right now, and what each one points to on the rivers, in the woods, and in the garden.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {filteredIndicators.map((ind, i) => {
                const tag = ind.state === "active" ? "active now" : `in about ${ind.days} days`;
                const tagColor = ind.state === "active" ? "#5a8a4a" : "#b08828";
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
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section style={{ marginTop: 30 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, margin: "0 0 12px" }}>
            <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Live instruments</h2>
            <span style={{ fontSize: 12, color: "#9a8f76", marginLeft: 6 }}>River:</span>
            {rivers.map((r) => (<button key={r.id} className="pheno-pill" data-on={r.id === riverId ? "1" : "0"} onClick={() => setRiverId(r.id)}>{r.name}</button>))}
            {river && <span style={{ fontSize: 12, color: "#9a8f76", fontStyle: "italic" }}>{river.note}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <Instrument Icon={Droplets} label={`${river ? river.name : "River"} flow`} value={river && river.flow != null ? river.flow : "n/a"} unit="cfs" sub={river && river.flow != null ? "USGS gauge" : "no live reading"} live={!!(river && river.flow != null)} accent={CAT.water.color} />
            <Instrument Icon={Fish} label="River water" value={river && river.temp != null ? Math.round(cToF(river.temp)) : "n/a"} unit="deg F" sub={river && river.temp != null ? `${river.name}, USGS` : "no temperature sensor on this gauge"} live={!!(river && river.temp != null)} accent={CAT.fish.color} />
            <Instrument Icon={Thermometer} label="Bay City air, now" value={airF != null ? airF : normToday} unit="deg F" sub={airF != null ? `current observation${regional.air.forecast ? ", " + regional.air.forecast.toLowerCase() : ""}` : "seasonal normal"} live={airF != null} accent={season.color} />
            <Instrument Icon={Waves} label="Lake Huron level" value={regional.level != null ? regional.level.toFixed(2) : "176.95"} unit="m IGLD" sub={regional.level != null ? "Saginaw Bay, NOAA" : "seasonal normal"} live={regional.level != null} accent={CAT.water.color} />
            <Instrument Icon={Sprout} label="Degree days, actual" value={actualTotal != null ? actualTotal : gddNow} unit="GDD50" sub={actualTotal != null ? "observed since Jan 1, Open-Meteo" : "modeled"} live={actualTotal != null} accent={CAT.garden.color} />
            <Instrument Icon={TreePine} label="Season anomaly" value={gddAnom != null ? (gddAnom >= 0 ? "+" : "") + gddAnom : "0"} unit="GDD vs normal" sub={gddAnom != null ? `about ${Math.abs(daysApprox)} days ${gddAnom >= 0 ? "ahead" : "behind"} normal` : "real degree days pending"} live={gddAnom != null} accent={CAT.bird.color} />
            <Instrument Icon={Sunrise} label="Daylight" value={forecast?.daylightH != null ? `${Math.floor(forecast.daylightH)}h ${Math.round((forecast.daylightH - Math.floor(forecast.daylightH)) * 60)}m` : "n/a"} unit="" sub={forecast?.daylightH != null ? `${forecast.daylightDeltaMin > 0 ? "+" : ""}${forecast.daylightDeltaMin} min/day${forecast.sunrise ? `, ${forecast.sunrise} to ${forecast.sunset}` : ""}` : "unavailable"} live={forecast?.daylightH != null} accent={season.color} />
            <Instrument Icon={Sprout} label="Soil, 6 inches" value={forecast?.soilF != null ? forecast.soilF : "n/a"} unit="deg F" sub={forecast?.soilF != null ? (forecast.soilF >= 50 ? "active; morels and warm-season planting" : "still cold for warm-season crops") : "unavailable"} live={forecast?.soilF != null} accent={CAT.garden.color} />
            <Instrument Icon={Snowflake} label="Frost watch" value={forecast?.frost?.length ? forecast.frost[0].low : (forecast?.coldest != null ? forecast.coldest : "n/a")} unit="deg F low" sub={forecast?.frost?.length ? `frost ${new Date(forecast.frost[0].date).toLocaleDateString("en-US", { weekday: "short" })} night; protect tender plants` : (forecast?.coldest != null ? "no frost in the 7-day outlook" : "unavailable")} live={forecast?.coldest != null} accent={CAT.water.color} />
          </div>
          <p style={{ fontSize: 11.5, color: "#9a8f76", margin: "12px 2px 0", lineHeight: 1.55 }}>
            <strong style={{ color: "#7a7058" }}>GDD</strong>, growing degree days: a running tally of heat above 50 degrees F that paces plants and insects. The higher the number, the further along the season. <strong style={{ color: "#7a7058" }}>cfs</strong>: cubic feet per second, the river's flow. <strong style={{ color: "#7a7058" }}>IGLD</strong>: the official Great Lakes height datum, in meters above sea level.
          </p>
        </section>

        {gddHistory && (
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

        <section className="pheno-2col-b" style={{ marginTop: 30 }}>
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

        {observations && observations.length > 0 && (
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
          One clock for the whole natural year, drawing on the <a href="https://michigantroutreport.com">Michigan Trout Report</a>, the <a href="https://michiganbirdingreport.com">Michigan Birding Report</a>, <a href="https://greatlakeslevels.org">Great Lakes Lake Levels</a>, and <a href="https://freighterviewfarms.com">Freighter View Farms</a>. Live data from USGS, NWS, NOAA CO-OPS, eBird, USA-NPN, and Open-Meteo. Built and maintained by <a href="https://chrisizworski.com">Chris Izworski</a>. Updated {generatedAt}.
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
  const [regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, springIndex, observations] = await Promise.all([fetchRegional(), fetchRivers(), fetchGddActual(), fetchBirds(), fetchAusableStats(), fetchForecast(), fetchGddHistory(), readHistory(), fetchSpringIndex(), fetchObservations()]);
  return {
    props: {
      regional, rivers, gddActual, birds, stats, forecast, gddHistory, history, springIndex, observations, doy,
      season: seasonOf(doy), normToday: Math.round(normalMeanF(doy)),
      dateStr: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Detroit" }),
      generatedAt: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" }) + " ET",
    },
  };
}
