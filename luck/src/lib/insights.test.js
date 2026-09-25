import { describe, expect, it } from 'vitest'
import { buildInsights, distinctCountDistribution } from './insights'

function activity(id, rates, rollsPerUnit = 1) {
  const drops = rates.map((rate, index) => ({ id: `${id}-${index}`, name: `${id} ${index}`, rate }))
  return {
    id,
    name: id,
    drops,
    groups: [{ id: 'main', type: 'independent', rollsPerUnit, drops: drops.map((drop) => drop.id) }],
  }
}

function progress(count, drops = {}, minutesPerUnit = 0) {
  return {
    count,
    minutesPerUnit,
    drops: Object.fromEntries(
      Object.entries(drops).map(([id, ats]) => [id, ats.map((at, index) => ({ id: `${id}${index}`, at }))]),
    ),
  }
}

describe('distinctCountDistribution', () => {
  it('matches the Poisson-binomial distribution', () => {
    const [none, one, two] = distinctCountDistribution([0.5, 0.25])
    expect(none).toBeCloseTo(0.375)
    expect(one).toBeCloseTo(0.5)
    expect(two).toBeCloseTo(0.125)
  })
})

describe('buildInsights', () => {
  const lucky = activity('lucky', [[1, 1000], [1, 1000]])
  const dry = activity('dry', [[1, 10]])
  const untouched = activity('untouched', [[1, 2]])
  const state = {
    lucky: progress(5, { 'lucky-0': [1] }, 1),
    dry: progress(100, {}, 2),
  }
  const insights = buildInsights([lucky, dry, untouched], (id) => state[id])

  it('ignores activities without progress', () => {
    expect(insights.overview.activitiesStarted).toBe(2)
    expect(insights.overview.uniquesObtained).toBe(1)
    expect(insights.overview.uniquesTracked).toBe(3)
    expect(insights.overview.playHours).toBeCloseTo((5 * 1 + 100 * 2) / 60)
  })

  it('ranks the driest missing items first', () => {
    expect(insights.driestItems[0].drop.id).toBe('dry-0')
    expect(insights.driestItems[0].dryChance).toBeCloseTo(0.9 ** 100)
  })

  it('ranks early first copies as the luckiest drops', () => {
    expect(insights.luckiestDrops).toHaveLength(1)
    expect(insights.luckiestDrops[0].chance).toBeCloseTo(0.001)
  })

  it('separates spooned and dry activities', () => {
    expect(insights.luckiestActivities.map((entry) => entry.activity.id)).toEqual(['lucky'])
    expect(insights.unluckiestActivities.map((entry) => entry.activity.id)).toEqual(['dry'])
  })

  it('orders greenlog estimates by expected play time', () => {
    const ids = insights.fastestGreenlogs.map((entry) => entry.activity.id)
    expect(ids).toEqual(['dry', 'lucky'])
    expect(insights.fastestGreenlogs[0].expectedHours).toBeCloseTo((10 * 2) / 60)
  })
})
