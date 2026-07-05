import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeMock } from '../test/chrome-mock'
import { getHighlights } from '../shared/storage'

const mock = installChromeMock()

beforeEach(() => mock.reset())

// Import for side effects (registers the onMessage listener) after the mock is installed.
const { handleContextMenuClick } = await import('./index')

function sendMessage(message: unknown): Promise<{ ok: boolean } | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve)
  })
}

describe('background message handling', () => {
  it('SAVE_HIGHLIGHT persists a highlight', async () => {
    const response = await sendMessage({
      type: 'SAVE_HIGHLIGHT',
      payload: { text: 'hello world', pageUrl: 'https://example.com', pageTitle: 'Example' },
    })
    expect(response).toEqual({ ok: true })
    const highlights = await getHighlights()
    expect(highlights).toHaveLength(1)
    expect(highlights[0].text).toBe('hello world')
  })

  it('DELETE_HIGHLIGHT removes it', async () => {
    await sendMessage({
      type: 'SAVE_HIGHLIGHT',
      payload: { text: 'to be deleted', pageUrl: 'https://example.com', pageTitle: 'Example' },
    })
    const [highlight] = await getHighlights()
    const response = await sendMessage({ type: 'DELETE_HIGHLIGHT', payload: { id: highlight.id } })
    expect(response).toEqual({ ok: true })
    expect(await getHighlights()).toHaveLength(0)
  })

  it('SET_SUMMARY attaches a summary', async () => {
    await sendMessage({
      type: 'SAVE_HIGHLIGHT',
      payload: { text: 'to be summarized', pageUrl: 'https://example.com', pageTitle: 'Example' },
    })
    const [highlight] = await getHighlights()
    const summary = { text: 'short version', model: 'gpt-4o-mini', createdAt: 1 }
    const response = await sendMessage({ type: 'SET_SUMMARY', payload: { id: highlight.id, summary } })
    expect(response).toEqual({ ok: true })
    const [updated] = await getHighlights()
    expect(updated.summary).toEqual(summary)
  })

  it('unknown message types get no response', async () => {
    const response = await sendMessage({ type: 'UNKNOWN', payload: {} })
    expect(response).toBeUndefined()
  })
})

describe('context menu save', () => {
  const tab = { url: 'https://example.com/article', title: 'Article' } as chrome.tabs.Tab

  it('persists a highlight when selection text is present', async () => {
    handleContextMenuClick(
      { menuItemId: 'snaggit-save-highlight', selectionText: '  some selected text  ' } as chrome.contextMenus.OnClickData,
      tab,
    )
    await new Promise(resolve => setTimeout(resolve, 0))
    const highlights = await getHighlights()
    expect(highlights).toHaveLength(1)
    expect(highlights[0]).toMatchObject({
      text: 'some selected text',
      pageUrl: 'https://example.com/article',
      pageTitle: 'Article',
    })
  })

  it('saves nothing when selectionText is empty or whitespace', async () => {
    handleContextMenuClick(
      { menuItemId: 'snaggit-save-highlight', selectionText: '   ' } as chrome.contextMenus.OnClickData,
      tab,
    )
    handleContextMenuClick(
      { menuItemId: 'snaggit-save-highlight', selectionText: undefined } as unknown as chrome.contextMenus.OnClickData,
      tab,
    )
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await getHighlights()).toHaveLength(0)
  })

  it('saves nothing for a different menu item id', async () => {
    handleContextMenuClick(
      { menuItemId: 'some-other-item', selectionText: 'some selected text' } as chrome.contextMenus.OnClickData,
      tab,
    )
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(await getHighlights()).toHaveLength(0)
  })
})
