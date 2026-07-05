import type { DeleteHighlightMessage, HighlightSummary, SetSummaryMessage } from './types'

function send(message: DeleteHighlightMessage | SetSummaryMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response?: { ok: boolean }) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!response?.ok) {
        reject(new Error('Request failed'))
        return
      }
      resolve()
    })
  })
}

export function requestDeleteHighlight(id: string): Promise<void> {
  return send({ type: 'DELETE_HIGHLIGHT', payload: { id } })
}

export function requestSetSummary(id: string, summary: HighlightSummary): Promise<void> {
  return send({ type: 'SET_SUMMARY', payload: { id, summary } })
}
