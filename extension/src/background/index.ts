import type { HighlightMutationMessage } from '../shared/types'
import { addHighlight, deleteHighlight, setSummary } from '../shared/storage'

const CONTEXT_MENU_ID = 'snaggit-save-highlight'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Save highlight to Snaggit',
    contexts: ['selection'],
  })
})

export function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): void {
  if (info.menuItemId !== CONTEXT_MENU_ID)
    return
  const text = info.selectionText?.trim() ?? ''
  if (!text)
    return
  addHighlight({ text, pageUrl: tab?.url ?? '', pageTitle: tab?.title ?? '' }).catch(console.error)
}

chrome.contextMenus.onClicked.addListener(handleContextMenuClick)

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
