import { getFlattenedLootRows } from "./loot.js";
import { CANNONBALL_GP } from "./constants.js";
import { potionGpPerHour } from "./potion.js";

/**
 * Determine if a loot row should be counted based on the task's loot configuration.
 * @param {{ key: string, unitPrice: number }} row
 * @param {Record<string, boolean>} lootPick
 * @param {number} lootMinGpPerItem
 */
function rowIncluded(row, lootPick, lootMinGpPerItem) {
  if (lootPick && row.key in lootPick) return lootPick[row.key];
  return row.unitPrice >= (lootMinGpPerItem ?? 0);
}

/**
 * Sum EV/kill for all included drop rows.
 * @param {any[]} flatLoot
 * @param {Record<string, boolean>} lootPick
 * @param {number} lootMinGpPerItem
 */
export function computeLootEvPerKill(flatLoot, lootPick, lootMinGpPerItem) {
  return flatLoot.reduce(
    (sum, row) => sum + (rowIncluded(row, lootPick, lootMinGpPerItem) ? row.evGp : 0),
    0
  );
}

/**
 * Compute all derived metrics for a single task.
 * @param {object} task
 * @param {Record<string, number>} priceById
 * @param {any[]} lootData
 */
/**
 * Compute all derived metrics for a single task.
 * @param {object} task
 * @param {Record<string, number>} priceById
 * @param {any[]} lootData
 */
export function computeTaskMetrics(task, priceById, lootData) {
  const kchr = task.kcPerHour || 0;
  const taskLen = task.taskLength || 0;
  const timeHours = kchr > 0 ? taskLen / kchr : 0;

  const flatLoot = getFlattenedLootRows(lootData, task.monsterId, priceById);

  // Manual GP/kill overrides loot table when set
  const manualGpPerKill = task.manualGpPerKill || 0;
  const lootEvPerKill =
    manualGpPerKill > 0
      ? manualGpPerKill
      : computeLootEvPerKill(flatLoot, task.lootPick ?? {}, task.lootMinGpPerItem ?? 0);

  const lootEvPerHour = lootEvPerKill * kchr;

  const cannonCostPerHour =
    task.useCannon && (task.cannonballsPerHour || 0) > 0
      ? (task.cannonballsPerHour || 0) * CANNONBALL_GP
      : 0;

  const potionCostPerHour = (task.potions || []).reduce(
    (sum, p) => sum + potionGpPerHour(p),
    0
  );

  const gpPerHour =
    lootEvPerHour -
    (task.inventoryCostPerHour || 0) -
    cannonCostPerHour -
    potionCostPerHour;
  const totalGp = gpPerHour * timeHours;
  const totalSlayerXp = (task.slayerXpPerHour || 0) * timeHours;
  const totalCombatXp = (task.combatXpPerHour || 0) * timeHours;

  return {
    timeHours,
    lootEvPerKill,
    lootEvPerHour,
    gpPerHour,
    totalGp,
    totalSlayerXp,
    totalCombatXp,
    flatLoot,
    cannonCostPerHour,
    potionCostPerHour,
    usingManualGp: manualGpPerKill > 0,
  };
}

/**
 * Return percentile rank of `value` within `arr` (0–100).
 * @param {number[]} arr
 * @param {number} value
 */
function percentileRank(arr, value) {
  if (arr.length === 0) return 50;
  const below = arr.filter((v) => v < value).length;
  return (below / arr.length) * 100;
}

/**
 * Return a skip / extend / speedup / keep recommendation for a single task,
 * relative to all known tasks.
 * @param {object} task
 * @param {object[]} allTasks
 * @param {Record<string, number>} priceById
 * @param {any[]} lootData
 * @param {object} [settings]
 * @returns {{ type: string, reason: string }}
 */
