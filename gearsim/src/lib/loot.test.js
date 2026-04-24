import { describe, it, expect } from "vitest";
import {
  meanQuantity,
  dropProbability,
  getFlattenedLootRows,
  formatQuantityLabel,
  formatRarityFraction,
} from "./loot.js";

describe("meanQuantity", () => {
  it("handles number", () => {
    expect(meanQuantity(2)).toBe(2);
  });
  it("handles range", () => {
    expect(meanQuantity([2, 3])).toBe(2.5);
  });
});

describe("formatQuantityLabel", () => {
  it("formats scalar quantity", () => {
    expect(formatQuantityLabel(2)).toBe("2");
  });
  it("formats inclusive range", () => {
    expect(formatQuantityLabel([2, 3])).toBe("2-3");
  });
  it("collapses equal range endpoints", () => {
    expect(formatQuantityLabel([3, 3])).toBe("3");
  });
});

describe("formatRarityFraction", () => {
  it("renders raw n/d", () => {
    expect(formatRarityFraction([2, 30])).toBe("2/30");
    expect(formatRarityFraction([1, 128])).toBe("1/128");
  });
  it("returns em dash for invalid", () => {
    expect(formatRarityFraction(null)).toBe("—");
    expect(formatRarityFraction([1, 0])).toBe("—");
  });
});

describe("dropProbability", () => {
  it("computes ratio", () => {
    expect(dropProbability([2, 30])).toBeCloseTo(2 / 30);
  });
  it("is 1 for always drop", () => {
    expect(dropProbability([1, 1])).toBe(1);
  });
});

describe("getFlattenedLootRows", () => {
  it("reads array-format loot and prices", () => {
    const loot = [
      {
        id: 99,
        name: "Test",
        drops: [
          {
            table_name: "Main",
            items: [{ name: "Gold", id: 1, quantity: 1, rarity: [1, 2] }],
          },
        ],
      },
    ];
    const prices = { "1": 1000 };
    const rows = getFlattenedLootRows(loot, 99, prices);
    expect(rows).toHaveLength(1);
    expect(rows[0].evGp).toBeCloseTo(500);
    expect(rows[0].quantityLabel).toBe("1");
    expect(rows[0].rarityLabel).toBe("1/2");
  });
  it("carries quantity range label from JSON", () => {
    const loot = [
      {
        id: 1,
        name: "M",
        drops: [
          {
            table_name: "T",
            items: [
              {
                name: "X",
                id: 10,
                quantity: [2, 3],
                rarity: [1, 1],
              },
            ],
          },
        ],
      },
    ];
    const rows = getFlattenedLootRows(loot, 1, { "10": 100 });
    expect(rows[0].quantityLabel).toBe("2-3");
  });
});
