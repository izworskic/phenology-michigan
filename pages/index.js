import Head from "next/head";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { Bird, Fish, Flower2, Waves, Thermometer, Sprout, Egg, TreePine, Feather, Compass, Droplets, X } from "lucide-react";
import {
  dayOfYear, normalMeanF, gddSeries, EVENTS, CAT, seasonOf, classify, RIVERS,
  MID_MONTH_DOY, MONTH_ABBR, cToF, hatchThresholds, projectOnset, doyToDate,
} from "../lib/phenology";
import { fetchRegional, fetchRivers, fetchGddActual, fetchBirds, fetchAusableStats } from "../lib/sources";

const SITE = "https://phenology.chrisizworski.com";
const CAT_ICON = { water: Waves, fish: Fish, hatch: Egg, bird: Bird, bloom: Flower2, garden: Sprout, wild: Feather };
const fmtDate = (doy) => doyToDate(doy).toLocaleDateString("en-US", { month: "long", day: "numeric" });

function doyAngle(doy) { return (doy / 365) * 360 - 90; }
function polar(cx, cy, r, a) { const t = (a * Math.PI) / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }

function Wheel({ doy, accent, onSelect }) {
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
        return (
          <g key={i} style={{ cursor: "pointer" }} onClick={() => onSelect(ev)}>
            <circle cx={ex} cy={ey} r="11" fill="transparent" />
            <circle cx={ex} cy={ey} r="3.6" fill={CAT[ev.cat].color} stroke="#fff" strokeWidth="0.6" />
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
      </div>
    </div>
  );
}

export default function Home({ regional, rivers, gddActual, birds, stats, doy, season, normToday, dateStr, generatedAt }) {
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
    // birds
    if (birds.length) {
      const names = birds.slice(0, 2).map((b) => b.comName).join(" and ");
      parts.push(`On the bay, ${birds.length} notable ${birds.length === 1 ? "bird is" : "birds are"} being reported, including ${names}.`);
    }
    return parts.join(" ");
  }, [rivers, stats, gddAnom, daysApprox, actualTotal, gddNow, thresholds, doy, birds]);

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
          </section>
        )}

        <section className="pheno-2col" style={{ marginTop: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "18px 18px 8px" }}>
            <Wheel doy={doy} accent={season} onSelect={setSel} />
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
          </div>
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

        <footer style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #e4dcc8", fontSize: 12, color: "#9a8f76", lineHeight: 1.55 }}>
          One clock for the whole natural year, drawing on the <a href="https://michigantroutreport.com">Michigan Trout Report</a>, the <a href="https://michiganbirdingreport.com">Michigan Birding Report</a>, <a href="https://greatlakeslevels.org">Great Lakes Lake Levels</a>, and <a href="https://freighterviewfarms.com">Freighter View Farms</a>. Live data from USGS, NWS, NOAA CO-OPS, eBird, and Open-Meteo. Built and maintained by <a href="https://chrisizworski.com">Chris Izworski</a>. Updated {generatedAt}.
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
  const [regional, rivers, gddActual, birds, stats] = await Promise.all([fetchRegional(), fetchRivers(), fetchGddActual(), fetchBirds(), fetchAusableStats()]);
  return {
    props: {
      regional, rivers, gddActual, birds, stats, doy,
      season: seasonOf(doy), normToday: Math.round(normalMeanF(doy)),
      dateStr: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Detroit" }),
      generatedAt: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" }) + " ET",
    },
  };
}
