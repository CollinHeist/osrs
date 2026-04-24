import {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import "./App.css";
import { useGameData } from "./hooks/useGameData.js";
import { meleeCombatSnapshot } from "./engine/melee.js";
import {
  SLOTS,
  sumMeleeEquipment,
  itemsToMap,
  dedupeCosmeticMeleeVariants,
} from "./lib/equipment.js";
import {
  enumerateLoadouts,
  marginalUpgradeCost,
  precomputeTopMeleeBySlot,
} from "./lib/optimize.js";
import { monsterForCombat } from "./lib/normalizeData.js";
import { getFlattenedLootRows } from "./lib/loot.js";
import { sampleDpsForLoadout } from "./engine/simulate.js";
import { MonsterSearch } from "./components/MonsterSearch.jsx";
import { ItemSlotPicker } from "./components/ItemSlotPicker.jsx";
import { DpsDistributionChart } from "./components/DpsDistributionChart.jsx";

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

const TABS = [
  { id: "loadout", label: "Loadout" },
  { id: "target", label: "Target" },
  { id: "results", label: "Results" },
  { id: "equipment", label: "Equipment" },
];

const EQUIPMENT_PREFS_STORAGE_KEY = "gearsim.equipmentPrefs.v1";

function loadEquipmentPrefs() {
  if (typeof localStorage === "undefined") {
    return { excluded: {}, obtained: {} };
  }
  try {
    const raw = localStorage.getItem(EQUIPMENT_PREFS_STORAGE_KEY);
    if (!raw) return { excluded: {}, obtained: {} };
    const j = JSON.parse(raw);
    const excluded = {};
    if (j?.excluded && typeof j.excluded === "object") {
      for (const [k, v] of Object.entries(j.excluded)) {
        if (v) excluded[String(k)] = true;
      }
    }
    const obtained = {};
    if (j?.obtained && typeof j.obtained === "object") {
      for (const [k, v] of Object.entries(j.obtained)) {
        if (v) obtained[String(k)] = true;
      }
    }
    return { excluded, obtained };
  } catch {
    return { excluded: {}, obtained: {} };
  }
}

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

/** Signed delta for compact display (e.g. DPS, TTK). */
function fmtSignedDelta(n, maxFrac) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return (
    sign +
    n.toLocaleString(undefined, {
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: 0,
    })
  );
}

function fmtSignedIntDelta(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return sign + Math.round(n).toLocaleString();
}

/** Wiki-style item version suffix for display (e.g. " (0)"). */
function itemVersionSuffix(it) {
  if (!it || it.version == null) return "";
  const v = String(it.version).trim();
  if (v === "") return "";
  return ` (${v})`;
}

