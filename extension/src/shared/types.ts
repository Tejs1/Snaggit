export interface HighlightSummary {
  text: string
  model: string
  createdAt: number
}

export interface Highlight {
  id: string
  text: string
  pageUrl: string
  pageTitle: string
  createdAt: number
  summary?: HighlightSummary
}

export type NewHighlight = Pick<Highlight, 'text' | 'pageUrl' | 'pageTitle'>

export interface Settings {
  openaiApiKey: string
  model: string
}

export const DEFAULT_SETTINGS: Settings = {
  openaiApiKey: '',
  model: 'gpt-4o-mini',
}

export const MODEL_OPTIONS = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'] as const

export interface SaveHighlightMessage {
  type: 'SAVE_HIGHLIGHT'
  payload: NewHighlight
}

export interface DeleteHighlightMessage {
  type: 'DELETE_HIGHLIGHT'
  payload: { id: string }
}

export interface SetSummaryMessage {
  type: 'SET_SUMMARY'
  payload: { id: string, summary: HighlightSummary }
}

export type HighlightMutationMessage = SaveHighlightMessage | DeleteHighlightMessage | SetSummaryMessage
