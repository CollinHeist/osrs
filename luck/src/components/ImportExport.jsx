import { useRef, useState } from 'react'
import { createExport } from '../hooks/useLuckTracker'

export default function ImportExport({ state, onImport }) {
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')

  function exportData() {
    const blob = new Blob(
      [JSON.stringify(createExport(state), null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `osrs-luck-tracker-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Backup downloaded.')
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const value = JSON.parse(await file.text())
      if (value.app && value.app !== 'osrs-luck-tracker') {
        throw new Error('This file was created by a different app.')
      }
      const replace = window.confirm(
        'Choose OK to replace your tracker data, or Cancel to merge this backup.',
      )
      onImport(value, replace ? 'replace' : 'merge')
      setMessage(replace ? 'Backup restored.' : 'Backup merged.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import that file.')
    }
  }

  return (
    <div className="import-export">
      <button className="text-button" type="button" onClick={exportData}>
        Export backup
      </button>
      <button className="text-button" type="button" onClick={() => inputRef.current?.click()}>
        Import backup
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={importData}
      />
      {message && <span role="status">{message}</span>}
    </div>
  )
}
