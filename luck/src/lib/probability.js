const DEFAULT_MAX_UNITS = 2_000_000
const EXACT_DROP_LIMIT = 24

export function rateToProbability(rate) {
  if (!Array.isArray(rate) || rate.length !== 2) {
    throw new Error('Drop rate must be a [numerator, denominator] pair.')
  }

  const [numerator, denominator] = rate.map(Number)
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 0 ||
    denominator <= 0 ||
    numerator > denominator
  ) {
    throw new Error('Drop rate must satisfy 0 ≤ numerator ≤ denominator.')
  }

  return numerator / denominator
}

export function noDropProbability(rate, eligibleUnits) {
  const units = Math.max(0, Math.floor(Number(eligibleUnits) || 0))
  return Math.pow(1 - rateToProbability(rate), units)
}

export function dropByProbability(rate, eligibleUnits) {
  return 1 - noDropProbability(rate, eligibleUnits)
}

function groupRolls(group) {
  return Math.max(0, Math.floor(Number(group.rollsPerUnit ?? 1) || 0))
}

export function rollsForDrop(activity, dropId) {
  const groups = (activity.groups ?? []).filter((group) => group.drops.includes(dropId))
  if (groups.length === 0) return 1
  return groups.reduce((sum, group) => sum + groupRolls(group), 0)
}

const DEFAULT_MODE = { id: 'default', name: 'Default' }
const resolvedModeCache = new WeakMap()

export function getModes(activity) {
  return activity.modes?.length ? activity.modes : [DEFAULT_MODE]
}

export function hasMultipleModes(activity) {
  return getModes(activity).length > 1
}

/**
 * Return a copy of the activity with a mode's group roll and drop rate overrides
 * applied. Unknown mode IDs resolve to the first (default) mode. Results are
 * cached per activity object so repeated calls return a stable reference.
 */
export function resolveMode(activity, modeId) {
  const modes = getModes(activity)
  const mode = modes.find((candidate) => candidate.id === modeId) ?? modes[0]
  let cache = resolvedModeCache.get(activity)
  if (!cache) {
    cache = new Map()
    resolvedModeCache.set(activity, cache)
  }
  if (cache.has(mode.id)) return cache.get(mode.id)

  const groups = (activity.groups ?? activity.drops.map((drop) => ({
    id: `independent-${drop.id}`,
    type: 'independent',
    rollsPerUnit: 1,
    drops: [drop.id],
  }))).map((group) => (
    mode.groupRolls?.[group.id] === undefined
      ? group
      : { ...group, rollsPerUnit: mode.groupRolls[group.id] }
  ))
  const drops = activity.drops.map((drop) => (
    mode.rates?.[drop.id] ? { ...drop, rate: mode.rates[drop.id] } : drop
  ))
  const resolved = { ...activity, groups, drops, mode }
  cache.set(mode.id, resolved)
  return resolved
}

/** Read per-mode counts from progress, falling back to a legacy single count. */
export function progressCounts(progress) {
  if (progress?.counts) return progress.counts
  return { default: Math.max(0, Math.floor(Number(progress?.count) || 0)) }
}

function modeCount(counts, modeId) {
  return Math.max(0, Math.floor(Number(counts?.[modeId]) || 0))
}

export function totalModeCount(activity, counts) {
  return getModes(activity).reduce((sum, mode) => sum + modeCount(counts, mode.id), 0)
}

/**
 * Describe a drop's eligible rolls as one segment per mode with a nonzero
 * count, since each mode may roll the drop at a different rate and frequency.
 */
export function dropExposure(activity, counts, dropId) {
  return getModes(activity)
    .map((mode) => {
      const resolved = resolveMode(activity, mode.id)
      const drop = resolved.drops.find((candidate) => candidate.id === dropId)
      return {
        modeId: mode.id,
        rate: drop.rate,
        probability: rateToProbability(drop.rate),
        rolls: modeCount(counts, mode.id) * rollsForDrop(resolved, dropId),
      }
    })
    .filter((segment) => segment.rolls > 0 && segment.probability > 0)
}

