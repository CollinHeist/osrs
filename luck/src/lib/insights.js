import {
  dropByProbability,
  getDropIntervals,
  noDropProbability,
  remainingCollectionStats,
  rollsForDrop,
} from './probability'

const EMPTY_PROGRESS = { count: 0, minutesPerUnit: 0, drops: {} }

// Poisson-binomial distribution of how many distinct uniques a fresh player would
// have seen, treating each drop as independent (accurate to O(rate) for exclusive tables).
export function distinctCountDistribution(probabilities) {
  let distribution = [1]
  for (const probability of probabilities) {
    const next = new Array(distribution.length + 1).fill(0)
    distribution.forEach((chance, count) => {
      next[count] += chance * (1 - probability)
      next[count + 1] += chance * probability
    })
    distribution = next
  }
  return distribution
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function isStarted(progress) {
  return progress.count > 0 || Object.values(progress.drops).some((entries) => entries.length > 0)
}

function describeDrop(activity, drop, progress) {
  const entries = progress.drops[drop.id] ?? []
  const known = entries.filter((entry) => entry.at !== null).map((entry) => entry.at)
  const rolls = rollsForDrop(activity, drop.id)
  return {
    activity,
    drop,
    obtained: entries.length > 0,
    firstAt: known.length ? Math.min(...known) : null,
    rolls,
    seenChance: dropByProbability(drop.rate, progress.count * rolls),
    intervals: getDropIntervals(known, progress.count),
  }
}

function activityLuck(activity, drops) {
  const obtained = drops.filter((item) => item.obtained).length
  const distribution = distinctCountDistribution(drops.map((item) => item.seenChance))
  return {
    activity,
    obtained,
    total: drops.length,
    expected: sum(drops.map((item) => item.seenChance)),
    atLeastChance: Math.min(1, sum(distribution.slice(obtained))),
    atMostChance: Math.min(1, sum(distribution.slice(0, obtained + 1))),
  }
}

function greenlogEstimate(activity, progress, drops) {
  const obtainedIds = drops.filter((item) => item.obtained).map((item) => item.drop.id)
  let remaining
  try {
    remaining = remainingCollectionStats(activity, obtainedIds)
  } catch {
    return null
  }
  const hasPace = progress.minutesPerUnit > 0
  return {
    activity,
    missing: drops.length - obtainedIds.length,
    expectedUnits: remaining.expected,
    medianUnits: remaining.median,
    expectedHours: hasPace && remaining.expected !== null
      ? (remaining.expected * progress.minutesPerUnit) / 60
      : null,
  }
}

function compareGreenlogs(left, right) {
  if (left.expectedHours !== null && right.expectedHours !== null) {
    return left.expectedHours - right.expectedHours
  }
  if (left.expectedHours !== null) return -1
  if (right.expectedHours !== null) return 1
  return (left.expectedUnits ?? Infinity) - (right.expectedUnits ?? Infinity)
}

export function buildInsights(activities, getProgress, limit = 5) {
  const started = activities
    .map((activity) => ({ activity, progress: getProgress(activity.id) ?? EMPTY_PROGRESS }))
    .filter(({ activity, progress }) => activity.drops.length > 0 && isStarted(progress))
    .map(({ activity, progress }) => ({
      activity,
      progress,
      drops: activity.drops.map((drop) => describeDrop(activity, drop, progress)),
    }))
  const allDrops = started.flatMap(({ drops }) => drops)
  const counted = started.filter(({ progress }) => progress.count > 0)

  // Items still missing, ranked by how unusual the current dry streak is.
  const driestItems = allDrops
    .filter((item) => !item.obtained && item.intervals.currentStreak > 0)
    .map((item) => ({
      ...item,
      streak: item.intervals.currentStreak,
      dryChance: noDropProbability(item.drop.rate, item.intervals.currentStreak * item.rolls),
    }))
    .sort((left, right) => left.dryChance - right.dryChance)
    .slice(0, limit)

  // Items whose first recorded copy came unusually early.
  const luckiestDrops = allDrops
    .filter((item) => item.firstAt !== null)
    .map((item) => ({
      ...item,
      chance: dropByProbability(item.drop.rate, item.firstAt * item.rolls),
    }))
    .sort((left, right) => left.chance - right.chance)
    .slice(0, limit)

  const luck = counted.map(({ activity, drops }) => activityLuck(activity, drops))
  const luckiestActivities = luck
    .filter((entry) => entry.obtained > 0 && entry.atLeastChance < 0.5)
    .sort((left, right) => left.atLeastChance - right.atLeastChance)
    .slice(0, limit)
  const unluckiestActivities = luck
    .filter((entry) => entry.obtained < entry.total && entry.atMostChance < 0.5)
    .sort((left, right) => left.atMostChance - right.atMostChance)
    .slice(0, limit)

  const fastestGreenlogs = started
    .filter(({ drops }) => drops.some((item) => !item.obtained))
    .map(({ activity, progress, drops }) => greenlogEstimate(activity, progress, drops))
    .filter(Boolean)
    .sort(compareGreenlogs)
    .slice(0, limit)

  const timed = started.filter(({ progress }) => progress.minutesPerUnit > 0)
  return {
    overview: {
      activitiesStarted: started.length,
      activitiesTotal: activities.filter((activity) => activity.drops.length > 0).length,
      uniquesObtained: allDrops.filter((item) => item.obtained).length,
      uniquesTracked: allDrops.length,
      uniquesExpected: sum(counted.flatMap(({ drops }) => drops.map((item) => item.seenChance))),
      greenlogs: started.filter(({ drops }) => drops.every((item) => item.obtained)).length,
      playHours: sum(timed.map(({ progress }) => (progress.count * progress.minutesPerUnit) / 60)),
      timedActivities: timed.length,
    },
    driestItems,
    luckiestDrops,
    luckiestActivities,
    unluckiestActivities,
    fastestGreenlogs,
  }
}
