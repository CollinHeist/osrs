import { useState } from "react";
import {
  formatRate,
  gpHrFromGpXp,
  gpXpFromGpHr,
  parseRate,
} from "../lib/efficiency.js";

/**
 * Editable rate field that accepts compact suffixes (100k, 1.5m).
 *
 * @param {{
 *   value: number;
 *   signed?: boolean;
 *   onCommit: (n: number) => void;
 *   "aria-label"?: string;
 * }} props
 */
function RateInput({ value, signed = false, onCommit, "aria-label": ariaLabel }) {
  const [text, setText] = useState(() => formatRate(value, { signed }));
  const [focused, setFocused] = useState(false);

  // Sync display when external value changes while not editing
  const display = focused ? text : formatRate(value, { signed });

  function commit() {
    setFocused(false);
    const parsed = parseRate(text);
    if (parsed == null || (!signed && parsed <= 0)) {
      setText(formatRate(value, { signed }));
      return;
    }
    onCommit(parsed);
    setText(formatRate(parsed, { signed }));
  }

  return (
    <input
      className="input-mono"
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
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
  );
}

/**
 * Signed decimal field for GP/XP values.
 *
 * @param {{
 *   value: number;
 *   onCommit: (n: number) => void;
 *   "aria-label"?: string;
 * }} props
 */
function GpXpInput({ value, onCommit, "aria-label": ariaLabel }) {
  const [text, setText] = useState(() => String(value));
  const [focused, setFocused] = useState(false);
  const display = focused ? text : String(Number(value.toFixed(4)));

  function commit() {
    setFocused(false);
    const parsed = parseRate(text);
    if (parsed == null) {
      setText(String(value));
      return;
    }
    onCommit(parsed);
    setText(String(parsed));
  }

  return (
    <input
      className="input-mono"
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
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
  );
}

/**
 * CRUD table for options in the active comparison.
 *
 * @param {{
 *   options: { id: string, name: string, xpHr: number, gpHr: number }[];
 *   onChange: (options: { id: string, name: string, xpHr: number, gpHr: number }[]) => void;
 *   onAdd: () => void;
 * }} props
 */
export function OptionEditor({ options, onChange, onAdd }) {
  function update(id, patch) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function remove(id) {
    onChange(options.filter((o) => o.id !== id));
  }

  function move(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= options.length) return;
    const copy = options.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Options</h2>
        <button type="button" className="btn-primary btn-sm" onClick={onAdd}>
          + Add option
        </button>
      </div>
      <p className="help-blurb">
        Enter XP/hr and either GP/hr or GP/XP for each method. Changing GP/XP calculates
        GP/hr. Positive GP is profit; negative is a loss. Effective XP/hr = XP/hr ÷ (1 −
        GP/hr ÷ money-maker GP/hr). Use “Reward profitable methods” below to choose whether
        earned GP counts as time saved.
      </p>
      {options.length === 0 ? (
        <p className="muted empty-hint">Add an option to plot effective XP rates.</p>
      ) : (
        <div className="table-wrap">
          <table className="option-table">
            <thead>
              <tr>
                <th className="col-order" aria-label="Order" />
                <th>Name</th>
                <th>XP/hr</th>
                <th>GP/XP</th>
                <th>GP/hr</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {options.map((o, i) => (
                <tr key={o.id}>
                  <td className="col-order">
                    <div className="order-btns">
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        title="Move up"
                        aria-label={`Move ${o.name} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={i === options.length - 1}
                        onClick={() => move(i, 1)}
                        title="Move down"
                        aria-label={`Move ${o.name} down`}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      className="input-text"
                      type="text"
                      value={o.name}
                      aria-label="Option name"
                      onChange={(e) => update(o.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <RateInput
                      key={`${o.id}-xp`}
                      value={o.xpHr}
                      aria-label="XP per hour"
                      onCommit={(xpHr) => update(o.id, { xpHr })}
                    />
                  </td>
                  <td>
                    <GpXpInput
                      key={`${o.id}-gp-xp`}
                      value={gpXpFromGpHr(o.xpHr, o.gpHr) ?? 0}
                      aria-label="GP per XP"
                      onCommit={(gpXp) => {
                        const gpHr = gpHrFromGpXp(o.xpHr, gpXp);
                        if (gpHr != null) update(o.id, { gpHr });
                      }}
                    />
                  </td>
                  <td>
                    <RateInput
                      key={`${o.id}-gp`}
                      value={o.gpHr}
                      signed
                      aria-label="GP per hour"
                      onCommit={(gpHr) => update(o.id, { gpHr })}
                    />
                  </td>
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => remove(o.id)}
                      title="Remove option"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