/**
 * Exposure for a span of `units` inside the grind, assuming the overall mix of
 * modes held evenly throughout. Scaled roll counts may be fractional.
 */
export function exposureForUnits(activity, counts, dropId, units) {
  const total = totalModeCount(activity, counts)
  const span = Math.max(0, Number(units) || 0)
  if (total === 0 || span === 0) return []
  return dropExposure(activity, counts, dropId)
    .map((segment) => ({ ...segment, rolls: (segment.rolls * span) / total }))
}

export function exposureNoDrop(segments) {
  const logMiss = segments.reduce(
    (sum, segment) => sum + segment.rolls * Math.log1p(-segment.probability),
    0,
  )
  return Math.exp(logMiss)
}

export function exposureDropBy(segments) {
  return 1 - exposureNoDrop(segments)
}

export function binomialProbability(trials, probability, successes) {
  const n = Math.max(0, Math.floor(Number(trials) || 0))
  const k = Math.floor(Number(successes))
  const p = Number(probability)
  if (!Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) return 0
  if (p === 0) return k === 0 ? 1 : 0
  if (p === 1) return k === n ? 1 : 0

  const logProbability = logGamma(n + 1)
    - logGamma(k + 1)
    - logGamma(n - k + 1)
    + k * Math.log(p)
    + (n - k) * Math.log1p(-p)
  return Math.exp(logProbability)
}

export function itemLuckStats(
  rate,
  eligibleRolls,
  observedCount,
  duplicateProtected = false,
) {
  const rolls = Math.max(0, Math.floor(Number(eligibleRolls) || 0))
  const recorded = Math.max(0, Math.floor(Number(observedCount) || 0))
  const observed = duplicateProtected ? Math.min(1, recorded) : recorded
  const perRoll = rateToProbability(rate)
  const distribution = duplicateProtected
    ? { trials: 1, probability: dropByProbability(rate, rolls), observed }
    : { trials: rolls, probability: perRoll, observed }
  const expected = distribution.trials * distribution.probability
  const variance = expected * (1 - distribution.probability)
  const percentile = binomialCdf(
    distribution.trials,
    distribution.probability,
    distribution.observed,
  )
  const delta = observed - expected
  const threshold = Math.max(0.05, expected * 0.05)
  const position = rolls === 0
    ? 'No rolls yet'
    : delta > threshold ? 'Above rate' : delta < -threshold ? 'Below rate' : 'On rate'

  return {
    rolls,
    observed,
    expected,
    delta,
    ratio: expected > 0 ? observed / expected : null,
    percentile,
    standardDeviations: variance > 0
      ? (distribution.observed - expected) / Math.sqrt(variance)
      : null,
    position,
    distribution,
  }
}

/**
 * Distribution of total drops across several binomial segments. A single
 * segment uses the exact binomial; large variances use a normal approximation;
 * otherwise the segment probability mass functions are convolved.
 */
