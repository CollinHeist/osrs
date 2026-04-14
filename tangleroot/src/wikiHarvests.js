/**
 * Tangleroot pet roll sources from OSRS Wiki "Tangleroot rates" table
 * (Farming level, Patch, Produce, Base chance B). Chance per roll:
 * 1 / (B − FarmingLevel × 25) when denominator > 0.
 * @see https://oldschool.runescape.wiki/w/Tangleroot
 */

export const PATCH_TYPE_ORDER = [
  "Herb", "Allotment", "Flower", "Hops", "Bush", "Tree", "Fruit tree", "Calquat",
  "Hardwood tree", "Redwood tree", "Spirit tree", "Celastrus tree", "Crystal tree",
  "Seaweed", "Mushroom", "Cactus", "Belladonna", "Hespori", "Vine", "Coral nursery", "Tithe Farm",
];

/** @type {{ id: string, produce: string, patchType: string, minLevel: number, base: number }[]} */
export const WIKI_HARVESTS = [
  { id: "allotment_potato"     , produce: "Potato"        , patchType: "Allotment"     , minLevel: 1 , base: 281040  },
  { id: "flower_marigold"      , produce: "Marigolds"     , patchType: "Flower"        , minLevel: 2 , base: 281040  },
  { id: "hops_barley"          , produce: "Barley"        , patchType: "Hops"          , minLevel: 3 , base: 112416  },
  { id: "hops_hammerstone"     , produce: "Hammerstone"   , patchType: "Hops"          , minLevel: 4 , base: 112416  },
  { id: "allotment_onion"      , produce: "Onion"         , patchType: "Allotment"     , minLevel: 5 , base: 281040  },
  { id: "allotment_cabbage"    , produce: "Cabbage"       , patchType: "Allotment"     , minLevel: 7 , base: 281040  },
  { id: "hops_asgarnian"       , produce: "Asgarnian"     , patchType: "Hops"          , minLevel: 8 , base: 89933   },
  { id: "herb_guam"            , produce: "Guam"          , patchType: "Herb"          , minLevel: 9 , base: 98364   },
  { id: "bush_redberry"        , produce: "Redberries"    , patchType: "Bush"          , minLevel: 10, base: 44966   },
  { id: "flower_rosemary"      , produce: "Rosemary"      , patchType: "Flower"        , minLevel: 11, base: 281040  },
  { id: "allotment_tomato"     , produce: "Tomato"        , patchType: "Allotment"     , minLevel: 12, base: 281040  },
  { id: "hops_jute"            , produce: "Jute"          , patchType: "Hops"          , minLevel: 13, base: 89933   },
  { id: "herb_marrentill"      , produce: "Marrentill"    , patchType: "Herb"          , minLevel: 14, base: 98364   },
  { id: "tree_oak"             , produce: "Oak"           , patchType: "Tree"          , minLevel: 15, base: 22483   },
  { id: "hops_yanillian"       , produce: "Yanillian"     , patchType: "Hops"          , minLevel: 16, base: 74944   },
  { id: "hops_flax"            , produce: "Flax"          , patchType: "Hops"          , minLevel: 18, base: 89933   },
  { id: "herb_tarromin"        , produce: "Tarromin"      , patchType: "Herb"          , minLevel: 19, base: 98364   },
  { id: "allotment_sweetcorn"  , produce: "Sweetcorn"     , patchType: "Allotment"     , minLevel: 20, base: 224832  },
  { id: "hops_krandorian"      , produce: "Krandorian"    , patchType: "Hops"          , minLevel: 21, base: 64238   },
  { id: "bush_cadava"          , produce: "Cadava berries", patchType: "Bush"          , minLevel: 22, base: 37472   },
  { id: "seaweed_giant"        , produce: "Giant seaweed" , patchType: "Seaweed"       , minLevel: 23, base: 7500    },
  { id: "flower_nasturtium"    , produce: "Nasturtiums"   , patchType: "Flower"        , minLevel: 24, base: 281040  },
  { id: "flower_woad"          , produce: "Woad"          , patchType: "Flower"        , minLevel: 25, base: 281040  },
  { id: "flower_limpwurt"      , produce: "Limpwurt"      , patchType: "Flower"        , minLevel: 26, base: 281040  },
  { id: "herb_harralander"     , produce: "Harralander"   , patchType: "Herb"          , minLevel: 26, base: 98364   },
  { id: "fruit_apple"          , produce: "Apple"         , patchType: "Fruit tree"    , minLevel: 27, base: 9000    },
  { id: "coral_elkhorn"        , produce: "Elkhorn coral" , patchType: "Coral nursery" , minLevel: 28, base: 98364   },
  { id: "hops_wildblood"       , produce: "Wildblood"     , patchType: "Hops"          , minLevel: 28, base: 56208   },
  { id: "herb_goutweed"        , produce: "Goutweed"      , patchType: "Herb"          , minLevel: 29, base: 98364   },
  { id: "tree_willow"          , produce: "Willow"        , patchType: "Tree"          , minLevel: 30, base: 16059   },
  { id: "allotment_strawberry" , produce: "Strawberry"    , patchType: "Allotment"     , minLevel: 31, base: 187360  },
  { id: "herb_ranarr"          , produce: "Ranarr"        , patchType: "Herb"          , minLevel: 32, base: 98364   },
  { id: "fruit_banana"         , produce: "Banana"        , patchType: "Fruit tree"    , minLevel: 33, base: 9000    },
  { id: "tithe_farm"           , produce: "Tithe Farm"    , patchType: "Tithe Farm"    , minLevel: 34, base: 7494389 },
  { id: "hw_teak"              , produce: "Teak"          , patchType: "Hardwood tree" , minLevel: 35, base: 5000    },
  { id: "bush_dwellberry"      , produce: "Dwellberries"  , patchType: "Bush"          , minLevel: 36, base: 32119   },
  { id: "vine_grape"           , produce: "Grapes"        , patchType: "Vine"          , minLevel: 36, base: 385426  },
  { id: "hops_hemp"            , produce: "Hemp"          , patchType: "Hops"          , minLevel: 37, base: 56208   },
  { id: "herb_toadflax"        , produce: "Toadflax"      , patchType: "Herb"          , minLevel: 38, base: 98364   },
  { id: "fruit_orange"         , produce: "Orange"        , patchType: "Fruit tree"    , minLevel: 39, base: 9000    },
  { id: "fruit_curry"          , produce: "Curry"         , patchType: "Fruit tree"    , minLevel: 42, base: 9000    },
  { id: "herb_irit"            , produce: "Irit"          , patchType: "Herb"          , minLevel: 44, base: 98364   },
  { id: "tree_maple"           , produce: "Maple"         , patchType: "Tree"          , minLevel: 45, base: 14052   },
  { id: "allotment_watermelon" , produce: "Watermelon"    , patchType: "Allotment"     , minLevel: 47, base: 160594  },
  { id: "bush_jangerberry"     , produce: "Jangerberries" , patchType: "Bush"          , minLevel: 48, base: 28104   },
  { id: "herb_avantoe"         , produce: "Avantoe"       , patchType: "Herb"          , minLevel: 50, base: 98364   },
  { id: "fruit_pineapple"      , produce: "Pineapple"     , patchType: "Fruit tree"    , minLevel: 51, base: 9000    },
  { id: "coral_pillar"         , produce: "Pillar coral"  , patchType: "Coral nursery" , minLevel: 52, base: 98364   },
  { id: "mushroom_bittercap"   , produce: "Mushrooms"     , patchType: "Mushroom"      , minLevel: 53, base: 7500    },
  { id: "cactus_cactus"        , produce: "Cactus"        , patchType: "Cactus"        , minLevel: 55, base: 7000    },
  { id: "hw_mahogany"          , produce: "Mahogany"      , patchType: "Hardwood tree" , minLevel: 55, base: 5000    },
  { id: "herb_kwuarm"          , produce: "Kwuarm"        , patchType: "Herb"          , minLevel: 56, base: 98364   },
  { id: "fruit_papaya"         , produce: "Papaya"        , patchType: "Fruit tree"    , minLevel: 57, base: 9000    },
  { id: "flower_white_lily"    , produce: "White lily"    , patchType: "Flower"        , minLevel: 58, base: 281040  },
  { id: "bush_white_berry"     , produce: "White berries" , patchType: "Bush"          , minLevel: 59, base: 28104   },
  { id: "tree_yew"             , produce: "Yew"           , patchType: "Tree"          , minLevel: 60, base: 11242   },
  { id: "allotment_snape"      , produce: "Snape grass"   , patchType: "Allotment"     , minLevel: 61, base: 173977  },
  { id: "herb_snapdragon"      , produce: "Snapdragon"    , patchType: "Herb"          , minLevel: 62, base: 98364   },
  { id: "belladonna_nightshade", produce: "Belladonna"    , patchType: "Belladonna"    , minLevel: 63, base: 8000    },
  { id: "cactus_potato"        , produce: "Potato cactus" , patchType: "Cactus"        , minLevel: 64, base: 160594  },
  { id: "hespori"              , produce: "Hespori"       , patchType: "Hespori"       , minLevel: 65, base: 7000    },
  { id: "herb_huasca"          , produce: "Huasca"        , patchType: "Herb"          , minLevel: 65, base: 98364   },
  { id: "hw_camphor"           , produce: "Camphor"       , patchType: "Hardwood tree" , minLevel: 66, base: 5000    },
  { id: "herb_cadantine"       , produce: "Cadantine"     , patchType: "Herb"          , minLevel: 67, base: 98364   },
  { id: "fruit_palm"           , produce: "Palm"          , patchType: "Fruit tree"    , minLevel: 68, base: 9000    },
  { id: "bush_poison_ivy"      , produce: "Poison ivy"    , patchType: "Bush"          , minLevel: 70, base: 28104   },
  { id: "hops_cotton"          , produce: "Cotton"        , patchType: "Hops"          , minLevel: 71, base: 56208   },
  { id: "calquat_calquat"      , produce: "Calquat"       , patchType: "Calquat"       , minLevel: 72, base: 6000    },
  { id: "herb_lantadyme"       , produce: "Lantadyme"     , patchType: "Herb"          , minLevel: 73, base: 98364   },
  { id: "crystal_tree"         , produce: "Crystal tree"  , patchType: "Crystal tree"  , minLevel: 74, base: 9000    },
  { id: "tree_magic"           , produce: "Magic"         , patchType: "Tree"          , minLevel: 75, base: 9368    },
  { id: "coral_umbral"         , produce: "Umbral coral"  , patchType: "Coral nursery" , minLevel: 77, base: 98364   },
  { id: "herb_dwarf_weed"      , produce: "Dwarf weed"    , patchType: "Herb"          , minLevel: 79, base: 98364   },
  { id: "hw_ironwood"          , produce: "Ironwood"      , patchType: "Hardwood tree" , minLevel: 80, base: 5000    },
  { id: "fruit_dragonfruit"    , produce: "Dragonfruit"   , patchType: "Fruit tree"    , minLevel: 81, base: 9000    },
  { id: "spirit_tree"          , produce: "Spirit tree"   , patchType: "Spirit tree"   , minLevel: 83, base: 5000    },
  { id: "celastrus_celastrus"  , produce: "Celastrus"     , patchType: "Celastrus tree", minLevel: 85, base: 9000    },
  { id: "herb_torstol"         , produce: "Torstol"       , patchType: "Herb"          , minLevel: 85, base: 98364   },
  { id: "redwood_redwood"      , produce: "Redwood"       , patchType: "Redwood tree"  , minLevel: 90, base: 5000    },
  { id: "hw_rosewood"          , produce: "Rosewood"      , patchType: "Hardwood tree" , minLevel: 92, base: 5000    },
];

