import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { histogramBins } from "../engine/simulate.js";

/**
 * @param {object} props
 * @param {number[]} props.samples
 * @param {string} props.title
 */
export function DpsDistributionChart({ samples, title }) {
  const data = useMemo(() => {
    const bins = histogramBins(samples, 20);
    return bins.map((b, i) => ({
      name: `${i + 1}`,
      dps: Number(b.mid.toFixed(3)),
      fights: b.count,
    }));
  }, [samples]);

  if (!samples.length) {
    return <p className="muted tight">Run a simulation or select a loadout to chart.</p>;
  }

  return (
    <div className="chart-card glass">
      <h3 className="chart-title">{title}</h3>
      <p className="muted tight">
        Monte Carlo fights (random hits, uniform 0…max damage). Bin height =
        number of fights; x ≈ DPS (HP ÷ kill time).
      </p>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,132,180,0.2)" />
            <XAxis
              dataKey="dps"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              label={{ value: "DPS (HP / s)", position: "insideBottom", offset: -4, fill: "var(--text-muted)", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              allowDecimals={false}
              label={{ value: "Fights", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,18,30,0.95)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => [v, "fights"]}
              labelFormatter={(l, payload) =>
                payload?.[0] ? `DPS ≈ ${payload[0].payload.dps}` : ""
              }
            />
            <Bar dataKey="fights" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
