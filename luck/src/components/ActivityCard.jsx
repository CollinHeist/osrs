import { collectionChance } from '../lib/probability'
import { formatNumber, formatPercent } from '../lib/format'
import ActivityProgressChart from './ActivityProgressChart'

export default function ActivityCard({ activity, progress, onOpen }) {
  const obtained = activity.drops.filter(
    (drop) => (progress.drops[drop.id] ?? []).length > 0,
  )
  const isGreenlogged = obtained.length === activity.drops.length
  const greenlogChance = collectionChance(activity, progress.count)

  return (
    <button
      className={`activity-card ${isGreenlogged ? 'greenlogged' : ''}`}
      type="button"
      onClick={onOpen}
    >
      <div className="activity-art">
        <img src={activity.imageUrl} alt="" />
      </div>
      <div className="activity-card-copy">
        <div className="eyebrow">{activity.category}</div>
        <h2>{activity.name}</h2>
        <div className="activity-card-stats">
          <span>
            <b>{formatNumber(progress.count)}</b> {activity.unit.plural}
          </span>
          <span>
            <b>{obtained.length}/{activity.drops.length}</b> uniques
          </span>
          <span title="Chance a fresh player would have every tracked unique by this count">
            <b>{formatPercent(greenlogChance)}</b> greenlog chance
          </span>
        </div>
      </div>
      <ActivityProgressChart activity={activity} progress={progress} />
      <span className="card-arrow" aria-hidden="true">→</span>
    </button>
  )
}
