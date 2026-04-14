import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Label,
} from "recharts";

// ─── Base chances from OSRS Wiki data module ────────────────────────────────
const BASE = {
  herb:     12150,
  cactus:   14833,
  maple:    20000,
  papaya:    9000,
  calquat:   6000,
  celastrus: 6000,
  ironwood: 15000,
  redwood:   5000,
  seaweed:   7500,
  mushroom:  7500,
};
const HESPORI_BASE = 4950;

const PATCH_META = [
  { key: "herb",      label: "Herb patches",    defaultCount: 9, perRun: 1, note: "" },
  { key: "cactus",    label: "Cactus patches",  defaultCount: 2, perRun: 1, note: "" },
  { key: "maple",     label: "Maple trees",     defaultCount: 7, perRun: 1, note: "" },
  { key: "papaya",    label: "Papaya trees",    defaultCount: 7, perRun: 1, note: "" },
  { key: "calquat",   label: "Calquat trees",   defaultCount: 4, perRun: 1, note: "" },
  { key: "celastrus", label: "Celastrus trees", defaultCount: 1, perRun: 1, note: "" },
  { key: "ironwood",  label: "Ironwood trees",  defaultCount: 4, perRun: 1, note: "" },
  { key: "redwood",   label: "Redwood tree",    defaultCount: 1, perRun: 1, note: "" },
  { key: "hespori",   label: "Hespori",         defaultCount: 1, perRun: 1, note: "level-independent" },
  { key: "seaweed",   label: "Giant seaweed",   defaultCount: 2, perRun: 1, note: "" },
  { key: "mushroom",  label: "Mushroom patch",  defaultCount: 1, perRun: 1, note: "" },
];

// ─── Math ────────────────────────────────────────────────────────────────────
function chancePerRoll(key, lvl) {
  if (key === "hespori") return 1 / HESPORI_BASE;
  const denom = BASE[key] - lvl * 25;
  return denom <= 0 ? 1 : 1 / denom;
}

function calcDayChance(instance, lvl) {
  let failProb = 1;
  for (const { key, perRun } of PATCH_META) {
    const count = instance[key] ?? 0;
    if (count === 0) continue;
    const rolls = key === "herb" ? count * perRun : count;
    failProb *= Math.pow(1 - chancePerRoll(key, lvl), rolls);
  }
  return 1 - failProb;
}

function fmt1in(p) {
  if (p <= 0) return "—";
  if (p >= 1) return "1/1";
  return `1/${Math.round(1 / p).toLocaleString()}`;
}