function DpsBreakdown({ title, snap, equip, itemsById }) {
  if (!snap) return null;
  return (
    <div className="dps-breakdown glass">
      <h3>{title}</h3>
      <div className="dps-kv">
        <div>
          Hit chance
          <strong>{fmtNum(snap.hitChance * 100, 2)}%</strong>
        </div>
        <div>
          Max hit
          <strong>{snap.maxHit}</strong>
        </div>
        <div>
          Attack roll
          <strong>{fmtInt(snap.attackRoll)}</strong>
        </div>
        <div>
          Defence roll
          <strong>{fmtInt(snap.defenceRoll)}</strong>
        </div>
        <div>
          Eff. attack (incl. +8)
          <strong>{snap.effectiveAttack}</strong>
        </div>
        <div>
          Eff. strength (incl. +8)
          <strong>{snap.effectiveStrength}</strong>
        </div>
        <div>
          Attack interval
          <strong>{snap.attackIntervalTicks} ticks</strong>
        </div>
        <div>
          Expected DPS
          <strong>{fmtNum(snap.dps, 3)}</strong>
        </div>
        <div>
          TTK (avg)
          <strong>{fmtNum(snap.ttkSeconds, 1)} s</strong>
        </div>
      </div>
      <p className="muted tight" style={{ marginBottom: "0.35rem" }}>
        Gear
      </p>
      <ul className="gear-lineup">
        {SLOTS.map((slot) => {
          const id = equip[slot];
          if (!id) return null;
          const n = itemsById[id]?.name ?? "—";
          return (
            <li key={slot}>
              <span className="muted">{slot}:</span> {n}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function App() {
  const data = useGameData();
  const itemsById = useMemo(() => itemsToMap(data.items), [data.items]);

  /** Catalog for lists / optimizer (drops cosmetic stat-twin variants). */
  const itemsCombatCatalog = useMemo(
    () => dedupeCosmeticMeleeVariants(data.items),
    [data.items]
  );

  const itemsBySlot = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const o = Object.fromEntries(SLOTS.map((s) => [s, []]));
    for (const it of itemsCombatCatalog) {
      const sl = it.slot;
      if (o[sl]) o[sl].push(it);
    }
    return o;
  }, [itemsCombatCatalog]);

  const topMeleeBySlot = useMemo(
    () => precomputeTopMeleeBySlot(itemsCombatCatalog, SLOTS, 40),
    [itemsCombatCatalog]
  );

  const [tab, setTab] = useState("target");
  const [monsterId, setMonsterId] = useState(undefined);
  const [attackLevel, setAttackLevel] = useState(80);
  const [strengthLevel, setStrengthLevel] = useState(80);
  const [defenceLevel, setDefenceLevel] = useState(70);
  const [meleeStyle, setMeleeStyle] = useState("aggressive");
  const [hitStyle, setHitStyle] = useState("slash");
  const [piety, setPiety] = useState(true);
  const [superCombat, setSuperCombat] = useState(true);
  const [equip, setEquip] = useState(() => ({ ...DEFAULT_EQUIP }));
  const [previewEquip, setPreviewEquip] = useState(() => ({ ...DEFAULT_EQUIP }));
  /** item id → true when excluded from optimizer candidate pools */
  const [excludedFromSim, setExcludedFromSim] = useState(
    () => loadEquipmentPrefs().excluded
  );
  /** item id → true when user already owns it (counts as 0 GP for upgrade cost) */
  const [obtainedItems, setObtainedItems] = useState(
    () => loadEquipmentPrefs().obtained
  );
  const [equipmentItemFilter, setEquipmentItemFilter] = useState("");
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
  const [overrideItemFilter, setOverrideItemFilter] = useState("");
  const [optRunStats, setOptRunStats] = useState(() => ({
    totalPossible: 0,
    simulated: 0,
    dpsPassDropped: 0,
  }));
  /** item id → custom GE price (GP) for budget / loadout cost; key absent = use catalog */
  const [priceOverrides, setPriceOverrides] = useState(() => ({}));
  const [sortKey, setSortKey] = useState("dps");
  const [sortDir, setSortDir] = useState(-1);
  const [lootPick, setLootPick] = useState(() => ({}));
  /** Min GE price per item: rows default to "picked up" when unit price ≥ this. */
  const [lootMinGpPerItem, setLootMinGpPerItem] = useState(0);
  const [budgetFieldFocused, setBudgetFieldFocused] = useState(false);
  const [budgetFieldDraft, setBudgetFieldDraft] = useState("");
  /** null = chart base loadout; else equip object for histogram */
  const [chartEquip, setChartEquip] = useState(null);
  const [selectedResultIdx, setSelectedResultIdx] = useState(null);
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
  const [resultItemControlId, setResultItemControlId] = useState(null);
  const [resultItemPopupPos, setResultItemPopupPos] = useState({ x: 0, y: 0 });
  const resultItemPopupRef = useRef(null);

  const allItemsSortedByName = useMemo(() => {
    const arr = Array.isArray(itemsCombatCatalog)
      ? [...itemsCombatCatalog]
      : [];
    arr.sort((a, b) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, {
        sensitivity: "base",
      })
    );
    return arr;
  }, [itemsCombatCatalog]);

  const equipmentListFiltered = useMemo(() => {
    const q = equipmentItemFilter.trim().toLowerCase();
    if (!q) return allItemsSortedByName;
    return allItemsSortedByName.filter((it) => {
      const name = String(it?.name ?? "").toLowerCase();
      const slot = String(it?.slot ?? "").toLowerCase();
      return name.includes(q) || slot.includes(q);
    });
  }, [allItemsSortedByName, equipmentItemFilter]);

  const effectivePriceById = useMemo(() => {
    const out = { ...data.priceById };
    for (const [k, v] of Object.entries(priceOverrides)) {
      if (Number.isFinite(v) && v >= 0) out[String(k)] = v;
    }
    for (const id of Object.keys(obtainedItems)) {
      if (obtainedItems[id]) out[String(id)] = 0;
    }
    return out;
  }, [data.priceById, priceOverrides, obtainedItems]);

  const optimizerCandidateItemIds = useMemo(() => {
    const s = new Set();
    for (const slot of SLOTS) {
      if (!optimizeSlots[slot]) continue;
      if (equip[slot]) s.add(String(equip[slot]));
      for (const id of topMeleeBySlot[slot] ?? []) {
        if (id) s.add(String(id));
      }
    }
    return Array.from(s).sort((a, b) => {
      const na = itemsById[a]?.name ?? "";
      const nb = itemsById[b]?.name ?? "";
      return na.localeCompare(nb);
    });
  }, [optimizeSlots, topMeleeBySlot, equip, itemsById]);

  const filteredOverrideItemIds = useMemo(() => {
    const q = overrideItemFilter.trim().toLowerCase();
    if (!q) return optimizerCandidateItemIds;
    return optimizerCandidateItemIds.filter((id) => {
      const it = itemsById[id];
      const name = String(it?.name ?? "").toLowerCase();
      const slot = String(it?.slot ?? "").toLowerCase();
      return name.includes(q) || slot.includes(q) || id.includes(q);
    });
  }, [overrideItemFilter, optimizerCandidateItemIds, itemsById]);

  const resultItemControl = useMemo(() => {
    if (!resultItemControlId) return null;
    const it = itemsById[resultItemControlId];
    if (!it) return null;
    return {
      id: resultItemControlId,
      item: it,
      catalogGp: data.priceById[resultItemControlId] ?? 0,
      effectiveGp: effectivePriceById[resultItemControlId] ?? 0,
      hasOverride: priceOverrides[resultItemControlId] !== undefined,
      overrideValue: priceOverrides[resultItemControlId],
      excluded: !!excludedFromSim[resultItemControlId],
      owned: !!obtainedItems[resultItemControlId],
    };
  }, [
    resultItemControlId,
    itemsById,
    data.priceById,
    effectivePriceById,
    priceOverrides,
    excludedFromSim,
    obtainedItems,
  ]);

  useEffect(() => {
    if (!resultItemControl) return undefined;
    const onPointerDown = (e) => {
      if (!resultItemPopupRef.current) return;
      if (!resultItemPopupRef.current.contains(e.target)) {
        setResultItemControlId(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setResultItemControlId(null);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [resultItemControl]);

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
        (m) =>
          m.id === activeMonsterId || String(m.id) === String(activeMonsterId)
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
        (e) =>
          e.id === activeMonsterId || String(e.id) === String(activeMonsterId)
      );
    }
    return !!(
      data.loot[String(activeMonsterId)] ?? data.loot[activeMonsterId]
    );
  }, [data.loot, activeMonsterId]);

  const monsterKey = String(activeMonsterId);

  const rowIncluded = useCallback(
    (rowKey, row) => {
      const v = lootPick[monsterKey]?.[rowKey];
      if (v === undefined) return row.unitPrice >= lootMinGpPerItem;
      return !!v;
    },
    [lootPick, monsterKey, lootMinGpPerItem]
  );

  const lootEvPerKill = useMemo(() => {
    let s = 0;
    for (const row of flatLoot) {
      if (rowIncluded(row.key, row)) s += row.evGp;
    }
    return s;
  }, [flatLoot, rowIncluded]);

  /** GP/kill if only the min GP/item rule applied (no manual row overrides). */
  const lootBaseGpPerKill = useMemo(() => {
    let s = 0;
    for (const row of flatLoot) {
      if (row.unitPrice >= lootMinGpPerItem) s += row.evGp;
    }
    return s;
  }, [flatLoot, lootMinGpPerItem]);

  const lootGroups = useMemo(() => {
    const order = [];
    /** @type {Map<string, typeof flatLoot>} */
    const byTable = new Map();
    for (const row of flatLoot) {
      const t = row.tableName ?? "—";
      if (!byTable.has(t)) {
        byTable.set(t, []);
        order.push(t);
      }
      byTable.get(t).push(row);
    }
    return order.map((tableName) => ({
      tableName,
      rows: byTable.get(tableName),
    }));
  }, [flatLoot]);

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

  const baseKillCycleSec = useMemo(() => {
    if (!baseSnap) return null;
    return baseSnap.ttkSeconds + betweenKillSec;
  }, [baseSnap, betweenKillSec]);

  const baseKph = useMemo(() => {
    if (!baseKillCycleSec || baseKillCycleSec <= 0) return 0;
    return 3600 / baseKillCycleSec;
  }, [baseKillCycleSec]);

  const baseGphr = baseKph * lootEvPerKill;

  const optResultsPriced = useMemo(() => {
    const baseDps = baseSnap?.dps ?? 0;
    return optResults.map((r) => {
      const costGp = marginalUpgradeCost(equip, r.equip, effectivePriceById);
      const kph =
        r.ttkSeconds + betweenKillSec > 0
          ? 3600 / (r.ttkSeconds + betweenKillSec)
          : 0;
      const gphr = kph * lootEvPerKill;
      const dpsGain = r.dps - baseDps;
      const value =
        costGp > 0 ? dpsGain / (costGp / 1e6) : dpsGain > 0 ? Infinity : 0;
      return { ...r, costGp, kph, gphr, dpsGain, value };
    });
  }, [
    optResults,
    effectivePriceById,
    equip,
    baseSnap,
    betweenKillSec,
    lootEvPerKill,
  ]);

  const previewBonuses = useMemo(
    () => sumMeleeEquipment(previewEquip, itemsById),
    [previewEquip, itemsById]
  );

  const previewSnap = useMemo(
    () =>
      monster
        ? meleeCombatSnapshot({
            ...combatParams,
            equipment: previewBonuses,
          })
        : null,
    [combatParams, previewBonuses, monster]
  );

  const chartLoadout = chartEquip ?? equip;
  const chartSamples = useMemo(() => {
    if (!monster) return [];
    return sampleDpsForLoadout(combatParams, chartLoadout, itemsById, 360);
  }, [combatParams, chartLoadout, itemsById, monster]);

  const previewChartSamples = useMemo(() => {
    if (!monster) return [];
    return sampleDpsForLoadout(combatParams, previewEquip, itemsById, 280);
  }, [combatParams, previewEquip, itemsById, monster]);

  const killCycleSec = baseSnap
    ? baseSnap.ttkSeconds + betweenKillSec
    : null;
  const killsPerHour =
    killCycleSec && killCycleSec > 0 ? 3600 / killCycleSec : 0;
  const gpPerHour = killsPerHour * lootEvPerKill;

  const equipmentScrollParentRef = useRef(null);
  // TanStack Virtual: intentional; list is windowed for performance.
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer
  const equipmentRowVirtualizer = useVirtualizer({
    count: equipmentListFiltered.length,
    getScrollElement: () => equipmentScrollParentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  useEffect(() => {
    equipmentScrollParentRef.current?.scrollTo({ top: 0 });
  }, [equipmentItemFilter]);

  const toggleExcluded = (id) => {
    setExcludedFromSim((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const toggleObtained = useCallback((id) => {
    setObtainedItems((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        EQUIPMENT_PREFS_STORAGE_KEY,
        JSON.stringify({
          excluded: excludedFromSim,
          obtained: obtainedItems,
        })
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [excludedFromSim, obtainedItems]);

  const toggleLootRow = (rowKey) => {
    setLootPick((prev) => {
      const cur = { ...(prev[monsterKey] ?? {}) };
      const row = flatLoot.find((r) => r.key === rowKey);
      const def = row ? row.unitPrice >= lootMinGpPerItem : true;
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
        next[row.key] = row.unitPrice >= lootMinGpPerItem;
      }
      return { ...prev, [monsterKey]: next };
    });
  };

  const setSlotItem = (slot, id) => {
    setEquip((e) => ({ ...e, [slot]: id || null }));
  };

  const setPreviewSlot = (slot, id) => {
    setPreviewEquip((e) => ({ ...e, [slot]: id || null }));
  };

  const toggleOptSlot = (slot) => {
    setOptimizeSlots((o) => ({ ...o, [slot]: !o[slot] }));
  };

  const setPriceOverrideForId = useCallback((id, raw) => {
    const digits = String(raw).replace(/\D/g, "");
    setPriceOverrides((prev) => {
      const next = { ...prev };
      if (digits === "") delete next[id];
      else next[id] = parseInt(digits, 10);
      return next;
    });
  }, []);

  const runOptimize = useCallback(() => {
    if (!monster || !itemsCombatCatalog.length) return;
    const slotsToVary = SLOTS.filter((s) => optimizeSlots[s]);
    if (!slotsToVary.length) {
      setOptResults([]);
      setOptRunStats({ totalPossible: 0, simulated: 0, dpsPassDropped: 0 });
      return;
    }
    /** @type {Record<string, string[]>} */
    const candidatesBySlot = {};
    let dpsPassDropped = 0;
    const baseDps = baseSnap?.dps ?? 0;
    for (const slot of slotsToVary) {
      const baseId = equip[slot];
      const basePool = topMeleeBySlot[slot] ?? [];
      const pool = [
        ...new Set([baseId, ...basePool].filter(Boolean)),
      ].filter((id) => !excludedFromSim[id]);
      const gpPrefiltered = pool.filter((id) => {
        if (id === baseId) return true;
        return (effectivePriceById[id] ?? 0) <= budgetGp;
      });
      const kept = [];
      for (const id of gpPrefiltered) {
        if (id === baseId) {
          kept.push(id);
          continue;
        }
        const oneSwapEquip = { ...equip, [slot]: id };
        const oneSwapBonuses = sumMeleeEquipment(oneSwapEquip, itemsById);
        const oneSwapSnap = meleeCombatSnapshot({
          ...combatParams,
          equipment: oneSwapBonuses,
        });
        if (oneSwapSnap.dps > baseDps) kept.push(id);
        else dpsPassDropped += 1;
      }
      candidatesBySlot[slot] = kept.length ? kept : [baseId].filter(Boolean);
    }
    const activeSlots = slotsToVary.filter(
      (slot) => (candidatesBySlot[slot]?.length ?? 0) > 0
    );
    const totalPossible = activeSlots.length
      ? activeSlots.reduce(
          (acc, slot) => acc * (candidatesBySlot[slot]?.length ?? 0),
          1
        )
      : 0;
    if (!activeSlots.length) {
      setOptResults([]);
      setOptRunStats({
        totalPossible: 0,
        simulated: 0,
        dpsPassDropped,
      });
      setSelectedResultIdx(null);
      setChartEquip(null);
      return;
    }
    const rows = enumerateLoadouts({
      baseEquip: equip,
      slotsToVary: activeSlots,
      candidatesBySlot,
      itemsById,
      priceById: effectivePriceById,
      budgetGp,
      maxCombinations,
      combatParams,
    });
    const enriched = rows.map((r) => {
      const costGp = marginalUpgradeCost(equip, r.equip, effectivePriceById);
      const kph =
        r.ttkSeconds + betweenKillSec > 0
          ? 3600 / (r.ttkSeconds + betweenKillSec)
          : 0;
      const gphr = kph * lootEvPerKill;
      const dpsGain = r.dps - baseDps;
      const value =
        costGp > 0 ? dpsGain / (costGp / 1e6) : dpsGain > 0 ? Infinity : 0;
      return { ...r, costGp, kph, gphr, dpsGain, value };
    });
    setOptResults(enriched);
    setResultsPage(1);
    setOptRunStats({
      totalPossible,
      simulated: rows.length,
      dpsPassDropped,
    });
    setSelectedResultIdx(null);
    setChartEquip(null);
  }, [
    monster,
    itemsCombatCatalog,
    effectivePriceById,
    optimizeSlots,
    equip,
    itemsById,
    excludedFromSim,
    budgetGp,
    maxCombinations,
    combatParams,
    baseSnap,
    betweenKillSec,
    lootEvPerKill,
    topMeleeBySlot,
  ]);

  const sortedResults = useMemo(() => {
    const arr = [...optResultsPriced];
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
  }, [optResultsPriced, sortKey, sortDir]);

  const baseDpsFilter = baseSnap?.dps ?? 0;
  const sortedResultsDpsUp = useMemo(
    () => sortedResults.filter((r) => r.dps > baseDpsFilter),
    [sortedResults, baseDpsFilter]
  );
  const resultsOmittedBelowBaseDps =
    sortedResults.length - sortedResultsDpsUp.length;
  const resultsPageCount = Math.max(
    1,
    Math.ceil(sortedResultsDpsUp.length / resultsPerPage)
  );
  const resultsPageSafe = Math.min(resultsPage, resultsPageCount);
  const pagedResultsStart = (resultsPageSafe - 1) * resultsPerPage;
  const pagedResults = sortedResultsDpsUp.slice(
    pagedResultsStart,
    pagedResultsStart + resultsPerPage
  );

  useEffect(() => {
    setResultsPage((p) => Math.min(Math.max(1, p), resultsPageCount));
  }, [resultsPageCount]);

  const bestId = useMemo(() => {
    if (!sortedResultsDpsUp.length) return -1;
    let best = 0;
    for (let i = 1; i < sortedResultsDpsUp.length; i++) {
      if (sortedResultsDpsUp[i].dps > sortedResultsDpsUp[best].dps) best = i;
    }
    return best;
  }, [sortedResultsDpsUp]);

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
    <div className="app layout-single">
      <header className="site-header">
        <div>
          <a className="home" href="../index.html">
            ← All tools
          </a>
          <h1>Gear simulator</h1>
          <p className="sub">
            Melee DPS &amp; TTK, loot EV from bundled prices, upgrade search with
            a GP budget. Base loadout is treated as owned.
          </p>
        </div>
      </header>

      {baseSnap && (
        <section className="live-strip glass" aria-live="polite">
          <div>
            <div className="metric-label">DPS (loadout)</div>
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
            <div className="metric-sub">selected loot</div>
          </div>
          <div>
            <div className="metric-label">GP / hr</div>
            <div className="metric-val">{fmtInt(gpPerHour)}</div>
            <div className="metric-sub">loot only</div>
          </div>
        </section>
      )}

      <nav className="tab-bar glass" aria-label="Main sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "loadout" && (
        <div className="tab-panel">
          <section className="panel glass">
            <h2>Base loadout</h2>
            <p className="muted tight">
              This equipment is assumed owned and is the baseline for upgrade
              costs (sum of GE prices for changed slots).
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
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "target" && (
        <div className="tab-panel">
          <section className="target-bar glass">
            <MonsterSearch
              monsters={data.monsters}
              value={activeMonsterId}
              onChange={setMonsterId}
            />
            {monster && (
              <div className="monster-pill">
                <strong>HP</strong> {monster.hp} · <strong>Def lvl</strong>{" "}
                {monster.defLevel} · <strong>Stab / Slash / Crush</strong>{" "}
                {monster.defStab} / {monster.defSlash} / {monster.defCrush}
              </div>
            )}
          </section>

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
            <h2>Loot</h2>
            <p className="muted tight">
              EV uses drop rate × mean quantity ×{" "}
              <code>latest_prices.json</code> (volume-weighted avg of high/low).
              By default, rows at or above the min GP/item
              threshold count as picked up; toggle rows to override. Selected
              rows feed GP/kill and GP/hr on the live strip and Results tab.
            </p>
            {!lootDefined ? (
              <p className="muted">No loot table for this monster.</p>
            ) : (
              <>
                <div className="loot-ev-summary" aria-live="polite">
                  <div className="loot-ev-summary-item">
                    <span className="loot-ev-summary-label">Base GP / kill</span>
                    <span className="loot-ev-summary-val">
                      {fmtInt(lootBaseGpPerKill)}
                    </span>
                    <span className="loot-ev-summary-hint muted">
                      min GP/item rule only
                    </span>
                  </div>
                  <div className="loot-ev-summary-item">
                    <span className="loot-ev-summary-label">
                      Effective GP / kill
                    </span>
                    <span className="loot-ev-summary-val">
                      {fmtInt(lootEvPerKill)}
                    </span>
                    <span className="loot-ev-summary-hint muted">
                      with your row selections
                    </span>
                  </div>
                </div>
                <div className="loot-toolbar">
                  <div className="field inline">
                    <label>Min GP per item (pick up)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={lootMinGpPerItem}
                      onChange={(e) => setLootMinGpPerItem(+e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={applyLootThreshold}
                  >
                    Apply to all rows
                  </button>
                </div>
                <div className="table-wrap loot-table-wrap">
                  <table className="loot-table">
                    <thead>
                      <tr>
                        <th className="loot-col-use">Use</th>
                        <th className="loot-col-name">Item</th>
                        <th className="loot-col-qty">Qty</th>
                        <th className="loot-col-p">Chance</th>
                        <th className="loot-col-gp">GP</th>
                        <th className="loot-col-ev">EV</th>
                      </tr>
                    </thead>
                    {lootGroups.map(({ tableName, rows }) => (
                      <tbody key={tableName}>
                        <tr className="loot-table-group">
                          <td colSpan={6}>{tableName}</td>
                        </tr>
                        {rows.map((row) => {
                          const on = rowIncluded(row.key, row);
                          const below = row.unitPrice < lootMinGpPerItem;
                          return (
                            <tr
                              key={row.key}
                              className={
                                below && !on ? "loot-row-dim" : undefined
                              }
                            >
                              <td className="loot-col-use">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggleLootRow(row.key)}
                                />
                              </td>
                              <td className="loot-col-name">
                                <span className="loot-name">
                                  {row.itemId != null
                                    ? itemsById[String(row.itemId)]?.name ??
                                      row.name
                                    : row.name}
                                </span>
                              </td>
                              <td className="loot-col-qty">
                                {row.quantityLabel ?? "—"}
                              </td>
                              <td className="loot-col-p">
                                {row.rarityLabel ?? "—"}
                              </td>
                              <td className="loot-col-gp">
                                {fmtInt(row.unitPrice)}
                              </td>
                              <td className="loot-col-ev loot-ev">
                                {fmtInt(row.evGp)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    ))}
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {tab === "results" && (
        <div className="tab-panel">
          <section className="panel glass">
            <h2>Optimizer</h2>
            <p className="muted tight">
              Vary checked slots among top melee-scored items. Budget = max
              total GP for items that differ from your base loadout. Click a
              result row to chart its DPS distribution.
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
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={
                    budgetFieldFocused
                      ? budgetFieldDraft
                      : Number.isFinite(budgetGp)
                        ? budgetGp.toLocaleString()
                        : "0"
                  }
                  onFocus={() => {
                    setBudgetFieldFocused(true);
                    setBudgetFieldDraft(String(budgetGp));
                  }}
                  onBlur={() => {
                    const n =
                      parseInt(
                        String(budgetFieldDraft).replace(/\D/g, ""),
                        10
                      ) || 0;
                    setBudgetGp(n);
                    setBudgetFieldFocused(false);
                  }}
                  onChange={(e) => {
                    if (budgetFieldFocused) {
                      setBudgetFieldDraft(e.target.value);
                    }
                  }}
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
            <button
              type="button"
              className="btn-secondary"
              style={{ marginLeft: "0.5rem", marginTop: "0.75rem" }}
              onClick={() => {
                setChartEquip(null);
                setSelectedResultIdx(null);
              }}
            >
              Chart base loadout
            </button>
          </section>

          <div className="results-dps-chart-wrap">
            <DpsDistributionChart
              samples={chartSamples}
              title={
                chartEquip
                  ? "DPS distribution (selected result)"
                  : "DPS distribution (base loadout)"
              }
            />
          </div>

          <div className="results-below-chart">
            {optimizerCandidateItemIds.length > 0 && (
              <section className="panel glass results-cost-overrides">
                <h3>Item cost overrides</h3>
                <p className="muted tight">
                  Set a custom GE price (GP) for budget and loadout cost
                  calculations. Leave blank for catalog price.{" "}
                  <strong>Run simulation</strong> again so the optimizer applies
                  overrides to the budget cap.
                </p>
                <div className="price-override-filter-row">
                  <label htmlFor="override-item-filter">Filter items</label>
                  <input
                    id="override-item-filter"
                    type="search"
                    value={overrideItemFilter}
                    onChange={(e) => setOverrideItemFilter(e.target.value)}
                    placeholder="Name, slot, or item id…"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="muted">
                    {filteredOverrideItemIds.length.toLocaleString()} shown
                  </span>
                </div>
                <div className="price-override-table-wrap">
                  <table className="price-override-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Catalog</th>
                        <th>Override (GP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverrideItemIds.map((id) => {
                        const it = itemsById[id];
                        const catalog = data.priceById[id] ?? 0;
                        const hasOverride = priceOverrides[id] !== undefined;
                        return (
                          <tr key={id}>
                            <td className="price-override-name">
                              <span className="price-override-title">
                                {it?.name ?? "—"}
                                {itemVersionSuffix(it)}
                              </span>
                            </td>
                            <td>{fmtInt(catalog)}</td>
                            <td>
                              <input
                                type="text"
                                inputMode="numeric"
                                className="price-override-input"
                                placeholder="default"
                                value={
                                  hasOverride ? String(priceOverrides[id]) : ""
                                }
                                onChange={(e) =>
                                  setPriceOverrideForId(id, e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {optRunStats.totalPossible > 0 && (
              <section className="panel glass results-table-panel">
                <h2>
                  Results ({sortedResultsDpsUp.length}
                  {sortedResults.length !== sortedResultsDpsUp.length
                    ? ` of ${sortedResults.length}`
                    : ""}
                  {optRunStats.totalPossible > 0
                    ? ` / ${optRunStats.totalPossible.toLocaleString()} possible`
                    : ""}
                  )
                </h2>
                <p className="muted tight">
                  Ranked {sortedResults.length.toLocaleString()} loadout
                  {sortedResults.length === 1 ? "" : "s"};{" "}
                  simulated{" "}
                  {optRunStats.simulated.toLocaleString()} within caps out of{" "}
                  {optRunStats.totalPossible.toLocaleString()} possible
                  combinations.{" "}
                  {optRunStats.dpsPassDropped > 0
                    ? `${optRunStats.dpsPassDropped.toLocaleString()} single-item candidates were pruned for not beating base DPS. `
                    : ""}
                  {resultsOmittedBelowBaseDps > 0
                    ? `${resultsOmittedBelowBaseDps.toLocaleString()} at or below base DPS are hidden. `
                    : ""}
                  Only rows with strictly higher DPS than your base loadout are
                  listed.
                </p>
                <div className="results-toolbar">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={runOptimize}
                  >
                    Re-run simulation
                  </button>
                  <div className="results-pagination">
                    <label htmlFor="results-page-size">Rows</label>
                    <select
                      id="results-page-size"
                      value={resultsPerPage}
                      onChange={(e) => {
                        setResultsPerPage(Math.max(5, +e.target.value || 25));
                        setResultsPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={resultsPageSafe <= 1}
                      onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <span className="muted">
                      Page {resultsPageSafe} / {resultsPageCount}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={resultsPageSafe >= resultsPageCount}
                      onClick={() =>
                        setResultsPage((p) => Math.min(resultsPageCount, p + 1))
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="table-wrap">
                <table className="results">
                  <thead>
                    <tr>
                      <th onClick={() => cycleSort("dps")}>Loadout</th>
                      <th onClick={() => cycleSort("dps")}>DPS (Δ vs base)</th>
                      <th onClick={() => cycleSort("ttk")}>
                        TTK s (Δ vs base)
                      </th>
                      <th onClick={() => cycleSort("gphr")}>
                        GP/hr (Δ vs base)
                      </th>
                      <th onClick={() => cycleSort("value")}>ΔDPS/MGP</th>
                      <th onClick={() => cycleSort("cost")}>
                        Loadout cost (GP)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const baseDpsRow = baseSnap?.dps ?? 0;
                      const baseTtkRow = baseSnap?.ttkSeconds ?? 0;
                      if (!sortedResultsDpsUp.length) {
                        return (
                          <tr>
                            <td colSpan={6} className="results-empty">
                              No loadouts beat base DPS (
                              {sortedResults.length.toLocaleString()} simulated).
                            </td>
                          </tr>
                        );
                      }
                      return pagedResults.map((r, i) => {
                        const globalIdx = pagedResultsStart + i;
                        return (
                        <tr
                          key={i}
                          className={`results-row-click ${
                            globalIdx === bestId ? "best" : ""
                          } ${selectedResultIdx === globalIdx ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedResultIdx(globalIdx);
                            setChartEquip({ ...r.equip });
                          }}
                        >
                          <td className="results-loadout">
                            {SLOTS.filter((s) => optimizeSlots[s]).map(
                              (s, slotIdx) => {
                                const id = r.equip[s];
                                const it = id ? itemsById[id] : null;
                                const name = it?.name ?? "—";
                                const changed =
                                  String(equip[s] ?? "") !== String(id ?? "");
                                return (
                                  <span key={s} className="results-loadout-item">
                                    {slotIdx > 0 ? (
                                      <span className="results-loadout-sep">
                                        {" "}
                                        ·{" "}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      className={
                                        changed
                                          ? "loadout-inline loadout-inline--new"
                                          : "loadout-inline loadout-inline--base"
                                      }
                                      onClick={(e) => {
                                        if (!changed || !id) return;
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const popupWidth = 340;
                                        const x = Math.min(
                                          Math.max(8, rect.left),
                                          window.innerWidth - popupWidth - 8
                                        );
                                        const y = Math.min(
                                          rect.bottom + 8,
                                          window.innerHeight - 220
                                        );
                                        setResultItemPopupPos({ x, y });
                                        setResultItemControlId(id);
                                      }}
                                    >
                                      {name}
                                      {itemVersionSuffix(it)}
                                    </button>
                                  </span>
                                );
                              }
                            )}
                          </td>
                          <td className="results-metric">
                            <div className="results-metric-val">
                              {fmtNum(r.dps, 3)}
                            </div>
                            <div className="results-metric-delta muted">
                              {fmtSignedDelta(r.dps - baseDpsRow, 3)}
                            </div>
                          </td>
                          <td className="results-metric">
                            <div className="results-metric-val">
                              {fmtNum(r.ttkSeconds, 1)}
                            </div>
                            <div className="results-metric-delta muted">
                              {fmtSignedDelta(
                                r.ttkSeconds - baseTtkRow,
                                1
                              )}
                            </div>
                          </td>
                          <td className="results-metric">
                            <div className="results-metric-val">
                              {fmtInt(r.gphr)}
                            </div>
                            <div className="results-metric-delta muted">
                              {fmtSignedIntDelta(r.gphr - baseGphr)}
                            </div>
                          </td>
                          <td>
                            {!Number.isFinite(r.value)
                              ? "∞"
                              : fmtNum(r.value, 3)}
                          </td>
                          <td>{fmtInt(r.costGp)}</td>
                        </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {tab === "equipment" && (
        <div className="tab-panel">
          <section className="panel glass">
            <h2>Simulation items</h2>
            <p className="muted tight">
              Full item catalog from loaded data. GP uses{" "}
              <code>latest_prices.json</code> (VWAP high/low). Click a row or
              the Use checkbox to include or exclude an item from optimizer
              candidate pools. Mark <strong>Obtained</strong> so that item
              counts as 0 GP in upgrade costs. Use and Obtained choices are
              saved in this browser (
              <code>{EQUIPMENT_PREFS_STORAGE_KEY}</code>).
            </p>
            <div className="excl-toolbar">
              <label className="excl-filter-label" htmlFor="equip-item-filter">
                Search
              </label>
              <input
                id="equip-item-filter"
                type="search"
                className="excl-filter-input"
                placeholder="Filter by name or slot…"
                value={equipmentItemFilter}
                onChange={(e) => setEquipmentItemFilter(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <span className="muted excl-filter-meta">
                {equipmentListFiltered.length.toLocaleString()} shown
              </span>
            </div>
            <div className="excl-virtual-head" aria-hidden>
              <span className="excl-col-use">Use</span>
              <span className="excl-col-own">Obtained</span>
              <span className="excl-col-slot">Slot</span>
              <span className="excl-col-name">Item</span>
              <span className="excl-col-gp">GP</span>
            </div>
            <div
              ref={equipmentScrollParentRef}
              className="excl-virtual-scroller"
              role="list"
              aria-label="Items included in upgrade simulations"
            >
              <div
                className="excl-virtual-inner"
                style={{ height: equipmentRowVirtualizer.getTotalSize() }}
              >
                {equipmentRowVirtualizer.getVirtualItems().map((vRow) => {
                  const it = equipmentListFiltered[vRow.index];
                  const id = String(it?.id ?? "");
                  const gp = effectivePriceById[id] ?? 0;
                  return (
                    <div
                      key={id}
                      className="excl-virtual-row"
                      data-index={vRow.index}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExcluded(id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExcluded(id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${vRow.size}px`,
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      <span className="excl-col-use">
                        <input
                          type="checkbox"
                          checked={!excludedFromSim[id]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleExcluded(id)}
                          aria-label={`Include ${it?.name ?? "item"} in simulations`}
                        />
                      </span>
                      <span className="excl-col-own">
                        <input
                          type="checkbox"
                          checked={!!obtainedItems[id]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleObtained(id)}
                          aria-label={`Already own ${it?.name ?? "item"} (0 GP upgrade cost)`}
                        />
                      </span>
                      <span className="excl-col-slot muted">
                        {it?.slot ?? "—"}
                      </span>
                      <span className="excl-col-name">{it?.name ?? "—"}</span>
                      <span className="excl-col-gp">{fmtInt(gp)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="panel glass">
            <h2>Preview equipment</h2>
            <p className="muted tight">
              Inspect DPS math for an alternate setup without changing your base
              loadout.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPreviewEquip({ ...equip })}
              style={{ marginBottom: "0.75rem" }}
            >
              Copy from base loadout
            </button>
            <div className="slot-stack">
              {SLOTS.map((slot) => (
                <div className="slot-block" key={slot}>
                  <ItemSlotPicker
                    slot={slot}
                    value={previewEquip[slot] ?? null}
                    onChange={(id) => setPreviewSlot(slot, id)}
                    itemsById={itemsById}
                    slotItems={itemsBySlot[slot] ?? []}
                  />
                </div>
              ))}
            </div>
            <DpsBreakdown
              title="DPS calculation (preview)"
              snap={previewSnap}
              equip={previewEquip}
              itemsById={itemsById}
            />
            <DpsDistributionChart
              samples={previewChartSamples}
              title="DPS distribution (preview)"
            />
          </section>
        </div>
      )}

      <footer className="footer-note">
        Phase 1: melee; wiki-style rolls. Chart = Monte Carlo kill times. Upgrade
        cost = sum of catalog GP (VWAP from{" "}
        <code>latest_prices.json</code>) for slots that differ from base
        (base assumed owned). Not affiliated with Jagex.{" "}
        <a href="legacy.html">Legacy manual DPS tool</a>.
      </footer>
      {resultItemControl &&
        createPortal(
          <section
            ref={resultItemPopupRef}
            className="result-item-popup glass"
            role="dialog"
            aria-modal="false"
            aria-label="Result item controls"
            style={{
              left: `${resultItemPopupPos.x}px`,
              top: `${resultItemPopupPos.y}px`,
            }}
          >
            <h3>
              {resultItemControl.item.name}
              {itemVersionSuffix(resultItemControl.item)}
            </h3>
            <p className="result-item-popup-prices">
              Catalog: <strong>{fmtInt(resultItemControl.catalogGp)} GP</strong>
              <span className="result-item-popup-price-sep">|</span>
              Effective:{" "}
              <strong>{fmtInt(resultItemControl.effectiveGp)} GP</strong>
            </p>
            <div className="result-item-popup-actions">
              <label className="result-item-toggle">
                <input
                  type="checkbox"
                  checked={!resultItemControl.excluded}
                  onChange={() => toggleExcluded(resultItemControl.id)}
                />
                Include in simulations
              </label>
              <label className="result-item-toggle">
                <input
                  type="checkbox"
                  checked={resultItemControl.owned}
                  onChange={() => toggleObtained(resultItemControl.id)}
                />
                Owned (0 GP cost)
              </label>
            </div>
            <label className="result-item-popup-override">
              Override GP
              <input
                type="text"
                inputMode="numeric"
                className="results-item-override"
                placeholder="default"
                value={
                  resultItemControl.hasOverride
                    ? String(resultItemControl.overrideValue)
                    : ""
                }
                onChange={(e) =>
                  setPriceOverrideForId(resultItemControl.id, e.target.value)
                }
              />
            </label>
          </section>,
          document.body
        )}
    </div>
  );
}
