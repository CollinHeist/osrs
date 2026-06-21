import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { fmtInt, fmtGp } from "../lib/format.js";

const POPUP_W = 280;
const POPUP_H = 128;

/**
 * @param {{
 *   allTasks: any[];
 *   focusTaskId: string;
 *   metric: 'xp' | 'gp';
 *   anchorRect: DOMRect;
 * }} props
 */
export function MetricDistributionPopup({ allTasks, focusTaskId, metric, anchorRect }) {
  const { data, focusIdx } = useMemo(() => {
    const rows = allTasks
      .filter((t) =>
        metric === "xp"
          ? (t.slayerXpPerHour || 0) > 0
          : t.metrics != null
      )
      .map((t) => ({
        id: t.id,
        name: t.monsterName,
        value:
          metric === "xp"
            ? t.slayerXpPerHour || 0
            : t.metrics.gpPerHour,
      }))
      .sort((a, b) => b.value - a.value);

    return { data: rows, focusIdx: rows.findIndex((d) => d.id === focusTaskId) };
  }, [allTasks, focusTaskId, metric]);

  if (!data.length || focusIdx === -1) return null;

  const focusValue = data[focusIdx].value;
  const label = metric === "xp" ? "XP/hr" : "GP/hr";
  const formatted = metric === "xp" ? fmtInt(focusValue) : fmtGp(focusValue);

  // "Top N%" = task is in the top N% of all tasks (lower index = better)
  const topPct = Math.max(1, Math.ceil(((focusIdx + 1) / data.length) * 100));

  const margin = 8;
  let left = anchorRect.left + anchorRect.width / 2 - POPUP_W / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - POPUP_W - margin));
  let top = anchorRect.top - POPUP_H - margin;
  if (top < margin) top = anchorRect.bottom + margin;

  return (
    <div className="metric-dist-popup" style={{ left, top, width: POPUP_W }}>
      <div className="metric-dist-header">
        <span className="metric-dist-label">{label} Distribution</span>
        <span className="metric-dist-rank">
          #{focusIdx + 1} / {data.length} · top {topPct}%
        </span>
      </div>
      <div className="metric-dist-value">{formatted}/hr</div>
      <ResponsiveContainer width="100%" height={58}>
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="8%"
        >
          {metric === "gp" && (
            <ReferenceLine y={0} stroke="rgba(120,132,180,0.5)" strokeWidth={1} />
          )}
          <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.id}
                fill={
                  d.id === focusTaskId
                    ? "#f0b429"
                    : metric === "gp" && d.value < 0
                    ? "rgba(232,107,107,0.3)"
                    : "rgba(120,132,180,0.28)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
