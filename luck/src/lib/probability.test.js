import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  binomialProbability,
  collectionChance,
  collectionMilestoneUnits,
  dropByProbability,
  getDropIntervals,
  itemLuckStats,
  noDropProbability,
  rateToProbability,
  remainingCollectionStats,
  unitsToDuration,
} from './probability'

const independentActivity = {
  drops: [
    { id: 'a', rate: [1, 2] },
    { id: 'b', rate: [1, 4] },
  ],
  groups: [
    { id: 'independent', type: 'independent', drops: ['a', 'b'] },
  ],
}

const exclusiveActivity = {
  drops: [
    { id: 'a', rate: [1, 4] },
    { id: 'b', rate: [1, 4] },
  ],
  groups: [
    { id: 'unique-table', type: 'exclusive', drops: ['a', 'b'] },
  ],
}

describe('drop probabilities', () => {
  it('parses rational rates and rejects invalid values', () => {
    expect(rateToProbability([1, 400])).toBe(0.0025)
    expect(() => rateToProbability([2, 1])).toThrow()
    expect(() => rateToProbability([1, 0])).toThrow()
  })

  it('calculates dry tails and cumulative drop chance', () => {
    expect(noDropProbability([1, 2], 3)).toBeCloseTo(0.125)
    expect(dropByProbability([1, 2], 3)).toBeCloseTo(0.875)
  })

  it('builds first-drop, duplicate, and current dry intervals', () => {
    expect(getDropIntervals([9, 3, 9, 25], 20)).toEqual({
      copies: [
        { at: 3, interval: 3, copy: 1 },
        { at: 9, interval: 6, copy: 2 },
        { at: 9, interval: 0, copy: 3 },
      ],
      currentStreak: 11,
      lastDrop: 9,
    })
  })

  it('summarizes item luck against the expected drop distribution', () => {
    expect(binomialProbability(4, 0.5, 2)).toBeCloseTo(0.375)

    const lucky = itemLuckStats([1, 100], 500, 8)
    expect(lucky.expected).toBe(5)
    expect(lucky.delta).toBe(3)
    expect(lucky.ratio).toBeCloseTo(1.6)
    expect(lucky.position).toBe('Above rate')
    expect(lucky.percentile).toBeGreaterThan(0.9)
  })

  it('models duplicate-protected items as obtained or missing', () => {
    const stats = itemLuckStats([1, 100], 100, 1, true)
    expect(stats.expected).toBeCloseTo(1 - 0.99 ** 100)
    expect(stats.distribution.trials).toBe(1)
    expect(stats.distribution.observed).toBe(1)
  })
})

describe('collection calculations', () => {
  it('calculates independent collection completion', () => {
    const expected = (1 - 0.5 ** 2) * (1 - 0.75 ** 2)
    expect(collectionChance(independentActivity, 2)).toBeCloseTo(expected)
  })

  it('accounts for mutually exclusive outcomes', () => {
    expect(collectionChance(exclusiveActivity, 1)).toBe(0)
    expect(collectionChance(exclusiveActivity, 2)).toBeCloseTo(0.125)
  })

  it('finds the first action count that reaches a collection milestone', () => {
    const units = collectionMilestoneUnits(independentActivity, 0.5)

    expect(units).toBe(3)
    expect(collectionChance(independentActivity, units)).toBeGreaterThanOrEqual(0.5)
    expect(collectionChance(independentActivity, units - 1)).toBeLessThan(0.5)
  })

  it('returns null when a collection milestone exceeds the search range', () => {
    expect(collectionMilestoneUnits(independentActivity, 0.99, { maxUnits: 2 })).toBeNull()
    expect(() => collectionMilestoneUnits(independentActivity, 1)).toThrow()
  })

  it('conditions remaining estimates on obtained drops', () => {
    const stats = remainingCollectionStats(independentActivity, ['a'])
    expect(stats.expected).toBeCloseTo(4)
    expect(stats.median).toBe(3)
    expect(stats.p90).toBe(9)
    expect(stats.bounded).toBe(true)
  })

  it('returns zero remaining work for a completed collection', () => {
    expect(remainingCollectionStats(independentActivity, ['a', 'b'])).toEqual({
      expected: 0,
      median: 0,
      p90: 0,
      bounded: true,
      evaluatedUnits: 0,
    })
  })

  it('approximates large exclusive collections close to the exact result', () => {
    const size = 30
    const rate = 1 / 300
    const ids = Array.from({ length: size }, (_, index) => `drop-${index}`)
    const activity = {
      drops: ids.map((id) => ({ id, rate: [1, 300] })),
      groups: [{ id: 'table', type: 'exclusive', drops: ids }],
    }
    const exactChance = (units) => {
      let chance = 0
      let combination = 1
      for (let excluded = 0; excluded <= size; excluded += 1) {
        chance += (excluded % 2 === 0 ? 1 : -1) * combination
          * (1 - excluded * rate) ** units
        combination = combination * (size - excluded) / (excluded + 1)
      }
      return chance
    }

    for (const units of [5_000, 10_000, 20_000]) {
      expect(Math.abs(collectionChance(activity, units) - exactChance(units)))
        .toBeLessThan(0.01)
    }
    expect(collectionChance(activity, 1_000_000, ids.slice(1))).toBeCloseTo(1)

    const fresh = remainingCollectionStats(activity)
    const partial = remainingCollectionStats(activity, ids.slice(0, 20))
    expect(fresh.expected).toBeGreaterThan(partial.expected)
    expect(remainingCollectionStats(activity, ids).expected).toBe(0)
  })

  it('validates every starter activity and handles the full Barrows log', () => {
    const catalog = JSON.parse(readFileSync(
      new URL('../../public/data/activities.json', import.meta.url),
      'utf8',
    ))

    for (const activity of catalog.activities) {
      expect(collectionChance(activity, 0)).toBeCloseTo(0)
      expect(collectionChance(activity, 1_000_000)).toBeGreaterThan(0.99)
      const stats = remainingCollectionStats(activity)
      expect(stats.expected).toBeGreaterThan(0)
      expect(stats.median).toBeGreaterThan(0)
      expect(stats.p90).toBeGreaterThan(stats.median)
    }
  })
})

describe('time conversion', () => {
  it('converts units and average minutes to hours', () => {
    expect(unitsToDuration(120, 2.5)).toEqual({
      minutes: 300,
      hours: 5,
    })
    expect(unitsToDuration(10, -1)).toBeNull()
  })
})
