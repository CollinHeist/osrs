import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtNum(n, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const mins = seconds / 60;
  if (mins < 60) return `${fmtNum(mins, 1)} min`;
  const hrs = mins / 60;
  if (hrs < 24) return `${fmtNum(hrs, 2)} hr`;
  const days = hrs / 24;
  return `${fmtNum(days, 2)} d`;
}

/**
 * @param {object} props
 * @param {any} props.plan
 */
export function TrainingProgressCharts({ plan }) {
  const rows = useMemo(() => {
    const out = [
      {
        idx: 0,
        attack: plan.startAttackLevel,
        strength: plan.startStrengthLevel,
        dps: plan.baselineDps,
        cumulativeXp: 0,
        cumulativeKills: 0,
        cumulativeTimeSeconds: 0,
      },
    ];
    for (let i = 0; i < plan.groupedSteps.length; i++) {
      const step = plan.groupedSteps[i];
      out.push({
        idx: i + 1,
        attack: step.attackLevelAfter,
        strength: step.strengthLevelAfter,
        dps: step.dpsAfter,
        cumulativeXp: step.cumulativeXp,
        cumulativeKills: plan.xpPerKill > 0 ? step.cumulativeXp / plan.xpPerKill : 0,
        cumulativeTimeSeconds: step.cumulativeTimeSeconds,
      });
    }
    return out;
  }, [plan]);

  if (rows.length <= 1) return null;

  return (
    <section className="panel glass">
      <h2>Progress plots</h2>
      <p className="muted tight">
        Visualizes level and DPS progression across your optimized training order.
      </p>

      <div className="training-charts-grid">
        <div className="chart-card glass">
          <h3 className="chart-title">Attack & Strength levels</h3>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,132,180,0.2)" />
                <XAxis
                  dataKey="cumulativeXp"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  label={{
                    value: "Cumulative XP",
                    position: "insideBottom",
                    offset: -4,
                    fill: "var(--text-muted)",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  domain={[1, 99]}
                  label={{
                    value: "Level",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--text-muted)",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(14,18,30,0.95)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload;
                    if (!p) return "";
                    return `XP ${Math.round(p.cumulativeXp).toLocaleString()} · Kills ${fmtNum(
                      p.cumulativeKills,
                      1
                    )} · Time ${formatDuration(p.cumulativeTimeSeconds)}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="attack"
                  name="Attack"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="strength"
                  name="Strength"
                  stroke="#7cd4a0"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card glass">
          <h3 className="chart-title">DPS progression</h3>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,132,180,0.2)" />
                <XAxis
                  dataKey="cumulativeXp"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  label={{
                    value: "Cumulative XP",
                    position: "insideBottom",
                    offset: -4,
                    fill: "var(--text-muted)",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  label={{
                    value: "DPS",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--text-muted)",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(14,18,30,0.95)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [fmtNum(Number(value), 3), "DPS"]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload;
                    if (!p) return "";
                    return `XP ${Math.round(p.cumulativeXp).toLocaleString()} · Kills ${fmtNum(
                      p.cumulativeKills,
                      1
                    )} · Time ${formatDuration(p.cumulativeTimeSeconds)}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="dps"
                  name="DPS"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
