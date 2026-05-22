export const DEFAULT_BONUSES = { hat: false, top: false, legs: false, boots: false, fellingAxe: false };

/**
 * Computes the combined XP multiplier from all active bonuses.
 * Lumberjack pieces are additive among themselves (with a set bonus when all four are worn),
 * then the result is multiplied by the felling axe factor.
 * Per the OSRS wiki, lumberjack and felling axe bonuses stack multiplicatively.
 */
export function computeXpMultiplier({ hat, top, legs, boots, fellingAxe }) {
  const allFour    = hat && top && legs && boots;
  const lumberjack = (hat ? 0.004 : 0) + (top ? 0.008 : 0) + (legs ? 0.006 : 0) + (boots ? 0.002 : 0) + (allFour ? 0.005 : 0);
  const felling    = fellingAxe ? 1.10 : 1.00;
  return (1 + lumberjack) * felling;
}
