import { useMemo, useState } from "react";
import { SLAYER_MASTERS, CANNONBALL_GP } from "../lib/constants.js";
import { getFlattenedLootRows } from "../lib/loot.js";
import { fmtGp, fmtInt } from "../lib/format.js";
import { MonsterSearch } from "./MonsterSearch.jsx";
import { LootTable } from "./LootTable.jsx";
import { PotionList } from "./PotionList.jsx";

function initDraft(initialTask) {
  if (!initialTask) {
    return {
      monsterId: null,
      monsterName: "",
      location: "",
      taskLength: "",
      slayerMaster: "Duradel",
      kcPerHour: "",
      slayerXpPerHour: "",
      combatXpPerHour: "",
      inventoryCostPerHour: "",
      inventoryNotes: "",
      useCannon: false,
      cannonballsPerHour: "",
      potions: [],
      loadoutLinks: [],
      lootMinGpPerItem: 1000,
      lootPick: {},
      manualGpPerKill: "",
      notes: "",
    };
  }
  return {
    monsterId: initialTask.monsterId ?? null,
    monsterName: initialTask.monsterName ?? "",
    location: initialTask.location ?? "",
    taskLength: String(initialTask.taskLength ?? ""),
    slayerMaster: initialTask.slayerMaster ?? "Duradel",
    kcPerHour: String(initialTask.kcPerHour ?? ""),
    slayerXpPerHour: String(initialTask.slayerXpPerHour ?? ""),
    combatXpPerHour: String(initialTask.combatXpPerHour ?? ""),
    inventoryCostPerHour: String(initialTask.inventoryCostPerHour ?? ""),
    inventoryNotes: initialTask.inventoryNotes ?? "",
    useCannon: initialTask.useCannon ?? false,
    cannonballsPerHour: String(initialTask.cannonballsPerHour ?? ""),
    potions: initialTask.potions ?? [],
    loadoutLinks: initialTask.loadoutLinks ?? [],
    lootMinGpPerItem: initialTask.lootMinGpPerItem ?? 1000,
    lootPick: initialTask.lootPick ?? {},
    manualGpPerKill: String(initialTask.manualGpPerKill ?? ""),
    notes: initialTask.notes ?? "",
  };
}

/**
 * @param {object} props
 * @param {object | null} props.initialTask
 * @param {{ monsters: any[], loot: any[], priceById: Record<string, number> }} props.gameData
 * @param {(data: object) => void} props.onSave
 * @param {() => void} props.onCancel
 */
