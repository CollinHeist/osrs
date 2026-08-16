import { useMemo, useState } from 'react'
import {
  dropByProbability,
  getDropIntervals,
  noDropProbability,
} from '../lib/probability'
import { formatNumber, formatPercent, formatRate } from '../lib/format'
import DropDistribution from './DropDistribution'

function rollsForDrop(activity, dropId) {
  return activity.groups
    .filter((group) => group.drops.includes(dropId))
    .reduce((sum, group) => sum + (group.rollsPerUnit ?? 1), 0) || 1
}

export default function DropRow({
  activity,
  drop,
  entries,
  currentCount,
  onAdd,
  onRemove,
}) {
  const [at, setAt] = useState(currentCount || '')
  const [error, setError] = useState('')
  const rollsPerUnit = rollsForDrop(activity, drop.id)
  const knownEntries = useMemo(
    () => entries
      .filter((entry) => entry.at !== null)
      .sort((a, b) => a.at - b.at),
    [entries],
  )
  const unknownEntries = useMemo(
    () => entries.filter((entry) => entry.at === null),
    [entries],
  )
  const intervals = getDropIntervals(
    knownEntries.map((entry) => entry.at),
    currentCount,
  )
  const hasDrop = entries.length > 0
  const hasUnknownDrop = unknownEntries.length > 0
  const duplicateProtected = drop.duplicateProtected === true
  const dryUnits = hasUnknownDrop ? null : hasDrop ? intervals.currentStreak : currentCount
  const dryTail = dryUnits === null
    ? null
    : noDropProbability(drop.rate, dryUnits * rollsPerUnit)
  const seenChance = dropByProbability(drop.rate, currentCount * rollsPerUnit)
  const firstDropAt = knownEntries[0]?.at ?? null
  const firstDropChance = firstDropAt
    ? dropByProbability(drop.rate, firstDropAt * rollsPerUnit)
    : null

  function submit(event) {
    event.preventDefault()
    if (duplicateProtected && hasDrop) {
      setError(`${drop.name} cannot be obtained more than once.`)
      return
    }
    const parsed = Math.floor(Number(at))
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > currentCount) {
      setError(`Enter a ${activity.unit.singular} from 1 to ${currentCount}.`)
      return
    }
    onAdd(parsed)
    setAt(currentCount || '')
    setError('')
  }

  return (
    <article className={`drop-row ${hasDrop ? 'obtained' : ''}`}>
      <div className="drop-heading">
        <a href={drop.wikiUrl} target="_blank" rel="noreferrer" className="drop-identity">
          <img src={drop.imageUrl} alt="" />
          <span>
            <strong>{drop.name}</strong>
            <small>{drop.rateLabel || formatRate(drop.rate)} per roll</small>
          </span>
        </a>
        <span className={`status-pill ${hasDrop ? 'complete' : ''}`}>
          {hasDrop
            ? duplicateProtected ? 'Obtained · duplicate protected' : `${entries.length} obtained`
            : 'Missing'}
        </span>
      </div>

      <div className="drop-metrics">
        {duplicateProtected && hasDrop ? (
          <>
            <div>
              <span>First obtained at</span>
              <strong>{firstDropAt === null
                ? 'KC unknown'
                : `${formatNumber(firstDropAt)} ${activity.unit.plural}`}</strong>
            </div>
            <div title="Chance to receive this item by its recorded acquisition point">
              <span>Seen by then</span>
              <strong>{firstDropChance === null ? 'Unknown' : formatPercent(firstDropChance)}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Current dry streak</span>
              <strong>{dryUnits === null
                ? 'Unknown'
                : `${formatNumber(dryUnits)} ${activity.unit.plural}`}</strong>
            </div>
            <div title="Chance to go at least this many eligible rolls without this item">
              <span>As dry or drier</span>
              <strong>{dryTail === null ? 'Unknown' : formatPercent(dryTail)}</strong>
            </div>
          </>
        )}
        <div title="Chance to receive at least one by the current count">
          <span>Seen by now</span>
          <strong>{formatPercent(seenChance)}</strong>
        </div>
      </div>

      <DropDistribution
        drop={drop}
        eligibleRolls={currentCount * rollsPerUnit}
        observedCount={entries.length}
      />

      {entries.length > 0 && (
        <div className="drop-history">
          {knownEntries.map((entry, index) => {
            const previousAt = index === 0 ? 0 : knownEntries[index - 1].at
            const interval = entry.at - previousAt
            const luck = dropByProbability(drop.rate, interval * rollsPerUnit)
            return (
              <span className="history-chip" key={entry.id}>
                #{index + 1} at {formatNumber(entry.at)}
                <small>{formatPercent(luck)} seen by then</small>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`Remove ${drop.name} at ${entry.at}`}
                >
                  ×
                </button>
              </span>
            )
          })}
          {unknownEntries.map((entry) => (
            <span className="history-chip unknown" key={entry.id}>
              Copy obtained · KC unknown
              <small>Counted in overall drop luck</small>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Remove ${drop.name} with unknown KC`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {duplicateProtected && hasDrop ? (
        <p className="duplicate-note">
          Duplicate protected: future successful rolls award a replacement item.
        </p>
      ) : (
        <form className="add-drop-form" onSubmit={submit}>
          <label>
            Add copy at {activity.unit.singular}
            <input
              type="number"
              min="1"
              max={currentCount}
              value={at}
              onChange={(event) => setAt(event.target.value)}
              disabled={currentCount < 1}
            />
          </label>
          <button className="button secondary" type="submit" disabled={currentCount < 1}>
            Add drop
          </button>
          <button className="button secondary unknown-kc-button" type="button" onClick={() => onAdd(null)}>
            Mark obtained · KC unknown
          </button>
          {error && <span className="field-error">{error}</span>}
        </form>
      )}
    </article>
  )
}
