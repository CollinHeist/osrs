/**
 * @param {Array<{ id: number, value?: number }>} pricesArr
 * @returns {Record<string, number>}
 */
export function buildPriceById(pricesArr) {
  /** @type {Record<string, number>} */
  const m = {};
  if (!Array.isArray(pricesArr)) return m;
  for (const row of pricesArr) {
    if (row && typeof row.id === "number") {
      m[String(row.id)] = row.value ?? 0;
    }
  }
  return m;
}

/**
 * Volume-weighted blend of avg high and avg low from latest_prices.json rows.
 * Each side contributes (price × volume) only when that price is a finite number
 * and volume > 0.
 * @param {any} row
 */
export function volumeWeightedPriceFromLatestRow(row) {
  if (!row || typeof row !== "object") return 0;
  const hiP = row.avgHighPrice;
  const loP = row.avgLowPrice;
  const hiV = Math.max(0, Number(row.highPriceVolume) || 0);
  const loV = Math.max(0, Number(row.lowPriceVolume) || 0);
  const hiOk = typeof hiP === "number" && Number.isFinite(hiP);
  const loOk = typeof loP === "number" && Number.isFinite(loP);

  let num = 0;
  let den = 0;
  if (hiOk && hiV > 0) {
    num += hiP * hiV;
    den += hiV;
  }
  if (loOk && loV > 0) {
    num += loP * loV;
    den += loV;
  }
  if (den > 0) return num / den;
  return 0;
}

/**
 * latest_prices.json: `{ data: { [id]: { avgHighPrice, highPriceVolume, avgLowPrice, lowPriceVolume } }, timestamp? }`
 * @param {any} raw
 * @returns {Record<string, number>}
 */
export function buildPriceByIdFromLatestPrices(raw) {
  /** @type {Record<string, number>} */
  const m = {};
  const data = raw?.data;
  if (!data || typeof data !== "object") return m;
  for (const [idStr, row] of Object.entries(data)) {
    m[idStr] = volumeWeightedPriceFromLatestRow(row);
  }
  return m;
}

/**
 * OSRS wiki-style monster → melee combat stats for the engine.
 * Supports both `{ skills, defensive }` dumps and legacy `{ hp, defLevel, … }`.
 * @param {any} raw
 */
export function monsterForCombat(raw) {
  if (!raw) return null;
  if (raw.skills && typeof raw.skills.hp === "number") {
    const d = raw.defensive ?? {};
    return {
      id: raw.id,
      name: raw.version ? `${raw.name} (${raw.version})` : raw.name,
      hp: raw.skills.hp,
      defLevel: raw.skills.def ?? 0,
      defStab: d.stab ?? 0,
      defSlash: d.slash ?? 0,
      defCrush: d.crush ?? 0,
    };
  }
  return {
    id: raw.id,
    name: raw.name,
    hp: raw.hp ?? 0,
    defLevel: raw.defLevel ?? 0,
    defStab: raw.defStab ?? 0,
    defSlash: raw.defSlash ?? 0,
    defCrush: raw.defCrush ?? 0,
  };
}
