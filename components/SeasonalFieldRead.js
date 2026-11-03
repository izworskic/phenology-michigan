import { Leaf, Thermometer, Waves, BookOpen, ExternalLink, Info, AlertTriangle } from "lucide-react";
import FieldSeasonDial from "./FieldSeasonDial";

const SOURCE = { heat: Thermometer, river: Waves };
const COLORS = { heat: "#76632b", river: "#2c6771" };

export default function SeasonalFieldRead({ read }) {
  if (!read || !read.tracks?.length) return null;
  const archived = read.status !== "current";
  return (
    <section aria-labelledby="field-read-title" style={{ marginTop: 22, border: "1px solid #c9d7bd", borderRadius: 18, overflow: "hidden", background: "#fbfcf7", boxShadow: "0 8px 24px rgba(42,66,30,0.05)" }}>
      <div style={{ padding: "19px 20px 14px", background: "linear-gradient(110deg, #e9efe0, #f6f4e8)", borderBottom: "1px solid #d9dfcd" }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
          <Leaf size={18} color="#3e7049" />
          <h2 id="field-read-title" style={{ fontSize: 20, fontFamily: "Georgia, serif", margin: 0, color: "#233d2a" }}>The living field desk</h2>
          <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 9px", border: "1px solid #b7c7a7", color: "#3d5e42", borderRadius: 20 }}>{archived ? "Archived evidence" : "Dated field evidence"}</span>
        </div>
        <p style={{ margin: "7px 0 0", fontSize: 13.5, color: "#4d604b", lineHeight: 1.5 }}>
          What the recent record actually supports, and one thing to look for yourself. Analysis through {read.asOfDate}. No unverified emergence or arrival predictions.
        </p>
      </div>
      <div style={{ padding: "16px 20px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 12 }}>
          {read.tracks.map(track => {
            const Icon = SOURCE[track.id] || Info;
            return <article key={track.id} style={{ border: "1px solid #dfe5d7", background: "#fff", borderRadius: 12, padding: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: COLORS[track.id] || "#466d4c", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}><Icon size={15} />{track.label}</div>
              <div style={{ margin: "9px 0 4px", color: "#293728", fontFamily: "Georgia, serif" }}><strong style={{ fontSize: 26, fontWeight: 600 }}>{track.value}</strong><span style={{ fontSize: 12, marginLeft: 6, color: "#657465" }}>{track.unit}</span></div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 8px", color: "#405046" }}>{track.detail}</p>
              <a href={track.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "#34654b", textDecoration: "underline" }} title={track.source}>{track.id === "heat" ? "Gridded climate source" : "USGS gauge source"} <ExternalLink size={11} style={{ display: "inline" }} /></a>
            </article>;
          })}
          <article style={{ border: "1px solid #dfe5d7", background: "#fff", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#58693a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}><BookOpen size={15} />Michigan observer notebook</div>
            {archived ? <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#546252" }}>Current observations withheld because the archive is too old.</p> : read.observations?.length ? (
              <>
                <p style={{ fontSize: 12, color: "#66775e", margin: "7px 0" }}>Reports from across Michigan, not verified locally:</p>
                <ul style={{ paddingLeft: 17, margin: 0 }}>
                  {read.observations.slice(0, 3).map((o, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 5 }}><strong>{o.name}</strong> — {o.phase} <span style={{ color: "#7a8574" }}>({o.date})</span></li>)}
                </ul>
              </>
            ) : <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#546252" }}>No recent statewide phenophase reports passed the date filter.</p>}
            <a href="https://usanpn.org/data" target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: "#34654b", textDecoration: "underline" }}>USA-NPN reports <ExternalLink size={11} style={{ display: "inline" }}/></a>
          </article>
        </div>
        <FieldSeasonDial timeline={read.timeline || []} caution={(read.quality || []).some(q => q.includes("declined"))} />
        <div style={{ marginTop: 13, display: "flex", gap: 10, alignItems: "flex-start", borderLeft: "3px solid #8bab75", background: "#f1f5e9", padding: "11px 13px", borderRadius: 7 }}>
          <Leaf size={17} color="#44704b" style={{ flexShrink: 0, marginTop: 2 }}/>
          <div><strong style={{ fontFamily: "Georgia, serif", color: "#314735", fontSize: 14 }}>Your field check</strong><p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.5, color: "#4a624a" }}>{read.fieldPrompt}</p></div>
        </div>
        <details style={{ marginTop: 10, fontSize: 12, color: "#637064" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}><AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }}/> How reliable is this read?</summary>
          <ul style={{ lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 20 }}>{(read.quality || []).map((q,i)=><li key={i}>{q}</li>)}</ul>
        </details>
      </div>
    </section>
  );
}