export function getTaskRecommendation(task, allTasks, priceById, lootData, settings = {}) {
  const {
    skipThreshold = 25,
    extendThreshold = 70,
    speedupThreshold = 40,
    longTaskHours = 2,
    xpWeight = 0.6,
    gpWeight = 0.4,
    absoluteMinXpHr = 20000,
    absoluteGoodXpHr = 60000,
    absoluteMinGpHr = -50000,
    absoluteGoodGpHr = 200000,
  } = settings;

  const myMetrics = computeTaskMetrics(task, priceById, lootData);
  const { timeHours } = myMetrics;
  const myXpHr = task.slayerXpPerHour || 0;
  const myGpHr = myMetrics.gpPerHour;
  const isLong = timeHours > longTaskHours;

  if (allTasks.length < 2) {
    const isLowXp = myXpHr < absoluteMinXpHr;
    const isNegativeGp = myGpHr < absoluteMinGpHr;
    const isHighXp = myXpHr >= absoluteGoodXpHr;
    const isGoodGp = myGpHr >= absoluteGoodGpHr;

    if (isLowXp && isNegativeGp) {
      return { type: "skip", reason: "Low XP/hr and negative GP/hr." };
    }
    if ((isHighXp || isGoodGp) && isLong) {
      return { type: "extend-speedup", reason: "Excellent rates — worth extending and speeding up." };
    }
    if (isHighXp || isGoodGp) {
      return { type: "extend", reason: "Excellent rates — worth extending." };
    }
    if (isLong && myXpHr >= absoluteMinXpHr) {
      return { type: "speedup", reason: "Long task with decent rates — consider using cannon/burst." };
    }
    return { type: "keep", reason: "Log more tasks for a full comparison." };
  }

  const allMetrics = allTasks.map((t) => computeTaskMetrics(t, priceById, lootData));
  const allXpHrs = allTasks.map((t) => t.slayerXpPerHour || 0);
  const allGpHrs = allMetrics.map((m) => m.gpPerHour);

  const xpPct = percentileRank(allXpHrs, myXpHr);
  const gpPct = percentileRank(allGpHrs, myGpHr);
  const composite = xpPct * xpWeight + gpPct * gpWeight;

  if (composite < skipThreshold) {
    return {
      type: "skip",
      reason: `Bottom ${Math.round(100 - composite)}% combined score — consider skipping this task.`,
    };
  }
  if (composite >= extendThreshold && isLong) {
    return {
      type: "extend-speedup",
      reason: `Top ${Math.round(composite)}% combined score with a ${fmtH(timeHours)} task — extend and speed up.`,
    };
  }
  if (composite >= extendThreshold) {
    return {
      type: "extend",
      reason: `Top ${Math.round(composite)}% combined score — worth extending.`,
    };
  }
  if (composite >= speedupThreshold && isLong) {
    return {
      type: "speedup",
      reason: `${fmtH(timeHours)} task with decent rates (${Math.round(composite)}th pct) — consider cannon or burst.`,
    };
  }
  return {
    type: "keep",
    reason: `Mid-tier task at the ${Math.round(composite)}th percentile.`,
  };
}

function fmtH(h) {
  if (!Number.isFinite(h) || h <= 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Rank all tasks by composite score (descending).
 * @param {object[]} tasks
 * @param {Record<string, number>} priceById
 * @param {any[]} lootData
 * @param {object} [settings]
 * @returns {Array<{ task: object, metrics: object, composite: number }>}
 */
export function rankTasks(tasks, priceById, lootData, settings = {}) {
  if (!tasks.length) return [];
  const { xpWeight = 0.6, gpWeight = 0.4 } = settings;
  const metricsArr = tasks.map((t) => computeTaskMetrics(t, priceById, lootData));
  const allXpHrs = tasks.map((t) => t.slayerXpPerHour || 0);
  const allGpHrs = metricsArr.map((m) => m.gpPerHour);

  return tasks
    .map((t, i) => {
      const xpPct = percentileRank(allXpHrs, allXpHrs[i]);
      const gpPct = percentileRank(allGpHrs, allGpHrs[i]);
      const composite = xpPct * xpWeight + gpPct * gpWeight;
      return { task: t, metrics: metricsArr[i], composite };
    })
    .sort((a, b) => b.composite - a.composite);
}
