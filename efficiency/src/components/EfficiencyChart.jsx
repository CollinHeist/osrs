import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatRate, sampleSeries, SERIES_COLORS } from "../lib/efficiency.js";

/**
 * @param {{
 *   active?: boolean;
 *   payload?: { name: string, value: number | null, color: string, dataKey: string }[];
 *   label?: number;
 *   optionNames: Record<string, string>;
 * }} props
 */
function ChartTooltip({ active, payload, label, optionNames }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && Number.isFinite(p.value));
  if (!rows.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">
        Money-maker {formatRate(label)} GP/hr
      </div>
      {rows.map((p) => (
        <div key={p.dataKey} className="chart-tooltip-row">
          <span style={{ color: p.color }}>
            {optionNames[p.dataKey] ?? p.name}
          </span>
          <span className="mono">{formatRate(p.value)} XP/hr</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Multi-line effective XP/hr chart across a money-maker GP/hr sweep.
 *
 * @param {{
 *   options: { id: string, name: string, xpHr: number, gpHr: number }[];
 *   minGpHr: number;
 *   maxGpHr: number;
 *   rewardProfit: boolean;
 * }} props
 */
export function EfficiencyChart({ options, minGpHr, maxGpHr, rewardProfit }) {
  const data = sampleSeries(options, minGpHr, maxGpHr, 100, rewardProfit);
  const optionNames = Object.fromEntries(options.map((o) => [o.id, o.name]));

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Effective XP/hr</h2>
          <p className="muted chart-sub">
            Higher is better.
            {rewardProfit
              ? " Lines stop where GP/hr ≥ money-maker rate (undefined)."
              : " Profitable GP is ignored; only losses reduce effective XP."}
          </p>
        </div>
      </div>
      {options.length === 0 ? (
        <p className="muted empty-hint">No options to plot.</p>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(120,132,180,0.15)" strokeDasharray="3 3" />
              <XAxis
                dataKey="m"
                type="number"
                domain={[minGpHr, maxGpHr]}
                tickFormatter={(v) => formatRate(v)}
                stroke="#8f97b8"
                tick={{ fill: "#8f97b8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                label={{
                  value: "Money-maker GP/hr",
                  position: "insideBottom",
                  offset: -2,
                  fill: "#8f97b8",
                  fontSize: 11,
                }}
              />
              <YAxis
                tickFormatter={(v) => formatRate(v)}
                stroke="#8f97b8"
                tick={{ fill: "#8f97b8", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                width={64}
                label={{
                  value: "Effective XP/hr",
                  angle: -90,
                  position: "insideLeft",
                  offset: 8,
                  fill: "#8f97b8",
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={<ChartTooltip optionNames={optionNames} />}
              />
              <Legend
                formatter={(value) => optionNames[value] ?? value}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {options.map((o, i) => (
                <Line
                  key={o.id}
                  type="monotone"
                  dataKey={o.id}
                  name={o.id}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