function exposureCountDistribution(segments) {
  const mean = segments.reduce((sum, { rolls, probability }) => sum + rolls * probability, 0)
  const variance = segments.reduce(
    (sum, { rolls, probability }) => sum + rolls * probability * (1 - probability),
    0,
  )
  const deviation = Math.sqrt(variance)
  const maxCount = segments.reduce((sum, { rolls }) => sum + Math.floor(rolls), 0)

  if (segments.length <= 1) {
    const trials = Math.floor(segments[0]?.rolls ?? 0)
    const probability = segments[0]?.probability ?? 0
    return {
      mean,
      deviation,
      maxCount,
      probabilityOf: (count) => binomialProbability(trials, probability, count),
      cdf: (count) => binomialCdf(trials, probability, count),
    }
  }

  if (variance > 100) {
    const cdf = (count) => (count < 0 ? 0 : count >= maxCount ? 1 : normalCdf((count + 0.5 - mean) / deviation))
    return {
      mean,
      deviation,
      maxCount,
      probabilityOf: (count) => cdf(count) - cdf(count - 1),
      cdf,
    }
  }

  // Convolve per-segment binomial masses up to a limit well past the mean.
  const limit = Math.min(maxCount, Math.ceil(mean + 10 * deviation + 10))
  let masses = [1]
  for (const { rolls, probability } of segments) {
    const trials = Math.floor(rolls)
    const segmentMasses = Array.from(
      { length: Math.min(trials, limit) + 1 },
      (_, count) => binomialProbability(trials, probability, count),
    )
    const next = new Array(Math.min(limit, masses.length - 1 + segmentMasses.length - 1) + 1).fill(0)
    masses.forEach((left, leftCount) => {
      segmentMasses.forEach((right, rightCount) => {
        const count = leftCount + rightCount
        if (count <= limit) next[count] += left * right
      })
    })
    masses = next
  }
  const cumulative = []
  masses.reduce((sum, mass, count) => {
    cumulative[count] = sum + mass
    return cumulative[count]
  }, 0)

  return {
    mean,
    deviation,
    maxCount,
    probabilityOf: (count) => masses[count] ?? 0,
    cdf: (count) => (count < 0 ? 0 : Math.min(1, cumulative[Math.min(count, cumulative.length - 1)])),
  }
}

/**
 * Summarize observed drops against an exposure spanning one or more modes.
 * Mirrors `itemLuckStats`, and matches it exactly for a single segment.
 */
export function exposureLuckStats(segments, observedCount, duplicateProtected = false) {
  const rolls = segments.reduce((sum, segment) => sum + segment.rolls, 0)
  const recorded = Math.max(0, Math.floor(Number(observedCount) || 0))
  const observed = duplicateProtected ? Math.min(1, recorded) : recorded

  let distribution
  if (duplicateProtected) {
    const chance = exposureDropBy(segments)
    distribution = {
      mean: chance,
      deviation: Math.sqrt(chance * (1 - chance)),
      maxCount: 1,
      probabilityOf: (count) => (count === 0 ? 1 - chance : count === 1 ? chance : 0),
      cdf: (count) => (count < 0 ? 0 : count === 0 ? 1 - chance : 1),
    }
  } else {
    distribution = exposureCountDistribution(segments)
  }

  const expected = distribution.mean
  const variance = distribution.deviation ** 2
  const delta = observed - expected
  const threshold = Math.max(0.05, expected * 0.05)
  const position = rolls === 0
    ? 'No rolls yet'
    : delta > threshold ? 'Above rate' : delta < -threshold ? 'Below rate' : 'On rate'

  return {
    rolls,
    observed,
    expected,
    delta,
    ratio: expected > 0 ? observed / expected : null,
    percentile: distribution.cdf(observed),
    standardDeviations: variance > 0 ? (observed - expected) / Math.sqrt(variance) : null,
    position,
    distribution: { ...distribution, observed },
  }
}

function binomialCdf(trials, probability, successes) {
  if (successes < 0) return 0
  if (successes >= trials) return 1
  if (probability === 0) return 1
  if (probability === 1) return successes >= trials ? 1 : 0

  const variance = trials * probability * (1 - probability)
  if (variance > 100) {
    const z = (successes + 0.5 - trials * probability) / Math.sqrt(variance)
    return normalCdf(z)
  }

  let term = Math.pow(1 - probability, trials)
  let cumulative = term
  for (let count = 0; count < successes; count += 1) {
    term *= ((trials - count) / (count + 1)) * (probability / (1 - probability))
    cumulative += term
  }
  return Math.min(1, Math.max(0, cumulative))
}

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * x)
  const coefficients = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const polynomial = coefficients.reduceRight(
    (sum, coefficient) => (sum + coefficient) * t,
    0,
  )
  const erf = sign * (1 - polynomial * Math.exp(-x * x))
  return (1 + erf) / 2
}

