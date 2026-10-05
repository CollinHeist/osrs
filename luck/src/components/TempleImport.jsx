import { useRef, useState } from 'react'
import { buildTempleDiff, parseCollectionLog, parsePlayerStats } from '../lib/temple'
import TemplePasteStep from './TemplePasteStep'
import TempleReviewStep from './TempleReviewStep'

const EMPTY_INPUTS = { username: '', collectionLog: '', playerStats: '' }

export default function TempleImport({ activities, state, onApply }) {
  const dialogRef = useRef(null)
  const [inputs, setInputs] = useState(EMPTY_INPUTS)
  const [error, setError] = useState('')
  const [diff, setDiff] = useState(null)
  const [message, setMessage] = useState('')

  function open() {
    setDiff(null)
    setError('')
    dialogRef.current?.showModal()
  }

  function close() {
    dialogRef.current?.close()
  }

  function review() {
    try {
      const log = parseCollectionLog(inputs.collectionLog)
      const stats = inputs.playerStats.trim() ? parsePlayerStats(inputs.playerStats) : null
      setDiff(buildTempleDiff(activities, state, log, stats))
      setError('')
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Could not read that response.')
    }
  }

  function apply(changes, count) {
    onApply(changes)
    setMessage(`Applied ${count} TempleOSRS ${count === 1 ? 'update' : 'updates'}.`)
    setInputs((current) => ({ ...EMPTY_INPUTS, username: current.username }))
    close()
  }

  return (
    <>
      <button className="text-button" type="button" onClick={open}>
        Import from TempleOSRS
      </button>
      {message && <span role="status">{message}</span>}
      <dialog ref={dialogRef} className="temple-dialog" onClose={() => setDiff(null)}>
        <div className="temple-dialog-header">
          <h2>Import from TempleOSRS</h2>
          <button className="text-button" type="button" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        {diff ? (
          <TempleReviewStep diff={diff} onBack={() => setDiff(null)} onApply={apply} />
        ) : (
          <TemplePasteStep
            inputs={inputs}
            error={error}
            onChange={(patch) => setInputs((current) => ({ ...current, ...patch }))}
            onSubmit={review}
          />
        )}
      </dialog>
    </>
  )
}
