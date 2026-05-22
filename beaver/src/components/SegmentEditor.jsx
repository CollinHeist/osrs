import { useRef } from "react";
import { TREES, TREE_BY_ID } from "../data/trees.js";
import { MAX_VIRTUAL_LEVEL } from "../lib/xpTable.js";

const C = {
  card:      "#1a1c14",
  border:    "#282b22",
  accent:    "#c8873a",
  accentDim: "#8b5a20",
  text:      "#e8ead4",
  muted:     "#7a7d6e",
  input:     "#0f1009",
  inputBdr:  "#2a2e20",
  red:       "#c04030",
  redBg:     "#281410",
  hover:     "#1e2018",
  virtual:   "#6a6d5e",
};

const inputStyle = {
  background:   "#0f1009",
  border:       "1px solid #2a2e20",
  borderRadius: 5,
  color:        "#e8ead4",
  padding:      "4px 6px",
  outline:      "none",
};

const selectStyle = {
  ...inputStyle,
  flex:          1,
  minWidth:      0,
  cursor:        "pointer",
  appearance:    "none",
  backgroundImage:    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7d6e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat:   "no-repeat",
  backgroundPosition: "right 8px center",
  paddingRight:  24,
};

export default function SegmentEditor({ segments, startLevel, onSegmentsChange, onStartLevelChange }) {
  const nextId = useRef(100);

  const fromLevelOf = (idx) => idx === 0 ? startLevel : segments[idx - 1].toLevel;
  const isLast      = (idx) => idx === segments.length - 1;

  const handleTreeChange = (idx, treeId) => {
    onSegmentsChange(segments.map((s, i) => i === idx ? { ...s, treeId } : s));
  };

  const handleToLevelChange = (idx, rawValue) => {
    const from   = fromLevelOf(idx);
    const maxTo  = isLast(idx) ? MAX_VIRTUAL_LEVEL : segments[idx + 1].toLevel - 1;
    const clamped = Math.max(from + 1, Math.min(maxTo, Math.round(Number(rawValue) || from + 1)));
    onSegmentsChange(segments.map((s, i) => i === idx ? { ...s, toLevel: clamped } : s));
  };

  const addSegment = () => {
    const lastIdx = segments.length - 1;
    const lastSeg = segments[lastIdx];
    const from    = fromLevelOf(lastIdx);
    const splitAt = Math.floor((from + lastSeg.toLevel) / 2);
    if (splitAt <= from) return;
    const newId = `s_${++nextId.current}`;
    onSegmentsChange([
      ...segments.slice(0, lastIdx),
      { ...lastSeg, toLevel: splitAt },
      { id: newId, treeId: lastSeg.treeId, toLevel: lastSeg.toLevel },
    ]);
  };

  const removeSegment = (idx) => {
    if (segments.length <= 1) return;
    const newSegs = segments.filter((_, i) => i !== idx);
    if (idx === segments.length - 1) {
      newSegs[newSegs.length - 1] = { ...newSegs[newSegs.length - 1], toLevel: segments[idx].toLevel };
    }
    onSegmentsChange(newSegs);
  };

  const reset = () => {
    onStartLevelChange(1);
    onSegmentsChange([
      { id: "s1", treeId: "normal", toLevel: 15 },
      { id: "s2", treeId: "oak",    toLevel: 30 },
      { id: "s3", treeId: "willow", toLevel: 60 },
      { id: "s4", treeId: "yew",    toLevel: 99 },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Starting Level */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Source Code Pro', monospace", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>
          Starting Level
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            min={1}
            max={(segments[0]?.toLevel ?? 99) - 1}
            value={startLevel}
            onChange={e => {
              const v = Math.max(1, Math.min((segments[0]?.toLevel ?? 99) - 1, Math.round(Number(e.target.value) || 1)));
              onStartLevelChange(v);
            }}
            style={{ ...inputStyle, width: 70, textAlign: "center", fontFamily: "'Source Code Pro', monospace", fontSize: 16, fontWeight: 600 }}
          />
          <span style={{ color: C.muted, fontSize: 12 }}>your current woodcutting level</span>
        </div>
      </div>

      {/* Segments */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Source Code Pro', monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Training Plan
          </div>
          <button
            onClick={reset}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, cursor: "pointer", padding: "2px 8px", fontSize: 11 }}
            onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}
          >
            Reset
          </button>
        </div>

        <div>
          {segments.map((seg, idx) => {
            const from  = fromLevelOf(idx);
            const last  = isLast(idx);
            const tree  = TREE_BY_ID[seg.treeId];
            const toVal = last ? seg.toLevel : seg.toLevel;
            const isVirtual = (v) => v > 99;

            return (
              <div
                key={seg.id}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  padding:      "8px 12px",
                  borderBottom: !last ? `1px solid ${C.border}` : "none",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Color strip */}
                <div style={{ width: 3, height: 28, borderRadius: 2, background: tree?.color ?? C.muted, flexShrink: 0 }} />

                {/* Tree selector */}
                <select
                  value={seg.treeId}
                  onChange={e => handleTreeChange(idx, e.target.value)}
                  style={{ ...selectStyle, fontSize: 13 }}
                >
                  {TREES.map(t => (
                    <option key={t.id} value={t.id} disabled={t.levelReq > from}>
                      {t.name}{t.levelReq > from ? ` (lv ${t.levelReq})` : ""}
                    </option>
                  ))}
                </select>

                {/* Level range: "from → [until input]" */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontFamily: "'Source Code Pro', monospace",
                    fontSize:   11,
                    color:      isVirtual(from) ? C.virtual : C.muted,
                  }}>
                    {from}→
                  </span>
                  <input
                    type="number"
                    value={toVal}
                    min={from + 1}
                    max={last ? MAX_VIRTUAL_LEVEL : segments[idx + 1].toLevel - 1}
                    onChange={e => handleToLevelChange(idx, e.target.value)}
                    style={{
                      ...inputStyle,
                      width:      52,
                      textAlign:  "center",
                      fontFamily: "'Source Code Pro', monospace",
                      fontSize:   12,
                      fontWeight: 600,
                      color:      isVirtual(toVal) ? C.virtual : C.text,
                    }}
                  />
                  {isVirtual(toVal) && (
                    <span style={{ fontSize: 9, color: C.virtual, fontFamily: "'Source Code Pro', monospace" }} title="Virtual level — uses level-99 drop rate">virt</span>
                  )}
                </div>

                {/* Remove button */}
                {segments.length > 1 ? (
                  <button
                    onClick={() => removeSegment(idx)}
                    title="Remove segment"
                    style={{
                      flexShrink:   0,
                      background:   "none",
                      border:       "none",
                      color:        C.muted,
                      cursor:       "pointer",
                      fontSize:     16,
                      lineHeight:   1,
                      padding:      "2px 4px",
                      borderRadius: 4,
                      marginLeft:   2,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.redBg; }}
                    onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}
                  >
                    ×
                  </button>
                ) : (
                  /* Spacer so rows have consistent width when only one segment */
                  <div style={{ width: 24, flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={addSegment}
            style={{
              width:        "100%",
              padding:      "7px",
              background:   "none",
              border:       `1px dashed ${C.accentDim}`,
              borderRadius: 7,
              color:        C.accent,
              cursor:       "pointer",
              fontSize:     12,
              fontWeight:   500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#201408"; e.currentTarget.style.borderColor = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = C.accentDim; }}
          >
            + Add Segment
          </button>
        </div>
      </div>

      {/* Virtual level hint */}
      {segments.some(s => s.toLevel > 99) && (
        <div style={{
          background:   "#14120a",
          border:       "1px solid #3a3010",
          borderRadius: 8,
          padding:      "10px 14px",
          fontSize:     11,
          color:        "#8a7d50",
          lineHeight:   1.5,
        }}>
          <strong style={{ color: "#c4a840" }}>Virtual levels</strong> — woodcutting is capped at 99 in-game,
          so levels above 99 use the level-99 drop rate. They represent continued cutting beyond the XP cap
          (~{Math.round(99)} → 200M XP at ~level 126).
        </div>
      )}
    </div>
  );
}
