import type { Settings } from './types'

export const MIN_SNIPPET_CHARS = 100
export const MAX_SNIPPET_CHARS = 12000
export const TRUNCATION_NOTE = ' (summarized from first 12,000 characters)'

export type SnippetCheck =
  | { ok: true, text: string, truncated: boolean }
  | { ok: false, reason: 'too-short' }

export function prepareSnippet(raw: string): SnippetCheck {
  const text = raw.trim()
  if (text.length < MIN_SNIPPET_CHARS)
    return { ok: false, reason: 'too-short' }
  if (text.length > MAX_SNIPPET_CHARS)
    return { ok: true, text: text.slice(0, MAX_SNIPPET_CHARS), truncated: true }
  return { ok: true, text, truncated: false }
}

export type SummarizeErrorKind = 'no-key' | 'invalid-key' | 'rate-limited' | 'network' | 'api'

export class SummarizeError extends Error {
  constructor(public kind: SummarizeErrorKind, message: string) {
    super(message)
    this.name = 'SummarizeError'
  }
}

export interface Summarizer {
  summarize: (text: string, settings: Settings) => Promise<string>
}

const SYSTEM_PROMPT = 'Summarize this passage in 2-3 sentences.'

export class DirectOpenAIProvider implements Summarizer {
  async summarize(text: string, settings: Settings): Promise<string> {
    if (!settings.openaiApiKey)
      throw new SummarizeError('no-key', 'Add your OpenAI key in Settings')

    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
        }),
      })
    }
    catch {
      throw new SummarizeError('network', 'Network error — check your connection')
    }

    if (response.status === 401)
      throw new SummarizeError('invalid-key', 'Invalid API key')
    if (response.status === 429)
      throw new SummarizeError('rate-limited', 'Rate limited by OpenAI — try again shortly')
    if (!response.ok)
      throw new SummarizeError('api', `OpenAI error (HTTP ${response.status})`)

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const summary = data.choices?.[0]?.message?.content?.trim()
    if (!summary)
      throw new SummarizeError('api', 'OpenAI returned an empty response')
    return summary
  }
}
