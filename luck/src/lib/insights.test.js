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

  it('uses per-mode counts and the planned mode', () => {
    const moded = {
      ...activity('moded', [[1, 10]]),
      modes: [
        { id: 'default', name: 'Normal' },
        { id: 'boosted', name: 'Boosted', rates: { 'moded-0': [1, 5] } },
      ],
    }
    const modedProgress = {
      ...progress(100, {}, 1),
      counts: { default: 50, boosted: 50 },
      plannedMode: 'boosted',
    }
    const result = buildInsights([moded], () => modedProgress)
    expect(result.driestItems[0].dryChance).toBeCloseTo(0.9 ** 50 * 0.8 ** 50)
    expect(result.fastestGreenlogs[0].expectedUnits).toBeCloseTo(5)
  })

  it('keeps obtained items out of the driest list unless they are under rate', () => {
    const grind = activity('grind', [[1, 10]])
    const underRate = progress(100, { 'grind-0': [20] })
    const excluded = buildInsights([grind], () => underRate)
    expect(excluded.driestItems).toHaveLength(0)

    const included = buildInsights([grind], () => underRate, 5, { includeObtainedUnderRate: true })
    expect(included.driestItems).toHaveLength(1)
    expect(included.driestItems[0].obtained).toBe(true)
    expect(included.driestItems[0].luck.position).toBe('Below rate')
    expect(included.driestItems[0].luck.observed).toBe(1)
  })

  it('ranks a rarer dry streak ahead of a milder under-rate drop', () => {
    const missing = activity('missing', [[1, 5]])
    const obtained = activity('obtained', [[1, 100]])
    const result = buildInsights(
      [missing, obtained],
      (id) => (id === 'missing' ? progress(20) : progress(200, { 'obtained-0': [40] })),
      5,
      { includeObtainedUnderRate: true },
    )
    expect(result.driestItems.map((item) => item.drop.id)).toEqual(['missing-0', 'obtained-0'])
  })

  it('still excludes obtained items that are above rate', () => {
    const spoon = activity('spoon', [[1, 100]])
    const result = buildInsights(
      [spoon],
      () => progress(50, { 'spoon-0': [1, 2, 3] }),
      5,
      { includeObtainedUnderRate: true },
    )
    expect(result.driestItems).toHaveLength(0)
  })

  it('orders greenlog estimates by expected play time', () => {
    const ids = insights.fastestGreenlogs.map((entry) => entry.activity.id)
    expect(ids).toEqual(['dry', 'lucky'])
    expect(insights.fastestGreenlogs[0].expectedHours).toBeCloseTo((10 * 2) / 60)
  })
})
