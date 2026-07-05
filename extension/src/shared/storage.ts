import type { Highlight, HighlightSummary, NewHighlight, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

const HIGHLIGHTS_KEY = 'highlights'
const SETTINGS_KEY = 'settings'

export async function getHighlights(): Promise<Highlight[]> {
  const data = await chrome.storage.local.get(HIGHLIGHTS_KEY)
  return (data[HIGHLIGHTS_KEY] as Highlight[] | undefined) ?? []
}

async function setHighlights(highlights: Highlight[]): Promise<void> {
  await chrome.storage.local.set({ [HIGHLIGHTS_KEY]: highlights })
}

export async function addHighlight(input: NewHighlight): Promise<Highlight> {
  const highlight: Highlight = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...input,
  }
  await setHighlights([highlight, ...(await getHighlights())])
  return highlight
}

export async function deleteHighlight(id: string): Promise<void> {
  await setHighlights((await getHighlights()).filter(h => h.id !== id))
}

export async function setSummary(id: string, summary: HighlightSummary): Promise<void> {
  const updated = (await getHighlights()).map(h => (h.id === id ? { ...h, summary } : h))
  await setHighlights(updated)
}

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

export function watchHighlights(callback: (highlights: Highlight[]) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local' && changes[HIGHLIGHTS_KEY])
      callback((changes[HIGHLIGHTS_KEY].newValue as Highlight[] | undefined) ?? [])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
