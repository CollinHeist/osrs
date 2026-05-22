/**
 * Standard OSRS XP table built from the game's formula.
 * Extended to level 150 to support "virtual levels" beyond the in-game cap of 99.
 * At virtual levels >99, the Woodcutting level is still capped at 99 for drop-rate
 * purposes — only the XP (and therefore log count) increases.
 */

/** Highest virtual level the planner allows. ~200m XP falls around level 126. */
export const MAX_VIRTUAL_LEVEL = 126;

const MAX_TABLE_LEVEL = 150;

const XP_TABLE = (() => {
  const t = [0, 0];
  let acc = 0;
  for (let l = 1; l <= MAX_TABLE_LEVEL - 1; l++) {
    acc += Math.floor(l + 300 * Math.pow(2, l / 7));
    t.push(Math.floor(acc / 4));
  }
  return t;
})();

export function xpAt(level) {
  const clamped = Math.max(1, Math.min(MAX_TABLE_LEVEL, Math.round(level)));
  return XP_TABLE[clamped] ?? 0;
}

export function xpBetween(fromLevel, toLevel) {
  return Math.max(0, xpAt(toLevel) - xpAt(fromLevel));
}
