import {
  formatRate,
  bestOptionSegments,
  SERIES_COLORS,
} from "../lib/efficiency.js";

/**
 * Summary of which option is best across money-maker GP/hr ranges.
 *
 * @param {{
 *   options: { id: string, name: string, xpHr: number, gpHr: number }[];
 *   minGpHr: number;
 *   maxGpHr: number;
 *   rewardProfit: boolean;
 * }} props
 */
export function BestSummary({ options, minGpHr, maxGpHr, rewardProfit }) {
  const segments = bestOptionSegments(
    options,
    minGpHr,
    maxGpHr,
    rewardProfit,
    200
  );

  const colorById = Object.fromEntries(
    options.map((o, i) => [o.id, SERIES_COLORS[i % SERIES_COLORS.length]])
  );

  return (
    <section className="panel summary-panel">
      <h2 className="panel-title">Best options by money-maker rate</h2>
      {options.length === 0 ? (
        <p className="muted empty-hint">Add options to see which wins across the range.</p>
      ) : segments.length === 0 ? (
        <p className="muted empty-hint">
          No defined effective rates in this range
          {rewardProfit
            ? " (profitable methods may exceed the money-maker rate)."
            : "."}
        </p>
      ) : (
        <ul className="summary-list">
          {segments.map((s) => (
            <li key={`${s.optionId}-${s.fromGpHr}-${s.toGpHr}`} className="summary-row">
              <span
                className="summary-swatch"
                style={{ background: colorById[s.optionId] ?? "#8f97b8" }}
                aria-hidden
              />
              <div className="summary-body">
                <div className="summary-name">{s.name}</div>
                <div className="summary-meta muted">
                  <span className="mono">
                    {formatRate(s.fromGpHr)} – {formatRate(s.toGpHr)} GP/hr
                  </span>
                  <span className="summary-sep">·</span>
                  <span>
                    ~{formatRate(s.midEffXpHr)} eff. XP/hr at midpoint
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
