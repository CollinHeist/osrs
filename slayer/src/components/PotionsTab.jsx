import { useState } from "react";
import { potionGpPerHour } from "../lib/potion.js";
import { fmtGp } from "../lib/format.js";
import { EditIcon, TrashIcon } from "./Icons.jsx";

function PotionRow({ potion, tasks, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(potion);

  const gphr = potionGpPerHour(potion);
  const usedBy = tasks.filter((t) =>
    (t.potions || []).some((p) => p.globalId === potion.id)
  );

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function save() {
    onUpdate(potion.id, {
      name: draft.name,
      costPerDose: parseFloat(draft.costPerDose) || 0,
      minutesPerDose: parseFloat(draft.minutesPerDose) || 0,
    });
    setEditing(false);
  }

  function cancel() {
    setDraft(potion);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="gpotion-row gpotion-row--editing">
        <input
          type="text"
          className="gpotion-name-input"
          placeholder="Potion name"
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          autoFocus
        />
        <input
          type="number"
          min="0"
          placeholder="GP / dose"
          value={draft.costPerDose}
          onChange={(e) => set("costPerDose", e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder="min / dose"
          value={draft.minutesPerDose}
          onChange={(e) => set("minutesPerDose", e.target.value)}
        />
        <span className="muted" />
        <div className="gpotion-actions">
          <button type="button" className="btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }} onClick={save}>Save</button>
          <button type="button" className="btn-secondary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }} onClick={cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gpotion-row">
      <span className="gpotion-name">{potion.name || <em className="muted">Unnamed</em>}</span>
      <span className="muted">{potion.costPerDose ? fmtGp(potion.costPerDose) : "—"}</span>
      <span className="muted">{potion.minutesPerDose ? `${potion.minutesPerDose} min` : "—"}</span>
      <span className={gphr > 0 ? "negative-num" : "muted"} style={{ fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
        {gphr > 0 ? `${fmtGp(gphr)}/hr` : "—"}
      </span>
      <div className="gpotion-actions">
        {usedBy.length > 0 && (
          <span className="gpotion-used-by muted" title={usedBy.map((t) => t.monsterName).join(", ")}>
            {usedBy.length} task{usedBy.length !== 1 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          className="btn-icon btn-icon-edit"
          title="Edit"
          onClick={() => { setDraft(potion); setEditing(true); }}
        >
          <EditIcon size={13} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-delete"
          title="Delete"
          onClick={() => {
            const msg = usedBy.length
              ? `"${potion.name}" is used by ${usedBy.length} task(s). Delete anyway?`
              : `Delete "${potion.name}"?`;
            if (window.confirm(msg)) onDelete(potion.id);
          }}
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   globalPotions: object[];
 *   tasks: object[];
 *   onAdd: () => void;
 *   onUpdate: (id: string, changes: object) => void;
 *   onDelete: (id: string) => void;
 * }} props
 */
export function PotionsTab({ globalPotions, tasks, onAdd, onUpdate, onDelete }) {
  return (
    <div className="potions-tab">
      <div className="potions-tab-header">
        <div>
          <h2 style={{ marginBottom: "0.25rem" }}>Potion Library</h2>
          <p className="muted" style={{ fontSize: "0.83rem" }}>
            Define potions once and add them to any task loadout. Updating the cost or
            duration here automatically recalculates GP/hr for every task that uses it.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onAdd}>
          + Add Potion
        </button>
      </div>

      {globalPotions.length === 0 ? (
        <div className="task-list-empty">
          <p>No potions in the library yet.</p>
          <p className="muted">Add a potion above, then attach it to tasks from the task form.</p>
        </div>
      ) : (
        <div className="gpotion-list">
          <div className="gpotion-header">
            <span>Name</span>
            <span>GP / dose</span>
            <span>min / dose</span>
            <span>GP / hr</span>
            <span />
          </div>
          {globalPotions.map((p) => (
            <PotionRow
              key={p.id}
              potion={p}
              tasks={tasks}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