function fmtPct(p, digits = 3) {
  return (p * 100).toFixed(digits) + "%";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS_KEY = "tangleroot_tracker_v1";
function lsLoad() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSave(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        "#0e0f0e",
  surface:   "#161714",
  card:      "#1c1e1b",
  border:    "#2a2d27",
  accent:    "#7cb87a",
  accentDim: "#4a7348",
  accentBg:  "#1a2619",
  text:      "#e8ead4",
  muted:     "#7a7d6e",
  gold:      "#d4a84b",
  red:       "#c45c3a",
  redBg:     "#2a1510",
  redDim:    "#7a3020",
  blue:      "#6a9fd4",
};

const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono', monospace" },
  header: {
    borderBottom: `1px solid ${C.border}`, padding: "1.25rem 2rem",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
  },
  headerTitle: { fontSize: "1rem", fontWeight: 600, letterSpacing: "0.1em", color: C.accent, textTransform: "uppercase", margin: 0 },
  headerSub: { fontSize: "0.65rem", color: C.muted, marginTop: "0.15rem", letterSpacing: "0.05em" },
  headerRight: { display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" },
  lvlRow: { display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.7rem", color: C.muted, letterSpacing: "0.05em" },
  lvlInput: { width: "120px", accentColor: C.accent },
  lvlVal: { color: C.accent, fontWeight: 600, minWidth: "2.5ch", fontSize: "0.95rem" },
  layout: { display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 69px)" },
  sidebar: { borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: "1.25rem" },
  main: { overflowY: "auto", padding: "1.25rem 1.75rem" },
  secLabel: { fontSize: "0.6rem", letterSpacing: "0.12em", color: C.muted, textTransform: "uppercase", margin: "0 0 0.6rem" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "0.9rem", marginBottom: "0.65rem" },
  patchRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" },
  patchLabel: { fontSize: "0.7rem", color: C.text, flex: 1 },
  patchNote:  { fontSize: "0.58rem", color: C.muted, marginLeft: "0.2rem" },
  patchInput: {
    width: "48px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px",
    color: C.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem", padding: "3px 5px", textAlign: "right",
  },
  dateInput: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: "3px", color: C.text,
    fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.72rem", padding: "4px 7px",
    width: "100%", marginBottom: "0.6rem", boxSizing: "border-box",
  },
  preview: {
    background: C.accentBg, border: `1px solid ${C.accentDim}`, borderRadius: "4px",
    padding: "0.65rem 0.9rem", marginBottom: "0.65rem", display: "flex", alignItems: "baseline", justifyContent: "space-between",
  },
  previewNum:  { fontSize: "1.5rem", fontWeight: 600, color: C.accent },
  previewFrac: { fontSize: "0.7rem", color: C.accentDim },
  btnPrimary: {
    width: "100%", padding: "0.6rem", background: C.accent, color: C.bg, border: "none", borderRadius: "3px",
    fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: "0.75rem",
    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", marginBottom: "0.5rem",
  },
  btnSecondary: {
    background: "transparent", border: `1px solid ${C.border}`, color: C.muted,
    padding: "0.28rem 0.55rem", borderRadius: "3px", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.04em",
  },
  btnImport: {
    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
    padding: "0.28rem 0.6rem", borderRadius: "3px", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.04em",
  },
  btnExport: {
    background: C.accentBg, border: `1px solid ${C.accentDim}`, color: C.accent,
    padding: "0.28rem 0.6rem", borderRadius: "3px", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.62rem", cursor: "pointer", letterSpacing: "0.04em",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.65rem", marginBottom: "1.1rem" },
  statCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "0.75rem 0.9rem" },
  statLabel: { fontSize: "0.58rem", color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.2rem" },
  statVal:  { fontSize: "1.3rem", fontWeight: 600, color: C.text },
  statSub:  { fontSize: "0.6rem", color: C.muted, marginTop: "0.1rem" },
  cumBar:   { background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "1rem 1.1rem", marginBottom: "1.1rem" },
  cumTrack: { height: "8px", background: C.surface, borderRadius: "4px", overflow: "hidden", margin: "0.6rem 0 0.4rem" },
  table:  { width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" },
  th: {
    textAlign: "left", padding: "0.35rem 0.65rem", color: C.muted, fontSize: "0.58rem",
    letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, fontWeight: 400,
  },
  td: { padding: "0.5rem 0.65rem", borderBottom: `1px solid ${C.border}`, verticalAlign: "middle" },
  miniBar: { height: "5px", background: C.surface, borderRadius: "3px", overflow: "hidden", minWidth: "70px" },
  empty: { textAlign: "center", color: C.muted, fontSize: "0.72rem", padding: "3rem 1rem", letterSpacing: "0.04em", lineHeight: 1.8 },
  toast: {
    position: "fixed", bottom: "1.5rem", right: "1.5rem",
    background: C.accentBg, border: `1px solid ${C.accentDim}`, color: C.accent,
    borderRadius: "4px", padding: "0.65rem 1rem", fontSize: "0.72rem", letterSpacing: "0.04em", zIndex: 1000, pointerEvents: "none",
  },
  toastErr: { background: C.redBg, border: `1px solid ${C.redDim}`, color: C.red },
  tabBar: { display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "1.25rem" },
  tab: {
    padding: "0.5rem 1.1rem", fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase",
    cursor: "pointer", border: "none", background: "transparent", fontFamily: "'IBM Plex Mono', monospace",
    borderBottom: "2px solid transparent", color: C.muted,
  },
  tabActive: { color: C.accent, borderBottom: `2px solid ${C.accent}` },
  chartCard: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "1.1rem 1.1rem 0.9rem", marginBottom: "1rem" },
  chartTitle: { fontSize: "0.62rem", letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: "0.9rem" },
  chartNote: { fontSize: "0.6rem", color: C.muted, marginTop: "0.6rem", lineHeight: 1.7 },
};

// ─── Recharts custom tooltip ───────────────────────────────────────────────────
function ChartTip({ active, payload, labelFmt, valFmt }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "0.45rem 0.7rem", fontSize: "0.67rem", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ color: C.muted, marginBottom: "0.15rem" }}>{labelFmt(row)}</div>
      {payload.map((p, i) => p.value !== null && p.value !== undefined && (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>{valFmt(p.value, p.name)}</div>
      ))}
    </div>
  );
}

