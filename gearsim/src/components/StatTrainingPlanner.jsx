import { useMemo, useState } from "react";
import { MonsterSearch } from "./MonsterSearch.jsx";
import { ItemSlotPicker } from "./ItemSlotPicker.jsx";
import { SLOTS, sumMeleeEquipment } from "../lib/equipment.js";
import { monsterForCombat } from "../lib/normalizeData.js";
import { buildAttackStrengthTrainingPlan } from "../lib/statTrainingPlan.js";
import { TrainingProgressCharts } from "./TrainingProgressCharts.jsx";

function fmtNum(n, d = 3) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

/**
 * @param {object} props
 * @param {any[]} props.monsters
 * @param {Record<string, any>} props.itemsById
 * @param {Record<string, any[]>} props.itemsBySlot
 * @param {Record<string, string | null>} props.defaultEquip
 */
export function StatTrainingPlanner({
  monsters,
  itemsById,
  itemsBySlot,
  defaultEquip,
}) {
  const [monsterId, setMonsterId] = useState(monsters[0]?.id);
  const [attackLevel, setAttackLevel] = useState(70);
  const [strengthLevel, setStrengthLevel] = useState(70);
  const [defenceLevel, setDefenceLevel] = useState(70);
  const [meleeStyle, setMeleeStyle] = useState("controlled");
  const [hitStyle, setHitStyle] = useState("slash");
  const [piety, setPiety] = useState(true);
  const [superCombat, setSuperCombat] = useState(true);
  const [goalType, setGoalType] = useState("level");
  const [goalLevel, setGoalLevel] = useState(99);
  const [killCount, setKillCount] = useState(1000);
  const [equip, setEquip] = useState(() => ({ ...defaultEquip }));

  const monsterRaw = useMemo(
    () =>
      monsters.find((m) => m.id === monsterId || String(m.id) === String(monsterId)) ??
      null,
    [monsters, monsterId]
  );
  const monster = useMemo(() => monsterForCombat(monsterRaw), [monsterRaw]);

  const prayerMults = useMemo(
    () => (piety ? { att: 1.2, str: 1.23, def: 1.2 } : { att: 1, str: 1, def: 1 }),
    [piety]
  );
  const potionAdds = useMemo(
    () => (superCombat ? { att: 5, str: 5, def: 5 } : { att: 0, str: 0, def: 0 }),
    [superCombat]
  );

  const equipmentBonuses = useMemo(() => sumMeleeEquipment(equip, itemsById), [equip, itemsById]);

  const plan = useMemo(() => {
    if (!monster) return null;
    return buildAttackStrengthTrainingPlan({
      attackLevel,
      strengthLevel,
      defenceLevel,
      meleeStyle,
      hitStyle,
      prayerMults,
      potionAdds,
      monster,
      equipment: equipmentBonuses,
      goalType,
      goalLevel,
      killCount,
    });
  }, [
    attackLevel,
    strengthLevel,
    defenceLevel,
    meleeStyle,
    hitStyle,
    prayerMults,
    potionAdds,
    monster,
    equipmentBonuses,
    goalType,
    goalLevel,
    killCount,
  ]);

  return (
    <div className="tab-panel">
      <section className="target-bar glass">
        <MonsterSearch monsters={monsters} value={monsterId} onChange={setMonsterId} />
        {monster && (
          <div className="monster-pill">
            <strong>HP</strong> {monster.hp} · <strong>Def lvl</strong> {monster.defLevel} ·{" "}
            <strong>Stab / Slash / Crush</strong> {monster.defStab} / {monster.defSlash} /{" "}
            {monster.defCrush}
          </div>
        )}
      </section>

      <section className="panel glass">
        <h2>Player, goal, and assumptions</h2>
        <div className="field-grid">
          <div className="field">
            <label>Attack</label>
            <input
              type="number"
              min={1}
              max={99}
              value={attackLevel}
              onChange={(e) => setAttackLevel(+e.target.value)}
            />
          </div>
          <div className="field">
            <label>Strength</label>
            <input
              type="number"
              min={1}
              max={99}
              value={strengthLevel}
              onChange={(e) => setStrengthLevel(+e.target.value)}
            />
          </div>
          <div className="field">
            <label>Defence</label>
            <input
              type="number"
              min={1}
              max={99}
              value={defenceLevel}
              onChange={(e) => setDefenceLevel(+e.target.value)}
            />
          </div>
          <div className="field">
            <label>Melee style</label>
            <select value={meleeStyle} onChange={(e) => setMeleeStyle(e.target.value)}>
              <option value="accurate">Accurate</option>
              <option value="aggressive">Aggressive</option>
              <option value="defensive">Defensive</option>
              <option value="controlled">Controlled</option>
            </select>
          </div>
          <div className="field">
            <label>Hit style</label>
            <select value={hitStyle} onChange={(e) => setHitStyle(e.target.value)}>
              <option value="slash">Slash</option>
              <option value="stab">Stab</option>
              <option value="crush">Crush</option>
            </select>
          </div>
          <div className="field">
            <label>Goal mode</label>
            <select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
              <option value="level">Target level (both stats)</option>
              <option value="kills">Kill count budget</option>
            </select>
          </div>
          {goalType === "level" ? (
            <div className="field">
              <label>Target level</label>
              <input
                type="number"
                min={1}
                max={99}
                value={goalLevel}
                onChange={(e) => setGoalLevel(+e.target.value)}
              />
            </div>
          ) : (
            <div className="field">
              <label>Kill count</label>
              <input
                type="number"
                min={1}
                step={1}
                value={killCount}
                onChange={(e) => setKillCount(+e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="row-chips">
          <label className="chip">
            <input type="checkbox" checked={piety} onChange={() => setPiety((v) => !v)} />
            Piety
          </label>
          <label className="chip">
            <input
              type="checkbox"
              checked={superCombat}
              onChange={() => setSuperCombat((v) => !v)}
            />
            Super combat (+5)
          </label>
        </div>
      </section>

      <section className="panel glass">
        <h2>Equipment</h2>
        <p className="muted tight">
          Set your current setup using items from the loaded gearsim `items.json` catalog.
        </p>
        <div className="slot-stack">
          {SLOTS.map((slot) => (
            <div className="slot-block" key={slot}>
              <ItemSlotPicker
                slot={slot}
                value={equip[slot] ?? null}
                onChange={(id) => setEquip((prev) => ({ ...prev, [slot]: id || null }))}
                itemsById={itemsById}
                slotItems={itemsBySlot[slot] ?? []}
              />
            </div>
          ))}
        </div>
      </section>

      {plan && (
        <>
          <section className="panel glass">
            <h2>Recommendation</h2>
            <div className="training-kv-grid">
              <div>
                <span className="training-kv-label">First stat to train</span>
                <strong className="training-kv-value">
                  {plan.firstRecommendation
                    ? plan.firstRecommendation[0].toUpperCase() +
                      plan.firstRecommendation.slice(1)
                    : "—"}
                </strong>
              </div>
              <div>
                <span className="training-kv-label">Start DPS</span>
                <strong className="training-kv-value">{fmtNum(plan.baselineDps, 3)}</strong>
              </div>
              <div>
                <span className="training-kv-label">Final DPS</span>
                <strong className="training-kv-value">{fmtNum(plan.finalDps, 3)}</strong>
              </div>
              <div>
                <span className="training-kv-label">Total DPS gain</span>
                <strong className="training-kv-value">{fmtNum(plan.dpsGainTotal, 3)}</strong>
              </div>
              <div>
                <span className="training-kv-label">Final Attack / Strength</span>
                <strong className="training-kv-value">
                  {plan.finalAttackLevel} / {plan.finalStrengthLevel}
                </strong>
              </div>
              <div>
                <span className="training-kv-label">XP spent</span>
                <strong className="training-kv-value">{fmtInt(plan.xpSpent)}</strong>
              </div>
            </div>
            {goalType === "kills" && (
              <p className="muted tight">
                Planned from {fmtInt(killCount)} kills at ~{fmtInt(plan.xpPerKill)} XP per kill.
                Estimated kills consumed by the selected level-ups:{" "}
                {fmtNum(plan.estimatedKillsUsed, 1)}.
              </p>
            )}
          </section>

          <section className="panel glass">
            <h2>Optimal leveling order</h2>
            <div className="table-wrap">
              <table className="results training-plan-table">
                <thead>
                  <tr>
                    <th>Train</th>
                    <th>Attack</th>
                    <th>Strength</th>
                    <th>DPS before</th>
                    <th>DPS after</th>
                    <th>Δ DPS</th>
                    <th>XP cost</th>
                    <th>Cumulative XP</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.groupedSteps.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="results-empty">
                        No valid level-up steps available for the chosen goal.
                      </td>
                    </tr>
                  ) : (
                    plan.groupedSteps.map((step) => (
                      <tr key={`${step.stepStart}-${step.stepEnd}`}>
                        <td className="training-stat-cell">
                          {step.stat === "attack" ? "Attack" : "Strength"}
                        </td>
                        <td className={step.stat === "attack" ? "training-active-skill" : ""}>
                          {step.attackLevelBefore} → {step.attackLevelAfter}
                        </td>
                        <td className={step.stat === "strength" ? "training-active-skill" : ""}>
                          {step.strengthLevelBefore} → {step.strengthLevelAfter}
                        </td>
                        <td>{fmtNum(step.dpsBefore, 3)}</td>
                        <td>{fmtNum(step.dpsAfter, 3)}</td>
                        <td>{fmtNum(step.dpsGain, 4)}</td>
                        <td>{fmtInt(step.xpCost)}</td>
                        <td>{fmtInt(step.cumulativeXp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <TrainingProgressCharts plan={plan} />
        </>
      )}
    </div>
  );
}