export const HARVEST_BY_ID = Object.fromEntries(WIKI_HARVESTS.map(h => [h.id, h]));

/** Sensible default when adding a new harvest row in the UI */
export const DEFAULT_HARVEST_ID = "herb_torstol";

/** Built-in "typical" endgame-ish day for untracked-day approximation (wiki-accurate rolls at logged level). */
export const TYPICAL_UNTRACKED_ENTRIES = [
  { harvestId: "herb_ranarr", qty: 9 },
  { harvestId: "tree_yew", qty: 7 },
  { harvestId: "fruit_papaya", qty: 6 },
  { harvestId: "fruit_palm", qty: 2 },
  { harvestId: "cactus_cactus", qty: 2 },
  { harvestId: "hespori", qty: 1 },
  { harvestId: "seaweed_giant", qty: 2 },
  { harvestId: "mushroom_bittercap", qty: 1 },
];

export function harvestLabel(id) {
  const h = HARVEST_BY_ID[id];
  return h ? `${h.produce} (${h.patchType})` : id;
}

export function harvestOptionsByPatchType() {
  const map = new Map();
  for (const h of WIKI_HARVESTS) {
    if (!map.has(h.patchType)) map.set(h.patchType, []);
    map.get(h.patchType).push(h);
  }
  const out = [];
  for (const t of PATCH_TYPE_ORDER) {
    if (map.has(t)) {
      out.push({ patchType: t, harvests: map.get(t) });
      map.delete(t);
    }
  }
  for (const [patchType, harvests] of map) out.push({ patchType, harvests });
  return out;
}

