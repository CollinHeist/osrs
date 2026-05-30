import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { fmtInt, fmtGp } from "../lib/format.js";
import { RECOMMENDATION_LABELS } from "../lib/constants.js";

const REC_COLORS = {
  skip: "#e86b6b",
  extend: "#5cdb9a",
  speedup: "#f0b429",
  keep: "#8f97b8",
  "extend-speedup": "#5bc8e8",
};

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="scatter-tooltip">
      <div className="scatter-tooltip-name">{d.name}</div>
      <div>XP/hr: {fmtInt(d.xp)}</div>
      <div>GP/hr: {fmtGp(d.gp)}</div>
      {d.master && <div className="scatter-tooltip-sub">{d.master}</div>}
      {d.rec && (
        <span className={`badge badge-sm badge-${d.rec}`} style={{ marginTop: "0.35rem" }}>
          {RECOMMENDATION_LABELS[d.rec] ?? d.rec}
        </span>
      )}
    </div>
  );
}

/**
 * @param {{ tasks: any[] }} props
 */
export function XpGpScatterChart({ tasks }) {
  const data = useMemo(
    () =>
      tasks
        .filter((t) => t.metrics && (t.slayerXpPerHour > 0 || t.metrics.gpPerHour !== 0))
        .map((t) => ({
          xp: t.slayerXpPerHour || 0,
          gp: t.metrics.gpPerHour,
          name: t.monsterName,
          master: t.slayerMaster,
          rec: t.recommendation?.type ?? "keep",
        })),
    [tasks]
  );

  if (data.length < 2) return null;

  return (
    <div className="panel scatter-card">
      <h2>XP/hr vs GP/hr — Task Overview</h2>
      <div className="chart-area scatter-area">
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 12, right: 24, bottom: 28, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,132,180,0.15)" />
            <ReferenceLine
              y={0}
              stroke="rgba(120,132,180,0.4)"
              strokeDasharray="4 2"
            />
            <XAxis
              type="number"
              dataKey="xp"
              name="Slayer XP/hr"
              tick={{ fill: "#8f97b8", fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              label={{
                value: "Slayer XP/hr",
                position: "insideBottom",
                offset: -16,
                fill: "#8f97b8",
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              dataKey="gp"
              name="GP/hr"
              tick={{ fill: "#8f97b8", fontSize: 11 }}
              tickFormatter={fmtGp}
              width={64}
              label={{
                value: "GP/hr (net)",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: "#8f97b8",
                fontSize: 10,
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "rgba(120,132,180,0.4)" }}
              content={<ScatterTooltip />}
            />
            <Scatter data={data} r={6}>
              {data.map((d, i) => (
                <Cell key={i} fill={REC_COLORS[d.rec] ?? "#8f97b8"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="scatter-legend">
        {Object.entries(REC_COLORS).map(([type, color]) => (
          <span key={type} className="scatter-legend-item">
            <span className="scatter-legend-dot" style={{ background: color }} />
            {RECOMMENDATION_LABELS[type] ?? type}
          </span>
        ))}
      </div>
    </div>
  );
}