export function TaskForm({ initialTask, gameData, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => initDraft(initialTask));
  const [linkInput, setLinkInput] = useState("");
  const [errors, setErrors] = useState({});

  // DPS helper — local state, not persisted
  const [dpsInput, setDpsInput] = useState("");
  const [xpPerKillInput, setXpPerKillInput] = useState("");

  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  }

  function handleMonsterChange(id) {
    const monster = gameData.monsters.find((m) => m.id === id);
    setDraft((d) => ({
      ...d,
      monsterId: id,
      monsterName: monster?.name ?? "",
      lootPick: {},
    }));
    if (errors.monsterId) setErrors((e) => ({ ...e, monsterId: null }));
  }

  function handleLootChange({ lootPick, lootMinGpPerItem }) {
    setDraft((d) => ({ ...d, lootPick, lootMinGpPerItem }));
  }

  function addLink() {
    const url = linkInput.trim();
    if (!url) return;
    setDraft((d) => ({ ...d, loadoutLinks: [...d.loadoutLinks, url] }));
    setLinkInput("");
  }

  function removeLink(i) {
    setDraft((d) => ({
      ...d,
      loadoutLinks: d.loadoutLinks.filter((_, j) => j !== i),
    }));
  }

  function validate() {
    const errs = {};
    if (!draft.monsterId) errs.monsterId = "Select a monster";
    if (!draft.taskLength || Number(draft.taskLength) <= 0)
      errs.taskLength = "Enter a positive number";
    if (!draft.kcPerHour || Number(draft.kcPerHour) <= 0)
      errs.kcPerHour = "Enter a positive number";
    if (!draft.slayerXpPerHour || Number(draft.slayerXpPerHour) <= 0)
      errs.slayerXpPerHour = "Enter a positive number";
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave({
      monsterId: draft.monsterId,
      monsterName: draft.monsterName,
      location: draft.location,
      taskLength: parseInt(draft.taskLength),
      slayerMaster: draft.slayerMaster,
      kcPerHour: parseFloat(draft.kcPerHour),
      slayerXpPerHour: parseFloat(draft.slayerXpPerHour),
      combatXpPerHour: parseFloat(draft.combatXpPerHour) || 0,
      inventoryCostPerHour: parseFloat(draft.inventoryCostPerHour) || 0,
      inventoryNotes: draft.inventoryNotes,
      useCannon: draft.useCannon,
      cannonballsPerHour: parseFloat(draft.cannonballsPerHour) || 0,
      potions: draft.potions,
      loadoutLinks: draft.loadoutLinks,
      lootMinGpPerItem: draft.lootMinGpPerItem,
      lootPick: draft.lootPick,
      manualGpPerKill: parseFloat(draft.manualGpPerKill) || 0,
      notes: draft.notes,
    });
  }

  // DPS helper calculations
  const selectedMonster = useMemo(
    () => gameData.monsters.find((m) => m.id === draft.monsterId) ?? null,
    [gameData.monsters, draft.monsterId]
  );
  const monsterHp = selectedMonster
    ? (selectedMonster.skills?.hp ?? selectedMonster.hp ?? null)
    : null;

  const dpsNum = parseFloat(dpsInput) || 0;
  const xpPerKillNum = parseFloat(xpPerKillInput) || 0;
  const approxKcHr =
    dpsNum > 0 && monsterHp ? Math.round((dpsNum * 3600) / monsterHp) : null;
  const approxSlayerXpHr =
    approxKcHr && xpPerKillNum ? Math.round(xpPerKillNum * approxKcHr) : null;

  function applyDpsHelper() {
    if (approxKcHr) set("kcPerHour", String(approxKcHr));
    if (approxSlayerXpHr) set("slayerXpPerHour", String(approxSlayerXpHr));
  }

  // Check if loot data exists for the selected monster
  const flatLoot = useMemo(
    () =>
      draft.monsterId
        ? getFlattenedLootRows(gameData.loot, draft.monsterId, gameData.priceById)
        : [],
    [gameData.loot, gameData.priceById, draft.monsterId]
  );
  const hasLootData = flatLoot.length > 0;

  const kcPerHourNum = parseFloat(draft.kcPerHour) || 0;
  const cannonCostPerHr =
    draft.useCannon ? (parseFloat(draft.cannonballsPerHour) || 0) * CANNONBALL_GP : 0;
  const manualGpNum = parseFloat(draft.manualGpPerKill) || 0;

  return (
    <div className="task-form">
      <div className="task-form-header">
        <h2>{initialTask ? "Edit Task" : "Log New Task"}</h2>
        <button type="button" className="btn-icon" onClick={onCancel}>
          ×
        </button>
      </div>

      <div className="task-form-body">
        {/* ── Monster & Assignment ── */}
        <section className="form-section">
          <h3 className="form-section-title">Monster &amp; Assignment</h3>
          <div className={errors.monsterId ? "field-error" : ""}>
            <MonsterSearch
              monsters={gameData.monsters}
              value={draft.monsterId}
              onChange={handleMonsterChange}
              label="Monster *"
            />
            {errors.monsterId && (
              <span className="field-error-msg">{errors.monsterId}</span>
            )}
          </div>

          <div className="field-grid" style={{ marginTop: "0.85rem" }}>
            <div className="field">
              <label>Slayer Master</label>
              <select
                value={draft.slayerMaster}
                onChange={(e) => set("slayerMaster", e.target.value)}
              >
                {SLAYER_MASTERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className={`field${errors.taskLength ? " field-has-error" : ""}`}>
              <label>Task Length (kills) *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={draft.taskLength}
                onChange={(e) => set("taskLength", e.target.value)}
              />
              {errors.taskLength && (
                <span className="field-error-msg">{errors.taskLength}</span>
              )}
            </div>
            <div className="field">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. Slayer Tower, Catacombs…"
                value={draft.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Rates ── */}
        <section className="form-section">
          <h3 className="form-section-title">Rates</h3>
          <div className="field-grid">
            <div className={`field${errors.kcPerHour ? " field-has-error" : ""}`}>
              <label>KC/hr *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={draft.kcPerHour}
                onChange={(e) => set("kcPerHour", e.target.value)}
              />
              {errors.kcPerHour && (
                <span className="field-error-msg">{errors.kcPerHour}</span>
              )}
            </div>
            <div className={`field${errors.slayerXpPerHour ? " field-has-error" : ""}`}>
              <label>Slayer XP/hr *</label>
              <input
                type="number"
                min="0"
                step="100"
                value={draft.slayerXpPerHour}
                onChange={(e) => set("slayerXpPerHour", e.target.value)}
              />
              {errors.slayerXpPerHour && (
                <span className="field-error-msg">{errors.slayerXpPerHour}</span>
              )}
            </div>
            <div className="field">
              <label>Combat XP/hr</label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Optional"
                value={draft.combatXpPerHour}
                onChange={(e) => set("combatXpPerHour", e.target.value)}
              />
            </div>
          </div>

          {/* DPS helper */}
          {draft.monsterId && monsterHp && (
            <div className="dps-helper">
              <div className="dps-helper-title">
                DPS Helper
                {monsterHp && (
                  <span className="dps-helper-hp">
                    {selectedMonster?.name} — {monsterHp} HP
                  </span>
                )}
              </div>
              <div className="dps-helper-inputs">
                <div className="field">
                  <label>Your DPS</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 4.5"
                    value={dpsInput}
                    onChange={(e) => setDpsInput(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>XP / kill</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 136"
                    value={xpPerKillInput}
                    onChange={(e) => setXpPerKillInput(e.target.value)}
                  />
                </div>
              </div>
              {approxKcHr && (
                <div className="dps-helper-result">
                  <span>≈ <strong>{fmtInt(approxKcHr)}</strong> KC/hr</span>
                  {approxSlayerXpHr && (
                    <span> · <strong>{fmtInt(approxSlayerXpHr)}</strong> Slayer XP/hr</span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginLeft: "0.75rem" }}
                    onClick={applyDpsHelper}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Inventory / Supplies ── */}
        <section className="form-section">
          <h3 className="form-section-title">Inventory &amp; Supplies</h3>
          <div className="field-grid">
            <div className="field">
              <label>Supply Cost/hr (GP)</label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={draft.inventoryCostPerHour}
                onChange={(e) => set("inventoryCostPerHour", e.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ marginTop: "0.65rem" }}>
            <label>Inventory Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. 3 prayer pots, 5 sharks…"
              value={draft.inventoryNotes}
              onChange={(e) => set("inventoryNotes", e.target.value)}
            />
          </div>

          {/* Potions */}
          <PotionList
            potions={draft.potions}
            onChange={(potions) => set("potions", potions)}
          />

          {/* Cannon */}
          <div className="cannon-row" style={{ marginTop: "0.75rem" }}>
            <label className="field-check">
              <input
                type="checkbox"
                checked={draft.useCannon}
                onChange={(e) => set("useCannon", e.target.checked)}
              />
              Use dwarf multicannon
            </label>
          </div>
          {draft.useCannon && (
            <div className="field-grid" style={{ marginTop: "0.5rem" }}>
              <div className="field">
                <label>Cannonballs / hr</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g. 2160"
                  value={draft.cannonballsPerHour}
                  onChange={(e) => set("cannonballsPerHour", e.target.value)}
                />
                {cannonCostPerHr > 0 && (
                  <span className="field-hint negative-num">
                    {fmtGp(cannonCostPerHr)}/hr cannon cost
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── Loadout Links ── */}
        <section className="form-section">
          <h3 className="form-section-title">Loadout Links</h3>
          <div className="link-input-row">
            <input
              type="url"
              placeholder="OSRS DPS Calculator URL…"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
            />
            <button type="button" className="btn-secondary" onClick={addLink}>
              Add
            </button>
          </div>
          {draft.loadoutLinks.length > 0 && (
            <ul className="link-list">
              {draft.loadoutLinks.map((url, i) => (
                <li key={i} className="link-item">
                  <a href={url} target="_blank" rel="noreferrer" title={url}>
                    {url.length > 55 ? `${url.slice(0, 52)}…` : url}
                  </a>
                  <button
                    type="button"
                    className="btn-icon btn-icon-sm"
                    onClick={() => removeLink(i)}
                    title="Remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Loot Configuration ── */}
        {draft.monsterId && (
          <section className="form-section">
            <h3 className="form-section-title">Loot Configuration</h3>

            {/* Manual GP/kill override */}
            <div className="field" style={{ marginBottom: "0.85rem" }}>
              <label>Manual GP / kill override</label>
              <input
                type="number"
                min="0"
                placeholder={
                  hasLootData
                    ? "Leave blank to use loot table below"
                    : "No loot data — enter approx GP/kill"
                }
                value={draft.manualGpPerKill}
                onChange={(e) => set("manualGpPerKill", e.target.value)}
              />
              {manualGpNum > 0 && (
                <span className="field-hint accent-num">
                  Overrides loot table · {fmtGp(manualGpNum * kcPerHourNum)}/hr at {fmtInt(kcPerHourNum)} KC/hr
                </span>
              )}
              {!hasLootData && manualGpNum === 0 && (
                <span className="field-hint">
                  No loot data available for this monster
                </span>
              )}
            </div>

            {hasLootData && (
              <LootTable
                key={`form-loot-${draft.monsterId}`}
                monsterId={draft.monsterId}
                gameData={gameData}
                lootPick={draft.lootPick}
                lootMinGpPerItem={draft.lootMinGpPerItem}
                kcPerHour={kcPerHourNum}
                onChange={handleLootChange}
                dimmed={manualGpNum > 0}
              />
            )}
          </section>
        )}

        {/* ── Notes ── */}
        <section className="form-section">
          <div className="field">
            <label>Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional notes about this task…"
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          {initialTask ? "Save Changes" : "Log Task"}
        </button>
      </div>
    </div>
  );
}
