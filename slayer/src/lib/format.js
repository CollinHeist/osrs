/**
 * Format a GP value with K/M abbreviations.
 * @param {number | null | undefined} n
 */
export function fmtGp(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1_000)}K`;
  return `${sign}${Math.round(abs).toLocaleString()}`;
}

/**
 * Format hours as "Xh Ym" or "Ym".
 * @param {number | null | undefined} h
 */
export function fmtHours(h) {
  if (h == null || !Number.isFinite(h) || h <= 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Format an integer with locale commas.
 * @param {number | null | undefined} n
 */
export function fmtInt(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

/**
 * Format a number with a fixed number of decimal places.
 * @param {number | null | undefined} n
 * @param {number} d
 */
export function fmtNum(n, d = 1) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
}
