import { getModes, totalModeCount } from '../lib/probability'
import { formatNumber } from '../lib/format'
import CurrentCountField from './CurrentCountField'

export default function KillTypeCounts({
  activity,
  counts,
  minimumCount,
  onUpdate,
}) {
  const modes = getModes(activity)
  const total = totalModeCount(activity, counts)

  if (modes.length === 1) {
    const modeId = modes[0].id
    return (
      <CurrentCountField
        key={`${activity.id}-${counts[modeId] ?? 0}`}
        label={`Current ${activity.unit.plural}`}
        count={counts[modeId] ?? 0}
        minimumCount={minimumCount}
        onCommit={(value) => onUpdate({ counts: { ...counts, [modeId]: value } })}
      />
    )
  }

  return (
    <div className="mode-counts">
      {modes.map((mode) => {
        const value = counts[mode.id] ?? 0
        const others = total - value
        return (
          <CurrentCountField
            key={`${activity.id}-${mode.id}-${value}`}
            label={`${mode.name} ${activity.unit.plural}`}
            count={value}
            minimumCount={Math.max(0, minimumCount - others)}
            onCommit={(next) => onUpdate({ counts: { ...counts, [mode.id]: next } })}
          />
        )
      })}
      <div className="count-total">
        <span>Total {activity.unit.plural}</span>
        <strong>{formatNumber(total)}</strong>
      </div>
    </div>
  )
}
