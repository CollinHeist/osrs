import { useMemo, useState, useCallback } from "react";
import "./App.css";
import { useGameData } from "./hooks/useGameData.js";
import { meleeCombatSnapshot } from "./engine/melee.js";
import {
  SLOTS,
  sumMeleeEquipment,
  itemsToMap,
} from "./lib/equipment.js";
import {
  enumerateLoadouts,
  loadoutCost,
  precomputeTopMeleeBySlot,
} from "./lib/optimize.js";
import { monsterForCombat } from "./lib/normalizeData.js";
import { getFlattenedLootRows } from "./lib/loot.js";
import { MonsterSearch } from "./components/MonsterSearch.jsx";
import { ItemSlotPicker } from "./components/ItemSlotPicker.jsx";

/** Default loadout — OSRS item ids */
const DEFAULT_EQUIP = {
  head: "3751",
  cape: "6570",
  neck: "1706",
  ammo: null,
  weapon: "1333",
  body: "10551",
  shield: "12954",
  legs: "21304",
  hands: "7462",
  feet: "11840",
  ring: "6737",
};

function fmtNum(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}

function fmtInt(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

export default function App() {
  const data = useGameData();
  const itemsById = useMemo(() => itemsToMap(data.items), [data.items]);

  const itemsBySlot = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const o = Object.fromEntries(SLOTS.map((s) => [s, []]));
    for (const it of data.items) {
      const sl = it.slot;
      if (o[sl]) o[sl].push(it);
    }
    return o;
  }, [data.items]);

  const topMeleeBySlot = useMemo(
    () => precomputeTopMeleeBySlot(data.items, SLOTS, 40),
    [data.items]
  );

  const [monsterId, setMonsterId] = useState(undefined);
  const [attackLevel, setAttackLevel] = useState(80);
  const [strengthLevel, setStrengthLevel] = useState(80);
  const [defenceLevel, setDefenceLevel] = useState(70);
  const [meleeStyle, setMeleeStyle] = useState("aggressive");
  const [hitStyle, setHitStyle] = useState("slash");
  const [piety, setPiety] = useState(true);
  const [superCombat, setSuperCombat] = useState(true);
  const [equip, setEquip] = useState(() => ({ ...DEFAULT_EQUIP }));
  /** Explicit `false` = not owned */
  const [owned, setOwned] = useState(() => ({}));
  const [budgetGp, setBudgetGp] = useState(50_000_000);
  const [betweenKillSec, setBetweenKillSec] = useState(3);
  const [optimizeSlots, setOptimizeSlots] = useState(() => ({
    weapon: true,
    body: true,
    head: false,
    feet: false,
    ring: false,
    neck: false,
    cape: false,
    shield: false,
    legs: false,
    hands: false,
    ammo: false,
  }));
  const [maxCombinations, setMaxCombinations] = useState(800);
  const [optResults, setOptResults] = useState([]);
  const [sortKey, setSortKey] = useState("dps");
  const [sortDir, setSortDir] = useState(-1);
  /** monsterId string → rowKey → included */
  const [lootPick, setLootPick] = useState(() => ({}));
  const [lootMinEv, setLootMinEv] = useState(0);

  const defaultMonsterId = useMemo(() => {
    if (!data.monsters.length) return undefined;
    if (!Array.isArray(data.loot)) return data.monsters[0].id;
    const lootIds = new Set(data.loot.map((e) => e.id));
    const hit = data.monsters.find((m) => lootIds.has(m.id));
    return hit?.id ?? data.monsters[0].id;
  }, [data.monsters, data.loot]);

  const activeMonsterId = monsterId ?? defaultMonsterId;

  const monsterRaw = useMemo(
    () =>
      data.monsters.find(
        (m) => m.id === activeMonsterId || String(m.id) === String(activeMonsterId)
      ) ?? null,
    [data.monsters, activeMonsterId]
  );

  const monster = useMemo(
    () => monsterForCombat(monsterRaw),
    [monsterRaw]
  );

  const flatLoot = useMemo(
    () => getFlattenedLootRows(data.loot, activeMonsterId, data.priceById),
    [data.loot, activeMonsterId, data.priceById]
  );

  const lootDefined = useMemo(() => {
    if (!data.loot) return false;
    if (Array.isArray(data.loot)) {
      return data.loot.some(
        (e) => e.id === activeMonsterId || String(e.id) === String(activeMonsterId)
      );
    }
    return !!(
      data.loot[String(activeMonsterId)] ?? data.loot[activeMonsterId]
    );
  }, [data.loot, activeMonsterId]);

  const monsterKey = String(activeMonsterId);

  const rowIncluded = useCallback(
    (rowKey, rowEv) => {
      const v = lootPick[monsterKey]?.[rowKey];
      if (v === undefined) return rowEv >= lootMinEv;
      return !!v;
    },
    [lootPick, monsterKey, lootMinEv]
  );

  const lootEvPerKill = useMemo(() => {
    let s = 0;
    for (const row of flatLoot) {
      if (rowIncluded(row.key, row.evGp)) s += row.evGp;
    }
    return s;
  }, [flatLoot, rowIncluded]);

  const prayerMults = useMemo(
    () =>
      piety
        ? { att: 1.2, str: 1.23, def: 1.2 }
        : { att: 1, str: 1, def: 1 },
    [piety]
  );

  const potionAdds = useMemo(
    () =>
      superCombat
        ? { att: 5, str: 5, def: 5 }
        : { att: 0, str: 0, def: 0 },
    [superCombat]
  );

  const combatParams = useMemo(
    () => ({
      attackLevel,
      strengthLevel,
      defenceLevel,
      meleeStyle,
      hitStyle,
      prayerMults,
      potionAdds,
      monster,
    }),
    [
      attackLevel,
      strengthLevel,
      defenceLevel,
      meleeStyle,
      hitStyle,
      prayerMults,
      potionAdds,
      monster,
    ]
  );

  const baseBonuses = useMemo(
    () => sumMeleeEquipment(equip, itemsById),
    [equip, itemsById]
  );

  const baseSnap = useMemo(
    () =>
      monster
        ? meleeCombatSnapshot({
            ...combatParams,
            equipment: baseBonuses,
          })
        : null,
    [combatParams, baseBonuses, monster]
  );

  const killCycleSec = baseSnap
    ? baseSnap.ttkSeconds + betweenKillSec
    : null;
  const killsPerHour =
    killCycleSec && killCycleSec > 0 ? 3600 / killCycleSec : 0;
  const gpPerHour = killsPerHour * lootEvPerKill;

  const toggleLootRow = (rowKey) => {
    setLootPick((prev) => {
      const cur = { ...(prev[monsterKey] ?? {}) };
      const row = flatLoot.find((r) => r.key === rowKey);
      const def = row ? row.evGp >= lootMinEv : true;
      const effective = cur[rowKey] !== undefined ? !!cur[rowKey] : def;
      return {
        ...prev,
        [monsterKey]: { ...cur, [rowKey]: !effective },
      };
    });
  };

  const applyLootThreshold = () => {
    setLootPick((prev) => {
      const next = { ...(prev[monsterKey] ?? {}) };
      for (const row of flatLoot) {
        next[row.key] = row.evGp >= lootMinEv;
      }
      return { ...prev, [monsterKey]: next };
    });
  };

  const setSlotItem = (slot, id) => {
    setEquip((e) => ({ ...e, [slot]: id || null }));
  };

  const toggleOwned = (itemId) => {
    const id = String(itemId);
    setOwned((o) => {
      const cur = o[id] !== false;
      return { ...o, [id]: !cur };
    });
  };

  const toggleOptSlot = (slot) => {
    setOptimizeSlots((o) => ({ ...o, [slot]: !o[slot] }));
  };

  const runOptimize = useCallback(() => {
    if (!monster || !data.items.length) return;
    const slotsToVary = SLOTS.filter((s) => optimizeSlots[s]);
    if (!slotsToVary.length) {
      setOptResults([]);
      return;
    }
    /** @type {Record<string, string[]>} */
    const candidatesBySlot = {};
    for (const slot of slotsToVary) {
      const basePool = topMeleeBySlot[slot] ?? [];
      const pool = [
        ...new Set([equip[slot], ...basePool].filter(Boolean)),
      ];
      const filtered = pool.filter(
        (id) => owned[id] !== false || (data.priceById[id] ?? 0) <= budgetGp
      );
      candidatesBySlot[slot] = filtered.length ? filtered : pool;
    }
    const rows = enumerateLoadouts({
      baseEquip: equip,
      slotsToVary,
      candidatesBySlot,
      itemsById,
      priceById: data.priceById,
      owned,
      budgetGp,
      maxCombinations,
      combatParams,
    });
    const baseDps = baseSnap?.dps ?? 0;
    const enriched = rows.map((r) => {
      const kph =
        r.ttkSeconds + betweenKillSec > 0
          ? 3600 / (r.ttkSeconds + betweenKillSec)
          : 0;
      const gphr = kph * lootEvPerKill;
      const dpsGain = r.dps - baseDps;
      const value =
        r.costGp > 0 ? dpsGain / (r.costGp / 1e6) : dpsGain > 0 ? Infinity : 0;
      return { ...r, kph, gphr, dpsGain, value };
    });
    setOptResults(enriched);
  }, [
    monster,
    data.items,
    data.priceById,
    optimizeSlots,
    equip,
    itemsById,
    owned,
    budgetGp,
    maxCombinations,
    combatParams,
    baseSnap,
    betweenKillSec,
    lootEvPerKill,
    topMeleeBySlot,
  ]);

  const sortedResults = useMemo(() => {
    const arr = [...optResults];
    const m = {
      dps: (r) => r.dps,
      cost: (r) => r.costGp,
      ttk: (r) => r.ttkSeconds,
      value: (r) => r.value,
      gphr: (r) => r.gphr,
    };
    const f = m[sortKey] ?? m.dps;
    arr.sort((a, b) => sortDir * (f(a) - f(b)));
    return arr;
  }, [optResults, sortKey, sortDir]);

  const bestId = useMemo(() => {
    if (!sortedResults.length) return -1;
    let best = 0;
    for (let i = 1; i < sortedResults.length; i++) {
      if (sortedResults[i].dps > sortedResults[best].dps) best = i;
    }
    return best;
  }, [sortedResults]);

  const cycleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(key === "cost" || key === "ttk" ? 1 : -1);
    }
  };

  if (data.loading) {
    return (
      <div className="app app--loading">
        <div className="loading-card">
          <div className="loading-pulse" />
          <p>Loading game data…</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="app">
        <div className="error-banner">Failed to load data: {data.error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div>
          <a className="home" href="../index.html">
            ← All tools
          </a>
          <h1>Gear simulator</h1>
          <p className="sub">
            Melee DPS &amp; time-to-kill from stats, prayers, and equipment —
            optimize upgrades with ownership + budget. Loot value uses bundled
            prices.
          </p>
        </div>
      </header>

      <section className="target-bar glass">
        <MonsterSearch
          monsters={data.monsters}
          value={activeMonsterId}
          onChange={setMonsterId}
        />
        {monsterRaw && (
          <div className="monster-pill">
            <strong>HP</strong> {monsterRaw.skills?.hp ?? "—"} ·{" "}
            <strong>Def lvl</strong> {monsterRaw.skills?.def ?? "—"} ·{" "}
            <strong>Stab / Slash / Crush</strong>{" "}
            {monsterRaw.defensive?.stab ?? 0} /{" "}
            {monsterRaw.defensive?.slash ?? 0} /{" "}
            {monsterRaw.defensive?.crush ?? 0}
          </div>
        )}
      </section>

      {baseSnap && (
        <section className="live-strip glass" aria-live="polite">
          <div>
            <div className="metric-label">DPS</div>
            <div className="metric-val accent">{fmtNum(baseSnap.dps, 3)}</div>
            <div className="metric-sub">expected / sec</div>
          </div>
          <div>
            <div className="metric-label">TTK</div>
            <div className="metric-val">{fmtNum(baseSnap.ttkSeconds, 1)}s</div>
            <div className="metric-sub">
              ~{fmtNum(baseSnap.ttkSeconds / 0.6, 1)} ticks
            </div>
          </div>
          <div>
            <div className="metric-label">Hit chance</div>
            <div className="metric-val">
              {fmtNum(baseSnap.hitChance * 100, 1)}%
            </div>
            <div className="metric-sub">max {baseSnap.maxHit}</div>
          </div>
          <div>
            <div className="metric-label">Kills / hr</div>
            <div className="metric-val">{fmtInt(killsPerHour)}</div>
            <div className="metric-sub">incl. {betweenKillSec}s wait</div>
          </div>
          <div>
            <div className="metric-label">GP / kill</div>
            <div className="metric-val">{fmtInt(lootEvPerKill)}</div>
            <div className="metric-sub">selected loot EV</div>
          </div>
          <div>
            <div className="metric-label">GP / hr</div>
            <div className="metric-val">{fmtInt(gpPerHour)}</div>
            <div className="metric-sub">loot only</div>
          </div>
        </section>
      )}

      <div className="layout-grid">
        <div>
          <section className="panel glass">
            <h2>Player &amp; style</h2>
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
                <select
                  value={meleeStyle}
                  onChange={(e) => setMeleeStyle(e.target.value)}
                >
                  <option value="accurate">Accurate</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="defensive">Defensive</option>
                  <option value="controlled">Controlled</option>
                </select>
              </div>
              <div className="field">
                <label>Hit style</label>
                <select
                  value={hitStyle}
                  onChange={(e) => setHitStyle(e.target.value)}
                >
                  <option value="slash">Slash</option>
                  <option value="stab">Stab</option>
                  <option value="crush">Crush</option>
                </select>
              </div>
              <div className="field">
                <label>Wait (s/kill)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={betweenKillSec}
                  onChange={(e) => setBetweenKillSec(+e.target.value)}
                />
              </div>
            </div>
            <div className="row-chips">
              <label className="chip">
                <input
                  type="checkbox"
                  checked={piety}
                  onChange={() => setPiety((p) => !p)}
                />
                Piety
              </label>
              <label className="chip">
                <input
                  type="checkbox"
                  checked={superCombat}
                  onChange={() => setSuperCombat((p) => !p)}
                />
                Super combat (+5)
              </label>
            </div>
          </section>

          <section className="panel glass">
            <h2>Equipment</h2>
            <p className="muted tight">
              Search by item name (large database). Toggle <strong>Owned</strong>{" "}
              if you still need to buy that piece (uses GE value from data).
            </p>
            <div className="slot-stack">
              {SLOTS.map((slot) => (
                <div className="slot-block" key={slot}>
                  <ItemSlotPicker
                    slot={slot}
                    value={equip[slot] ?? null}
                    onChange={(id) => setSlotItem(slot, id)}
                    itemsById={itemsById}
                    slotItems={itemsBySlot[slot] ?? []}
                  />
                  {equip[slot] && (
                    <label className="own-slot">
                      <input
                        type="checkbox"
                        checked={owned[equip[slot]] !== false}
                        onChange={() => toggleOwned(equip[slot])}
                      />
                      <span>Owned</span>
                      <span className="own-price">
                        {fmtInt(data.priceById[equip[slot]] ?? 0)} GP
                      </span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="muted tight" style={{ marginTop: "0.75rem" }}>
              Loadout cost (unowned only):{" "}
              <strong className="accent-num">
                {fmtInt(loadoutCost(equip, data.priceById, owned))} GP
              </strong>
            </p>
          </section>

          <section className="panel glass">
            <h2>Optimize gear</h2>
            <p className="muted tight">
              Slots checked are varied using top melee-scored items in each slot.
              Unowned items above per-item budget are excluded; total unowned
              spend must stay within budget.
            </p>
            <div className="row-chips" style={{ marginBottom: "0.75rem" }}>
              {SLOTS.map((slot) => (
                <label className="chip" key={slot}>
                  <input
                    type="checkbox"
                    checked={!!optimizeSlots[slot]}
                    onChange={() => toggleOptSlot(slot)}
                  />
                  {slot}
                </label>
              ))}
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Budget (GP)</label>
                <input
                  type="number"
                  min={0}
                  step={100_000}
                  value={budgetGp}
                  onChange={(e) => setBudgetGp(+e.target.value)}
                />
              </div>
              <div className="field">
                <label>Max combinations</label>
                <input
                  type="number"
                  min={50}
                  max={20000}
                  step={50}
                  value={maxCombinations}
                  onChange={(e) => setMaxCombinations(+e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "0.75rem" }}
              onClick={runOptimize}
            >
              Run simulation
            </button>
          </section>

          {optResults.length > 0 && (
            <section className="panel glass">
              <h2>Results ({optResults.length})</h2>
              <div className="table-wrap">
                <table className="results">
                  <thead>
                    <tr>
                      <th onClick={() => cycleSort("dps")}>Loadout</th>
                      <th onClick={() => cycleSort("dps")}>DPS</th>
                      <th onClick={() => cycleSort("ttk")}>TTK s</th>
                      <th onClick={() => cycleSort("gphr")}>GP/hr</th>
                      <th onClick={() => cycleSort("value")}>ΔDPS/MGP</th>
                      <th onClick={() => cycleSort("cost")}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((r, i) => (
                      <tr key={i} className={i === bestId ? "best" : ""}>
                        <td>
                          {SLOTS.filter((s) => optimizeSlots[s])
                            .map((s) => itemsById[r.equip[s]]?.name ?? r.equip[s])
                            .join(" · ")}
                        </td>
                        <td>{fmtNum(r.dps, 3)}</td>
                        <td>{fmtNum(r.ttkSeconds, 1)}</td>
                        <td>{fmtInt(r.gphr)}</td>
                        <td>
                          {!Number.isFinite(r.value)
                            ? "∞"
                            : fmtNum(r.value, 3)}
                        </td>
                        <td>{fmtInt(r.costGp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <aside>
          <section className="panel glass">
            <h2>Loot</h2>
            <p className="muted tight">
              Expected GP per kill uses drop rate × mean quantity × item value
              from <code>prices.json</code>. Toggle rows to include in totals.
            </p>
            {!lootDefined ? (
              <p className="muted">No loot table for this monster.</p>
            ) : (
              <>
                <div className="loot-toolbar">
                  <div className="field inline">
                    <label>Min EV (GP/kill)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={lootMinEv}
                      onChange={(e) => setLootMinEv(+e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={applyLootThreshold}
                  >
                    Apply threshold
                  </button>
                </div>
                <div className="table-wrap loot-table-wrap">
                  <table className="loot-table">
                    <thead>
                      <tr>
                        <th>Use</th>
                        <th>Table</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>P(drop)</th>
                        <th>Unit</th>
                        <th>EV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatLoot.map((row) => {
                        const on = rowIncluded(row.key, row.evGp);
                        const below = row.evGp < lootMinEv;
                        return (
                          <tr
                            key={row.key}
                            className={
                              below && !on ? "loot-row-dim" : undefined
                            }
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggleLootRow(row.key)}
                              />
                            </td>
                            <td className="loot-tn">{row.tableName}</td>
                            <td>
                              <span className="loot-name">{row.name}</span>
                              <span className="loot-id">{row.itemId}</span>
                            </td>
                            <td>{fmtNum(row.avgQty, 2)}</td>
                            <td>{fmtNum(row.pDrop * 100, 2)}%</td>
                            <td>{fmtInt(row.unitPrice)}</td>
                            <td className="loot-ev">{fmtInt(row.evGp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      <footer className="footer-note">
        Phase 1: melee only; wiki-style hit rolls. Data schema v
        {data.meta?.schemaVersion ?? "?"} — prices from bundled snapshot (
        <code>value</code> field). Loot EV is a simple per-row model (not full
        nested table logic). Not affiliated with Jagex.{" "}
        <a href="legacy.html">Legacy manual DPS tool</a>.
      </footer>
    </div>
  );
}
