import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { TREE_BY_ID } from "../data/trees.js";

const C = {
  border:  "#282b22",
  muted:   "#7a7d6e",
  text:    "#e8ead4",
  gold:    "#d4a84b",
  green:   "#8cb87a",
  accent:  "#c8873a",
  surface: "#141510",
};

const MILESTONES = [
  { p: 50,  label: "50%",  stroke: "#d4a84b88" },
  { p: 75,  label: "75%",  stroke: "#8cb87a66" },
  { p: 90,  label: "90%",  stroke: "#6a9fd488" },
  { p: 99,  label: "99%",  stroke: "#c04030aa" },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const chance = payload[0]?.value ?? 0;
  const dry    = 100 - chance;

  return (
    <div style={{
      background: "#1a1c14ee",
      border:     "1px solid #282b22",
      borderRadius: 8,
      padding:    "10px 14px",
      fontSize:   12,
      minWidth:   140,
    }}>
      <div style={{ color: "#7a7d6e", fontFamily: "'Source Code Pro', monospace", marginBottom: 6 }}>
        Level {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#8cb87a", fontWeight: 600 }}>
        <span>Chance</span>
        <span style={{ fontFamily: "'Source Code Pro', monospace" }}>{chance.toFixed(2)}%</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, color: "#7a7d6e", fontSize: 11, marginTop: 3 }}>
        <span>Still dry</span>
        <span style={{ fontFamily: "'Source Code Pro', monospace" }}>{dry.toFixed(2)}%</span>
      </div>
    </div>
  );
}

export default function ProbabilityChart({ chartData, filledSegments, maxLevel = 99 }) {
  const hasData = chartData.some(d => d.chance > 0);

  const gradientId = "beaverGradient";

  return (
    <div style={{
      background:   "#141510",
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      padding:      "20px 16px 14px",
    }}>
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   16,
        paddingBottom:  12,
        borderBottom:   `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Cumulative Pet Chance</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Probability of receiving the Beaver by level
          </div>
        </div>

        {/* Tree legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", justifyContent: "flex-end", maxWidth: 320 }}>
          {filledSegments.map(seg => {
            const tree = TREE_BY_ID[seg.treeId];
            if (!tree) return null;
            return (
              <div key={seg.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: tree.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: C.muted }}>{tree.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!hasData ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13 }}>
          Add a training plan to see results
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8cb87a" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8cb87a" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />

            {/* Segment background areas */}
            {filledSegments.map(seg => {
              const tree = TREE_BY_ID[seg.treeId];
              if (!tree) return null;
              return (
                <ReferenceArea
                  key={seg.id}
                  x1={seg.fromLevel}
                  x2={seg.toLevel}
                  fill={tree.color}
                  fillOpacity={0.06}
                  stroke={tree.color}
                  strokeOpacity={0.12}
                />
              );
            })}

            {/* Level 99 boundary when showing virtual levels */}
            {maxLevel > 99 && (
              <ReferenceLine
                x={99}
                stroke="#6a6d5e"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{ value: "99", position: "top", fill: "#6a6d5e", fontSize: 10, fontFamily: "'Source Code Pro', monospace" }}
              />
            )}

            {/* Milestone reference lines */}
            {MILESTONES.map(m => (
              <ReferenceLine
                key={m.p}
                y={m.p}
                stroke={m.stroke}
                strokeDasharray="5 4"
                strokeWidth={1}
                label={{
                  value:    m.label,
                  position: "right",
                  fill:     m.stroke.slice(0, 7),
                  fontSize: 10,
                  fontFamily: "'Source Code Pro', monospace",
                }}
              />
            ))}

            <XAxis
              dataKey="level"
              type="number"
              domain={[1, maxLevel]}
              tickCount={Math.min(10, maxLevel)}
              tick={{ fill: C.muted, fontSize: 11, fontFamily: "'Source Code Pro', monospace" }}
              tickLine={false}
              axisLine={{ stroke: C.border }}
              label={{ value: maxLevel > 99 ? "Woodcutting Level (99+ = virtual)" : "Woodcutting Level", position: "insideBottom", offset: -4, fill: C.muted, fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fill: C.muted, fontSize: 11, fontFamily: "'Source Code Pro', monospace" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="chance"
              stroke="#8cb87a"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: "#8cb87a", stroke: "#1a1c14", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Milestone legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, flexWrap: "wrap" }}>
        {MILESTONES.map(m => (
          <div key={m.p} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 1.5, background: m.stroke.slice(0, 7), opacity: 0.8 }} />
            <span style={{ fontSize: 11, color: C.muted }}>{m.label} mark</span>
          </div>
        ))}
      </div>
    </div>
  );
}
