import { useState } from 'react'
import type { Highlight, Settings } from '../../shared/types'
import { deleteHighlight } from '../../shared/storage'

interface Props {
  highlight: Highlight
  settings: Settings
  onOpenSettings: () => void
}

export function HighlightRow({ highlight }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="row">
      <p
        className={expanded ? 'text' : 'text clamped'}
        onClick={() => setExpanded(current => !current)}
        title={expanded ? 'Click to collapse' : 'Click to expand'}
      >
        {highlight.text}
      </p>
      <a className="source" href={highlight.pageUrl} target="_blank" rel="noreferrer">
        {highlight.pageTitle || highlight.pageUrl}
      </a>
      {highlight.summary && <p className="summary">{highlight.summary.text}</p>}
      <div className="actions">
        <button onClick={() => void deleteHighlight(highlight.id)}>Delete</button>
      </div>
    </article>
  )
}