function logGamma(value) {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ]
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value)
  }

  const shifted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => {
    series += coefficient / (shifted + index + 1)
  })
  const base = shifted + coefficients.length - 0.5
  return 0.5 * Math.log(2 * Math.PI)
    + (shifted + 0.5) * Math.log(base)
    - base
    + Math.log(series)
}

export function getDropIntervals(history, currentCount) {
  const count = Math.max(0, Math.floor(Number(currentCount) || 0))
  const sorted = [...history]
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0 && value <= count)
    .sort((a, b) => a - b)

  const copies = sorted.map((at, index) => {
    const previous = index === 0 ? 0 : sorted[index - 1]
    return { at, interval: at - previous, copy: index + 1 }
  })
  const lastDrop = sorted.at(-1) ?? 0

  return {
    copies,
    currentStreak: count - lastDrop,
    lastDrop,
  }
}

function normalizeGroups(activity) {
  const dropIds = activity.drops.map((drop) => drop.id)
  const groups = activity.groups ?? activity.drops.map((drop) => ({
    id: `independent-${drop.id}`,
    type: 'independent',
    rollsPerUnit: 1,
    drops: [drop.id],
  }))

  for (const group of groups) {
    const probabilitySum = group.drops.reduce((sum, dropId) => {
      const drop = activity.drops.find((candidate) => candidate.id === dropId)
      if (!drop) throw new Error(`Unknown drop "${dropId}" in group "${group.id}".`)
      return sum + rateToProbability(drop.rate)
    }, 0)

    if (group.type === 'exclusive' && probabilitySum > 1 + Number.EPSILON) {
      throw new Error(`Exclusive group "${group.id}" has probabilities above 1.`)
    }
    if (!['exclusive', 'independent'].includes(group.type)) {
      throw new Error(`Unsupported drop group type "${group.type}".`)
    }
  }

  return { dropIds, groups }
}

export function createCollectionModel(activity) {
  const { dropIds, groups } = normalizeGroups(activity)
  if (dropIds.length > EXACT_DROP_LIMIT) {
    throw new Error(
      `Exact collection calculations support at most ${EXACT_DROP_LIMIT} tracked drops.`,
    )
  }

  return {
    groups,
    dropIds,
    dropsById: new Map(activity.drops.map((drop) => [drop.id, drop])),
    dropIndex: new Map(dropIds.map((dropId, index) => [dropId, index])),
    completeMask: (1 << dropIds.length) - 1,
  }
}

export function maskForObtained(model, obtainedDropIds) {
  return obtainedDropIds.reduce((mask, dropId) => {
    const index = model.dropIndex.get(dropId)
    return index === undefined ? mask : mask | (1 << index)
  }, 0)
}

function isLargeCollection(activity) {
  return activity.drops.length > EXACT_DROP_LIMIT
}

export function collectionChance(activity, units, obtainedDropIds = []) {
  const count = Math.max(0, Math.floor(Number(units) || 0))
  if (isLargeCollection(activity)) {
    return approximateCollectionChance(missRateClasses(activity, obtainedDropIds), count)
  }

  const model = createCollectionModel(activity)
  const obtainedMask = maskForObtained(model, obtainedDropIds)
  const missingIndices = model.dropIds
    .map((_, index) => index)
    .filter((index) => !(obtainedMask & (1 << index)))

  if (missingIndices.length === 0) return 1
  const symmetric = getSymmetricExclusiveModel(model, missingIndices)
  if (symmetric) {
    return symmetricCollectionChance(symmetric, count)
  }
  if (missingIndices.length > 20) {
    throw new Error('Large collections must use one equal-rate exclusive drop group.')
  }

  let chance = 0
  const subsetCount = 1 << missingIndices.length
  for (let subset = 0; subset < subsetCount; subset += 1) {
    const excludedMask = missingIndices.reduce((mask, dropIndex, subsetIndex) => (
      subset & (1 << subsetIndex) ? mask | (1 << dropIndex) : mask
    ), 0)
    const absentPerUnit = probabilityNoneFromMask(model, excludedMask)
    const parity = popcount(subset) % 2 === 0 ? 1 : -1
    chance += parity * Math.pow(absentPerUnit, count)
  }

  return Math.min(1, Math.max(0, chance))
}