export function chancePerRollFromBase(base, lvl) {
  const denom = base - lvl * 25;
  return denom <= 0 ? 1 : 1 / denom;
}

export function calcChanceFromEntries(entries, lvl) {
  if (!entries?.length) return 0;
  let failProb = 1;
  for (const { harvestId, qty } of entries) {
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    if (n === 0) continue;
    const h = HARVEST_BY_ID[harvestId];
    if (!h) continue;
    const p = chancePerRollFromBase(h.base, lvl);
    failProb *= Math.pow(1 - p, n);
  }
  return 1 - failProb;
}

export function mergeEntryLists(a, b) {
  const m = new Map();
  for (const arr of [a, b]) {
    if (!arr) continue;
    for (const { harvestId, qty } of arr) {
      const n = Math.max(0, Math.floor(Number(qty) || 0));
      if (!harvestId || n === 0) continue;
      m.set(harvestId, (m.get(harvestId) ?? 0) + n);
    }
  }
  return [...m.entries()].map(([harvestId, q]) => ({ harvestId, qty: q }));
}

export function cloneEntries(entries) {
  return (entries ?? []).map(e => ({ harvestId: e.harvestId, qty: e.qty }));
}

/** Map legacy v1/v2 flat instance keys → wiki entry lines (best-effort). */
export function legacyInstanceToEntries(instance, farmingLevel) {
  if (!instance || typeof instance !== "object") return [];
  const L = Math.min(99, Math.max(1, farmingLevel | 0));
  const pickHerb = () => {
    if (L >= 85) return "herb_torstol";
    if (L >= 79) return "herb_dwarf_weed";
    if (L >= 73) return "herb_lantadyme";
    if (L >= 67) return "herb_cadantine";
    if (L >= 62) return "herb_snapdragon";
    if (L >= 56) return "herb_kwuarm";
    if (L >= 50) return "herb_avantoe";
    if (L >= 44) return "herb_irit";
    if (L >= 38) return "herb_toadflax";
    if (L >= 32) return "herb_ranarr";
    if (L >= 26) return "herb_harralander";
    if (L >= 19) return "herb_tarromin";
    if (L >= 14) return "herb_marrentill";
    return "herb_guam";
  };
  const out = [];
  const add = (id, q) => {
    const n = Math.max(0, Math.floor(Number(q) || 0));
    if (n > 0) out.push({ harvestId: id, qty: n });
  };
  add(pickHerb(), instance.herb);
  add("cactus_cactus", instance.cactus);
  add("tree_maple", instance.maple);
  add("fruit_papaya", instance.papaya);
  add("calquat_calquat", instance.calquat);
  add("celastrus_celastrus", instance.celastrus);
  add("hw_ironwood", instance.ironwood);
  add("redwood_redwood", instance.redwood);
  add("hespori", instance.hespori);
  add("seaweed_giant", instance.seaweed);
  add("mushroom_bittercap", instance.mushroom);
  return mergeEntryLists(out, []);
}

