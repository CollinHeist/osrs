import { formatRate, parseRate } from "../lib/efficiency.js";
import { useState } from "react";

/**
 * @param {{
 *   value: number;
 *   label: string;
 *   onCommit: (n: number) => void;
 * }} props
 */
function GpRangeField({ value, label, onCommit }) {
  const [text, setText] = useState(() => formatRate(value));
  const [focused, setFocused] = useState(false);
  const display = focused ? text : formatRate(value);

  function commit() {
    setFocused(false);
    const parsed = parseRate(text);
    if (parsed == null || parsed <= 0) {
      setText(formatRate(value));
      return;
    }
    onCommit(parsed);
    setText(formatRate(parsed));
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="input-mono"
        type="text"
        inputMode="decimal"
        value={display}
        onFocus={() => {
          setFocused(true);
          setText(String(value));
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

/**
 * Min/max money-maker GP/hr sweep controls + profit-reward toggle.
 *
 * @param {{
 *   minGpHr: number;
 *   maxGpHr: number;
 *   rewardProfit: boolean;
 *   onChange: (plot: { minGpHr: number, maxGpHr: number, rewardProfit: boolean }) => void;
 * }} props
 */
export function PlotControls({ minGpHr, maxGpHr, rewardProfit, onChange }) {
  return (
    <section className="panel plot-controls">
      <h2 className="panel-title">Money-maker range (X-axis)</h2>
      <div className="plot-fields">
        <GpRangeField
          label="Min GP/hr"
          value={minGpHr}
          onCommit={(n) =>
            onChange({
              minGpHr: n,
              maxGpHr: Math.max(maxGpHr, n + 1),
              rewardProfit,
            })
          }
        />
        <GpRangeField
          label="Max GP/hr"
          value={maxGpHr}
          onCommit={(n) =>
            onChange({
              minGpHr: Math.min(minGpHr, n - 1),
              maxGpHr: n,
              rewardProfit,
            })
          }
        />
      </div>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={rewardProfit}
          onChange={(e) =>
            onChange({
              minGpHr,
              maxGpHr,
              rewardProfit: e.target.checked,
            })
          }
        />
        <span>
          <span className="toggle-title">Reward profitable methods</span>
          <span className="toggle-desc muted">
            When on, GP earned while training counts as time saved versus the money-maker
            (e.g. +100k/hr at a 100k/hr money-maker saves an hour per hour trained). When
            off, only GP losses reduce effective XP/hr.
          </span>
        </span>
      </label>
    </section>
  );
}
