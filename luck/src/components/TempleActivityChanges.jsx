import { formatNumber } from '../lib/format'
import { isSelectable, KC_ROW } from '../lib/temple'

function rowNote(row, isKc) {
  if (row.status === 'missing') return 'Not tracked by the collection log.'
  if (row.status === 'conflict') {
    return isKc
      ? 'TempleOSRS reports fewer; your count is kept.'
      : 'Your tracker has more; existing drops are kept.'
  }
  if (row.shared) return 'Also in other collection log categories; may include other sources.'
  return ''
}

function ChangeRow({ label, row, isKc, checked, onToggle }) {
  const note = rowNote(row, isKc)
  return (
    <li className={`temple-row ${row.status}`}>
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={!isSelectable(row)}
          onChange={onToggle}
        />
        <span className="temple-row-name">{label}</span>
        <span className="temple-row-values">
          {formatNumber(row.current)} → {row.incoming === null ? '—' : formatNumber(row.incoming)}
        </span>
      </label>
      {note && <small>{note}</small>}
    </li>
  )
}

export default function TempleActivityChanges({ change, selectableKeys, selected, onChange }) {
  const selectedCount = selectableKeys.filter((key) => selected.has(key)).length
  const allSelected = selectableKeys.length > 0 && selectedCount === selectableKeys.length

  function toggle(key) {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return (
    <section className="temple-activity">
      <label className="temple-activity-heading">
        <input
          type="checkbox"
          checked={allSelected}
          disabled={selectableKeys.length === 0}
          ref={(element) => {
            if (element) element.indeterminate = selectedCount > 0 && !allSelected
          }}
          onChange={() => onChange(new Set(allSelected ? [] : selectableKeys))}
        />
        <strong>{change.name}</strong>
      </label>
      <ul>
        {change.kc && (
          <ChangeRow
            label={`Total ${change.unit?.plural ?? 'count'}`}
            row={change.kc}
            isKc
            checked={selected.has(KC_ROW)}
            onToggle={() => toggle(KC_ROW)}
          />
        )}
        {change.drops.map((row) => (
          <ChangeRow
            key={row.dropId}
            label={row.name}
            row={row}
            checked={selected.has(row.dropId)}
            onToggle={() => toggle(row.dropId)}
          />
        ))}
      </ul>
    </section>
  )
}
