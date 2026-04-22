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
