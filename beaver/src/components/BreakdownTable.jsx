const C = {
  card:    "#1a1c14",
  border:  "#282b22",
  text:    "#e8ead4",
  muted:   "#7a7d6e",
  surface: "#131509",
  green:   "#8cb87a",
  accent:  "#c8873a",
  hover:   "#1e2018",
};

function fmtPct(p) {
  if (p < 0.0001) return "<0.01%";
  return (p * 100).toFixed(2) + "%";
}

function fmt1in(p) {
  if (p <= 0) return "—";
  if (p >= 1) return "1/1";
  return `1/${Math.round(1 / p).toLocaleString()}`;
}

function fmtXp(xp) {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(2)}m`;
  if (xp >= 1_000)     return `${(xp / 1_000).toFixed(1)}k`;
  return xp.toLocaleString();
}

function ProgressBar({ fraction, color }) {
  return (
    <div style={{
      height:       5,
      borderRadius: 3,
      background:   "#282b22",
      overflow:     "hidden",
      marginTop:    4,
    }}>
      <div style={{
        height:       "100%",
        width:        `${Math.min(100, fraction * 100).toFixed(1)}%`,
        background:   color,
        borderRadius: 3,
        transition:   "width .3s ease",
      }} />
    </div>
  );
}

const TH_STYLE = {
  padding:     "8px 12px",
  fontFamily:  "'Source Code Pro', monospace",
  fontSize:    10,
  fontWeight:  600,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color:       C.muted,
  textAlign:   "left",
  whiteSpace:  "nowrap",
  borderBottom: `1px solid ${C.border}`,
  background:  C.surface,
};

export default function BreakdownTable({ results, xpMultiplier = 1 }) {
  if (!results?.length) return null;

  const usingBonus = xpMultiplier > 1.001;
  const maxLogs = Math.max(...results.map(r => r.actions));

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      overflow:     "hidden",
      marginTop:    20,
    }}>
      <div style={{
        padding:     "14px 16px",
        borderBottom: `1px solid ${C.border}`,
        fontSize:    11,
        color:       C.muted,
        fontFamily:  "'Source Code Pro', monospace",
        letterSpacing: ".08em",
        textTransform: "uppercase",
      }}>
        Segment Breakdown
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH_STYLE}>Tree</th>
              <th style={{ ...TH_STYLE, textAlign: "center" }}>Levels</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>XP</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>{usingBonus ? "Pet Rolls" : "Logs"}</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>Seg. Chance</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>Odds / Log</th>
              <th style={{ ...TH_STYLE, textAlign: "right" }}>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const prevCum = idx === 0 ? 0 : results[idx - 1].cumChance;
              const avgOddsPerLog = r.avgPPerLog ?? 0;

              return (
                <tr
                  key={r.id}
                  style={{ borderBottom: idx < results.length - 1 ? `1px solid ${C.border}` : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.hover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Tree */}
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: r.treeColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{r.treeName}</span>
                    </div>
                  </td>

                  {/* Level range */}
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{
                      fontFamily: "'Source Code Pro', monospace",
                      fontSize:   12,
                      color:      C.muted,
                    }}>
                      {r.fromLevel} – {r.toLevel}
                    </span>
                  </td>

                  {/* XP */}
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <span style={{ fontFamily: "'Source Code Pro', monospace", fontSize: 12, color: C.text }}>
                      {fmtXp(r.xp)}
                    </span>
                  </td>

                  {/* Actions / Logs */}
                  <td style={{ padding: "10px 12px 8px", textAlign: "right", minWidth: 110 }}>
                    <span style={{ fontFamily: "'Source Code Pro', monospace", fontSize: 12, color: C.text }}>
                      {r.actions.toLocaleString()}
                    </span>
                    <ProgressBar fraction={r.actions / maxLogs} color={r.treeColor} />
                  </td>

                  {/* Segment chance */}
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <span style={{
                      fontFamily: "'Source Code Pro', monospace",
                      fontSize:   13,
                      fontWeight: 600,
                      color:      r.segChance > 0.05 ? C.green : C.muted,
                    }}>
                      {fmtPct(r.segChance)}
                    </span>
                  </td>

                  {/* Avg odds per log in this segment */}
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <span style={{ fontFamily: "'Source Code Pro', monospace", fontSize: 12, color: C.muted }}>
                      {fmt1in(avgOddsPerLog)}
                    </span>
                  </td>

                  {/* Cumulative */}
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <div>
                      <span style={{
                        fontFamily: "'Source Code Pro', monospace",
                        fontSize:   13,
                        fontWeight: 600,
                        color:      r.cumChance > 0.5 ? C.green : r.cumChance > 0.1 ? C.accent : C.text,
                      }}>
                        {fmtPct(r.cumChance)}
                      </span>
                    </div>
                    <div style={{
                      fontSize:   10,
                      color:      C.muted,
                      fontFamily: "'Source Code Pro', monospace",
                      marginTop:  2,
                    }}>
                      +{fmtPct(r.cumChance - prevCum)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
        {usingBonus
          ? "Pet Rolls = total chops (XP-gaining actions), each of which rolls for the pet. With the felling axe, ~20% of chops yield no log but still fire a roll."
          : "Logs = chops made; each log cut triggers one pet roll."}
        {" "}Drop rate formula: 1/(base − level×25) per roll.
      </div>
    </div>
  );
}