export function normalizeDayForLoad(day) {
  if (!day || typeof day !== "object") return day;
  const lvl = typeof day.level === "number" ? day.level : 99;
  if (Array.isArray(day.entries) && day.entries.length) {
    const ch =
      day.approximate && typeof day.chance === "number" && !Number.isNaN(day.chance)
        ? day.chance
        : calcChanceFromEntries(day.entries, lvl);
    return { ...day, entries: mergeEntryLists(day.entries, []), chance: ch, approximate: !!day.approximate };
  }
  if (day.instance && typeof day.instance === "object") {
    const entries = legacyInstanceToEntries(day.instance, lvl);
    const chance =
      day.approximate && typeof day.chance === "number"
        ? day.chance
        : calcChanceFromEntries(entries, lvl);
    return { ...day, entries, chance, approximate: !!day.approximate };
  }
  if (day.approximate && typeof day.chance === "number") {
    return { ...day, entries: [], approximate: true, chance: day.chance };
  }
  return {
    ...day,
    entries: Array.isArray(day.entries) ? day.entries : [],
    chance: typeof day.chance === "number" ? day.chance : 0,
    approximate: !!day.approximate,
  };
}

export function normalizeRunForLoad(run) {
  if (!run || typeof run !== "object") return run;
  if (Array.isArray(run.entries) && run.entries.length) {
    return { ...run, entries: mergeEntryLists(run.entries, []) };
  }
  if (run.instance && typeof run.instance === "object") {
    const lvl = 99;
    return { ...run, entries: legacyInstanceToEntries(run.instance, lvl) };
  }
  return { ...run, entries: Array.isArray(run.entries) ? run.entries : [] };
}
