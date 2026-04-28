/**
 * Standard semantics:
 * - Negative GP/XP = costs money (GP leaves your bank per XP).
 * - Positive GP/XP = net profit (GP gained per XP); gather time is 0.
 */
export function computeMethodTimes({ xpNeeded, gpxp, xphr, gphr }) {
  if (xpNeeded <= 0 || !Number.isFinite(xphr) || xphr <= 0 || !Number.isFinite(gphr) || gphr <= 0) {
    return {
      totalCost: 0,
      gatherH: 0,
      trainH: 0,
      totalH: Infinity,
    };
  }

  const totalCost = xpNeeded * (-gpxp);
  const gatherH = totalCost > 0 ? totalCost / gphr : 0;
  const trainH = xpNeeded / xphr;
  const totalH = gatherH + trainH;

  return { totalCost, gatherH, trainH, totalH };
}

export function sortRows(rows, sortCol, sortDir) {
  const mult = sortDir;
  return [...rows].sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv)) * mult;
    }
    return (av - bv) * mult;
  });
}

export function pickBestRow(rows) {
  if (!rows.length) return null;
  return rows.reduce((best, r) => (r.totalH < best.totalH ? r : best), rows[0]);
}

export function efficiencyRange(rows, best) {
  if (!rows.length || !best) return 0;
  const worstH = rows.reduce((w, r) => (r.totalH > w ? r.totalH : w), rows[0].totalH);
  return worstH - best.totalH;
}
