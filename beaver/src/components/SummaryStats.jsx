import { levelAtPercentile } from "../lib/petCalc.js";

const C = {
  card:    "#1a1c14",
  border:  "#282b22",
  text:    "#e8ead4",
  muted:   "#7a7d6e",
  surface: "#131509",
  accent:  "#c8873a",
  green:   "#8cb87a",
  greenBg: "#1a2619",
  gold:    "#d4a84b",
  virtual: "#6a6d5e",
};

function fmtPct(p, digits = 2) {
  return (p * 100).toFixed(digits) + "%";
}

function fmtNum(n) {
  if (!isFinite(n)) return "∞";
  return Math.round(n).toLocaleString();
}

function fmt1in(p) {
  if (p <= 0) return "—";
  if (p >= 1) return "1/1";
  return `1/${Math.round(1 / p).toLocaleString()}`;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      "12px 16px",
      flex:         "1 1 130px",
    }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "'Source Code Pro', monospace", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ?? C.text, fontFamily: "'Source Code Pro', monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function LevelTag({ level, color }) {
  const isVirtual = level > 99;
  return (
    <span style={{
      fontFamily:    "'Source Code Pro', monospace",
      fontSize:      14,
      fontWeight:    700,
      color:         isVirtual ? C.virtual : (color ?? C.text),
    }}>
      {level != null ? (isVirtual ? `${level}*` : level) : "—"}
    </span>
  );
}

export default function SummaryStats({ totalLogs, finalChance, segmentResults, chartData, xpMultiplier = 1 }) {
  const totalXp     = segmentResults.reduce((s, r) => s + r.xp, 0);
  const usingBonus  = xpMultiplier > 1.001;

  const lv50 = levelAtPercentile(chartData, 0.50);
  const lv75 = levelAtPercentile(chartData, 0.75);
  const lv90 = levelAtPercentile(chartData, 0.90);
  const lv99 = levelAtPercentile(chartData, 0.99);

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      padding:      "16px",
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Source Code Pro', monospace", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>
        Summary
      </div>

      {/* Top stat cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <StatCard
          label={usingBonus ? "Pet Rolls (chops)" : "Total Logs Cut"}
          value={fmtNum(totalLogs)}
          sub={totalXp >= 1_000_000
            ? `${(totalXp / 1_000_000).toFixed(2)}m XP`
            : `${(totalXp / 1_000).toFixed(1)}k XP`}
        />
        <StatCard
          label="Pet Chance"
          value={fmtPct(finalChance)}
          sub={fmt1in(finalChance) + " odds"}
          accent={finalChance > 0.5 ? C.green : finalChance > 0.1 ? C.accent : C.text}
        />
        <StatCard
          label="Dry Probability"
          value={fmtPct(1 - finalChance)}
          sub="chance of not getting pet"
          accent={1 - finalChance > 0.9 ? C.muted : C.text}
        />
      </div>

      {/* Level-at-percentile table */}
      {finalChance > 0 ? (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { label: "50% chance by", level: lv50, color: C.gold },
              { label: "75% chance by", level: lv75, color: C.accent },
              { label: "90% chance by", level: lv90, color: C.green },
              { label: "99% chance by", level: lv99, color: "#c04030" },
            ].map(({ label, level, color }, i) => (
              <div
                key={label}
                style={{
                  padding:      "10px 12px",
                  borderRight:  i < 3 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em", fontFamily: "'Source Code Pro', monospace", marginBottom: 5 }}>
                  {label}
                </div>
                <LevelTag level={level} color={color} />
                {level == null && (
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>beyond plan</div>
                )}
                {level != null && level > 99 && (
                  <div style={{ fontSize: 10, color: C.virtual, marginTop: 3 }}>virtual level</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: "7px 12px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted }}>
            "By level X" = cumulative probability reaching that threshold as you level.
            {lv50 && lv50 > 99 && " * = virtual level (beyond 99, using level-99 drop rate)."}
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px", textAlign: "center", color: C.muted, fontSize: 12 }}>
          Add tree segments to your training plan to see statistics.
        </div>
      )}
    </div>
  );
}
