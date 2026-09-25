import { dropByProbability, rollsForDrop } from '../lib/probability'
import { formatPercent } from '../lib/format'

const SIZE = 64
const STROKE = 9
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Gaps shrink as segments get smaller and disappear entirely for very large collection logs.
function segmentGap(count) {
  if (count <= 1 || count > 72) return 0
  return Math.min(6, 120 / count)
}

function Arc({ start, length, className, children }) {
  const dash = (length / 360) * CIRCUMFERENCE
  return (
    <circle
      className={className}
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
      strokeDashoffset={-(start / 360) * CIRCUMFERENCE}
    >
      {children}
    </circle>
  )
}

export default function ActivityProgressChart({ activity, progress }) {
  const total = activity.drops.length
  const gap = segmentGap(total)
  const segment = total ? 360 / total : 360
  const items = activity.drops.map((drop) => {
    const obtained = (progress.drops[drop.id] ?? []).length > 0
    const eligibleRolls = progress.count * rollsForDrop(activity, drop.id)
    return {
      drop,
      obtained,
      fill: obtained ? 1 : dropByProbability(drop.rate, eligibleRolls),
    }
  })
  const obtainedCount = items.filter((item) => item.obtained).length

  return (
    <div
      className="activity-progress"
      role="img"
      aria-label={`Item progress for ${activity.name}: ${obtainedCount} of ${total} obtained`}
    >
      <div className="activity-progress-label">
        <span>Item progress</span>
        <small>Chance seen by now</small>
      </div>
      <svg
        className="activity-progress-ring"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        aria-hidden="true"
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {total === 0 && <Arc start={0} length={360} className="track" />}
          {items.map(({ drop, obtained, fill }, index) => {
            const start = index * segment + gap / 2
            const length = segment - gap
            const title = `${drop.name}: ${obtained ? 'obtained' : `${formatPercent(fill)} chance seen`}`
            return (
              <g key={drop.id} className={obtained ? 'obtained' : ''}>
                <Arc start={start} length={length} className="track">
                  <title>{title}</title>
                </Arc>
                {fill > 0 && (
                  <Arc start={start} length={length * fill} className="fill">
                    <title>{title}</title>
                  </Arc>
                )}
              </g>
            )
          })}
        </g>
        <text x={SIZE / 2} y={SIZE / 2} className="activity-progress-count">
          {total ? `${obtainedCount}/${total}` : '—'}
        </text>
      </svg>
    </div>
  )
}
