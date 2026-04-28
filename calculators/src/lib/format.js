/** Compact GP display (unsigned magnitude) */
export function formatGpCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(a / 1e9).toFixed(1)}b`;
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)}m`;
  if (a >= 1e3) return `${(a / 1e3).toFixed(1)}k`;
  return Math.round(a).toLocaleString();
}

/** GP with sign (unicode minus for negatives) */
export function formatGpSigned(n) {
  const neg = n < 0;
  const body = formatGpCompact(n);
  return neg ? `\u2212${body}` : body;
}

export function formatRateK(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}m`;
  return `${(n / 1e3).toFixed(0)}k`;
}

export function formatHours(h) {
  if (h < 1 / 60) return `${Math.round(h * 3600)}s`;
  if (h < 1) {
    const m = Math.round(h * 60);
    return `${m}m`;
  }
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

/** Axis label for GP/hr */
export function formatGphrAxis(v) {
  if (v >= 1e6) {
    const m = v / 1e6;
    return m === Math.floor(m) ? `${m}m` : `${m.toFixed(2).replace(/\.?0+$/, '')}m`;
  }
  return `${v / 1e3}k`;
}

/** User-facing GP/XP label */
export function describeGpxp(gpxp) {
  if (gpxp < 0) return { short: 'Cost', detail: 'Negative GP/XP — costs money to train' };
  if (gpxp > 0) return { short: 'Profit', detail: 'Positive GP/XP — net gain; no GP gathering time' };
  return { short: 'Break-even', detail: 'Zero GP/XP' };
}
