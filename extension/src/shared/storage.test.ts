import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeMock } from '../test/chrome-mock'
import {
  addHighlight,
  deleteHighlight,
  getHighlights,
  getSettings,
  saveSettings,
  setSummary,
  watchHighlights,
} from './storage'

const mock = installChromeMock()

beforeEach(() => mock.reset())

const input = { text: 'a'.repeat(120), pageUrl: 'https://example.com/a', pageTitle: 'Example A' }

describe('highlights', () => {
  it('starts empty', async () => {
    expect(await getHighlights()).toEqual([])
  })

  it('addHighlight assigns id/createdAt and stores newest-first', async () => {
    const first = await addHighlight(input)
    const second = await addHighlight({ ...input, pageTitle: 'Example B' })
    expect(first.id).toBeTruthy()
    expect(first.createdAt).toBeGreaterThan(0)
    const all = await getHighlights()
    expect(all.map(h => h.id)).toEqual([second.id, first.id])
  })

  it('deleteHighlight removes only the matching highlight', async () => {
    const keep = await addHighlight(input)
    const remove = await addHighlight({ ...input, pageTitle: 'Example B' })
    await deleteHighlight(remove.id)
    expect((await getHighlights()).map(h => h.id)).toEqual([keep.id])
  })

  it('setSummary attaches a summary to the matching highlight', async () => {
    const h = await addHighlight(input)
    await setSummary(h.id, { text: 'short version', model: 'gpt-4o-mini', createdAt: 1 })
    const [stored] = await getHighlights()
    expect(stored.summary?.text).toBe('short version')
  })

  it('watchHighlights fires on change and unsubscribes cleanly', async () => {
    const seen = vi.fn()
    const unsubscribe = watchHighlights(seen)
    await addHighlight(input)
    expect(seen).toHaveBeenCalledTimes(1)
    expect(seen.mock.calls[0][0]).toHaveLength(1)
    unsubscribe()
    await addHighlight(input)
    expect(seen).toHaveBeenCalledTimes(1)
  })
})

describe('settings', () => {
  it('returns defaults when unset', async () => {
    expect(await getSettings()).toEqual({ openaiApiKey: '', model: 'gpt-4o-mini' })
  })

  it('round-trips saved settings', async () => {
    await saveSettings({ openaiApiKey: 'sk-test', model: 'gpt-4o' })
    expect(await getSettings()).toEqual({ openaiApiKey: 'sk-test', model: 'gpt-4o' })
  })
})
