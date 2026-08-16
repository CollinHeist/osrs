import { dropByProbability } from '../lib/probability'
import { formatPercent } from '../lib/format'

function rollsForDrop(activity, dropId) {
  return activity.groups
    .filter((group) => group.drops.includes(dropId))
    .reduce((sum, group) => sum + (group.rollsPerUnit ?? 1), 0) || 1
}

export default function ActivityProgressChart({ activity, progress }) {
  return (
    <div
      className="activity-progress"
      role="img"
      aria-label={`Item progress for ${activity.name}`}
    >
      <div className="activity-progress-label">
        <span>Item progress</span>
        <small>Chance seen by now</small>
      </div>
      <div className="activity-progress-bars">
        {activity.drops.map((drop) => {
          const obtained = (progress.drops[drop.id] ?? []).length > 0
          const eligibleRolls = progress.count * rollsForDrop(activity, drop.id)
          const chance = dropByProbability(drop.rate, eligibleRolls)

          return (
            <span
              className={obtained ? 'obtained' : ''}
              key={drop.id}
              title={`${drop.name}: ${obtained ? 'obtained' : `${formatPercent(chance)} chance seen`}`}
            >
              <i style={{ height: `${obtained ? 100 : chance * 100}%` }} />
            </span>
          )
        })}
      </div>
    </div>
  )
}
