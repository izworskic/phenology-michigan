import Head from "next/head";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { Bird, Fish, Flower2, Waves, Thermometer, Sprout, Egg, TreePine, Feather, Compass, Droplets } from "lucide-react";
import {
  dayOfYear, normalMeanF, gddSeries, EVENTS, CAT, seasonOf, classify, MID_MONTH_DOY, MONTH_ABBR,
} from "../lib/phenology";
import { fetchConditions, fetchBirds } from "../lib/sources";

const SITE = "https://phenology.chrisizworski.com";
const CAT_ICON = { water: Waves, fish: Fish, hatch: Egg, bird: Bird, bloom: Flower2, garden: Sprout, wild: Feather };

function doyAngle(doy) { return (doy / 365) * 360 - 90; }
function polar(cx, cy, r, a) { const t = (a * Math.PI) / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; }

function Wheel({ doy, accent }) {
  const size = 340, cx = size / 2, cy = size / 2, R = 150;
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const seasons = [
    { from: 335, to: 445, color: "#5b7286" },
    { from: 80, to: 152, color: "#5a8a4a" },
    { from: 152, to: 266, color: "#c79a2e" },
    { from: 266, to: 335, color: "#a85a2c" },
  ];
  const arc = (from, to, r) => {
    const [x0, y0] = polar(cx, cy, r, doyAngle(from));
    const [x1, y1] = polar(cx, cy, r, doyAngle(to));
    const large = to - from > 182.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const [nx, ny] = polar(cx, cy, R - 8, doyAngle(doy));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      {seasons.map((s, i) => (
        <path key={i} d={arc(s.from, s.to, R + 14)} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" opacity="0.55" />
      ))}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#cdbfa3" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={R - 30} fill="none" stroke="#e3d8bf" strokeWidth="1" />
      {months.map((m, i) => {
        const d = MID_MONTH_DOY[i];
        const [tx, ty] = polar(cx, cy, R + 1, doyAngle(d - 15));
        const [ix, iy] = polar(cx, cy, R - 9, doyAngle(d - 15));
        const [lx, ly] = polar(cx, cy, R - 46, doyAngle(d));
        return (
          <g key={i}>
            <line x1={ix} y1={iy} x2={tx} y2={ty} stroke="#bdae90" strokeWidth="1" />
            <text x={lx} y={ly + 4} textAnchor="middle" style={{ fontSize: 11, fill: "#8a7d62", fontFamily: "Georgia, serif" }}>{m}</text>
          </g>
        );
      })}
      {EVENTS.map((ev, i) => {
        const [ex, ey] = polar(cx, cy, R - 30, doyAngle(ev.p % 365));
        return <circle key={i} cx={ex} cy={ey} r="3.1" fill={CAT[ev.cat].color} opacity="0.9" />;
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={accent.color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={nx} cy={ny} r="5" fill={accent.color} stroke="#fff" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="4" fill="#5b5238" />
    </svg>
  );
}

function Instrument({ Icon, label, value, unit, sub, live, accent }) {
  return (
    <div style={{ border: "1px solid #e4dcc8", borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.55)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={accent} />
        <span style={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8a7d62", fontFamily: "Georgia, serif" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: live ? "#5a8a4a" : "#b08828", border: `1px solid ${live ? "#bcd3ad" : "#e3d2a6"}`, borderRadius: 6, padding: "1px 6px" }}>{live ? "live" : "modeled"}</span>
      </div>
      <div><span style={{ fontSize: 28, color: "#2b2a1f", fontWeight: 600, fontFamily: "Fraunces, Georgia, serif" }}>{value}</span><span style={{ fontSize: 13, color: "#8a7d62", marginLeft: 4 }}>{unit}</span></div>
      <div style={{ fontSize: 11.5, color: "#9a8f76", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function EventRow({ ev, doy, state }) {
  const C = CAT[ev.cat]; const Icon = CAT_ICON[ev.cat];
  const tag = state === "active" ? "now" : state === "imminent" ? `${ev.s - doy} d` : `${doy - ev.e} d ago`;
  const tagColor = state === "active" ? "#5a8a4a" : state === "imminent" ? "#b08828" : "#a89c83";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid #ece4d2" }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: C.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Icon size={15} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f" }}>{ev.name}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: tagColor, whiteSpace: "nowrap" }}>{tag}</span>
        </div>
        <div style={{ fontSize: 12, color: "#9a8f76", lineHeight: 1.35 }}>{ev.note}</div>
      </div>
    </div>
  );
}

export default function Home({ conditions, birds, doy, season, normToday, dateStr, generatedAt }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const series = useMemo(() => gddSeries(), []);
  const gddNow = series[Math.min(364, doy - 1)].gdd;
  const { active, imminent, recent } = classify(doy);

  const airF = conditions.air.tempF;
  const warmAnom = airF != null ? airF - normToday : null;
  const anomText = warmAnom == null ? "Air comparison pending."
    : warmAnom >= 4 ? `Running ${Math.round(warmAnom)} deg above normal. Events may run early.`
    : warmAnom <= -4 ? `Running ${Math.abs(Math.round(warmAnom))} deg below normal. Events may run late.`
    : "Near seasonal normal. Timing on schedule.";

  const personLd = {
    "@context": "https://schema.org", "@type": "WebSite",
    name: "Michigan Phenology", url: SITE,
    description: "A real-time phenology dashboard for Saginaw Bay and northeastern Michigan: river conditions, bird movement, insect hatches, ice and lake phase, and growing degree days, in one view.",
    author: {
      "@type": "Person", name: "Chris Izworski", url: "https://chrisizworski.com",
      sameAs: [
        "https://chrisizworski.com", "https://michigantroutreport.com/chris-izworski/",
        "https://michiganbirdingreport.com/chris-izworski", "https://greatlakeslevels.org",
        "https://github.com/izworskic", "https://www.youtube.com/@izworskic",
        "https://www.wikidata.org/wiki/Q138283432",
      ],
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 70% -10%, #fbf7ec 0%, #f4eede 55%, #efe7d3 100%)", color: "#2b2a1f", padding: "0 0 40px" }}>
      <Head>
        <title>Michigan Phenology by Chris Izworski: Saginaw Bay and the AuSable in Real Time</title>
        <meta name="description" content="Where the natural year stands right now across Saginaw Bay and northeastern Michigan. Live river flow, bird sightings, hatch timing, lake level, and growing degree days, by Chris Izworski." />
        <link rel="canonical" href={SITE + "/"} />
        <meta property="og:title" content="Michigan Phenology by Chris Izworski" />
        <meta property="og:description" content="The natural year of Saginaw Bay and the AuSable, read in real time." />
        <meta property="og:url" content={SITE + "/"} />
        <meta property="og:type" content="website" />
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
          <p style={{ margin: "10px 0 0", fontSize: 14.5, color: "#7a7058", fontStyle: "italic" }}>{dateStr}. The natural year, read in real time from the rivers, the bay, and the sky.</p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(300px, 1.05fr)", gap: 28, alignItems: "start", marginTop: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "18px 18px 8px" }}>
            <Wheel doy={doy} accent={season} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", padding: "8px 4px 12px" }}>
              {Object.entries(CAT).map(([k, c]) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8a7d62" }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, display: "inline-block" }} />{c.label}
                </span>
              ))}
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
          <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: "0 0 12px" }}>Live instruments</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
            <Instrument Icon={Droplets} label="AuSable flow" value={conditions.usgs.flow != null ? conditions.usgs.flow : 540} unit="cfs" sub={conditions.usgs.flow != null ? "near Grayling, USGS" : "seasonal normal"} live={conditions.usgs.flow != null} accent={CAT.water.color} />
            <Instrument Icon={Fish} label="River water" value={conditions.usgs.temp != null ? conditions.usgs.temp.toFixed(1) : "13.5"} unit="deg C" sub={conditions.usgs.temp != null ? "AuSable, USGS" : "seasonal normal"} live={conditions.usgs.temp != null} accent={CAT.fish.color} />
            <Instrument Icon={Thermometer} label="Bay City air" value={airF != null ? airF : normToday} unit="deg F" sub={conditions.air.forecast || "seasonal normal"} live={airF != null} accent={season.color} />
            <Instrument Icon={Waves} label="Lake Huron level" value={conditions.level != null ? conditions.level.toFixed(2) : "176.95"} unit="m IGLD" sub={conditions.level != null ? "Saginaw Bay, NOAA" : "seasonal normal"} live={conditions.level != null} accent={CAT.water.color} />
            <Instrument Icon={Sprout} label="Growing degree days" value={gddNow} unit="GDD50" sub="accumulated since Jan 1, modeled" live={false} accent={CAT.garden.color} />
            <Instrument Icon={TreePine} label="Anomaly" value={warmAnom != null ? (warmAnom >= 0 ? "+" : "") + Math.round(warmAnom) : "0"} unit="deg vs normal" sub={anomText} live={airF != null} accent={CAT.bird.color} />
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28, marginTop: 30, alignItems: "start" }}>
          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "18px 14px 8px" }}>
            <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: "0 0 6px", paddingLeft: 6 }}>Growing degree day accumulation</h2>
            <p style={{ fontSize: 12.5, color: "#9a8f76", margin: "0 0 8px", paddingLeft: 6 }}>Base 50 F, climatological. Hatch and bloom timing track this curve; the marker is today.</p>
            <div style={{ height: 220 }}>
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <XAxis dataKey="doy" ticks={MID_MONTH_DOY} tickFormatter={(d) => MONTH_ABBR[MID_MONTH_DOY.indexOf(d)] || ""} tick={{ fontSize: 11, fill: "#8a7d62" }} stroke="#cdbfa3" />
                    <YAxis tick={{ fontSize: 11, fill: "#8a7d62" }} stroke="#cdbfa3" width={42} />
                    <Tooltip formatter={(v) => [`${v} GDD`, ""]} labelFormatter={(d) => `Day ${d}`} contentStyle={{ fontFamily: "Georgia, serif", fontSize: 12, borderRadius: 8, border: "1px solid #e4dcc8" }} />
                    <ReferenceLine x={doy} stroke={season.color} strokeWidth={2} strokeDasharray="4 3" label={{ value: "now", fill: season.color, fontSize: 11, position: "top" }} />
                    <Line type="monotone" dataKey="gdd" stroke="#9a5b3f" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div style={{ height: "100%" }} />}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.4)", border: "1px solid #e4dcc8", borderRadius: 18, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Bird size={16} color={CAT.bird.color} />
              <h2 style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d62", margin: 0 }}>Notable sightings, Saginaw Bay</h2>
              <span style={{ marginLeft: "auto", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: birds.length ? "#5a8a4a" : "#b08828", border: `1px solid ${birds.length ? "#bcd3ad" : "#e3d2a6"}`, borderRadius: 6, padding: "1px 6px" }}>{birds.length ? "live, eBird" : "no recent"}</span>
            </div>
            {birds.length ? birds.map((b, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #ece4d2" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 14.5, color: "#2b2a1f" }}>{b.comName}{b.howMany ? <span style={{ color: "#9a8f76", fontSize: 12 }}>  x{b.howMany}</span> : null}</div>
                <div style={{ fontSize: 11.5, color: "#9a8f76" }}>{b.locName}{b.obsDt ? `  .  ${b.obsDt.split(" ")[0]}` : ""}</div>
              </div>
            )) : <div style={{ fontSize: 12.5, color: "#9a8f76", padding: "6px 0" }}>No notable reports in the last ten days. Check back during a migration wave.</div>}
          </div>
        </section>

        <footer style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #e4dcc8", fontSize: 12, color: "#9a8f76", lineHeight: 1.55 }}>
          One clock for the whole natural year, drawing on the <a href="https://michigantroutreport.com">Michigan Trout Report</a>, the <a href="https://michiganbirdingreport.com">Michigan Birding Report</a>, <a href="https://greatlakeslevels.org">Great Lakes Lake Levels</a>, and <a href="https://freighterviewfarms.com">Freighter View Farms</a>. Live data from USGS, NWS, NOAA CO-OPS, and eBird; phenological windows from regional records for Saginaw Bay and northeastern Michigan. Built and maintained by <a href="https://chrisizworski.com">Chris Izworski</a>. Updated {generatedAt}.
        </footer>
      </div>
    </div>
  );
}

export async function getServerSideProps({ res }) {
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  const now = new Date();
  const doy = dayOfYear(now);
  const [conditions, birds] = await Promise.all([fetchConditions(), fetchBirds()]);
  return {
    props: {
      conditions, birds, doy,
      season: seasonOf(doy),
      normToday: Math.round(normalMeanF(doy)),
      dateStr: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Detroit" }),
      generatedAt: now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Detroit" }) + " ET",
    },
  };
}
