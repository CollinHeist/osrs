import { useMemo } from 'react'
import {
  collectionChance,
  remainingCollectionStats,
  unitsToDuration,
} from '../lib/probability'
import { formatDuration, formatNumber, formatPercent } from '../lib/format'
import DropRow from './DropRow'
import MetricCard from './MetricCard'

export default function ActivityDetail({
  activity,
  progress,
  onBack,
  onUpdate,
  onAddDrop,
  onRemoveDrop,
  onReset,
}) {
  const obtainedIds = activity.drops
    .filter((drop) => (progress.drops[drop.id] ?? []).length > 0)
    .map((drop) => drop.id)
  const isGreenlogged = obtainedIds.length === activity.drops.length

  const summary = useMemo(() => {
    const completionChance = collectionChance(activity, progress.count)
    const remaining = remainingCollectionStats(activity, obtainedIds)
    const duration = (units) => {
      const result = unitsToDuration(units, progress.minutesPerUnit)
      return result ? formatDuration(result.hours) : '—'
    }

    return {
      completionChance,
      remaining,
      expectedTime: duration(remaining.expected),
      medianTime: duration(remaining.median),
      p90Time: duration(remaining.p90),
    }
  }, [activity, obtainedIds, progress.count, progress.minutesPerUnit])

  function reset() {
    if (window.confirm(`Clear all ${activity.name} progress? This cannot be undone.`)) {
      onReset()
    }
  }

  return (
    <>
      <button className="back-button" type="button" onClick={onBack}>← All activities</button>

      <section className={`detail-hero ${isGreenlogged ? 'greenlogged' : ''}`}>
        <img src={activity.imageUrl} alt="" />
        <div>
          <div className="eyebrow">{activity.category}</div>
          <h1>{activity.name}</h1>
          <a href={activity.wikiUrl} target="_blank" rel="noreferrer">Open OSRS Wiki ↗</a>
        </div>
      </section>

      {activity.rateNote && <aside className="rate-note">{activity.rateNote}</aside>}

      <section className="control-panel">
        <label>
          Current {activity.unit.plural}
          <input
            type="number"
            min="0"
            value={progress.count}
            onChange={(event) => onUpdate({
              count: Math.max(0, Math.floor(Number(event.target.value) || 0)),
            })}
          />
        </label>
        <label>
          Average minutes per {activity.unit.singular}
          <input
            type="number"
            min="0"
            step="0.1"
            value={progress.minutesPerUnit}
            onChange={(event) => onUpdate({
              minutesPerUnit: Math.max(0, Number(event.target.value) || 0),
            })}
          />
        </label>
        <button className="text-button danger" type="button" onClick={reset}>
          Reset activity
        </button>
      </section>

      <section className="metrics-grid" aria-label="Activity luck summary">
        <MetricCard
          label="Tracked uniques"
          value={`${obtainedIds.length}/${activity.drops.length}`}
          detail={obtainedIds.length === activity.drops.length ? 'Greenlogged' : 'First copy of each'}
          tone={obtainedIds.length === activity.drops.length ? 'positive' : ''}
        />
        <MetricCard
          label="Greenlog chance by now"
          value={formatPercent(summary.completionChance, 4, true)}
          detail="Fresh-player completion probability"
        />
        <MetricCard
          label="Expected remaining"
          value={formatNumber(summary.remaining.expected)}
          detail={activity.unit.plural}
        />
        <MetricCard
          label="Expected play time"
          value={summary.expectedTime}
          detail={progress.minutesPerUnit ? 'Using your average pace' : 'Add an average time'}
        />
      </section>

      <section className="estimate-panel">
        <div>
          <span>Median remaining</span>
          <strong>{formatNumber(summary.remaining.median)} {activity.unit.plural}</strong>
          <small>{summary.medianTime}</small>
        </div>
        <div>
          <span>90% completion point</span>
          <strong>{formatNumber(summary.remaining.p90)} {activity.unit.plural}</strong>
          <small>{summary.p90Time}</small>
        </div>
        <p>
          These are probability estimates, not guarantees. Expected time is an average;
          the 90% point means one in ten comparable grinds would take longer.
        </p>
      </section>

      <div className="section-heading">
        <div>
          <div className="eyebrow">Drop log</div>
          <h2>Tracked uniques</h2>
        </div>
        <p>
          Record every copy at its {activity.unit.singular}, or mark it obtained
          when the exact count is unknown.
        </p>
      </div>

      <section className="drop-list">
        {activity.drops.map((drop) => (
          <DropRow
            key={drop.id}
            activity={activity}
            drop={drop}
            entries={progress.drops[drop.id] ?? []}
            currentCount={progress.count}
            onAdd={(at) => onAddDrop(drop.id, at)}
            onRemove={(entryId) => onRemoveDrop(drop.id, entryId)}
          />
        ))}
      </section>
    </>
  )
}
