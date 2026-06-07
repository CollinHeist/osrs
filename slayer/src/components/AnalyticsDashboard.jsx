import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { fmtInt, fmtGp, fmtHours } from "../lib/format.js";
import { rankTasks } from "../lib/analytics.js";
import { RECOMMENDATION_LABELS } from "../lib/constants.js";

const REC_COLORS = {
  skip: "#e86b6b",
  extend: "#5cdb9a",
  speedup: "#f0b429",
  keep: "#8f97b8",
  "extend-speedup": "#5bc8e8",
};

/**
 * @param {object} props
 * @param {any[]} props.tasks enriched tasks with metrics + recommendation
 * @param {object} props.gameData
 * @param {object} [props.settings]
 */
export function AnalyticsDashboard({ tasks, gameData, settings = {} }) {
  const ranked = useMemo(() => {
    if (gameData.loading || !tasks.length) return [];
    return rankTasks(tasks, gameData.priceById, gameData.loot, settings);
  }, [tasks, gameData, settings]);

  const xpChartData = useMemo(
    () =>
      [...tasks]
        .filter((t) => (t.slayerXpPerHour || 0) > 0)
        .sort((a, b) => (b.slayerXpPerHour || 0) - (a.slayerXpPerHour || 0))
        .slice(0, 20)
        .map((t) => ({
          name: t.monsterName,
          value: t.slayerXpPerHour || 0,
          rec: t.recommendation?.type ?? "keep",
        })),
    [tasks]
  );

  const gpChartData = useMemo(
    () =>
      tasks
        .filter((t) => t.metrics)
        .sort(
          (a, b) =>
            (b.metrics.gpPerHour || 0) - (a.metrics.gpPerHour || 0)
        )
        .slice(0, 20)
        .map((t) => ({
          name: t.monsterName,
          value: t.metrics.gpPerHour,
          rec: t.recommendation?.type ?? "keep",
        })),
    [tasks]
  );

  if (!tasks.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <p>No tasks logged yet.</p>
        <p className="muted">
          Add tasks on the Tasks tab to see analytics and recommendations.
        </p>
      </div>
    );
  }

  const toSkip = ranked.filter(
    (r) => r.task.recommendation?.type === "skip"
  );
  const toExtend = ranked.filter((r) =>
    ["extend", "extend-speedup"].includes(r.task.recommendation?.type)
  );
  const toSpeedup = ranked.filter((r) =>
    ["speedup", "extend-speedup"].includes(r.task.recommendation?.type)
  );

  const chartTooltipStyle = {
    background: "rgba(14,18,32,0.98)",
    border: "1px solid rgba(120,132,180,0.38)",
    borderRadius: 8,
    fontSize: 12,
    color: "#eef1fb",
  };
  const chartLabelStyle = { color: "#eef1fb" };
  const chartItemStyle = { color: "#eef1fb" };

  return (
    <div className="analytics-layout">
      {xpChartData.length > 0 && (
        <div className="panel chart-card">
          <h2>Slayer XP/hr by Monster</h2>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={xpChartData}
                margin={{ top: 8, right: 16, bottom: 56, left: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(120,132,180,0.15)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8f97b8", fontSize: 11 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#8f97b8", fontSize: 11 }}
                  tickFormatter={(v) => fmtInt(v)}
                  width={64}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartLabelStyle}
                  itemStyle={chartItemStyle}
                  formatter={(v) => [fmtInt(v), "XP/hr"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {xpChartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={REC_COLORS[d.rec] ?? "#8f97b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {gpChartData.length > 0 && (
        <div className="panel chart-card">
          <h2>GP/hr (net) by Monster</h2>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={gpChartData}
                margin={{ top: 8, right: 16, bottom: 56, left: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(120,132,180,0.15)"
                />
                <ReferenceLine y={0} stroke="rgba(120,132,180,0.4)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8f97b8", fontSize: 11 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#8f97b8", fontSize: 11 }}
                  tickFormatter={(v) => fmtGp(v)}
                  width={64}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartLabelStyle}
                  itemStyle={chartItemStyle}
                  formatter={(v) => [fmtGp(v), "GP/hr"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {gpChartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.value >= 0 ? "#5cdb9a" : "#e86b6b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {ranked.length > 0 && (
        <div className="panel">
          <h2>Task Rankings</h2>
          <div className="table-wrap">
            <table className="results">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "2rem" }}>#</th>
                  <th style={{ textAlign: "left" }}>Monster</th>
                  <th>Slayer XP/hr</th>
                  <th>GP/hr</th>
                  <th>Time</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.task.id}>
                    <td
                      className="muted"
                      style={{ textAlign: "left", fontSize: "0.75rem" }}
                    >
                      {i + 1}
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <strong>{r.task.monsterName}</strong>
                      <div
                        className="muted"
                        style={{ fontSize: "0.72rem" }}
                      >
                        {r.task.slayerMaster}
                      </div>
                    </td>
                    <td className="accent-num">
                      {fmtInt(r.task.slayerXpPerHour)}
                    </td>
                    <td
                      className={
                        r.metrics.gpPerHour >= 0
                          ? "positive-num"
                          : "negative-num"
                      }
                    >
                      {fmtGp(r.metrics.gpPerHour)}
                    </td>
                    <td className="muted" style={{ fontSize: "0.78rem" }}>
                      {fmtHours(r.metrics.timeHours)}
                    </td>
                    <td>
                      {r.task.recommendation && (
                        <span
                          className={`badge badge-${r.task.recommendation.type}`}
                        >
                          {RECOMMENDATION_LABELS[
                            r.task.recommendation.type
                          ] ?? r.task.recommendation.type}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(toExtend.length > 0 || toSpeedup.length > 0 || toSkip.length > 0) && (
        <div className="rec-summary-grid">
          {toExtend.length > 0 && (
            <div className="panel rec-card rec-card-extend">
              <h2>
                <span className="badge badge-extend" style={{ marginRight: "0.5rem" }}>Extend</span>
                Worth extending
              </h2>
              <ul className="rec-list">
                {toExtend.map((r) => (
                  <li key={r.task.id}>
                    <strong>{r.task.monsterName}</strong>
                    <span className="muted">
                      {" — "}
                      {fmtInt(r.task.slayerXpPerHour)} XP/hr
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {toSpeedup.length > 0 && (
            <div className="panel rec-card rec-card-speedup">
              <h2>
                <span className="badge badge-speedup" style={{ marginRight: "0.5rem" }}>Speedup</span>
                Speed up (cannon/burst)
              </h2>
              <ul className="rec-list">
                {toSpeedup.map((r) => (
                  <li key={r.task.id}>
                    <strong>{r.task.monsterName}</strong>
                    <span className="muted">
                      {" — "}
                      {fmtHours(r.metrics.timeHours)} task
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {toSkip.length > 0 && (
            <div className="panel rec-card rec-card-skip">
              <h2>
                <span className="badge badge-skip" style={{ marginRight: "0.5rem" }}>Skip</span>
                Consider skipping
              </h2>
              <ul className="rec-list">
                {toSkip.map((r) => (
                  <li key={r.task.id}>
                    <strong>{r.task.monsterName}</strong>
                    <span className="muted">
                      {" — "}
                      {r.task.recommendation?.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
