/** @returns {string} */
export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Default seeded state for first visit. */
export function createDefaultState() {
  const optA = newId();
  const optB = newId();
  const comparisonId = newId();
  return {
    version: 1,
    plot: { minGpHr: 500_000, maxGpHr: 10_000_000, rewardProfit: true },
    activeId: comparisonId,
    comparisons: [
      {
        id: comparisonId,
        name: "Smithing",
        options: [
          {
            id: optA,
            name: "Blast furnace bars",
            xpHr: 100_000,
            gpHr: 200_000,
          },
          {
            id: optB,
            name: "Anvil platebodies",
            xpHr: 150_000,
            gpHr: -25_000,
          },
        ],
      },
    ],
  };
}

/**
 * Validate imported JSON against the expected schema.
 *
 * @param {unknown} data
 * @returns {{ ok: true, state: object } | { ok: false, error: string }}
 */
export function validateImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "File must contain a JSON object" };
  }
  const obj = /** @type {Record<string, unknown>} */ (data);
  if (obj.version !== 1) {
    return { ok: false, error: "Unsupported or missing version (expected 1)" };
  }
  if (!Array.isArray(obj.comparisons)) {
    return { ok: false, error: "Missing comparisons array" };
  }
  if (obj.comparisons.length === 0) {
    return { ok: false, error: "File contains no comparisons" };
  }

  const plot = obj.plot && typeof obj.plot === "object" ? obj.plot : {};
  const plotObj = /** @type {Record<string, unknown>} */ (plot);
  const minGpHr = Number(plotObj.minGpHr);
  const maxGpHr = Number(plotObj.maxGpHr);
  const rewardProfit = plotObj.rewardProfit !== false;

  /** @type {object[]} */
  const comparisons = [];
  for (const c of obj.comparisons) {
    if (!c || typeof c !== "object") {
      return { ok: false, error: "Invalid comparison entry" };
    }
    const cmp = /** @type {Record<string, unknown>} */ (c);
    if (typeof cmp.name !== "string" || !cmp.name.trim()) {
      return { ok: false, error: "Each comparison needs a name" };
    }
    if (!Array.isArray(cmp.options)) {
      return { ok: false, error: `Comparison "${cmp.name}" is missing options` };
    }
    const options = [];
    for (const o of cmp.options) {
      if (!o || typeof o !== "object") {
        return { ok: false, error: `Invalid option in "${cmp.name}"` };
      }
      const opt = /** @type {Record<string, unknown>} */ (o);
      const xpHr = Number(opt.xpHr);
      const gpHr = Number(opt.gpHr);
      if (!Number.isFinite(xpHr) || xpHr <= 0) {
        return { ok: false, error: `Option in "${cmp.name}" needs a positive xpHr` };
      }
      if (!Number.isFinite(gpHr)) {
        return { ok: false, error: `Option in "${cmp.name}" needs a numeric gpHr` };
      }
      options.push({
        id: typeof opt.id === "string" && opt.id ? opt.id : newId(),
        name: typeof opt.name === "string" && opt.name.trim() ? opt.name.trim() : "Option",
        xpHr,
        gpHr,
      });
    }
    comparisons.push({
      id: typeof cmp.id === "string" && cmp.id ? cmp.id : newId(),
      name: cmp.name.trim(),
      options,
    });
  }

  const activeId =
    typeof obj.activeId === "string" &&
    comparisons.some((c) => c.id === obj.activeId)
      ? obj.activeId
      : comparisons[0].id;

  return {
    ok: true,
    state: {
      version: 1,
      plot: {
        minGpHr: Number.isFinite(minGpHr) && minGpHr > 0 ? minGpHr : 500_000,
        maxGpHr:
          Number.isFinite(maxGpHr) && maxGpHr > 0 ? maxGpHr : 10_000_000,
        rewardProfit,
      },
      activeId,
      comparisons,
    },
  };
}

export const STORAGE_KEY = "efficiency.comparisons.v1";
