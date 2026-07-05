import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from './types'
import {
  DirectOpenAIProvider,
  MAX_SNIPPET_CHARS,
  prepareSnippet,
  SummarizeError,
} from './summarizer'

const settings: Settings = { openaiApiKey: 'sk-test', model: 'gpt-4o-mini' }

afterEach(() => vi.unstubAllGlobals())

function openAIResponse(status: number, content?: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('prepareSnippet', () => {
  it('rejects snippets under 100 chars', () => {
    expect(prepareSnippet('a'.repeat(99))).toEqual({ ok: false, reason: 'too-short' })
  })

  it('passes through mid-size snippets untouched', () => {
    const text = 'a'.repeat(500)
    expect(prepareSnippet(`  ${text}  `)).toEqual({ ok: true, text, truncated: false })
  })

  it('truncates snippets over 12,000 chars and flags it', () => {
    const result = prepareSnippet('a'.repeat(MAX_SNIPPET_CHARS + 1))
    expect(result).toMatchObject({ ok: true, truncated: true })
    if (result.ok)
      expect(result.text).toHaveLength(MAX_SNIPPET_CHARS)
  })
})

describe('DirectOpenAIProvider', () => {
  const provider = new DirectOpenAIProvider()

  it('throws no-key without calling fetch when key is empty', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(provider.summarize('text', { ...settings, openaiApiKey: '' }))
      .rejects.toMatchObject({ kind: 'no-key' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns the summary text on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openAIResponse(200, ' A tidy summary. ')))
    await expect(provider.summarize('text', settings)).resolves.toBe('A tidy summary.')
  })

  it('sends model, system prompt, and bearer key', async () => {
    const fetchSpy = vi.fn(async () => openAIResponse(200, 'ok'))
    vi.stubGlobal('fetch', fetchSpy)
    await provider.summarize('the passage', settings)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Summarize this passage in 2-3 sentences.' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'the passage' })
  })

  it('maps 401 to invalid-key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openAIResponse(401)))
    await expect(provider.summarize('text', settings)).rejects.toMatchObject({ kind: 'invalid-key' })
  })

  it('maps 429 to rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openAIResponse(429)))
    await expect(provider.summarize('text', settings)).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('maps fetch rejection to network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))
    await expect(provider.summarize('text', settings)).rejects.toMatchObject({ kind: 'network' })
  })

  it('maps empty content to api error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => openAIResponse(200, '')))
    const error = await provider.summarize('text', settings).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SummarizeError)
    expect((error as SummarizeError).kind).toBe('api')
  })
})
