import { useMemo, useState } from "react";
import { fmtGp } from "../lib/format.js";
import { potionGpPerHour } from "../lib/potion.js";

/**
 * @param {{
 *   potions: Array<{ id: string, globalId?: string, name: string, costPerDose: string|number, minutesPerDose: string|number }>;
 *   globalPotions?: object[];
 *   onChange: (potions: any[]) => void;
 * }} props
 */
export function PotionList({ potions, globalPotions = [], onChange }) {
  const [showLibrary, setShowLibrary] = useState(false);

  const totalGpHr = useMemo(
    () => potions.reduce((s, p) => s + potionGpPerHour(p), 0),
    [potions]
  );

  // Global potions not already added to this task
  const availableGlobal = globalPotions.filter(
    (gp) => !potions.some((p) => p.globalId === gp.id)
  );

  function addCustom() {
    onChange([
      ...potions,
      { id: crypto.randomUUID(), name: "", costPerDose: "", minutesPerDose: "" },
    ]);
  }

  function addFromLibrary(globalPotion) {
    onChange([
      ...potions,
      {
        id: crypto.randomUUID(),
        globalId: globalPotion.id,
        name: globalPotion.name,
        costPerDose: globalPotion.costPerDose,
        minutesPerDose: globalPotion.minutesPerDose,
      },
    ]);
    setShowLibrary(false);
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
        {globalPotions.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowLibrary((v) => !v)}
          >
            From library
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={addCustom}>
          + Custom
        </button>
      </div>

      {/* Library picker */}
      {showLibrary && (
        <div className="potion-library-picker">
          {availableGlobal.length === 0 ? (
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              All library potions are already added.
            </span>
          ) : (
            availableGlobal.map((gp) => (
              <button
                key={gp.id}
                type="button"
                className="potion-library-btn"
                onClick={() => addFromLibrary(gp)}
              >
                <span className="potion-library-name">{gp.name || "Unnamed"}</span>
                <span className="muted" style={{ fontSize: "0.72rem" }}>
                  {fmtGp(potionGpPerHour(gp))}/hr
                </span>
              </button>
            ))
          )}
        </div>
      )}

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
            const isLinked = Boolean(p.globalId);
            const gphr = potionGpPerHour(p);
            return (
              <div key={p.id} className={`potion-entry${isLinked ? " potion-entry--linked" : ""}`}>
                <div className="potion-name-cell">
                  {isLinked && <span className="potion-linked-dot" title="Synced from library" />}
                  {isLinked ? (
                    <span className="potion-linked-name">{p.name || "Library potion"}</span>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Super Combat"
                      value={p.name}
                      onChange={(e) => update(p.id, "name", e.target.value)}
                    />
                  )}
                </div>
                {isLinked ? (
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {p.costPerDose ? fmtGp(p.costPerDose) : "—"}
                  </span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    placeholder="15000"
                    value={p.costPerDose}
                    onChange={(e) => update(p.id, "costPerDose", e.target.value)}
                  />
                )}
                {isLinked ? (
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {p.minutesPerDose ? `${p.minutesPerDose} min` : "—"}
                  </span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="5"
                    value={p.minutesPerDose}
                    onChange={(e) => update(p.id, "minutesPerDose", e.target.value)}
                  />
                )}
                <span className={`potion-gphr ${gphr > 0 ? "negative-num" : "muted"}`}>
                  {gphr > 0 ? fmtGp(gphr) : "—"}
                </span>
                <button
                  type="button"
                  className="btn-icon btn-icon-sm"
                  onClick={() => remove(p.id)}
                  title={isLinked ? "Unlink from task" : "Remove"}
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
