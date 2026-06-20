import { xpAt } from "./xpTable.js";
import { TREE_BY_ID } from "../data/trees.js";

/**
 * Returns the per-log Beaver pet chance at a given woodcutting level for a tree.
 * Formula: 1 / (base - level * 25), sourced from the OSRS wiki.
 * Woodcutting level is capped at 99 — virtual levels beyond 99 still use the 99 rate.
 */
export function chancePerLog(tree, level) {
  const cappedLevel = Math.min(level, 99);
  const denom = tree.base - cappedLevel * 25;
  return denom > 0 ? 1 / denom : 1;
}

/**
 * Computes per-segment and cumulative pet chance results.
 *
 * Each segment's probability is calculated by iterating over every level
 * transition within the range, since the per-log drop rate improves with level.
 *
 * @param {Array<{id, treeId, fromLevel, toLevel}>} filledSegments
 * @param {number} xpMultiplier  — effective XP-per-chop multiplier (e.g. 1.025 for full lumberjack).
 *                                  Higher multiplier = fewer chops per level = fewer pet rolls.
 * @returns {Array} result objects with xp, actions (pet rolls), segChance, cumChance, etc.
 */
export function computeResults(filledSegments, xpMultiplier = 1) {
  let cumFailProb = 1;

  return filledSegments.map(seg => {
    const tree = TREE_BY_ID[seg.treeId];
    if (!tree) return null;

    let segFailProb    = 1;
    let totalActions   = 0;
    let weightedPSum   = 0;

    for (let level = seg.fromLevel; level < seg.toLevel; level++) {
      const xpForLevel      = xpAt(level + 1) - xpAt(level);
      const actionsForLevel = xpForLevel / (tree.xpPerLog * xpMultiplier);
      const p = chancePerLog(tree, level);
      segFailProb   *= Math.pow(1 - p, actionsForLevel);
      totalActions  += actionsForLevel;
      weightedPSum  += p * actionsForLevel;
    }

    const segChance  = 1 - segFailProb;
    const avgPPerLog = totalActions > 0 ? weightedPSum / totalActions : 0;
    cumFailProb *= segFailProb;

    return {
      id:         seg.id,
      treeId:     seg.treeId,
      treeName:   tree.name,
      treeColor:  tree.color,
      fromLevel:  seg.fromLevel,
      toLevel:    seg.toLevel,
      xp:         xpAt(seg.toLevel) - xpAt(seg.fromLevel),
      actions:    Math.round(totalActions),
      segChance,
      avgPPerLog,
      cumChance:  1 - cumFailProb,
    };
  }).filter(Boolean);
}

/**
 * Builds a per-level probability chart dataset. Covers every level from 1 up to
 * `maxLevel` (inclusive). Each entry is the cumulative probability of having
 * received the pet by the time that level is reached.
 *
 * @param {Array}  filledSegments
 * @param {number} maxLevel      — highest level to include (defaults to 99, supports virtual levels)
 * @param {number} xpMultiplier  — effective XP-per-chop multiplier from gear bonuses
 * @returns {Array<{level, chance}>}
 */
export function computeChartData(filledSegments, maxLevel = 99, xpMultiplier = 1) {
  let cumFailProb = 1;
  const data = [{ level: 1, chance: 0 }];

  for (let level = 1; level < maxLevel; level++) {
    const seg = filledSegments.find(s => level >= s.fromLevel && level < s.toLevel);

    if (seg) {
      const tree = TREE_BY_ID[seg.treeId];
      if (tree) {
        const xpForLevel     = xpAt(level + 1) - xpAt(level);
        const actionsForLevel = xpForLevel / (tree.xpPerLog * xpMultiplier);
        const p = chancePerLog(tree, level); // already capped at 99 internally
        cumFailProb *= Math.pow(1 - p, actionsForLevel);
      }
    }

    data.push({ level: level + 1, chance: +(((1 - cumFailProb) * 100).toFixed(4)) });
  }

  return data;
}

/**
 * Finds the first level in chartData where the cumulative chance reaches or
 * exceeds `p` (0–1). Returns null if it is never reached within the data.
 *
 * @param {Array<{level, chance}>} chartData
 * @param {number} p  — probability threshold (0–1)
 */
export function levelAtPercentile(chartData, p) {
  const target = p * 100;
  for (const pt of chartData) {
    if (pt.chance >= target) return pt.level;
  }
  return null;
}
