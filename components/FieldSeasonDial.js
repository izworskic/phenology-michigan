import { useState } from "react";

const DAYS = 86400000;
const dateMs = s => Date.parse(s + "T12:00:00Z");
const pretty = s => new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function FieldSeasonDial({ timeline = [], caution = false }) {
  const [metric, setMetric] = useState("riverF");
  const [point, setPoint] = useState(-1);
  const rows = [...timeline].filter(p => p && /^\d{4}-\d\d-\d\d$/.test(p.date)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-28);
  if (rows.length < 4) return null;
  const valid = rows.filter(p => Number.isFinite(p[metric]));
  if (valid.length < 3) return null;
  const selected = rows[point >= 0 ? Math.min(point, rows.length - 1) : rows.length - 1];
  const firstDay = dateMs(rows[0].date), lastDay = dateMs(rows[rows.length - 1].date);
  const span = Math.max(DAYS, lastDay - firstDay);
  const values = valid.map(p => p[metric]);
  const min = Math.floor(Math.min(...values) - (metric === "riverF" ? 1 : 3));
  const max = Math.ceil(Math.max(...values) + (metric === "riverF" ? 1 : 3));
  const toX = d => 25 + (dateMs(d) - firstDay) / span * 550;
  const toY = v => 120 - (v - min) / Math.max(1, max - min) * 92;
  const strokes = [], segments = [];
  for (const row of rows) {
    const previous = segments[segments.length - 1];
    const previousDate = previous?.at(-1)?.date;
    if (!Number.isFinite(row[metric])) { if (segments.length && segments.at(-1).length) segments.push([]); continue; }
    if (previousDate && dateMs(row.date) - dateMs(previousDate) > DAYS) segments.push([]);
    if (!segments.length) segments.push([]);
    segments.at(-1).push(row);
  }
  for (const segment of segments.filter(a => a.length >= 2)) {
    strokes.push(segment.map((r,i)=>(i ? "L" : "M") + toX(r.date).toFixed(1) + "," + toY(r[metric]).toFixed(1)).join(" "));
  }
  const current = Number.isFinite(selected?.[metric]) ? selected[metric] : null;
  const color = metric === "riverF" ? "#247080" : "#98723e";
  return (
    <div style={{ marginTop: 14, border: "1px solid #d8e0ce", borderRadius: 12, background: "#fff", padding: "14px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 5 }}>
        <strong style={{ color: "#2d4b36", fontSize: 14, fontFamily: "Georgia, serif" }}>The season's pulse</strong>
        <span style={{ fontSize: 11, color: "#718071" }}>28-day evidence replay</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["riverF", "River °F"], ["heatGdd", "Heat GDD"]].map(([id, label]) => <button key={id} type="button" aria-pressed={metric === id} onClick={() => { setMetric(id); setPoint(-1); }} style={{ border: "1px solid " + (metric === id ? "#3f6b49" : "#cdd5c9"), background: metric === id ? "#345f40" : "#f7f9f4", color: metric === id ? "#fff" : "#415b43", fontSize: 11.5, borderRadius: 7, cursor: "pointer", padding: "5px 9px", fontWeight: metric === id ? 650 : 450 }}>{label}</button>)}
        </div>
      </div>
      <svg role="img" aria-label={"Dated historical " + (metric === "riverF" ? "AuSable water temperature" : "modeled accumulated heat") + " line chart"} viewBox="0 0 600 157" style={{ width: "100%", height: "auto", display: "block" }}>
        {[30, 76, 120].map((y,i)=><line key={i} x1="25" x2="575" y1={y} y2={y} stroke="#e9eee3" strokeWidth="1" />)}
        {strokes.map((d,i)=><path key={i} d={d} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />)}
        {valid.map((r,i)=><circle key={i} cx={toX(r.date)} cy={toY(r[metric])} r={r.date === selected?.date ? "4.7" : "2"} fill={r.date === selected?.date ? "#233a2d" : color} stroke="#fff" strokeWidth="1.3" />)}
        <text x="24" y="16" fontSize="11" fill="#657565">{max}{metric === "riverF" ? " °F" : " GDD"}</text>
        <text x="24" y="141" fontSize="11" fill="#657565">{min}</text>
        <text x="25" y="153" fontSize="11" fill="#657565">{pretty(rows[0].date)}</text>
        <text x="574" y="153" textAnchor="end" fontSize="11" fill="#657565">{pretty(rows.at(-1).date)}</text>
      </svg>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 11 }}>
        <label htmlFor="pheno-field-scrub" style={{ fontSize: 12, color: "#506250", whiteSpace: "nowrap" }}>Explore the record</label>
        <input id="pheno-field-scrub" type="range" min="0" max={rows.length - 1} step="1" value={point >= 0 ? Math.min(point, rows.length - 1) : rows.length - 1} onChange={e=>setPoint(Number(e.target.value))} style={{ flex: "1 1 120px", accentColor: color }} />
        <span aria-live="polite" style={{ fontSize: 12.5, color: "#3b533d", minWidth: 145 }}>{pretty(selected.date)}: <strong>{current === null ? "no reading" : Math.round(current * 10) / 10}{current === null ? "" : metric === "riverF" ? " °F" : " GDD"}</strong></span>
      </div>
      <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "8px 0 0", color: "#788377" }}>
        Dots are archived values, not a forecast. Missing dates are not interpolated. {metric === "heatGdd" ? "Gridded heat totals may be revised between daily snapshots. A downward step is a data inconsistency, not heat being lost." : "AuSable gauge temperatures, not bay water or air temperature."}
        {caution && metric === "heatGdd" ? " Recent cumulative revisions detected: trend comparisons are withheld." : ""}
      </p>
    </div>
  );
}
