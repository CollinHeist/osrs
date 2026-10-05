import { useId } from 'react'
import { templeUrls } from '../lib/temple'

function ResponseField({ label, hint, url, value, onChange }) {
  const id = useId()
  return (
    <div className="temple-response-field">
      <div className="temple-response-label">
        <label htmlFor={id}>{label}</label>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">Open in new tab ↗</a>
        ) : (
          <span>Enter a username to get the link</span>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hint}
        spellCheck="false"
        rows={4}
      />
    </div>
  )
}

export default function TemplePasteStep({ inputs, error, onChange, onSubmit }) {
  const urls = inputs.username.trim() ? templeUrls(inputs.username) : null

  function submit(event) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="temple-step" onSubmit={submit}>
      <p className="temple-intro">
        TempleOSRS can&apos;t be called directly from this page. Open each link, copy the
        entire response, and paste it below. Your collection log must be synced to
        TempleOSRS through the RuneLite plugin.
      </p>

      <label>
        RuneScape username
        <input
          value={inputs.username}
          onChange={(event) => onChange({ username: event.target.value })}
          placeholder="e.g. Zezima"
          autoComplete="off"
        />
      </label>

      <ResponseField
        label="Collection log"
        hint="Paste the collection log JSON (required)"
        url={urls?.collectionLog}
        value={inputs.collectionLog}
        onChange={(collectionLog) => onChange({ collectionLog })}
      />
      <ResponseField
        label="Player stats"
        hint="Paste the player stats JSON to also import kill counts (optional)"
        url={urls?.playerStats}
        value={inputs.playerStats}
        onChange={(playerStats) => onChange({ playerStats })}
      />

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="temple-actions">
        <button className="button" type="submit" disabled={!inputs.collectionLog.trim()}>
          Review changes
        </button>
      </div>
    </form>
  )
}
