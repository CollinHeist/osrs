/**
 * Volume-weighted blend of avg high and avg low from latest_prices.json rows.
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
 * latest_prices.json: `{ data: { [id]: { avgHighPrice, highPriceVolume, avgLowPrice, lowPriceVolume } } }`
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