/**
 * Chance a fresh player has every missing drop after the given per-mode counts.
 * Each inclusion-exclusion term multiplies the per-mode miss chances raised to
 * that mode's count.
 */
export function collectionChanceForCounts(activity, counts, obtainedDropIds = []) {
  const segments = getModes(activity)
    .map((mode) => ({ activity: resolveMode(activity, mode.id), units: modeCount(counts, mode.id) }))
    .filter((segment) => segment.units > 0)
  if (segments.length === 0) return collectionChance(activity, 0, obtainedDropIds)
  if (segments.length === 1) {
    return collectionChance(segments[0].activity, segments[0].units, obtainedDropIds)
  }

  // Large collections combine each drop's per-mode log miss chance.
  if (isLargeCollection(activity)) {
    const combined = new Map()
    for (const segment of segments) {
      for (const [dropId, logMiss] of dropLogMisses(segment.activity, obtainedDropIds)) {
        combined.set(dropId, (combined.get(dropId) ?? 0) + segment.units * logMiss)
      }
    }
    return approximateCollectionChance(classesFromLogMisses(combined), 1)
  }

  const models = segments.map((segment) => ({
    model: createCollectionModel(segment.activity),
    units: segment.units,
  }))
  const reference = models[0].model
  const obtainedMask = maskForObtained(reference, obtainedDropIds)
  const missingIndices = reference.dropIds
    .map((_, index) => index)
    .filter((index) => !(obtainedMask & (1 << index)))
  if (missingIndices.length === 0) return 1
  if (missingIndices.length > 20) {
    throw new Error('Large collections must use one equal-rate exclusive drop group.')
  }

  // Inclusion-exclusion over subsets of missing drops, across every mode.
  let chance = 0
  const subsetCount = 1 << missingIndices.length
  for (let subset = 0; subset < subsetCount; subset += 1) {
    const excludedMask = missingIndices.reduce((mask, dropIndex, subsetIndex) => (
      subset & (1 << subsetIndex) ? mask | (1 << dropIndex) : mask
    ), 0)
    const absent = models.reduce(
      (product, { model, units }) => product * Math.pow(probabilityNoneFromMask(model, excludedMask), units),
      1,
    )
    const parity = popcount(subset) % 2 === 0 ? 1 : -1
    chance += parity * absent
  }

  return Math.min(1, Math.max(0, chance))
}

/**
 * Additional units of the planned mode needed, on top of the current per-mode
 * counts, for a fresh player's completion chance to reach `target`.
 */
export function collectionMilestoneUnitsForCounts(
  activity,
  counts,
  plannedModeId,
  target,
  options = {},
) {
  const probability = Number(target)
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error('Collection milestone must be between 0 and 1.')
  }

  const planned = resolveMode(activity, plannedModeId).mode.id
  const maxUnits = options.maxUnits ?? DEFAULT_MAX_UNITS
  return findQuantile(
    (units) => collectionChanceForCounts(activity, {
      ...counts,
      [planned]: modeCount(counts, planned) + units,
    }),
    probability,
    maxUnits,
  )
}

export function collectionMilestoneUnits(
  activity,
  target,
  options = {},
) {
  const probability = Number(target)
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1) {
    throw new Error('Collection milestone must be between 0 and 1.')
  }

  const maxUnits = options.maxUnits ?? DEFAULT_MAX_UNITS
  return findQuantile(
    (units) => collectionChance(activity, units),
    probability,
    maxUnits,
  )
}

