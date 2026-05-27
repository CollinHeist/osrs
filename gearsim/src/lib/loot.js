/**
 * Display quantity as a fixed value or "min–max" for a range (JSON may use [2, 3]).
 * @param {number | number[]} quantity
 */
export function formatQuantityLabel(quantity) {
  if (typeof quantity === "number" && Number.isFinite(quantity)) {
    return String(Math.trunc(quantity));
  }
  if (Array.isArray(quantity) && quantity.length >= 2) {
    const a = Math.trunc(+quantity[0]);
    const b = Math.trunc(+quantity[1]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      if (a === b) return String(a);
      return `${a}-${b}`;
    }
  }
  return "—";
}

/**
 * @param {number | number[]} quantity
 */
export function meanQuantity(quantity) {
  if (typeof quantity === "number" && Number.isFinite(quantity)) return quantity;
  if (Array.isArray(quantity) && quantity.length >= 2) {
    const a = +quantity[0];
    const b = +quantity[1];
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  return 1;
}

/**
 * @param {[number, number]} rarity
 */
export function dropProbability(rarity) {
  if (!Array.isArray(rarity) || rarity.length < 2) return 0;
  const [n, d] = rarity;
  if (!d || d <= 0) return 0;
  return Math.min(1, Math.max(0, n / d));
}

/**
 * Display rarity as the raw fraction from loot data (e.g. 2/30, 1/128).
 * @param {unknown} rarity
 */
export function formatRarityFraction(rarity) {
  if (!Array.isArray(rarity) || rarity.length < 2) return "—";
  const n = Math.trunc(Number(rarity[0]));
  const d = Math.trunc(Number(rarity[1]));
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return "—";
  return `${n}/${d}`;
}

/**
 * @param {any} lootMonster entry from loot.json
 * @param {Record<string, number>} priceById
 * @returns {Array<{ key: string, tableName: string, itemId: number, name: string, avgQty: number, quantityLabel: string, rarityLabel: string, pDrop: number, unitPrice: number, evGp: number }>}
 */
/**
 * @param {any} lootData loot.json root: array of monsters OR legacy object map
 * @param {string|number} monsterId
 * @param {Record<string, number>} priceById
 */
export function getFlattenedLootRows(lootData, monsterId, priceById) {
  if (lootData == null) return [];
  if (Array.isArray(lootData)) {
    const entry =
      lootData.find(
        (e) => e.id === monsterId || String(e.id) === String(monsterId)
      ) ?? null;
    return flattenLootRows(entry, priceById);
  }
  if (typeof lootData === "object") {
    const legacy = lootData[String(monsterId)] ?? lootData[monsterId];
    if (!Array.isArray(legacy)) return [];
    return legacy.map((r, i) => ({
      key: `legacy-${monsterId}-${i}`,
      tableName: "Fixed EV",
      itemId: typeof r.id === "number" ? r.id : null,
      name: r.name ?? "—",
      avgQty: 1,
      quantityLabel: "1",
      rarityLabel: "1/1",
      pDrop: 1,
      unitPrice:
        typeof r.id === "number" ? priceById[String(r.id)] ?? 0 : 0,
      evGp: r.evGp ?? 0,
    }));
  }
  return [];
}

export function flattenLootRows(lootMonster, priceById) {
  if (!lootMonster?.drops?.length) return [];
  /** @type {any[]} */
  const rows = [];
  lootMonster.drops.forEach((table, ti) => {
    const tableName = table.table_name ?? "—";
    (table.items ?? []).forEach((item, ii) => {
      const avgQty = meanQuantity(item.quantity);
      const pDrop = dropProbability(item.rarity);
      const itemId = item.id;
      const isCoins = item.name?.toLowerCase() === "coins" || itemId === 995;
      const unitPrice = isCoins ? 1 : (priceById[String(itemId)] ?? 0);
      const evGp = avgQty * pDrop * unitPrice;
      rows.push({
        key: `${lootMonster.id}-${ti}-${ii}`,
        tableName,
        itemId,
        name: item.name ?? `Item ${itemId}`,
        avgQty,
        quantityLabel: formatQuantityLabel(item.quantity),
        rarityLabel: formatRarityFraction(item.rarity),
        pDrop,
        unitPrice,
        evGp,
      });
    });
  });
  return rows;
}
