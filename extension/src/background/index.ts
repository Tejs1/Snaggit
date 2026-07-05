import type { SaveHighlightMessage } from '../shared/types'
import { addHighlight } from '../shared/storage'

chrome.runtime.onMessage.addListener((message: SaveHighlightMessage, _sender, sendResponse) => {
  if (message?.type !== 'SAVE_HIGHLIGHT')
    return
  addHighlight(message.payload)
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }))
  return true // keep the message channel open for the async response
})
