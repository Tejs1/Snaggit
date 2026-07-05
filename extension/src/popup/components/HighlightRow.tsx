import { useState } from 'react'
import type { Highlight, Settings } from '../../shared/types'
import { requestDeleteHighlight, requestSetSummary } from '../../shared/messages'
import {
  DirectOpenAIProvider,
  MIN_SNIPPET_CHARS,
  prepareSnippet,
  SummarizeError,
  TRUNCATION_NOTE,
} from '../../shared/summarizer'
import type { Summarizer } from '../../shared/summarizer'

const provider: Summarizer = new DirectOpenAIProvider()

interface Props {
  highlight: Highlight
  settings: Settings
  onOpenSettings: () => void
}

export function HighlightRow({ highlight, settings, onOpenSettings }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string, needsKey: boolean } | null>(null)

  const snippet = prepareSnippet(highlight.text)

  async function summarize() {
    if (!snippet.ok)
      return
    setPending(true)
    setError(null)
    try {
      const text = await provider.summarize(snippet.text, settings)
      const suffix = snippet.truncated ? TRUNCATION_NOTE : ''
      await requestSetSummary(highlight.id, {
        text: text + suffix,
        model: settings.model,
        createdAt: Date.now(),
      })
    }
    catch (thrown) {
      const isSummarizeError = thrown instanceof SummarizeError
      setError({
        message: isSummarizeError ? thrown.message : 'Something went wrong',
        needsKey: isSummarizeError && (thrown.kind === 'no-key' || thrown.kind === 'invalid-key'),
      })
    }
    finally {
      setPending(false)
    }
  }

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
        <button
          onClick={() => void summarize()}
          disabled={pending || !snippet.ok}
          title={snippet.ok ? undefined : `Too short to summarize (under ${MIN_SNIPPET_CHARS} characters)`}
        >
          {pending ? 'Summarizing…' : highlight.summary ? 'Re-summarize' : 'Summarize'}
        </button>
        <button onClick={() => void requestDeleteHighlight(highlight.id).catch(console.error)}>Delete</button>
      </div>
      {error && (
        <div className="error">
          <span>{error.message}</span>
          {error.needsKey
            ? <button className="link" onClick={onOpenSettings}>Open Settings</button>
            : <button onClick={() => void summarize()}>Retry</button>}
        </div>
      )}
    </article>
  )
}
