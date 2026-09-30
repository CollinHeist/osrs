import { getModes, resolveMode } from '../lib/probability'

export default function PlannedModeSelect({ activity, plannedMode, onUpdate }) {
  const modes = getModes(activity)
  if (modes.length < 2) return null

  return (
    <label title="Future estimates assume every remaining unit uses this kill type">
      Planned {activity.unit.plural}
      <select
        value={resolveMode(activity, plannedMode).mode.id}
        onChange={(event) => onUpdate({ plannedMode: event.target.value })}
      >
        {modes.map((mode) => (
          <option key={mode.id} value={mode.id}>{mode.name}</option>
        ))}
      </select>
    </label>
  )
}
