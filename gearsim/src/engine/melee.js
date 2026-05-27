/**
 * OSRS PvM melee hit chance & max hit (wiki-aligned, Phase 1 simplifications).
 * @see https://oldschool.runescape.wiki/w/Hit_chance
 * @see https://oldschool.runescape.wiki/w/Maximum_melee_hit
 */

/** @typedef {import('./types.js').HitStyle} HitStyle */
/** @typedef {import('./types.js').MeleeStyle} MeleeStyle */
/** @typedef {import('./types.js').MonsterStats} MonsterStats */
/** @typedef {import('./types.js').EquipmentBonuses} EquipmentBonuses */

const TICK_SEC = 0.6;

/**
 * Invisible style boosts to effective levels (accuracy / strength / defence).
 * @param {MeleeStyle} style
 */
export function styleLevelBoosts(style) {
  switch (style) {
    case "accurate":
      return { att: 3, str: 0, def: 0 };
    case "aggressive":
      return { att: 0, str: 3, def: 0 };
    case "defensive":
      return { att: 0, str: 0, def: 3 };
    case "controlled":
      return { att: 1, str: 1, def: 1 };
    default:
      return { att: 0, str: 0, def: 0 };
  }
}

/**
 * @param {number} attackLevel
 * @param {number} strengthLevel
 * @param {number} defenceLevel
 * @param {MeleeStyle} style
 * @param {{ att: number, str: number, def: number }} prayerMults
 * @param {{ att: number, str: number, def: number }} potionAdds additive visible levels
 */
export function effectiveMeleeLevels(
  attackLevel,
  strengthLevel,
  defenceLevel,
  style,
  prayerMults,
  potionAdds
) {
  const s = styleLevelBoosts(style);
  const att = Math.floor((attackLevel + potionAdds.att) * prayerMults.att) + s.att + 8;
  const str = Math.floor((strengthLevel + potionAdds.str) * prayerMults.str) + s.str + 8;
  const def = Math.floor((defenceLevel + potionAdds.def) * prayerMults.def) + s.def + 8;
  return { att, str, def };
}

/**
 * @param {number} effAtt
 * @param {HitStyle} style
 * @param {EquipmentBonuses} eq
 */
export function attackRoll(effAtt, style, eq) {
  const bonus =
    style === "stab" ? eq.stabAtt : style === "slash" ? eq.slashAtt : eq.crushAtt;
  return effAtt * (bonus + 64);
}

/**
 * @param {HitStyle} style
 * @param {MonsterStats} m
 */
export function monsterDefenceRoll(style, m) {
  const stat = style === "stab" ? m.defStab : style === "slash" ? m.defSlash : m.defCrush;
  return (m.defLevel + 9) * (stat + 64);
}

/**
 * @param {number} attRoll
 * @param {number} defRoll
 */
export function hitChance(attRoll, defRoll) {
  if (attRoll <= 0 || defRoll < 0) return 0;
  let p;
  if (attRoll > defRoll) {
    p = 1 - (defRoll + 2) / (2 * (attRoll + 1));
  } else {
    p = attRoll / (2 * (defRoll + 1));
  }
  return Math.max(0, Math.min(1, p));
}

/**
 * @param {number} effStr
 * @param {EquipmentBonuses} eq
 */
export function maxMeleeHit(effStr, eq) {
  if (effStr <= 0) return 0;
  return Math.floor(0.5 + (effStr * (eq.str + 64)) / 640);
}

/** Expected damage per successful hit (uniform 0..max inclusive). */
export function expectedDamageOnHit(maxHit) {
  if (maxHit <= 0) return 0;
  return maxHit / 2;
}

/**
 * @param {Object} o
 * @param {number} o.attackLevel
 * @param {number} o.strengthLevel
 * @param {number} o.defenceLevel
 * @param {MeleeStyle} o.meleeStyle
 * @param {HitStyle} o.hitStyle
 * @param {{ att: number, str: number, def: number }} o.prayerMults
 * @param {{ att: number, str: number, def: number }} o.potionAdds
 * @param {EquipmentBonuses} o.equipment
 * @param {MonsterStats} o.monster
 */
export function meleeCombatSnapshot(o) {
  const eff = effectiveMeleeLevels(
    o.attackLevel,
    o.strengthLevel,
    o.defenceLevel,
    o.meleeStyle,
    o.prayerMults,
    o.potionAdds
  );
  const aRoll = attackRoll(eff.att, o.hitStyle, o.equipment);
  const dRoll = monsterDefenceRoll(o.hitStyle, o.monster);
  const pHit = hitChance(aRoll, dRoll);
  const maxH = maxMeleeHit(eff.str, o.equipment);
  const evDmg = pHit * expectedDamageOnHit(maxH);
  const ticks = Math.max(1, o.equipment.attSpeedTicks || 4);
  const dps = evDmg / (ticks * TICK_SEC);
  const ttk =
    dps > 0.0001 ? o.monster.hp / dps : Number.POSITIVE_INFINITY;
  return {
    effectiveAttack: eff.att,
    effectiveStrength: eff.str,
    attackRoll: aRoll,
    defenceRoll: dRoll,
    hitChance: pHit,
    maxHit: maxH,
    expectedDamagePerSwing: evDmg,
    attackIntervalTicks: ticks,
    dps,
    ttkSeconds: ttk,
    killsPerHour: ttk > 0 && Number.isFinite(ttk) ? 3600 / ttk : 0,
  };
}
