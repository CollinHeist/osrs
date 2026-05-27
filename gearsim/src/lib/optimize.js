import { meleeCombatSnapshot } from "../engine/melee.js";
import { sumMeleeEquipment, meleeItemScore, SLOTS } from "./equipment.js";

/**
 * GP cost to buy every slot that differs from the base loadout (base assumed owned).
 * @param {Record<string, string | null>} baseEquip
 * @param {Record<string, string | null>} candidateEquip
 * @param {Record<string, number>} priceById
 */
export function marginalUpgradeCost(baseEquip, candidateEquip, priceById) {
  let sum = 0;
  for (const slot of SLOTS) {
    const c = candidateEquip[slot];
    const b = baseEquip[slot];
    if (!c || c === b) continue;
    sum += priceById[c] ?? 0;
  }
  return sum;
}

/**
 * @param {Object} o
 * @param {Record<string, string | null>} o.baseEquip
 * @param {string[]} o.slotsToVary
 * @param {Record<string, string[]>} o.candidatesBySlot item ids per slot
 * @param {Record<string, any>} o.itemsById
 * @param {Record<string, number>} o.priceById
 * @param {number} o.budgetGp
 * @param {number} o.maxCombinations
 * @param {any} o.combatParams passed to meleeCombatSnapshot
 */
export function enumerateLoadouts(o) {
  const slots = o.slotsToVary.filter((s) => (o.candidatesBySlot[s]?.length ?? 0) > 0);
  if (slots.length === 0) return [];

  /** @type {string[][]} */
  const axes = slots.map((s) => o.candidatesBySlot[s]);
  const out = [];

  function rec(i, equip) {
    if (out.length >= o.maxCombinations) return;
    if (i >= axes.length) {
      const cost = marginalUpgradeCost(o.baseEquip, equip, o.priceById);
      if (cost > o.budgetGp) return;
      const bonuses = sumMeleeEquipment(equip, o.itemsById);
      const snap = meleeCombatSnapshot({
        ...o.combatParams,
        equipment: bonuses,
      });
      out.push({
        equip: { ...equip },
        costGp: cost,
        ...snap,
      });
      return;
    }
    for (const id of axes[i]) {
      const slot = slots[i];
      const next = { ...equip, [slot]: id };
      rec(i + 1, next);
      if (out.length >= o.maxCombinations) return;
    }
  }

  rec(0, { ...o.baseEquip });
  return out;
}

/**
 * @param {string} slot
 * @param {any[]} allItems
 * @param {number} limit sort by melee score desc, take top N
 */
export function defaultMeleeCandidatesForSlot(slot, allItems, limit = 24) {
  const inSlot = allItems.filter((i) => i.slot === slot);
  const scored = inSlot.map((i) => ({
    id: String(i.id),
    score: meleeItemScore(i),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}

/**
 * Precompute top melee item ids per slot (single pass over all items).
 * @param {any[]} allItems
 * @param {string[]} slots
 * @param {number} perSlot
 * @returns {Record<string, string[]>}
 */
export function precomputeTopMeleeBySlot(allItems, slots, perSlot = 36) {
  /** @type {Record<string, { id: string, score: number }[]>} */
  const buckets = {};
  for (const s of slots) buckets[s] = [];
  if (!Array.isArray(allItems)) return buckets;
  for (const it of allItems) {
    const sl = it.slot;
    if (!buckets[sl]) continue;
    buckets[sl].push({ id: String(it.id), score: meleeItemScore(it) });
  }
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const s of slots) {
    buckets[s].sort((a, b) => b.score - a.score);
    out[s] = buckets[s].slice(0, perSlot).map((x) => x.id);
  }
  return out;
}
