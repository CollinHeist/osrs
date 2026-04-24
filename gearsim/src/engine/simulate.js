import { meleeCombatSnapshot } from "./melee.js";
import { sumMeleeEquipment } from "../lib/equipment.js";

/**
 * One fight: random hits until monster HP reaches 0; returns ticks used.
 * @param {number} pHit
 * @param {number} maxHit inclusive 0..maxHit
 * @param {number} attackTicks
 * @param {number} monsterHp
 */
export function simulateFightTicks(pHit, maxHit, attackTicks, monsterHp) {
  let hp = monsterHp;
  let ticks = 0;
  const maxD = Math.max(0, maxHit);
  while (hp > 0) {
    ticks += attackTicks;
    if (Math.random() < pHit) {
      hp -= Math.floor(Math.random() * (maxD + 1));
    }
  }
  return ticks;
}

const TICK_SEC = 0.6;

/**
 * Monte Carlo DPS samples (HP / fight duration) for RNG fights.
 * @param {any} combatParams snapshot params minus equipment
 * @param {import('./types.js').EquipmentBonuses} equipment
 * @param {number} count
 */
export function sampleDpsDistribution(combatParams, equipment, count = 400) {
  const snap = meleeCombatSnapshot({ ...combatParams, equipment });
  const hp = combatParams.monster?.hp ?? 0;
  if (hp <= 0 || !Number.isFinite(snap.hitChance)) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const ticks = simulateFightTicks(
      snap.hitChance,
      snap.maxHit,
      snap.attackIntervalTicks,
      hp
    );
    const sec = ticks * TICK_SEC;
    out.push(sec > 0 ? hp / sec : 0);
  }
  return out;
}

/**
 * Histogram bins for chart (fixed bin count).
 * @param {number[]} samples
 * @param {number} bins
 */
export function histogramBins(samples, bins = 22) {
  if (!samples.length) return [];
  let lo = Math.min(...samples);
  let hi = Math.max(...samples);
  if (hi - lo < 1e-6) {
    lo -= 0.05;
    hi += 0.05;
  }
  const w = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const s of samples) {
    let i = Math.floor((s - lo) / w);
    if (i < 0) i = 0;
    if (i >= bins) i = bins - 1;
    counts[i]++;
  }
  return counts.map((c, i) => ({
    label: `${(lo + i * w).toFixed(2)}–${(lo + (i + 1) * w).toFixed(2)}`,
    mid: lo + (i + 0.5) * w,
    count: c,
  }));
}

/**
 * @param {any} combatParams
 * @param {Record<string, string | null>} equip
 * @param {Record<string, any>} itemsById
 * @param {number} count
 */
export function sampleDpsForLoadout(combatParams, equip, itemsById, count) {
  const bonuses = sumMeleeEquipment(equip, itemsById);
  return sampleDpsDistribution(combatParams, bonuses, count);
}