function LuckGauge({ days }) {
  if (days.length === 0) return null;
  const currentCum = (1 - days.reduce((f, d) => f * (1 - d.chance), 1)) * 100;

  return (
    <div style={S.chartCard}>
      <div style={S.chartTitle}>Where you sit among all players</div>
      <div style={{ position: "relative", height: "58px" }}>
        {/* Track */}
        <div style={{ position:"absolute", left:0, right:0, top:"20px", height:"14px", background:C.surface, borderRadius:"7px", overflow:"hidden" }}>
          <div style={{ position:"absolute", left:0, width:`${Math.min(currentCum, 100)}%`, height:"100%", background:`linear-gradient(90deg, ${C.accentBg}, ${C.accentDim})` }} />
          <div style={{ position:"absolute", left:`${Math.min(currentCum, 98.5)}%`, top:0, width:"3px", height:"100%", background:C.accent }} />
        </div>
        {/* "You" label */}
        <div style={{ position:"absolute", left:`${Math.min(currentCum, 95)}%`, top:4, transform:"translateX(-50%)", fontSize:"0.58rem", color:C.accent, whiteSpace:"nowrap" }}>
          You ({currentCum.toFixed(1)}%)
        </div>
        {/* p50 / p90 ticks */}
        {[{x:50,label:"p50",col:C.muted},{x:90,label:"p90",col:C.gold}].map(({x,label,col})=>(
          <div key={x} style={{ position:"absolute", left:`${x}%`, top:"18px" }}>
            <div style={{ width:"1px", height:"16px", background:col }} />
            <div style={{ fontSize:"0.55rem", color:col, transform:"translateX(-50%)", marginTop:"2px", whiteSpace:"nowrap" }}>{label}</div>
          </div>
        ))}
        {/* axis labels */}
        <div style={{ position:"absolute", left:0, top:"38px", fontSize:"0.55rem", color:C.muted }}>Luckiest</div>
        <div style={{ position:"absolute", right:0, top:"38px", fontSize:"0.55rem", color:C.muted, textAlign:"right" }}>Unluckiest</div>
      </div>
      <div style={S.chartNote}>
        {currentCum.toFixed(1)}% of players would have received Tangleroot by now.
        {currentCum < 50
          ? ` You are in the lucky half — still well below the median.`
          : currentCum < 90
          ? ` You have passed the median (p50). You are ${(currentCum - 50).toFixed(1)} percentile points into the unlucky tail.`
          : ` You are past the p90 mark. Only ~10% of players go this long. The pet is seriously overdue.`}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, err }) {
  if (!msg) return null;
  return <div style={{ ...S.toast, ...(err ? S.toastErr : {}) }}>{msg}</div>;
}

