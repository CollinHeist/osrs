import { describe, it, expect } from "vitest";
import {
  hitChance,
  maxMeleeHit,
  meleeCombatSnapshot,
  monsterDefenceRoll,
  effectiveMeleeLevels,
} from "./melee.js";

const noPray = { att: 1, str: 1, def: 1 };
const noPot = { att: 0, str: 0, def: 0 };

describe("hitChance", () => {
  it("is symmetric edge at equal rolls", () => {
    const p = hitChance(1000, 1000);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
  it("approaches 1 when attack roll dominates", () => {
    expect(hitChance(50000, 100)).toBeGreaterThan(0.99);
  });
});

describe("maxMeleeHit", () => {
  it("increases with strength bonus", () => {
    const eff = 120;
    const low = maxMeleeHit(eff, {
      stabAtt: 0,
      slashAtt: 0,
      crushAtt: 0,
      str: 0,
      attSpeedTicks: 4,
    });
    const high = maxMeleeHit(eff, {
      stabAtt: 0,
      slashAtt: 0,
      crushAtt: 0,
      str: 82,
      attSpeedTicks: 4,
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe("meleeCombatSnapshot regression", () => {
  const dummyMonster = {
    id: "dummy",
    name: "Dummy",
    hp: 200,
    defLevel: 20,
    defStab: 20,
    defSlash: 20,
    defCrush: 20,
  };

  it("produces stable DPS for a mid-game whip setup", () => {
    const eq = {
      stabAtt: 0,
      slashAtt: 82,
      crushAtt: 0,
      str: 82,
      attSpeedTicks: 4,
    };
    const snap = meleeCombatSnapshot({
      attackLevel: 80,
      strengthLevel: 80,
      defenceLevel: 70,
      meleeStyle: "aggressive",
      hitStyle: "slash",
      prayerMults: { att: 1.2, str: 1.23, def: 1 },
      potionAdds: { att: 5, str: 5, def: 5 },
      equipment: eq,
      monster: dummyMonster,
    });
    expect(snap.dps).toBeGreaterThan(2);
    expect(snap.dps).toBeLessThan(30);
    expect(snap.maxHit).toBeGreaterThan(20);
    expect(snap.hitChance).toBeGreaterThan(0.4);
  });

  it("monotonic: higher strength level does not lower max hit", () => {
    const base = meleeCombatSnapshot({
      attackLevel: 70,
      strengthLevel: 70,
      defenceLevel: 70,
      meleeStyle: "aggressive",
      hitStyle: "slash",
      prayerMults: noPray,
      potionAdds: noPot,
      equipment: {
        stabAtt: 0,
        slashAtt: 50,
        crushAtt: 0,
        str: 50,
        attSpeedTicks: 4,
      },
      monster: dummyMonster,
    });
    const more = meleeCombatSnapshot({
      attackLevel: 70,
      strengthLevel: 99,
      defenceLevel: 70,
      meleeStyle: "aggressive",
      hitStyle: "slash",
      prayerMults: noPray,
      potionAdds: noPot,
      equipment: {
        stabAtt: 0,
        slashAtt: 50,
        crushAtt: 0,
        str: 50,
        attSpeedTicks: 4,
      },
      monster: dummyMonster,
    });
    expect(more.maxHit).toBeGreaterThanOrEqual(base.maxHit);
    expect(more.dps).toBeGreaterThanOrEqual(base.dps);
  });
});

describe("effectiveMeleeLevels", () => {
  it("applies piety-style multipliers", () => {
    const piety = { att: 1.2, str: 1.23, def: 1.2 };
    const a = effectiveMeleeLevels(99, 99, 99, "aggressive", piety, {
      att: 0,
      str: 0,
      def: 0,
    });
    const b = effectiveMeleeLevels(99, 99, 99, "aggressive", noPray, {
      att: 0,
      str: 0,
      def: 0,
    });
    expect(a.str).toBeGreaterThan(b.str);
  });
});

describe("defence roll uses style defence stat", () => {
  const m = {
    id: "x",
    name: "X",
    hp: 10,
    defLevel: 100,
    defStab: 250,
    defSlash: 0,
    defCrush: 0,
  };
  it("slash is easier than stab when stab defence is huge", () => {
    const slash = monsterDefenceRoll("slash", m);
    const stab = monsterDefenceRoll("stab", m);
    expect(stab).toBeGreaterThan(slash);
  });
});
