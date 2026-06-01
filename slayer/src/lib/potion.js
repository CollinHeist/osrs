/**
 * Compute the GP/hr cost for a single potion entry.
 * @param {{ costPerDose: string|number, minutesPerDose: string|number }} p
 * @returns {number}
 */
export function potionGpPerHour(p) {
  const cost = parseFloat(p.costPerDose) || 0;
  const mins = parseFloat(p.minutesPerDose) || 0;
  if (!cost || !mins) return 0;
  return (cost / mins) * 60;
}
