import { binomialProbability, itemLuckStats } from '../lib/probability'
import { formatNumber, formatPercent } from '../lib/format'

function distributionPoints(distribution) {
  const { trials, probability, observed } = distribution
  const mean = trials * probability
  const deviation = Math.sqrt(mean * (1 - probability))
  const minimum = Math.max(0, Math.floor(Math.min(mean - 3.5 * deviation, observed)))
  const maximum = Math.min(trials, Math.ceil(Math.max(mean + 3.5 * deviation, observed)))
  const span = maximum - minimum
  const values = span <= 30
    ? Array.from({ length: span + 1 }, (_, index) => minimum + index)
    : Array.from(
      { length: 31 },
      (_, index) => Math.round(minimum + (span * index) / 30),
    )

  return [...new Set([...values, observed])]
    .sort((a, b) => a - b)
    .map((count) => ({
      count,
      probability: binomialProbability(trials, probability, count),
    }))
}

export default function DropDistribution({
  drop,
  eligibleRolls,
  observedCount,
}) {
  const stats = itemLuckStats(
    drop.rate,
    eligibleRolls,
    observedCount,
    drop.duplicateProtected,
  )
  const points = distributionPoints(stats.distribution)
  const peak = Math.max(...points.map((point) => point.probability), Number.EPSILON)
  const deltaPrefix = stats.delta > 0 ? '+' : ''
  const ratio = stats.ratio === null ? '—' : `${formatNumber(stats.ratio, 2)}×`

  return (
    <section className="item-luck" aria-label={`${drop.name} luck statistics`}>
      <div className="item-luck-stats">
        <div>
          <span>Expected drops</span>
          <strong>{formatNumber(stats.expected, 2)}</strong>
        </div>
        <div className={stats.position === 'Above rate' ? 'lucky' : stats.position === 'Below rate' ? 'unlucky' : ''}>
          <span>Over / under rate</span>
          <strong>{stats.position}</strong>
          <small>{deltaPrefix}{formatNumber(stats.delta, 2)} drops · {ratio} rate</small>
        </div>
        <div title="Share of comparable players with this many drops or fewer">
          <span>Drop percentile</span>
          <strong>{formatPercent(stats.percentile)}</strong>
          <small>{stats.standardDeviations === null
            ? 'Not enough rolls'
            : `${formatNumber(stats.standardDeviations, 2)} standard deviations`}</small>
        </div>
      </div>

      <div
        className="distribution-plot"
        role="img"
        aria-label={`Distribution of drops after ${formatNumber(stats.rolls)} eligible rolls. You recorded ${stats.observed}.`}
      >
        <div className="distribution-bars">
          {points.map((point) => (
            <span
              className={point.count === stats.distribution.observed ? 'user-bar' : ''}
              key={point.count}
              style={{ height: `${Math.max(2, (point.probability / peak) * 100)}%` }}
              title={`${point.count} drops: ${formatPercent(point.probability, 2)}`}
            />
          ))}
        </div>
        <div className="distribution-axis">
          <span>{points[0]?.count ?? 0}</span>
          <b>You: {stats.observed}</b>
          <span>{points.at(-1)?.count ?? 0} drops</span>
        </div>
      </div>
    </section>
  )
}
