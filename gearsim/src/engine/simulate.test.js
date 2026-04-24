import { describe, it, expect } from "vitest";
import { simulateFightTicks, histogramBins } from "./simulate.js";

describe("simulateFightTicks", () => {
  it("terminates", () => {
    const t = simulateFightTicks(1, 10, 4, 50);
    expect(t).toBeGreaterThan(0);
    expect(t % 4).toBe(0);
  });
});

describe("histogramBins", () => {
  it("bins counts", () => {
    const h = histogramBins([1, 1, 1, 5], 4);
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(4);
  });
});
