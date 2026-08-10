/**
 * Effective GP rate used in the efficiency formula.
 * When rewardProfit is false, profitable GP is ignored (treated as 0).
 *
 * @param {number} gpHr
 * @param {boolean} rewardProfit
 * @returns {number}
 */
export function effectiveGpHr(gpHr, rewardProfit) {
  if (!Number.isFinite(gpHr)) return 0;
  return rewardProfit ? gpHr : Math.min(0, gpHr);
}

/**
 * Effective XP/hr given a money-maker GP/hr baseline.
 * Returns null when the method is at least as profitable as the money-maker
 * (effective gpHr >= moneyMakerGpHr), since the rate diverges to infinity.
 *
 * @param {number} xpHr
 * @param {number} gpHr
 * @param {number} moneyMakerGpHr
 * @param {boolean} [rewardProfit=true]
 * @returns {number | null}
 */
export function effXpHr(xpHr, gpHr, moneyMakerGpHr, rewardProfit = true) {
  if (!(moneyMakerGpHr > 0) || !(xpHr > 0) || !Number.isFinite(gpHr)) return null;
  const g = effectiveGpHr(gpHr, rewardProfit);
  if (g >= moneyMakerGpHr) return null;
  const denom = 1 - g / moneyMakerGpHr;
  if (!(denom > 0) || !Number.isFinite(denom)) return null;
  const value = xpHr / denom;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Evenly sample money-maker GP/hr across [minGpHr, maxGpHr].
 *
 * @param {number} minGpHr
 * @param {number} maxGpHr
 * @param {number} [count=100]
 * @returns {number[]}
 */
export function sampleMoneyMakerRates(minGpHr, maxGpHr, count = 100) {
  const lo = Math.max(1, Number(minGpHr) || 0);
  const hi = Math.max(lo + 1, Number(maxGpHr) || lo + 1);
  const n = Math.max(2, Math.min(200, Math.floor(count)));
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push(lo + ((hi - lo) * i) / (n - 1));
  }
  return pts;
}

/**
 * Build Recharts-friendly rows: { m, [optionId]: effXpHr | null }.
 *
 * @param {{ id: string, xpHr: number, gpHr: number }[]} options
 * @param {number} minGpHr
 * @param {number} maxGpHr
 * @param {number} [count=100]
 * @param {boolean} [rewardProfit=true]
 * @returns {Record<string, number | null>[]}
 */
export function sampleSeries(options, minGpHr, maxGpHr, count = 100, rewardProfit = true) {
  const rates = sampleMoneyMakerRates(minGpHr, maxGpHr, count);
  return rates.map((m) => {
    const row = { m };
    for (const opt of options) {
      row[opt.id] = effXpHr(opt.xpHr, opt.gpHr, m, rewardProfit);
    }
    return row;
  });
}

/**
 * Money-maker GP/hr where two options have equal effective XP/hr, or null if none.
 *
 * @param {{ xpHr: number, gpHr: number }} a
 * @param {{ xpHr: number, gpHr: number }} b
 * @param {boolean} rewardProfit
 * @returns {number | null}
 */
export function crossoverGpHr(a, b, rewardProfit = true) {
  const x1 = a.xpHr;
  const x2 = b.xpHr;
  const g1 = effectiveGpHr(a.gpHr, rewardProfit);
  const g2 = effectiveGpHr(b.gpHr, rewardProfit);
  if (!(x1 > 0) || !(x2 > 0)) return null;
  // x1 / (1 - g1/M) = x2 / (1 - g2/M)  =>  M = (x1*g2 - x2*g1) / (x1 - x2)
  const denom = x1 - x2;
  if (Math.abs(denom) < 1e-12) {
    // Same XP/hr: equal everywhere iff same effective GP, else never
    return null;
  }
  const m = (x1 * g2 - x2 * g1) / denom;
  if (!Number.isFinite(m) || m <= 0) return null;
  // Must be valid for both (neither diverged)
  if (g1 >= m || g2 >= m) return null;
  const e1 = effXpHr(x1, a.gpHr, m, rewardProfit);
  const e2 = effXpHr(x2, b.gpHr, m, rewardProfit);
  if (e1 == null || e2 == null) return null;
  if (Math.abs(e1 - e2) / Math.max(e1, e2) > 1e-6) return null;
  return m;
}

/**
 * Contiguous ranges of money-maker GP/hr where each option is best.
 *
 * @param {{ id: string, name: string, xpHr: number, gpHr: number }[]} options
 * @param {number} minGpHr
 * @param {number} maxGpHr
 * @param {boolean} [rewardProfit=true]
 * @param {number} [count=200]
 * @returns {{
 *   optionId: string,
 *   name: string,
 *   fromGpHr: number,
 *   toGpHr: number,
 *   midEffXpHr: number,
 * }[]}
 */