export function remainingCollectionStats(
  activity,
  obtainedDropIds = [],
  options = {},
) {
  const maxUnits = options.maxUnits ?? DEFAULT_MAX_UNITS
  const complete = {
    expected: 0,
    median: 0,
    p90: 0,
    bounded: true,
    evaluatedUnits: 0,
  }

  if (isLargeCollection(activity)) {
    const classes = missRateClasses(activity, obtainedDropIds)
    if (classes.length === 0) return complete
    const chanceAt = (units) => approximateCollectionChance(classes, units)
    const expected = approximateExpected(classes, maxUnits)
    const p90 = findQuantile(chanceAt, 0.9, maxUnits)
    return {
      expected,
      median: findQuantile(chanceAt, 0.5, maxUnits),
      p90,
      bounded: expected !== null && p90 !== null,
      evaluatedUnits: maxUnits,
    }
  }

  const model = createCollectionModel(activity)
  const startingMask = maskForObtained(model, obtainedDropIds)
  if (startingMask === model.completeMask) return complete

  const missingIndices = model.dropIds
    .map((_, index) => index)
    .filter((index) => !(startingMask & (1 << index)))
  const symmetric = getSymmetricExclusiveModel(model, missingIndices)
  if (symmetric) {
    const expected = symmetricExpected(symmetric)
    const chanceAt = (units) => symmetricCollectionChance(symmetric, units)
    return {
      expected,
      median: findQuantile(chanceAt, 0.5, maxUnits),
      p90: findQuantile(chanceAt, 0.9, maxUnits),
      bounded: Number.isFinite(expected) && chanceAt(maxUnits) >= 0.9,
      evaluatedUnits: maxUnits,
    }
  }
  if (missingIndices.length > 20) {
    throw new Error('Large collections must use one equal-rate exclusive drop group.')
  }
  const subsetCount = 1 << missingIndices.length
  let expected = 0
  let finite = true

  for (let subset = 1; subset < subsetCount; subset += 1) {
    const excludedMask = missingIndices.reduce((mask, dropIndex, subsetIndex) => (
      subset & (1 << subsetIndex) ? mask | (1 << dropIndex) : mask
    ), 0)
    const absentPerUnit = probabilityNoneFromMask(model, excludedMask)
    if (absentPerUnit >= 1) {
      finite = false
      continue
    }
    const parity = popcount(subset) % 2 === 1 ? 1 : -1
    expected += parity / (1 - absentPerUnit)
  }

  const chanceAt = (units) => collectionChance(activity, units, obtainedDropIds)
  const median = findQuantile(chanceAt, 0.5, maxUnits)
  const p90 = findQuantile(chanceAt, 0.9, maxUnits)

  return {
    expected: finite ? Math.max(0, expected) : null,
    median,
    p90,
    bounded: finite && p90 !== null,
    evaluatedUnits: maxUnits,
  }
}

// Large collections treat each missing drop as independent, which is exact for
// independent groups and accurate to O(rate) for exclusive ones. Drops sharing a
// per-unit miss chance collapse into one [logMiss, count] class.
function missRateClasses(activity, obtainedDropIds) {
  return classesFromLogMisses(dropLogMisses(activity, obtainedDropIds))
}

function dropLogMisses(activity, obtainedDropIds) {
  const { groups } = normalizeGroups(activity)
  const dropsById = new Map(activity.drops.map((drop) => [drop.id, drop]))
  const obtained = new Set(obtainedDropIds)
  const logMisses = new Map()

  for (const group of groups) {
    const rolls = groupRolls(group)
    for (const dropId of group.drops) {
      if (obtained.has(dropId)) continue
      const logMiss = rolls * Math.log1p(-rateToProbability(dropsById.get(dropId).rate))
      logMisses.set(dropId, (logMisses.get(dropId) ?? 0) + logMiss)
    }
  }
  return logMisses
}

function classesFromLogMisses(logMisses) {
  const classes = new Map()
  for (const logMiss of logMisses.values()) {
    classes.set(logMiss, (classes.get(logMiss) ?? 0) + 1)
  }
  return [...classes]
}

