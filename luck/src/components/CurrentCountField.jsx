import { useState } from 'react'

export default function CurrentCountField({
  activity,
  count,
  minimumCount,
  onUpdate,
}) {
  const [draft, setDraft] = useState(String(count))

  function commit() {
    const parsed = Math.floor(Number(draft))
    if (!Number.isFinite(parsed)) {
      setDraft(String(count))
      return
    }

    const nextCount = Math.max(0, minimumCount, parsed)
    setDraft(String(nextCount))
    onUpdate({ count: nextCount })
  }

  return (
    <label>
      Current {activity.unit.plural}
      <input
        type="number"
        min="0"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(String(count))
          }
        }}
      />
    </label>
  )
}
