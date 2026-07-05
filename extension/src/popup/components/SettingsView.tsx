import { useState } from 'react'
import type { Settings } from '../../shared/types'
import { MODEL_OPTIONS } from '../../shared/types'
import { saveSettings } from '../../shared/storage'
import { maskKey } from '../../shared/mask'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onBack: () => void
}

export function SettingsView({ settings, onSave, onBack }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(settings.model)
  const hasSavedKey = settings.openaiApiKey.length > 0

  async function handleSave() {
    const trimmed = apiKey.trim()
    const next: Settings = { openaiApiKey: trimmed.length > 0 ? trimmed : settings.openaiApiKey, model }
    await saveSettings(next)
    onSave(next)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Settings</h1>
        <button className="icon" onClick={onBack} title="Back">←</button>
      </header>
      <div className="settings">
        <label>
          OpenAI API key
          {hasSavedKey && (
            <p className="hint">
              Current key:
              {' '}
              {maskKey(settings.openaiApiKey)}
            </p>
          )}
          <input
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder={hasSavedKey ? 'Leave blank to keep current key' : 'sk-…'}
          />
        </label>
        <label>
          Model
          <select value={model} onChange={event => setModel(event.target.value)}>
            {MODEL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button className="save" onClick={() => void handleSave()}>Save</button>
        <p className="note">
          Your key is stored only on this device, in extension storage. The settings
          UI only ever shows a masked preview of a saved key, but anyone with access
          to this browser profile could still read the stored value.
        </p>
      </div>
    </div>
  )
}
