import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'
import { getSettings } from '../shared/storage'
import { HighlightRow } from './components/HighlightRow'
import { useHighlights } from './useHighlights'
import './App.css'

export default function App() {
  const highlights = useHighlights()
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!highlights || !settings)
    return <div className="empty">Loading…</div>

  return (
    <div className="app">
      <header className="header">
        <h1>Snaggit</h1>
      </header>
      {highlights.length === 0
        ? (
            <div className="empty">
              Select text on any page and click "Save Highlight?" to get started.
            </div>
          )
        : (
            <ul className="list">
              {highlights.map(highlight => (
                <li key={highlight.id}>
                  <HighlightRow
                    highlight={highlight}
                    settings={settings}
                    onOpenSettings={() => {}}
                  />
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
