import { useEffect, useState } from "react";
import { buildPriceById } from "../lib/normalizeData.js";

function dataUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base + path : `${base}/${path}`;
}

export function useGameData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    meta: null,
    monsters: [],
    items: [],
    /** @type {Record<string, number>} */
    priceById: {},
    /** loot.json: array of { id, name, drops } */
    loot: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meta, monsters, items, pricesRaw, loot] = await Promise.all([
          fetch(dataUrl("data/meta.json")).then((r) => r.json()),
          fetch(dataUrl("data/monsters.json")).then((r) => r.json()),
          fetch(dataUrl("data/items.json")).then((r) => r.json()),
          fetch(dataUrl("data/prices.json")).then((r) => r.json()),
          fetch(dataUrl("data/loot.json")).then((r) => r.json()),
        ]);
        const priceById = buildPriceById(pricesRaw);
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            meta,
            monsters: Array.isArray(monsters) ? monsters : [],
            items: Array.isArray(items) ? items : [],
            priceById,
            loot: Array.isArray(loot) ? loot : [],
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: String(e?.message || e),
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
