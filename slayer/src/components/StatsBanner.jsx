import { useMemo } from "react";
import { fmtInt, fmtGp } from "../lib/format.js";

/**
 * @param {{ tasks: Array<{ slayerXpPerHour?: number, metrics?: object }> }} props
 */
export function StatsBanner({ tasks }) {
  const stats = useMemo(() => {
    const withMetrics = tasks.filter((t) => t.metrics);
    if (!withMetrics.length) return null;

    const avgXpHr =
      withMetrics.reduce((s, t) => s + (t.slayerXpPerHour || 0), 0) /
      withMetrics.length;
    const avgGpHr =
      withMetrics.reduce((s, t) => s + (t.metrics.gpPerHour || 0), 0) /
      withMetrics.length;
    const bestXpTask = withMetrics.reduce((best, t) =>
      (t.slayerXpPerHour || 0) > (best?.slayerXpPerHour || 0) ? t : best,
      null
    );

    return { avgXpHr, avgGpHr, bestXpTask, count: withMetrics.length };
  }, [tasks]);

  if (!tasks.length) return null;

  return (
    <div className="live-strip">
      <div>
        <div className="metric-label">Tasks Logged</div>
        <div className="metric-val">{tasks.length}</div>
      </div>
      {stats && (
        <>
          <div>
            <div className="metric-label">Avg XP/hr</div>
            <div className="metric-val accent">{fmtInt(stats.avgXpHr)}</div>
          </div>
          <div>
            <div className="metric-label">Avg GP/hr</div>
            <div
              className={`metric-val ${stats.avgGpHr >= 0 ? "accent" : ""}`}
              style={stats.avgGpHr < 0 ? { color: "var(--negative)" } : {}}
            >
              {fmtGp(stats.avgGpHr)}
            </div>
          </div>
          {stats.bestXpTask && (
            <div>
              <div className="metric-label">Best XP/hr</div>
              <div className="metric-val accent" style={{ fontSize: "0.95rem" }}>
                {stats.bestXpTask.monsterName}
              </div>
              <div className="metric-sub">
                {fmtInt(stats.bestXpTask.slayerXpPerHour)} xp/hr
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
