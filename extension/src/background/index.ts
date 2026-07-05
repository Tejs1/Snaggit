import type { HighlightMutationMessage } from '../shared/types'
import { addHighlight, deleteHighlight, setSummary } from '../shared/storage'

chrome.runtime.onMessage.addListener((message: HighlightMutationMessage, _sender, sendResponse) => {
  switch (message?.type) {
    case 'SAVE_HIGHLIGHT':
      addHighlight(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true // keep the message channel open for the async response
    case 'DELETE_HIGHLIGHT':
      deleteHighlight(message.payload.id)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true
    case 'SET_SUMMARY':
      setSummary(message.payload.id, message.payload.summary)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true
    default:
      return
  }
})
