import { useMemo } from 'react'
import {
  collectionChanceForCounts,
  collectionMilestoneUnitsForCounts,
  getModes,
  hasMultipleModes,
  progressCounts,
  remainingCollectionStats,
  resolveMode,
  unitsToDuration,
} from '../lib/probability'
import { formatDuration, formatNumber, formatPercent } from '../lib/format'
import DropRow from './DropRow'
import KillTypeCounts from './KillTypeCounts'
import MetricCard from './MetricCard'
import PlannedModeSelect from './PlannedModeSelect'

const COLLECTION_MILESTONES = [0.5, 0.75, 0.9, 0.95, 0.99, 0.999]

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
  const minimumCount = Object.values(progress.drops)
    .flat()
    .reduce((latest, entry) => Math.max(latest, entry.at ?? 0), 0)

  const counts = progressCounts(progress)
  const multiMode = hasMultipleModes(activity)
  const plannedActivity = resolveMode(activity, progress.plannedMode)
  const plannedLabel = `${plannedActivity.mode.name} ${activity.unit.plural}`.toLowerCase()

  const summary = useMemo(() => {
    const completionChance = collectionChanceForCounts(activity, counts)
    const milestones = COLLECTION_MILESTONES
      .filter((target) => target > completionChance)
      .map((target) => {
        const additional = collectionMilestoneUnitsForCounts(
          activity,
          counts,
          plannedActivity.mode.id,
          target,
        )
        return {
          target,
          additional,
          units: additional === null ? null : progress.count + additional,
        }
      })
    const remaining = remainingCollectionStats(plannedActivity, obtainedIds)
    const duration = (units) => {
      if (units === null) return '—'
      const result = unitsToDuration(units, progress.minutesPerUnit)
      return result ? formatDuration(result.hours) : '—'
    }

    return {
      completionChance,
      milestones,
      remaining,
      expectedTime: duration(remaining.expected),
      medianTime: duration(remaining.median),
      p90Time: duration(remaining.p90),
    }
  }, [activity, counts, obtainedIds, plannedActivity, progress.count, progress.minutesPerUnit])
  const formattedCompletionChance = summary.completionChance < 0.01
    ? formatPercent(summary.completionChance, 4)
    : formatPercent(summary.completionChance, 1)

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
      {multiMode && getModes(activity).some((mode) => mode.note) && (
        <aside className="rate-note">
          {getModes(activity).filter((mode) => mode.note).map((mode) => (
            <span className="mode-note" key={mode.id}><b>{mode.name}:</b> {mode.note}</span>
          ))}
        </aside>
      )}

      <section className={`control-panel ${multiMode ? 'has-modes' : ''}`}>
        <KillTypeCounts
          activity={activity}
          counts={counts}
          minimumCount={minimumCount}
          onUpdate={onUpdate}
        />
        <div className="control-panel-aside">
          <PlannedModeSelect
            activity={activity}
            plannedMode={progress.plannedMode}
            onUpdate={onUpdate}
          />
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
        </div>
      </section>

      <section
        className={`metrics-grid ${isGreenlogged ? 'greenlogged' : ''}`}
        aria-label="Activity luck summary"
      >
        <MetricCard
          label="Tracked uniques"
          value={`${obtainedIds.length}/${activity.drops.length}`}
          detail={obtainedIds.length === activity.drops.length ? 'Greenlogged' : 'First copy of each'}
          tone={obtainedIds.length === activity.drops.length ? 'positive' : ''}
        />
        <MetricCard
          label="Greenlog chance by now"
          value={formattedCompletionChance}
          detail="Fresh-player completion probability"
          popover={(
            <div className="milestone-list">
              <b>Upcoming chance milestones</b>
              {summary.milestones.length > 0 ? summary.milestones.map(({ target, units, additional }) => (
                <span key={target}>
                  <em>{formatPercent(target, target >= 0.999 ? 1 : 0)}</em>
                  {units === null ? (
                    <>Beyond 2,000,000 more {multiMode ? plannedLabel : activity.unit.plural}</>
                  ) : (
                    <>
                      At {formatNumber(units)} {activity.unit.plural}
                      <small>
                        +{formatNumber(additional)} {multiMode ? plannedLabel : ''} from now
                      </small>
                    </>
                  )}
                </span>
              )) : (
                <span>All listed milestones reached.</span>
              )}
            </div>
          )}
        />
        {!isGreenlogged && (
          <>
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
          </>
        )}
      </section>

      {!isGreenlogged && (
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
            {multiMode && ` Remaining estimates assume ${plannedLabel}.`}
          </p>
        </section>
      )}

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
            counts={counts}
            currentCount={progress.count}
            onAdd={(at) => onAddDrop(drop.id, at)}
            onRemove={(entryId) => onRemoveDrop(drop.id, entryId)}
          />
        ))}
      </section>
    </>
  )
}