// ─── Import modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [mode, setMode] = useState("merge");
  const fileRef = useRef();
  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.days || !Array.isArray(data.days)) throw new Error("Invalid format");
        onImport(data, mode);
      } catch (err) { onImport(null, mode, err.message); }
    };
    reader.readAsText(file);
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"1.5rem", width:"340px", fontFamily:"'IBM Plex Mono', monospace" }}>
        <p style={{ ...S.secLabel, margin:"0 0 1rem" }}>Import data</p>
        <p style={{ fontSize:"0.7rem", color:C.muted, marginBottom:"1rem", lineHeight:1.7 }}>
          Select a <code style={{ color:C.accent }}>.json</code> file exported from this tracker.
        </p>
        <div style={{ marginBottom:"1rem" }}>
          <p style={{ ...S.secLabel, margin:"0 0 0.5rem" }}>Import mode</p>
          {[["merge","Merge — add to existing days"],["replace","Replace — overwrite all data"]].map(([val,label]) => (
            <label key={val} style={{ display:"flex", alignItems:"center", gap:"0.5rem", fontSize:"0.7rem", color:mode===val?C.text:C.muted, marginBottom:"0.4rem", cursor:"pointer" }}>
              <input type="radio" name="mode" value={val} checked={mode===val} onChange={() => setMode(val)} style={{ accentColor:C.accent }} />
              {label}
            </label>
          ))}
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display:"none" }} onChange={handleFile} />
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button style={{ ...S.btnExport, flex:1, padding:"0.5rem" }} onClick={() => fileRef.current.click()}>Choose file</button>
          <button style={{ ...S.btnSecondary, padding:"0.5rem 0.75rem" }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Charts tab ───────────────────────────────────────────────────────────────
function ChartsTab({ days }) {
  const n = days.length;
  const avgP = n ? days.reduce((a, d) => a + d.chance, 0) / n : 0;

  // ── P-curve data: actual + expected, extrapolated to 95% or 150% of current days ──
  const extendTo = n === 0 ? 30 : Math.max(
    n + Math.ceil(n * 0.5),
    avgP > 0 ? Math.ceil(Math.log(0.05) / Math.log(1 - avgP)) : 30,
    10
  );

  const pCurveData = [];
  let cumFail = 1;
  for (let i = 1; i <= extendTo; i++) {
    if (i <= n) cumFail *= (1 - days[i - 1].chance);
    pCurveData.push({
      day:      i,
      actual:   i <= n ? parseFloat(((1 - cumFail) * 100).toFixed(3)) : null,
      expected: avgP > 0 ? parseFloat(((1 - Math.pow(1 - avgP, i)) * 100).toFixed(3)) : 0,
    });
  }

  // Percentile thresholds (using avg p as proxy)
  const pDay = q => avgP > 0 ? Math.ceil(Math.log(1 - q) / Math.log(1 - avgP)) : null;
  const p50day = pDay(0.50);
  const p90day = pDay(0.90);

  const currentCum = n > 0 ? (1 - days.reduce((f, d) => f * (1 - d.chance), 1)) * 100 : 0;

  // ── Daily bar data ──
  const dailyData = days.map((d, i) => ({
    idx:    i + 1,
    date:   d.date,
    pct:    parseFloat((d.chance * 100).toFixed(4)),
    isHigh: d.chance >= avgP,
  }));

  // ── Histogram of daily % values ──
  const BUCKETS = 12;
  let hMin = Infinity, hMax = -Infinity;
  days.forEach(d => { hMin = Math.min(hMin, d.chance * 100); hMax = Math.max(hMax, d.chance * 100); });
  if (!isFinite(hMin)) { hMin = 0; hMax = 1; }
  const hRange = hMax - hMin || 0.001;
  const bSize  = hRange / BUCKETS;
  const histData = Array.from({ length: BUCKETS }, (_, i) => {
    const lo = hMin + i * bSize;
    return { label: lo.toFixed(3) + "%", lo, count: 0 };
  });
  days.forEach(d => {
    const bi = Math.min(BUCKETS - 1, Math.floor((d.chance * 100 - hMin) / bSize));
    histData[bi].count++;
  });

  const axTick  = { fill: C.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" };
  const gridProp = { stroke: C.border, strokeDasharray: "3 3" };
  const emptyNote = (
    <div style={S.empty}>
      <div style={{ fontSize: "2rem", marginBottom: "0.65rem" }}>☘</div>
      Log at least one day to see charts.
    </div>
  );

  if (n === 0) return emptyNote;

  return (
    <div>
      {/* ── P-curve ── */}
      <div style={S.chartCard}>
        <div style={S.chartTitle}>Cumulative probability curve (P-curve)</div>
        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={pCurveData} margin={{ top:8, right:28, bottom:24, left:4 }}>
            <CartesianGrid {...gridProp} />
            <XAxis dataKey="day" tick={axTick} tickLine={false} axisLine={{ stroke:C.border }}>
              <Label value="Day number" position="insideBottom" offset={-14} style={{ ...axTick, fill:C.muted }} />
            </XAxis>
            <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={axTick} tickLine={false} axisLine={{ stroke:C.border }} width={42} />
            <Tooltip content={
              <ChartTip
                labelFmt={r => `Day ${r.day}`}
                valFmt={(v, name) => name==="actual" ? `Actual: ${v.toFixed(2)}%` : `Expected: ${v.toFixed(2)}%`}
              />
            } />
            {/* 50% line */}
            <ReferenceLine y={50} stroke={C.border} strokeDasharray="2 5" />
            {/* p50 day */}
            {p50day && p50day <= extendTo && (
              <ReferenceLine x={p50day} stroke={C.muted} strokeDasharray="4 3"
                label={{ value:"p50", position:"top", offset:-75, fill:C.muted, fontSize:11, fontFamily:"'IBM Plex Mono', monospace" }} />
            )}
            {/* p90 day */}
            {p90day && p90day <= extendTo && (
              <ReferenceLine x={p90day} stroke={C.gold} strokeDasharray="4 3"
                label={{ value:"p90", position:"top", offset:-75, fill:C.gold, fontSize:11, fontFamily:"'IBM Plex Mono', monospace" }} />
            )}
            {/* Expected (dashed) */}
            <Line type="monotone" dataKey="expected" name="expected" stroke={C.accentDim} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
            {/* Actual (solid) */}
            <Line type="monotone" dataKey="actual" name="actual" stroke={C.accent} strokeWidth={2.5} dot={false} connectNulls={false} />
            {/* Current position marker */}
            {n > 0 && (
              <ReferenceLine x={n} stroke={C.accent} strokeWidth={1} strokeDasharray="2 3"
                label={{ value:`Day ${n}`, position:"insideTopRight", fill:C.accent, fontSize:9, fontFamily:"'IBM Plex Mono', monospace" }} />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div style={S.chartNote}>
          <span style={{ color:C.accent }}>━━</span> Your actual cumulative P &nbsp;&nbsp;
          <span style={{ color:C.accentDim }}>╌╌╌</span> Expected (constant avg-P geometric) &nbsp;&nbsp;
          <span style={{ color:C.gold }}>╌╌╌</span> p90 threshold
          {p50day && <span style={{ color:C.muted }}> &nbsp; | &nbsp; p50 = day {p50day}, p90 = day {p90day}</span>}
        </div>
        <div style={{ ...S.chartNote, marginTop:"0.3rem" }}>
          {currentCum < 50
            ? `Your actual curve is at ${currentCum.toFixed(2)}% — ${(50 - currentCum).toFixed(2)}% below the median. You have been getting lucky rolls.`
            : currentCum < 90
            ? `Your actual curve is at ${currentCum.toFixed(2)}%. You have passed the median (day ${p50day}) and are in the unlucky half.`
            : `Your actual curve is at ${currentCum.toFixed(2)}% — beyond p90. Statistically only 1 in 10 players goes this long without a drop.`}
        </div>
      </div>

      {/* ── Two column: daily bar + histogram ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>

        {/* Daily % bar chart */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}>Daily chance per logged day</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={dailyData} margin={{ top:4, right:8, bottom:22, left:4 }}>
              <CartesianGrid {...gridProp} vertical={false} />
              <XAxis dataKey="idx" tick={axTick} tickLine={false} axisLine={{ stroke:C.border }}>
                <Label value="Day #" position="insideBottom" offset={-14} style={{ ...axTick, fill:C.muted }} />
              </XAxis>
              <YAxis tickFormatter={v=>`${v.toFixed(2)}%`} tick={axTick} tickLine={false} axisLine={{ stroke:C.border }} width={48} />
              <Tooltip content={
                <ChartTip labelFmt={r=>`Day ${r.idx} — ${r.date}`} valFmt={v=>`${v.toFixed(4)}%`} />
              } />
              <Bar dataKey="pct" radius={[2,2,0,0]}
                fill={C.accentDim}
                /* colour bars above/below avg differently */
              />
              {avgP > 0 && (
                <ReferenceLine y={avgP * 100} stroke={C.gold} strokeDasharray="3 3"
                  label={{ value:"avg", position:"right", fill:C.gold, fontSize:9, fontFamily:"'IBM Plex Mono', monospace" }} />
              )}
            </BarChart>
          </ResponsiveContainer>
          <div style={S.chartNote}>
            <span style={{ color:C.gold }}>╌╌╌</span> Average daily % across all logged days ({fmtPct(avgP, 4)})
          </div>
        </div>

        {/* Histogram */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}>Distribution of daily %</div>
          {n < 2 ? (
            <div style={{ ...S.empty, padding:"2.5rem 0", fontSize:"0.65rem" }}>Log more days to see a distribution.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={histData} margin={{ top:4, right:8, bottom:22, left:4 }}>
                <CartesianGrid {...gridProp} vertical={false} />
                <XAxis dataKey="label" tick={{ ...axTick, fontSize:8 }} tickLine={false} axisLine={{ stroke:C.border }}
                  interval={Math.ceil(BUCKETS / 6) - 1}>
                  <Label value="Daily % bucket" position="insideBottom" offset={-14} style={{ ...axTick, fill:C.muted }} />
                </XAxis>
                <YAxis allowDecimals={false} tick={axTick} tickLine={false} axisLine={{ stroke:C.border }} width={24} />
                <Tooltip content={
                  <ChartTip labelFmt={r=>`~${r.label}`} valFmt={v=>`${v} day${v!==1?"s":""}`} />
                } />
                <Bar dataKey="count" fill={C.blue} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={S.chartNote}>
            How varied your daily chances are — a wide spread means inconsistent run composition across days.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Log tab ──────────────────────────────────────────────────────────────────
function LogTab({ days, removeDay, clearAll }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.65rem" }}>
        <p style={{ ...S.secLabel, margin:0 }}>Harvest log</p>
        {days.length > 0 && <button style={S.btnSecondary} onClick={clearAll}>clear all</button>}
      </div>

      {days.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:"2rem", marginBottom:"0.65rem" }}>☘</div>
          No days logged yet.<br />
          Fill in a harvest instance and click "Log this day".<br />
          <span style={{ fontSize:"0.62rem" }}>Your data is saved automatically in your browser.</span>
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Lvl</th>
              <th style={S.th}>Herb runs</th>
              <th style={S.th}>Trees</th>
              <th style={S.th}>Other</th>
              <th style={S.th}>Daily %</th>
              <th style={S.th}>Cumulative</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const byDateAsc = (a, b) => a.date.localeCompare(b.date);
              const cumById = new Map();
              let cumFail = 1;
              for (const x of [...days].sort(byDateAsc)) {
                cumFail *= (1 - x.chance);
                cumById.set(x.id, 1 - cumFail);
              }
              return [...days].sort((a, b) => b.date.localeCompare(a.date)).map(d => {
                const cum   = cumById.get(d.id);
                const herbs = d.instance.herb ?? 0;
                const trees = ["maple","papaya","calquat","ironwood","redwood"].reduce((s,k) => s+(d.instance[k]??0), 0);
                const other = ["cactus","hespori","seaweed","mushroom"].reduce((s,k) => s+(d.instance[k]??0), 0);
                return (
                  <tr key={d.id}>
                    <td style={S.td}>{d.date}</td>
                    <td style={{ ...S.td, color:C.muted }}>{d.level}</td>
                    <td style={{ ...S.td, color:C.muted }}>{herbs>0?`×${herbs}`:"—"}</td>
                    <td style={{ ...S.td, color:C.muted }}>{trees>0?`×${trees}`:"—"}</td>
                    <td style={{ ...S.td, color:C.muted }}>{other>0?`×${other}`:"—"}</td>
                    <td style={S.td}><span style={{ color:C.accent, fontWeight:600 }}>{fmtPct(d.chance,3)}</span></td>
                    <td style={S.td}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                        <div style={S.miniBar}>
                          <div style={{ height:"100%", width:`${Math.min(cum*100,100)}%`, background:cum>0.75?C.gold:C.accent, borderRadius:"3px" }} />
                        </div>
                        <span style={{ color:cum>0.5?C.gold:C.muted, fontSize:"0.68rem", minWidth:"40px" }}>{fmtPct(cum,1)}</span>
                      </div>
                    </td>
                    <td style={S.td}><button style={S.btnSecondary} onClick={() => removeDay(d.id)}>✕</button></td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [level,      setLevel]      = useState(99);
  const [instance,   setInstance]   = useState(Object.fromEntries(PATCH_META.map(p => [p.key, p.defaultCount])));
  const [date,       setDate]       = useState(todayStr());
  const [days,       setDays]       = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [activeTab,  setActiveTab]  = useState("log");

  function showToast(msg, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    const d = lsLoad();
    if (d) {
      if (Array.isArray(d.days))       setDays(d.days);
      if (typeof d.level === "number") setLevel(d.level);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    lsSave({ days, level });
  }, [days, level, loaded]);

  const preview   = calcDayChance(instance, level);
  const cumProb   = days.reduce((acc, d) => 1 - (1-acc)*(1-d.chance), 0);
  const avgChance = days.length ? days.reduce((a,d) => a+d.chance, 0) / days.length : 0;

  function addDay() {
    let toastMsg;
    setDays(prev => {
      const idx = prev.findIndex(d => d.date === date);
      if (idx === -1) {
        const chance = calcDayChance(instance, level);
        toastMsg = `Logged ${date} — ${fmtPct(chance, 3)} daily chance`;
        return [...prev, { id: Date.now(), date, level, instance: { ...instance }, chance }]
          .sort((a, b) => a.date.localeCompare(b.date));
      }
      const existing = prev[idx];
      const mergedInstance = Object.fromEntries(
        PATCH_META.map(({ key }) => [
          key,
          (existing.instance[key] ?? 0) + (instance[key] ?? 0),
        ])
      );
      const mergedChance = calcDayChance(mergedInstance, level);
      toastMsg = `Updated ${date} — merged with existing log — ${fmtPct(mergedChance, 3)} daily chance`;
      return prev
        .map((d, i) =>
          i === idx
            ? { ...existing, level, instance: mergedInstance, chance: mergedChance }
            : d
        )
        .sort((a, b) => a.date.localeCompare(b.date));
    });
    showToast(toastMsg);
  }

  function removeDay(id) { setDays(prev => prev.filter(d => d.id !== id)); }

  function clearAll() {
    if (window.confirm("Delete all logged days? This cannot be undone.")) {
      setDays([]); showToast("All days cleared.");
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ version:1, exportedAt:new Date().toISOString(), level, days }, null, 2)], { type:"application/json" });
    const a = Object.assign(document.createElement("a"), { href:URL.createObjectURL(blob), download:`tangleroot-${todayStr()}.json` });
    a.click(); URL.revokeObjectURL(a.href);
    showToast(`Exported ${days.length} day${days.length!==1?"s":""}`);
  }

  function exportCSV() {
    const header = ["date","level",...PATCH_META.map(p=>p.key),"daily_chance_pct","cumulative_chance_pct"];
    let cumFail = 1;
    const rows = days.map(d => {
      cumFail *= (1-d.chance);
      return [d.date, d.level, ...PATCH_META.map(p=>d.instance[p.key]??0), (d.chance*100).toFixed(6), ((1-cumFail)*100).toFixed(6)].join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type:"text/csv" });
    const a = Object.assign(document.createElement("a"), { href:URL.createObjectURL(blob), download:`tangleroot-${todayStr()}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
    showToast(`Exported ${days.length} rows as CSV`);
  }

  function handleImport(data, mode, errMsg) {
    setShowImport(false);
    if (!data) { showToast(`Import failed: ${errMsg}`, true); return; }
    if (mode === "replace") {
      setDays(data.days.sort((a,b) => a.date.localeCompare(b.date)));
      if (data.level) setLevel(data.level);
      showToast(`Replaced with ${data.days.length} imported days`);
    } else {
      setDays(prev => {
        const ids = new Set(prev.map(d => d.id));
        return [...prev, ...data.days.filter(d => !ids.has(d.id))].sort((a,b) => a.date.localeCompare(b.date));
      });
      showToast(`Merged ${data.days.length} days`);
    }
  }

  const pDay = q => avgChance > 0 ? Math.ceil(Math.log(1-q) / Math.log(1-avgChance)) : null;

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.headerTitle}>☘ Tangleroot Tracker</p>
          <p style={S.headerSub}>OSRS farming pet probability log</p>
        </div>
        <div style={S.headerRight}>
          <div style={{ display:"flex", gap:"0.4rem", alignItems:"center" }}>
            <button style={S.btnExport} onClick={exportJSON}>↓ JSON</button>
            <button style={S.btnExport} onClick={exportCSV}>↓ CSV</button>
            <button style={S.btnImport} onClick={() => setShowImport(true)}>↑ Import</button>
          </div>
          <div style={S.lvlRow}>
            <span>FARMING LVL</span>
            <input type="range" min={1} max={99} value={level} step={1} style={S.lvlInput}
              onChange={e => setLevel(Number(e.target.value))} />
            <span style={S.lvlVal}>{level}</span>
          </div>
        </div>
      </div>

      <div style={S.layout}>
        {/* Sidebar */}
        <div style={S.sidebar}>
          <p style={S.secLabel}>Log a harvest day</p>
          <div style={S.card}>
            <label style={{ ...S.secLabel, display:"block", marginBottom:"0.35rem" }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.dateInput} />
            {PATCH_META.map(({ key, label, note }) => (
              <div key={key} style={S.patchRow}>
                <span style={S.patchLabel}>{label}{note && <span style={S.patchNote}> {note}</span>}</span>
                <input type="number" min={0} max={99} value={instance[key]} style={S.patchInput}
                  onChange={e => setInstance(prev => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value)||0) }))} />
              </div>
            ))}
          </div>
          <div style={S.preview}>
            <div>
              <div style={{ fontSize:"0.58rem", color:C.accentDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.15rem" }}>Daily chance</div>
              <div style={S.previewNum}>{fmtPct(preview,3)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"0.58rem", color:C.accentDim, marginBottom:"0.15rem" }}>approx.</div>
              <div style={S.previewFrac}>{fmt1in(preview)}</div>
            </div>
          </div>
          <button style={S.btnPrimary} onClick={addDay}>+ Log this day</button>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"0.75rem", marginTop:"0.25rem" }}>
            <p style={{ ...S.secLabel, margin:"0 0 0.4rem" }}>Patch defaults</p>
            <button style={{ ...S.btnSecondary, fontSize:"0.6rem", width:"100%" }}
              onClick={() => setInstance(Object.fromEntries(PATCH_META.map(p=>[p.key,p.defaultCount])))}>
              Reset to defaults
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={S.main}>
          {/* Stats row */}
          <div style={S.statsGrid}>
            {[
              { label:"Days logged",  val: days.length,                                          sub:"sessions" },
              { label:"Cumulative P", val: days.length ? fmtPct(cumProb,2) : "—",               sub:"chance so far", color: cumProb>0.5?C.gold:cumProb>0.25?C.accent:C.text },
              { label:"Avg daily %",  val: days.length ? fmtPct(avgChance,3) : "—",             sub:"per logged day" },
              { label:"p50 / p90",    val: days.length ? `${pDay(0.5) ?? "—"} / ${pDay(0.9) ?? "—"}` : "— / —", sub:"expected days" },
            ].map(({ label, val, sub, color }) => (
              <div key={label} style={S.statCard}>
                <div style={S.statLabel}>{label}</div>
                <div style={{ ...S.statVal, color: color ?? C.text }}>{val}</div>
                <div style={S.statSub}>{sub}</div>
              </div>
            ))}
          </div>
          <LuckGauge days={days} />

          {/* Tabs */}
          <div style={S.tabBar}>
            {[{id:"log",label:"Log"},{id:"charts",label:"Charts"}].map(t => (
              <button key={t.id} style={{ ...S.tab, ...(activeTab===t.id ? S.tabActive : {}) }} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "log"    && <LogTab days={days} removeDay={removeDay} clearAll={clearAll} />}
          {activeTab === "charts" && <ChartsTab days={days} />}
        </div>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      <Toast msg={toast?.msg} err={toast?.err} />
    </div>
  );
}
