import { describe, it, expect } from "vitest";
import { dedupeCosmeticMeleeVariants, itemMeleeBonuses } from "./equipment.js";

describe("dedupeCosmeticMeleeVariants", () => {
  it("keeps first of identical name, slot, and melee stats", () => {
    const a = {
      id: 1,
      name: "Test helm",
      slot: "head",
      offensive: { stab: 0, slash: 0, crush: 0 },
      bonuses: { str: 5 },
      speed: 0,
    };
    const b = {
      id: 2,
      name: "Test helm",
      slot: "head",
      offensive: { stab: 0, slash: 0, crush: 0 },
      bonuses: { str: 5 },
      speed: 0,
      version: "1",
    };
    const out = dedupeCosmeticMeleeVariants([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
  });

  it("keeps both when melee stats differ", () => {
    const a = {
      id: 1,
      name: "X",
      slot: "head",
      offensive: { stab: 0, slash: 0, crush: 0 },
      bonuses: { str: 1 },
    };
    const b = {
      id: 2,
      name: "X",
      slot: "head",
      offensive: { stab: 0, slash: 0, crush: 0 },
      bonuses: { str: 2 },
    };
    expect(dedupeCosmeticMeleeVariants([a, b])).toHaveLength(2);
  });

  it("keeps both when name differs", () => {
    const a = { id: 1, name: "A", slot: "head", bonuses: { str: 1 } };
    const b = { id: 2, name: "B", slot: "head", bonuses: { str: 1 } };
    expect(dedupeCosmeticMeleeVariants([a, b])).toHaveLength(2);
  });

  it("matches itemMeleeBonuses normalization used in engine", () => {
    const it = {
      id: 9,
      name: "Z",
      slot: "weapon",
      stabAtt: 10,
      str: 3,
      speed: 5,
    };
    expect(itemMeleeBonuses(it)).toEqual(
      expect.objectContaining({
        stabAtt: 10,
        str: 3,
        speed: 5,
      })
    );
  });
});
