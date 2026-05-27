import { describe, it, expect } from "vitest";
import {
  buildPriceById,
  buildPriceByIdFromLatestPrices,
  volumeWeightedPriceFromLatestRow,
} from "./normalizeData.js";

describe("buildPriceById", () => {
  it("maps array rows by id", () => {
    const m = buildPriceById([{ id: 1, value: 100 }]);
    expect(m["1"]).toBe(100);
  });
});

describe("volumeWeightedPriceFromLatestRow", () => {
  it("blends high and low by volume", () => {
    const row = {
      avgHighPrice: 264,
      highPriceVolume: 332992,
      avgLowPrice: 260,
      lowPriceVolume: 182012,
    };
    const v = volumeWeightedPriceFromLatestRow(row);
    const expected =
      (264 * 332992 + 260 * 182012) / (332992 + 182012);
    expect(v).toBeCloseTo(expected, 6);
  });

  it("uses low only when high has no volume", () => {
    expect(
      volumeWeightedPriceFromLatestRow({
        avgHighPrice: null,
        highPriceVolume: 0,
        avgLowPrice: 171218,
        lowPriceVolume: 6,
      })
    ).toBe(171218);
  });

  it("uses high only when low has no volume", () => {
    expect(
      volumeWeightedPriceFromLatestRow({
        avgHighPrice: 565,
        highPriceVolume: 14,
        avgLowPrice: null,
        lowPriceVolume: 0,
      })
    ).toBe(565);
  });

  it("returns 0 when no usable price-volume pairs", () => {
    expect(
      volumeWeightedPriceFromLatestRow({
        avgHighPrice: null,
        highPriceVolume: 0,
        avgLowPrice: null,
        lowPriceVolume: 0,
      })
    ).toBe(0);
  });
});

describe("buildPriceByIdFromLatestPrices", () => {
  it("reads data map keys as item ids", () => {
    const raw = {
      data: {
        "99": {
          avgHighPrice: 100,
          highPriceVolume: 1,
          avgLowPrice: 50,
          lowPriceVolume: 3,
        },
      },
    };
    const m = buildPriceByIdFromLatestPrices(raw);
    expect(m["99"]).toBeCloseTo((100 * 1 + 50 * 3) / 4, 8);
  });
});