export function bestOptionSegments(options, minGpHr, maxGpHr, rewardProfit = true, count = 200) {
  if (!options.length) return [];

  const rates = sampleMoneyMakerRates(minGpHr, maxGpHr, count);
  /** @type {{ optionId: string, name: string, fromGpHr: number, toGpHr: number, midEffXpHr: number }[]} */
  const segments = [];

  /** @type {{ id: string, name: string, from: number, to: number, mid: number, midEff: number } | null} */
  let cur = null;

  for (const m of rates) {
    let bestId = null;
    let bestName = "";
    let bestEff = -Infinity;

    for (const opt of options) {
      const e = effXpHr(opt.xpHr, opt.gpHr, m, rewardProfit);
      if (e == null) continue;
      if (e > bestEff) {
        bestEff = e;
        bestId = opt.id;
        bestName = opt.name;
      }
    }

    if (bestId == null) {
      if (cur) {
        segments.push({
          optionId: cur.id,
          name: cur.name,
          fromGpHr: cur.from,
          toGpHr: cur.to,
          midEffXpHr: cur.midEff,
        });
        cur = null;
      }
      continue;
    }

    if (!cur || cur.id !== bestId) {
      if (cur) {
        segments.push({
          optionId: cur.id,
          name: cur.name,
          fromGpHr: cur.from,
          toGpHr: cur.to,
          midEffXpHr: cur.midEff,
        });
      }
      cur = {
        id: bestId,
        name: bestName,
        from: m,
        to: m,
        mid: m,
        midEff: bestEff,
      };
    } else {
      cur.to = m;
      const mid = (cur.from + cur.to) / 2;
      const midOpt = options.find((o) => o.id === cur.id);
      const midEff = midOpt
        ? effXpHr(midOpt.xpHr, midOpt.gpHr, mid, rewardProfit)
        : bestEff;
      cur.mid = mid;
      cur.midEff = midEff ?? bestEff;
    }
  }

  if (cur) {
    segments.push({
      optionId: cur.id,
      name: cur.name,
      fromGpHr: cur.from,
      toGpHr: cur.to,
      midEffXpHr: cur.midEff,
    });
  }

  // Snap first/last segment edges to the exact plot bounds when they cover endpoints
  if (segments.length) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (Math.abs(first.fromGpHr - rates[0]) < 1e-6) first.fromGpHr = minGpHr;
    if (Math.abs(last.toGpHr - rates[rates.length - 1]) < 1e-6) last.toGpHr = maxGpHr;

    // Refine boundaries with pairwise crossovers when adjacent winners differ
    for (let i = 0; i < segments.length - 1; i++) {
      const a = options.find((o) => o.id === segments[i].optionId);
      const b = options.find((o) => o.id === segments[i + 1].optionId);
      if (!a || !b) continue;
      const x = crossoverGpHr(a, b, rewardProfit);
      if (x != null && x > segments[i].fromGpHr && x < segments[i + 1].toGpHr) {
        segments[i].toGpHr = x;
        segments[i + 1].fromGpHr = x;
      }
    }
  }

  return segments;
}

/**
 * Compact rate formatter (e.g. 100k, 1.5m, −25k).
 *
 * @param {number} n
 * @param {{ signed?: boolean }} [opts]
 * @returns {string}
 */
export function formatRate(n, opts = {}) {
  if (!Number.isFinite(n)) return "—";
  const sign = opts.signed && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  const neg = n < 0 ? "−" : "";
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
    return `${neg}${sign}${s}m`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "");
    return `${neg}${sign}${s}k`;
  }
  return `${neg}${sign}${Math.round(abs)}`;
}

/**
 * Parse a compact rate string or plain number into a float.
 * Accepts: 100k, 1.5m, +200k, -25k, 150000.
 *
 * @param {string | number} raw
 * @returns {number | null}
 */
export function parseRate(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim().toLowerCase().replace(/,/g, "").replace(/−/g, "-");
  if (!s) return null;
  const m = s.match(/^([+-]?)(\d*\.?\d+)\s*([km])?$/i);
  if (!m) return null;
  let n = parseFloat(m[2]);
  if (!Number.isFinite(n)) return null;
  if (m[3] === "k") n *= 1_000;
  if (m[3] === "m") n *= 1_000_000;
  if (m[1] === "-") n = -n;
  return n;
}

/** Chart line colors cycled per option. */
export const SERIES_COLORS = [
  "#f0b429",
  "#5cdb9a",
  "#6a9fd4",
  "#e86b6b",
  "#c8873a",
  "#b388ff",
  "#4dd0e1",
  "#ff8a65",
];
