import { useState } from 'react'
import {
  countSelected,
  defaultSelection,
  isSelectable,
  KC_ROW,
  selectedChanges,
} from '../lib/temple'
import TempleActivityChanges from './TempleActivityChanges'

function selectableKeys(change) {
  const keys = change.drops.filter(isSelectable).map((row) => row.dropId)
  return isSelectable(change.kc) ? [KC_ROW, ...keys] : keys
}

export default function TempleReviewStep({ diff, onBack, onApply }) {
  const [selection, setSelection] = useState(() => defaultSelection(diff.changes))
  const selectedCount = countSelected(diff.changes, selection)

  function selectAll(selected) {
    setSelection(Object.fromEntries(diff.changes.map((change) => (
      [change.activityId, new Set(selected ? selectableKeys(change) : [])]
    ))))
  }

  function apply() {
    onApply(selectedChanges(diff.changes, selection), selectedCount)
  }

  return (
    <div className="temple-step">
      <p className="temple-intro">
        {diff.player ? <strong>{diff.player}</strong> : 'Unknown player'}
        {diff.lastChecked && <> · collection log synced {diff.lastChecked}</>}
      </p>

      {diff.warnings.map((warning) => (
        <aside key={warning} className="rate-note">{warning}</aside>
      ))}

      {diff.changes.length === 0 ? (
        <p className="temple-empty">Your tracker already matches TempleOSRS.</p>
      ) : (
        <>
          <div className="temple-select-all">
            <button className="text-button" type="button" onClick={() => selectAll(true)}>
              Select all
            </button>
            <button className="text-button" type="button" onClick={() => selectAll(false)}>
              Select none
            </button>
          </div>

          <div className="temple-activity-list">
            {diff.changes.map((change) => (
              <TempleActivityChanges
                key={change.activityId}
                change={change}
                selectableKeys={selectableKeys(change)}
                selected={selection[change.activityId] ?? new Set()}
                onChange={(keys) => setSelection((current) => (
                  { ...current, [change.activityId]: keys }
                ))}
              />
            ))}
          </div>

          <p className="temple-footnote">
            The collection log counts items obtained, so a drop that gives several items
            at once counts more than once. Imported drops have no kill number until you
            edit them. Shared items are left unselected because their count may include
            other sources.
          </p>
        </>
      )}

      <div className="temple-actions">
        <button className="button secondary" type="button" onClick={onBack}>
          Back
        </button>
        <button className="button" type="button" disabled={selectedCount === 0} onClick={apply}>
          Apply {selectedCount} {selectedCount === 1 ? 'change' : 'changes'}
        </button>
      </div>
    </div>
  )
}
