/** @typedef {import('../engine/types.js').EquipmentBonuses} EquipmentBonuses */

const SLOTS = [
  "head",
  "cape",
  "neck",
  "ammo",
  "weapon",
  "body",
  "shield",
  "legs",
  "hands",
  "feet",
  "ring",
];

export { SLOTS };

/**
 * @param {any} it
 */
export function itemMeleeBonuses(it) {
  if (!it) return { stabAtt: 0, slashAtt: 0, crushAtt: 0, str: 0, speed: 4 };
  const o = it.offensive ?? {};
  const b = it.bonuses ?? {};
  return {
    stabAtt: o.stab ?? it.stabAtt ?? 0,
    slashAtt: o.slash ?? it.slashAtt ?? 0,
    crushAtt: o.crush ?? it.crushAtt ?? 0,
    str: b.str ?? it.str ?? 0,
    speed: typeof it.speed === "number" && it.speed > 0 ? it.speed : 4,
  };
}

/**
 * @param {Record<string, string | null>} equippedBySlot
 * @param {Record<string, any>} itemsById
 * @returns {EquipmentBonuses}
 */
export function sumMeleeEquipment(equippedBySlot, itemsById) {
  let stabAtt = 0;
  let slashAtt = 0;
  let crushAtt = 0;
  let str = 0;
  let attSpeedTicks = 4;

  for (const slot of SLOTS) {
    const id = equippedBySlot[slot];
    if (!id) continue;
    const it = itemsById[id];
    if (!it) continue;
    const m = itemMeleeBonuses(it);
    stabAtt += m.stabAtt;
    slashAtt += m.slashAtt;
    crushAtt += m.crushAtt;
    str += m.str;
    if (slot === "weapon") {
      attSpeedTicks = m.speed;
    }
  }

  return { stabAtt, slashAtt, crushAtt, str, attSpeedTicks };
}

/**
 * Drop cosmetic duplicate items: same trimmed name, same slot, and same
 * melee-relevant stats ({@link itemMeleeBonuses}). First occurrence in array
 * order is kept. Full {@link itemsToMap} should still be built from the raw
 * list so loot and loadouts can resolve every item id.
 * @param {any[]} items
 * @returns {any[]}
 */
export function dedupeCosmeticMeleeVariants(items) {
  if (!Array.isArray(items)) return [];
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {any[]} */
  const out = [];
  for (const it of items) {
    if (!it || typeof it.id !== "number") continue;
    const name = String(it.name ?? "").trim();
    const slot = String(it.slot ?? "");
    const m = itemMeleeBonuses(it);
    const statKey = `${m.stabAtt},${m.slashAtt},${m.crushAtt},${m.str},${m.speed}`;
    const key = `${name}\0${slot}\0${statKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/**
 * @param {any[]} items
 * @returns {Record<string, any>}
 */
export function itemsToMap(items) {
  /** @type {Record<string, any>} */
  const m = {};
  if (!Array.isArray(items)) return m;
  for (const it of items) {
    if (it && typeof it.id === "number") m[String(it.id)] = it;
  }
  return m;
}

/**
 * @param {string} slot
 * @param {any[]} items
 */
export function itemsForSlot(slot, items) {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i.slot === slot);
}

/**
 * Melee relevance score for candidate ranking.
 * @param {any} it
 */
export function meleeItemScore(it) {
  const m = itemMeleeBonuses(it);
  return m.str + Math.max(m.stabAtt, m.slashAtt, m.crushAtt);
}
