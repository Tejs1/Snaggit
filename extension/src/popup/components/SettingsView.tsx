import { useState } from 'react'
import type { Settings } from '../../shared/types'
import { MODEL_OPTIONS } from '../../shared/types'
import { saveSettings } from '../../shared/storage'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onBack: () => void
}

export function SettingsView({ settings, onSave, onBack }: Props) {
  const [apiKey, setApiKey] = useState(settings.openaiApiKey)
  const [model, setModel] = useState(settings.model)

  async function handleSave() {
    const next: Settings = { openaiApiKey: apiKey.trim(), model }
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
          <input
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="sk-…"
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
          Your key is stored only on this device, in extension storage. Anyone with
          access to this browser profile could read it.
        </p>
      </div>
    </div>
  )
}
