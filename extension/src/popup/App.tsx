import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'
import { getSettings } from '../shared/storage'
import { HighlightRow } from './components/HighlightRow'
import { SettingsView } from './components/SettingsView'
import { useHighlights } from './useHighlights'
import './App.css'

export default function App() {
  const highlights = useHighlights()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [view, setView] = useState<'list' | 'settings'>('list')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!highlights || !settings)
    return <div className="empty">Loading…</div>

  if (view === 'settings') {
    return (
      <SettingsView
        settings={settings}
        onSave={(next) => {
          setSettings(next)
          setView('list')
        }}
        onBack={() => setView('list')}
      />
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Snaggit</h1>
        <button className="icon" onClick={() => setView('settings')} title="Settings">⚙️</button>
      </header>
      {highlights.length === 0
        ? (
            <div className="empty">
              Select text on any page and click “Save Highlight?” to get started.
            </div>
          )
        : (
            <ul className="list">
              {highlights.map(highlight => (
                <li key={highlight.id}>
                  <HighlightRow
                    highlight={highlight}
                    settings={settings}
                    onOpenSettings={() => setView('settings')}
                  />
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
