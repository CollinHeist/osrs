import { Fragment, useMemo, useState } from "react";
import { getFlattenedLootRows } from "../lib/loot.js";
import { computeLootEvPerKill } from "../lib/analytics.js";
import { fmtGp } from "../lib/format.js";

/**
 * @param {{ key: string, unitPrice: number }} row
 * @param {Record<string, boolean>} lootPick
 * @param {number} lootMinGpPerItem
 */
function rowIncluded(row, lootPick, lootMinGpPerItem) {
  if (lootPick && row.key in lootPick) return lootPick[row.key];
  return row.unitPrice >= (lootMinGpPerItem ?? 0);
}

/**
 * @param {object} props
 * @param {number | null} props.monsterId
 * @param {{ loot: any[], priceById: Record<string, number> }} props.gameData
 * @param {Record<string, boolean>} props.lootPick
 * @param {number} props.lootMinGpPerItem
 * @param {number} props.kcPerHour
 * @param {({ lootPick: Record<string, boolean>, lootMinGpPerItem: number }) => void} props.onChange
 */
export function LootTable({
  monsterId,
  gameData,
  lootPick,
  lootMinGpPerItem,
  kcPerHour,
  onChange,
  dimmed = false,
}) {
  // Initialize from prop; parent should pass a stable key to remount on context change.
  const [thresholdInput, setThresholdInput] = useState(
    String(lootMinGpPerItem ?? 0)
  );

  const flatLoot = useMemo(
    () => getFlattenedLootRows(gameData.loot, monsterId, gameData.priceById),
    [gameData.loot, monsterId, gameData.priceById]
  );

  const lootGroups = useMemo(() => {
    const groups = new Map();
    for (const row of flatLoot) {
      if (!groups.has(row.tableName)) groups.set(row.tableName, []);
      groups.get(row.tableName).push(row);
    }
    return groups;
  }, [flatLoot]);

  const evPerKill = useMemo(
    () => computeLootEvPerKill(flatLoot, lootPick, lootMinGpPerItem),
    [flatLoot, lootPick, lootMinGpPerItem]
  );

  const evPerHour = evPerKill * (kcPerHour || 0);

  if (!monsterId) {
    return (
      <p className="muted">Select a monster above to configure loot pickup.</p>
    );
  }

  if (flatLoot.length === 0) {
    return (
      <p className="muted">No loot data available for this monster.</p>
    );
  }

  function toggleRow(key, currentlyIncluded) {
    onChange({
      lootMinGpPerItem,
      lootPick: { ...lootPick, [key]: !currentlyIncluded },
    });
  }

  function applyThreshold() {
    const val = Math.max(0, parseInt(thresholdInput) || 0);
    const newPick = {};
    for (const row of flatLoot) {
      newPick[row.key] = row.unitPrice >= val;
    }
    onChange({ lootMinGpPerItem: val, lootPick: newPick });
  }

  function handleThresholdKeyDown(e) {
    if (e.key === "Enter") applyThreshold();
  }

  return (
    <div className={dimmed ? "loot-dimmed" : undefined}>
      <div className="loot-ev-summary">
        <div className="loot-ev-summary-item">
          <span className="loot-ev-summary-label">EV / kill</span>
          <span className="loot-ev-summary-val">{fmtGp(evPerKill)}</span>
        </div>
        {kcPerHour > 0 && (
          <div className="loot-ev-summary-item">
            <span className="loot-ev-summary-label">Loot EV / hr</span>
            <span className="loot-ev-summary-val">{fmtGp(evPerHour)}</span>
          </div>
        )}
      </div>

      <div className="loot-toolbar">
        <div className="field inline">
          <label>Min GP to include</label>
          <input
            type="number"
            min="0"
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            onBlur={applyThreshold}
            onKeyDown={handleThresholdKeyDown}
          />
        </div>
        <button type="button" className="btn-secondary" onClick={applyThreshold}>
          Apply
        </button>
      </div>

      <div className="loot-table-wrap">
        <table className="loot-table">
          <thead>
            <tr>
              <th className="loot-col-use">Use</th>
              <th className="loot-col-name">Item</th>
              <th className="loot-col-qty">Qty</th>
              <th className="loot-col-p">Chance</th>
              <th className="loot-col-gp">Price</th>
              <th className="loot-col-ev">EV/kill</th>
            </tr>
          </thead>
          <tbody>
            {[...lootGroups.entries()].map(([tableName, rows]) => (
              <Fragment key={tableName}>
                <tr className="loot-table-group">
                  <td colSpan={6}>{tableName}</td>
                </tr>
                {rows.map((row) => {
                  const included = rowIncluded(row, lootPick, lootMinGpPerItem);
                  return (
                    <tr
                      key={row.key}
                      className={included ? "" : "loot-row-dim"}
                    >
                      <td className="loot-col-use">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleRow(row.key, included)}
                        />
                      </td>
                      <td className="loot-col-name">
                        <span className="loot-name">{row.name}</span>
                      </td>
                      <td className="loot-col-qty">{row.quantityLabel}</td>
                      <td className="loot-col-p">{row.rarityLabel}</td>
                      <td className="loot-col-gp">{fmtGp(row.unitPrice)}</td>
                      <td className="loot-col-ev">
                        <span className={included ? "loot-ev" : ""}>
                          {fmtGp(row.evGp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
