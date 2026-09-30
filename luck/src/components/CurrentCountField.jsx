import { useState } from 'react'

export default function CurrentCountField({
  label,
  count,
  minimumCount,
  onCommit,
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
    onCommit(nextCount)
  }

  return (
    <label>
      {label}
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
