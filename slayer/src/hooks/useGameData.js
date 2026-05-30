import { useEffect, useState } from "react";
import { buildPriceByIdFromLatestPrices } from "../lib/normalizeData.js";

function dataUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base + path : `${base}/${path}`;
}

export function useGameData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    monsters: [],
    /** @type {Record<string, number>} */
    priceById: {},
    /** loot.json: array of { id, name, drops } */
    loot: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [monsters, latestPricesRaw, loot] = await Promise.all([
          fetch(dataUrl("data/monsters.json")).then((r) => r.json()),
          fetch(dataUrl("data/latest_prices.json")).then((r) => r.json()),
          fetch(dataUrl("data/loot.json")).then((r) => r.json()),
        ]);
        const priceById = buildPriceByIdFromLatestPrices(latestPricesRaw);
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            monsters: Array.isArray(monsters) ? monsters : [],
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