function approximateCollectionChance(classes, units) {
  return classes.reduce(
    (chance, [logMiss, count]) => chance * Math.pow(-Math.expm1(units * logMiss), count),
    1,
  )
}

function approximateExpected(classes, maxUnits) {
  if (classes.some(([logMiss]) => logMiss === 0)) return null
  let expected = 0
  for (let units = 0; units <= maxUnits; units += 1) {
    const remaining = 1 - approximateCollectionChance(classes, units)
    if (remaining < 1e-12) return expected
    expected += remaining
  }
  return null
}

function getSymmetricExclusiveModel(model, missingIndices) {
  if (model.groups.length !== 1 || model.groups[0].type !== 'exclusive') return null
  const group = model.groups[0]
  if (group.drops.length !== model.dropIds.length) return null

  const rates = missingIndices.map((index) => (
    rateToProbability(model.dropsById.get(model.dropIds[index]).rate)
  ))
  if (rates.some((rate) => Math.abs(rate - rates[0]) > Number.EPSILON)) return null
  const rollsPerUnit = groupRolls(group)
  if (rollsPerUnit === 0 || rates[0] === 0) return null

  return {
    missingCount: missingIndices.length,
    rate: rates[0],
    rollsPerUnit,
  }
}

function symmetricCollectionChance(model, units) {
  let chance = 0
  for (let size = 0; size <= model.missingCount; size += 1) {
    const absentPerUnit = Math.pow(1 - size * model.rate, model.rollsPerUnit)
    const sign = size % 2 === 0 ? 1 : -1
    chance += sign * combination(model.missingCount, size)
      * Math.pow(absentPerUnit, units)
  }
  return Math.min(1, Math.max(0, chance))
}

function symmetricExpected(model) {
  let expected = 0
  for (let size = 1; size <= model.missingCount; size += 1) {
    const absentPerUnit = Math.pow(1 - size * model.rate, model.rollsPerUnit)
    const sign = size % 2 === 1 ? 1 : -1
    expected += sign * combination(model.missingCount, size) / (1 - absentPerUnit)
  }
  return Math.max(0, expected)
}

function combination(total, selected) {
  const count = Math.min(selected, total - selected)
  let result = 1
  for (let index = 1; index <= count; index += 1) {
    result = result * (total - count + index) / index
  }
  return result
}

function probabilityNoneFromMask(model, excludedMask) {
  let probability = 1

  for (const group of model.groups) {
    const rolls = groupRolls(group)
    if (group.type === 'exclusive') {
      const excludedChance = group.drops.reduce((sum, dropId) => {
        const index = model.dropIndex.get(dropId)
        return excludedMask & (1 << index)
          ? sum + rateToProbability(model.dropsById.get(dropId).rate)
          : sum
      }, 0)
      probability *= Math.pow(1 - excludedChance, rolls)
    } else {
      for (const dropId of group.drops) {
        const index = model.dropIndex.get(dropId)
        if (excludedMask & (1 << index)) {
          probability *= Math.pow(
            1 - rateToProbability(model.dropsById.get(dropId).rate),
            rolls,
          )
        }
      }
    }
  }

  return probability
}

function popcount(value) {
  let count = 0
  let remaining = value
  while (remaining) {
    remaining &= remaining - 1
    count += 1
  }
  return count
}

function findQuantile(chanceAt, target, maxUnits) {
  if (chanceAt(maxUnits) < target) return null

  let low = 0
  let high = maxUnits
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2)
    if (chanceAt(midpoint) >= target) high = midpoint
    else low = midpoint + 1
  }
  return low
}

export function unitsToDuration(units, minutesPerUnit) {
  const minutes = Number(units) * Number(minutesPerUnit)
  if (!Number.isFinite(minutes) || minutes < 0) return null

  return {
    minutes,
    hours: minutes / 60,
  }
}
