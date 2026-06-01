import { useMemo } from "react";
import { fmtGp } from "../lib/format.js";
import { potionGpPerHour } from "../lib/potion.js";

/**
 * @param {{
 *   potions: Array<{ id: string, name: string, costPerDose: string, minutesPerDose: string }>;
 *   onChange: (potions: any[]) => void;
 * }} props
 */
export function PotionList({ potions, onChange }) {
  const totalGpHr = useMemo(
    () => potions.reduce((s, p) => s + potionGpPerHour(p), 0),
    [potions]
  );

  function addPotion() {
    onChange([
      ...potions,
      { id: crypto.randomUUID(), name: "", costPerDose: "", minutesPerDose: "" },
    ]);
  }

  function update(id, field, value) {
    onChange(potions.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function remove(id) {
    onChange(potions.filter((p) => p.id !== id));
  }

  return (
    <div className="potion-list">
      <div className="potion-list-header">
        <span className="potion-list-label">Potions</span>
        {totalGpHr > 0 && (
          <span className="negative-num potion-list-total">
            {fmtGp(totalGpHr)}/hr
          </span>
        )}
        <button type="button" className="btn-secondary" onClick={addPotion}>
          + Add potion
        </button>
      </div>

      {potions.length > 0 && (
        <div className="potion-entries">
          <div className="potion-header-row">
            <span>Name</span>
            <span>GP / dose</span>
            <span>min / dose</span>
            <span>GP / hr</span>
            <span />
          </div>
          {potions.map((p) => {
            const gphr = potionGpPerHour(p);
            return (
              <div key={p.id} className="potion-entry">
                <input
                  type="text"
                  placeholder="e.g. Super Combat"
                  value={p.name}
                  onChange={(e) => update(p.id, "name", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="15000"
                  value={p.costPerDose}
                  onChange={(e) => update(p.id, "costPerDose", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="5"
                  value={p.minutesPerDose}
                  onChange={(e) => update(p.id, "minutesPerDose", e.target.value)}
                />
                <span className={`potion-gphr ${gphr > 0 ? "negative-num" : "muted"}`}>
                  {gphr > 0 ? fmtGp(gphr) : "—"}
                </span>
                <button
                  type="button"
                  className="btn-icon btn-icon-sm"
                  onClick={() => remove(p.id)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
