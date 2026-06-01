import { fmtInt, fmtGp, fmtHours } from "../lib/format.js";
import { RECOMMENDATION_LABELS } from "../lib/constants.js";
import { LootTable } from "./LootTable.jsx";
import { EditIcon, TrashIcon } from "./Icons.jsx";
import { potionGpPerHour } from "../lib/potion.js";

/**
 * @param {object} props
 * @param {object} props.task enriched task with metrics + recommendation
 * @param {{ loot: any[], priceById: Record<string, number> }} props.gameData
 * @param {(id: string, changes: object) => void} props.onUpdate
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDelete
 * @param {() => void} props.onClose
 */
export function TaskDetail({ task, gameData, onUpdate, onEdit, onDelete, onClose }) {
  const { metrics, recommendation } = task;

  function handleLootChange({ lootPick, lootMinGpPerItem }) {
    onUpdate(task.id, { lootPick, lootMinGpPerItem });
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <div>
          <h2 className="task-detail-monster">{task.monsterName}</h2>
          <span className="task-detail-meta">
            {task.slayerMaster} &middot; {fmtInt(task.taskLength)} kills
            {task.location && (
              <>
                {" "}&middot;{" "}
                <span title="Location">📍 {task.location}</span>
              </>
            )}
            {task.useCannon && (
              <span className="cannon-badge" style={{ marginLeft: "0.5rem" }}>
                Cannon
              </span>
            )}
          </span>
        </div>
        <div className="task-detail-actions">
          <button
            type="button"
            className="btn-icon btn-icon-edit btn-icon-lg"
            title="Edit task"
            onClick={onEdit}
          >
            <EditIcon size={15} />
          </button>
          <button
            type="button"
            className="btn-icon btn-icon-delete btn-icon-lg"
            title="Delete task"
            onClick={() => {
              if (window.confirm(`Delete ${task.monsterName} task?`)) onDelete();
            }}
          >
            <TrashIcon size={15} />
          </button>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>

      {recommendation && (
        <div className={`recommendation-box recommendation-${recommendation.type}`}>
          <span className={`badge badge-${recommendation.type}`}>
            {RECOMMENDATION_LABELS[recommendation.type] ?? recommendation.type}
          </span>
          <span className="recommendation-reason">{recommendation.reason}</span>
        </div>
      )}

      {metrics && (
        <div className="metrics-grid">
          <div className="metric-cell">
            <div className="metric-label">Time</div>
            <div className="metric-val">{fmtHours(metrics.timeHours)}</div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Slayer XP/hr</div>
            <div className="metric-val accent-num">
              {fmtInt(task.slayerXpPerHour)}
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">GP/hr (net)</div>
            <div
              className={`metric-val ${
                metrics.gpPerHour >= 0 ? "positive-num" : "negative-num"
              }`}
            >
              {fmtGp(metrics.gpPerHour)}
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Loot EV/hr</div>
            <div className="metric-val accent-num">
              {metrics.usingManualGp ? (
                <span title="Using manual GP/kill override">{fmtGp(metrics.lootEvPerHour)} *</span>
              ) : (
                fmtGp(metrics.lootEvPerHour)
              )}
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">Total Slayer XP</div>
            <div className="metric-val">{fmtInt(metrics.totalSlayerXp)}</div>
          </div>
          {task.combatXpPerHour > 0 && (
            <div className="metric-cell">
              <div className="metric-label">Combat XP/hr</div>
              <div className="metric-val">{fmtInt(task.combatXpPerHour)}</div>
            </div>
          )}
          <div className="metric-cell">
            <div className="metric-label">Total GP</div>
            <div
              className={`metric-val ${
                metrics.totalGp >= 0 ? "positive-num" : "negative-num"
              }`}
            >
              {fmtGp(metrics.totalGp)}
            </div>
          </div>
          <div className="metric-cell">
            <div className="metric-label">KC/hr</div>
            <div className="metric-val">{fmtInt(task.kcPerHour)}</div>
          </div>
          {metrics.cannonCostPerHour > 0 && (
            <div className="metric-cell">
              <div className="metric-label">Cannon cost/hr</div>
              <div className="metric-val negative-num">
                {fmtGp(metrics.cannonCostPerHour)}
              </div>
            </div>
          )}
          {metrics.potionCostPerHour > 0 && (
            <div className="metric-cell">
              <div className="metric-label">Potion cost/hr</div>
              <div className="metric-val negative-num">
                {fmtGp(metrics.potionCostPerHour)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cannon details */}
      {task.useCannon && task.cannonballsPerHour > 0 && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2>Cannon</h2>
          <div className="kv-row">
            <span className="kv-label">Cannonballs/hr</span>
            <span>{fmtInt(task.cannonballsPerHour)}</span>
          </div>
          {metrics?.cannonCostPerHour > 0 && (
            <div className="kv-row">
              <span className="kv-label">Cannon cost/hr</span>
              <span className="negative-num">{fmtGp(metrics.cannonCostPerHour)}</span>
            </div>
          )}
        </div>
      )}

      <div className="panel" style={{ marginTop: "1rem" }}>
        <h2>Loot Configuration</h2>
        {metrics?.usingManualGp && (
          <p className="field-hint accent-num" style={{ marginBottom: "0.5rem" }}>
            * Using manual GP/kill override: {fmtGp(task.manualGpPerKill)}/kill
          </p>
        )}
        <LootTable
          key={`${task.id}-loot`}
          monsterId={task.monsterId}
          gameData={gameData}
          lootPick={task.lootPick ?? {}}
          lootMinGpPerItem={task.lootMinGpPerItem ?? 0}
          kcPerHour={task.kcPerHour}
          onChange={handleLootChange}
          dimmed={metrics?.usingManualGp}
        />
      </div>

      {task.loadoutLinks?.length > 0 && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2>Loadout Links</h2>
          <ul className="loadout-links-list">
            {task.loadoutLinks.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url.length > 64 ? `${url.slice(0, 61)}…` : url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(task.inventoryCostPerHour > 0 ||
        task.inventoryNotes ||
        task.potions?.length > 0) && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2>Inventory</h2>
          {task.inventoryCostPerHour > 0 && (
            <div className="kv-row">
              <span className="kv-label">Other supply cost/hr</span>
              <span className="negative-num">{fmtGp(task.inventoryCostPerHour)}</span>
            </div>
          )}
          {task.potions?.length > 0 && (
            <div className="potion-detail-list">
              {task.potions.map((p, i) => {
                const gphr = potionGpPerHour(p);
                return (
                  <div key={p.id ?? i} className="kv-row">
                    <span className="kv-label">{p.name || "Potion"}</span>
                    <span className="negative-num">
                      {gphr > 0 ? fmtGp(gphr) : "—"}/hr
                    </span>
                  </div>
                );
              })}
              {metrics?.potionCostPerHour > 0 && (
                <div className="kv-row kv-row-total">
                  <span className="kv-label">Potions total</span>
                  <span className="negative-num">
                    {fmtGp(metrics.potionCostPerHour)}/hr
                  </span>
                </div>
              )}
            </div>
          )}
          {task.inventoryNotes && (
            <p className="muted" style={{ marginTop: "0.45rem" }}>
              {task.inventoryNotes}
            </p>
          )}
        </div>
      )}

      {task.notes && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <h2>Notes</h2>
          <p className="muted">{task.notes}</p>
        </div>
      )}
    </div>
  );
}
