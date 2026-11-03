import { useState } from "react";
import { Flower2, Bird, TrendingUp, AlertCircle, ExternalLink, BarChart3, MapPin } from "lucide-react";

const BROWN = "#856037", TEAL = "#315f60", FG = "#2d362a";
const metricDay = mmdd => {
  if (!/^\d{2}-\d{2}$/.test(mmdd || "")) return null;
  const dt = Date.parse("2027-" + mmdd + "T12:00:00Z");
  return Number.isFinite(dt) ? Math.round((dt - Date.parse("2027-01-01T12:00:00Z")) / 86400000) + 1 : null;
};
const label = date => date ? new Date("2027-" + date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "Unavailable";
const errorLabel = days => Number.isFinite(days) ? days.toFixed(1) + " days" : "Unavailable";

function YearBand({ annual, bird = false, typicalCenter }) {
  const lines = (annual || []).slice(-10).sort((a, b) => a.year - b.year);
  if (!lines.length) return <p>No comparable historical years were available.</p>;
  const X = value => 75 + Math.max(0, Math.min(1, (value - 95) / 70)) * 490;
  const ymax = lines.length * 23 + 46;
  const center = metricDay(typicalCenter);
  return <div style={{ background: "#f8f9f5", border: "1px solid #d9e1d4", borderRadius: 11, padding: "9px 8px" }}>
    <svg viewBox={`0 0 600 ${ymax}`} role="img" aria-label={"Each row is one observed " + (bird ? "first public hummingbird report" : "trillium flowering reporting period") + " for a qualifying spring, not a predicted arrival or bloom"} style={{ display: "block", width: "100%", height: "auto" }}>
      {[[105, "Apr 15"], [121, "May 1"], [135, "May 15"], [152, "Jun 1"]].map(([d, name]) =>
        <g key={d}><line x1={X(d)} x2={X(d)} y1="12" y2={ymax - 23} stroke="#e1e7de" strokeDasharray="3 4"/><text x={X(d)} y={ymax - 6} textAnchor="middle" fill="#61705e" fontSize="11">{name}</text></g>
      )}
      {center && <line x1={X(center)} x2={X(center)} y1="10" y2={ymax - 25} stroke="#78957f" strokeWidth="1.6" strokeDasharray="6 5"/>}
      {lines.map((v, i) => {
        const y = 21 + i * 23, day = metricDay(v.center), lo = metricDay(v.low), hi = metricDay(v.high);
        return <g key={v.year}>
          <text x="9" y={y + 4} fontSize="12" fontWeight="600" fill="#3e523d">{v.year}</text>
          {Number.isFinite(lo) && Number.isFinite(hi) && <line x1={X(lo)} x2={X(hi)} y1={y} y2={y} stroke={BROWN} strokeWidth="7" strokeLinecap="round" opacity=".5"/>}
          {day && <circle cx={X(day)} cy={y} r="5" fill={bird ? TEAL : BROWN} stroke="#fff" strokeWidth="1.5"/>}
          <text x="594" y={y + 4} fontSize="11" textAnchor="end" fill="#64715f">{v.reports} reports</text>
        </g>;
      })}
    </svg>
    <p style={{ fontSize: 11.5, lineHeight: 1.45, margin: "5px 4px 2px", color: "#64705e" }}>
      {bird ? "Dot = first dated public report in a qualifying year." : "Band = middle 60% of annotated flowering reports; dot = reported midpoint week."} Dashed line = historical reporting center. Reporting activity varies.
    </p>
  </div>;
}

function MetricCompare({ region, bird }) {
  const m = region.metrics;
  if (bird) return <p style={{ color: "#5b6558", fontSize: 13, margin: "8px 0" }}>
    {region.heldOutYears ? `The calendar-only median missed later first public reports by an average of ${errorLabel(region.calendarMaeDays)} across ${region.heldOutYears} evaluated seasons.` : "Not enough independently reported seasons for an out-of-time calendar check."}
    {" "}No local-degree-day migration forecast is fitted.
  </p>;
  if (!region.heldOutYears) return <p style={{ fontSize: 12.5, color: "#6a705f" }}>Not enough later eligible seasons for a genuine forward-in-time validation.</p>;
  const vals = [{ k: "Calendar baseline", v: m?.rollingCalendarMaeDays, color: "#79968a" }, { k: "Thermal model", v: m?.rollingHeatMaeDays, color: BROWN }];
  const max = Math.max(10, ...vals.map(x => x.v || 0));
  return <div>
    <div style={{ fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", color: "#697463", fontWeight: 700, margin: "12px 0 8px" }}>Held-out prediction error, 2024 onward</div>
    {vals.map(x => <div key={x.k} style={{ display: "grid", gridTemplateColumns: "130px 1fr 64px", gap: 8, alignItems: "center", marginBottom: 7 }}>
      <span style={{ fontSize: 11.5, color: FG }}>{x.k}</span>
      <div style={{ background: "#e7ece5", height: 11, borderRadius: 7, overflow: "hidden" }}><div style={{ height: "100%", width: (100 * (x.v || 0) / max) + "%", background: x.color, borderRadius: 7 }} /></div>
      <strong style={{ fontSize: 12, color: FG, textAlign: "right" }}>{errorLabel(x.v)}</strong>
    </div>)}
    <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "7px 0 0", color: "#697463" }}>Lower error is better. The model trained only on earlier springs for each test. {region.heldOutYears} eligible holdout years; data gaps and sparse reporting can make validation inconclusive.</p>
  </div>;
}

export default function SpeciesTrialObservatory({ data }) {
  const [speciesId, setSpeciesId] = useState("trillium-grandiflorum");
  const [regionBySpecies, setRegionBySpecies] = useState({ "trillium-grandiflorum": "central", "ruby-throated-hummingbird": "saginaw-bay" });
  const [heldOutIndex, setHeldOutIndex] = useState(-1);
  if (data?.schema !== "phenology-species-trials-v1" || !Array.isArray(data.species) || data.species.length < 2) return null;
  const species = data.species.find(s => s.id === speciesId) || data.species[0];
  const bird = species.id === "ruby-throated-hummingbird";
  const regionId = regionBySpecies[species.id];
  const region = (species.regions || []).find(r => r.id === regionId) || species.regions?.[0];
  if (!region) return null;
  const heldOut = (region.heldOut || []).slice();
  const index = heldOutIndex >= 0 ? Math.min(heldOutIndex, Math.max(0, heldOut.length - 1)) : heldOut.length - 1;
  const detail = heldOut[index] || null;
  const validated = !bird && region.modelStatus === "historical-skill";
  const supported = region.typicalCenter;
  const speciesText = bird ? "first PUBLIC spring reports" : "regional flowering REPORTS";

  return <section aria-labelledby="species-lab-heading" style={{ marginTop: 22, borderRadius: 18, border: "1px solid #d5d6c2", background: "#f8f5eb", overflow: "hidden" }}>
    <div style={{ padding: "19px 20px 16px", background: "linear-gradient(110deg,#e9e9dd,#f4eadc)" }}>
      <span style={{ fontSize: 11, color: "#65644d", fontWeight: 700, letterSpacing: ".11em", textTransform: "uppercase" }}>The scientific observatory · field trial 01</span>
      <h2 id="species-lab-heading" style={{ fontFamily: "Georgia, serif", fontWeight: 600, fontSize: 22, color: FG, margin: "6px 0 8px" }}>Two species. Two biological clocks.</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#5a6256", margin: 0 }}>Compare what flowering plants and migrating birds actually report across Michigan, then see whether weather modeling predicts historical reports better than the calendar. Tests use years that were not yet available when each prediction was fitted.</p>
    </div>
    <div style={{ padding: "16px 18px 20px" }}>
      <div role="group" aria-label="Choose biological event" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginBottom: 16 }}>
        {data.species.map(s => {
          const b = s.id === "ruby-throated-hummingbird", active = s.id === species.id;
          const Icon = b ? Bird : Flower2;
          return <button key={s.id} type="button" aria-pressed={active} onClick={() => { setSpeciesId(s.id); setHeldOutIndex(-1); }}
            style={{ background: active ? (b ? "#e7f1ed" : "#f2e8d9") : "#fff", border: "1.5px solid " + (active ? b ? TEAL : BROWN : "#dbdfd5"), borderRadius: 11, padding: "13px 14px", textAlign: "left", cursor: "pointer", color: FG }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon size={18} color={b ? TEAL : BROWN}/><strong style={{ fontSize: 14 }}>{s.name}</strong></div>
            <div style={{ marginTop: 5, fontSize: 12, color: "#677064" }}>{b ? "Migration · first public report" : "Woodland bloom · flowering reports"}</div>
          </button>;
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <MapPin size={16} color="#617060"/>
        <label htmlFor="pheno-species-region" style={{ fontSize: 12.5, fontWeight: 700, color: FG }}>Regional evidence</label>
        <select id="pheno-species-region" value={region.id} onChange={e => { setRegionBySpecies(prev => ({ ...prev, [species.id]: e.target.value })); setHeldOutIndex(-1); }}
          style={{ flex: "1 1 180px", padding: "9px 10px", borderRadius: 8, border: "1px solid #b9c7b3", background: "#fff", color: FG, fontSize: 13 }}>
          {(species.regions || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 13 }}>
        <div style={{ border: "1px solid #dedfcf", background: "#fff", padding: "16px 17px", borderRadius: 12 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "#717760", fontWeight: 700 }}>Historical {speciesText}</div>
          {supported ? <>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 25, color: bird ? TEAL : BROWN, margin: "9px 0 3px" }}>{label(region.typicalStart)} – {label(region.typicalEnd)}</div>
            <p style={{ fontSize: 13, margin: "0 0 9px", color: "#4f5f50" }}>Typical report date near <strong>{label(region.typicalCenter)}</strong></p>
          </> : <p style={{ fontSize: 17, fontWeight: 600, color: "#8b622b", margin: "10px 0" }}>Dates withheld: too little independent reporting.</p>}
          <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: 0, color: "#667263" }}>{region.availableYears} qualifying seasons · {region.evidence === "weekly-annotated-flowering-report" ? "flowering-annotated records" : "at least two distinct observers per year"}.</p>
          <p style={{ fontSize: 12, lineHeight: 1.5, color: "#73796a", margin: "8px 0 0" }}>{region.caveat}</p>
        </div>
        <div style={{ border: "1px solid #dedfcf", background: "#fff", padding: "16px 17px", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#596d56" }}><TrendingUp size={15}/><strong style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Prediction trial</strong></div>
          <div style={{ color: validated ? "#286445" : "#885f25", fontFamily: "Georgia, serif", fontSize: 17, margin: "7px 0" }}>{bird ? "Calendar history only" : validated ? "Heat model passed both historical tests" : "Heat-derived date withheld"}</div>
          <MetricCompare region={region} bird={bird}/>
          {validated && <p style={{ fontSize: 12, color: "#5d6d5c", lineHeight: 1.5 }}>Passing a test of regional reporting dates does not mean a particular woodland is flowering. This is not today's bloom forecast.</p>}
        </div>
      </div>
      <div style={{ marginTop: 13, background: "#fff", padding: "14px 15px", border: "1px solid #dedfcf", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 9 }}><BarChart3 size={16} color={bird ? TEAL : BROWN}/><strong style={{ fontSize: 14, color: FG }}>The record, spring by spring</strong></div>
        <YearBand annual={region.annual} bird={bird} typicalCenter={region.typicalCenter}/>
        {heldOut.length > 0 && <>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
            <span style={{ color: "#6a7563", fontSize: 12, marginRight: 4 }}>Replay a withheld year:</span>
            {heldOut.map((f, i) => <button key={f.year} type="button" aria-pressed={i === index} onClick={() => setHeldOutIndex(i)}
              style={{ padding: "5px 9px", color: i === index ? "#fff" : FG, background: i === index ? "#405c45" : "#f0f3ed", border: "1px solid #b9c7b5", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>{f.year}</button>)}
          </div>
          {detail && <p aria-live="polite" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "9px 0 0", color: "#566755" }}>
            <strong>{detail.year}:</strong> Actual {bird ? "first public report" : "annotated flowering-report midpoint"} {label(bird ? detail.observedFirstReport : detail.observedCenter)}.
            {bird ? ` Earlier-year calendar benchmark ${label(detail.historicalCalendar)} (error ${errorLabel(detail.absoluteErrorDays)}).`
              : ` Earlier-year calendar estimate ${label(detail.calendarDate)} (error ${errorLabel(detail.calendarErrorDays)}); heat reference ${label(detail.heatDate)} (${errorLabel(detail.heatErrorDays)}).`}
          </p>}
        </>}
      </div>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 13, fontSize: 12, color: "#697367", lineHeight: 1.55 }}>
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }}/>
        <div>These are independent archived reporting histories. Missing records never mean that a species was absent. A model reaching a temperature threshold does not verify flowers or bird arrivals. <a href={species.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#37624b", textDecoration: "underline" }}>Inspect original observations <ExternalLink size={11} style={{ display: "inline" }}/></a>. <a href={species.explorerUrl} style={{ color: "#37624b", textDecoration: "underline" }}>Open the specialist {bird ? "hummingbird" : "trillium"} tracker.</a></div>
      </div>
    </div>
  </section>;
}
