# Snaggit Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome MV3 extension where users select text on any page, save it via a "Save Highlight?" bubble, and manage highlights (list / delete / per-highlight OpenAI summary) in the toolbar popup.

**Architecture:** Content script (vanilla TS, Shadow-DOM bubble) → background service worker (sole storage writer) → `chrome.storage.local` → React popup (list, delete, summarize, settings). Summaries go through a `Summarizer` interface so a Phase 2 proxy server can replace the direct-OpenAI provider without rework.

**Tech Stack:** TypeScript (strict), Vite 8 + @crxjs/vite-plugin 2, React 19, Bun (package manager + script runner), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-05-snaggit-highlighter-design.md`

## Global Constraints

- All package/script commands use Bun: `bun install`, `bun add`, `bun run dev`, `bun run build`.
- Tests run with `bun run test` (Vitest). **Never `bun test`** — that invokes Bun's own runner, not Vitest.
- All extension code lives in `extension/`; run its commands from `extension/`.
- Extension display name: `Snaggit`. MV3 only.
- Model dropdown values, exactly: `gpt-4o-mini` (default), `gpt-4.1-mini`, `gpt-4o`.
- Summarize guards: snippet < **100** chars → disabled; > **12,000** chars → truncate to 12,000 and note "summarized from first 12,000 characters".
- Fixed summarize system prompt: `Summarize this passage in 2-3 sentences.`
- Commit messages: conventional style, no AI/assistant references of any kind.
- The template's tsconfig has `noUnusedLocals`/`noUnusedParameters` — leave no unused imports or variables, `bun run build` runs `tsc -b` and will fail.

---

### Task 1: Scaffold extension from the CRXJS react-ts template

**Files:**
- Create: `extension/` (entire tree from the `create-crxjs` react-ts template)
- Modify: `extension/package.json` (name)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building CRXJS project at `extension/` with `src/popup/`, `src/content/`, `src/sidepanel/`, `manifest.config.ts`, `vite.config.ts`. Later tasks modify these paths exactly as named here.

**Background:** per the CRXJS docs (https://crxjs.dev/guide/installation/create-crxjs), scaffold with `bun x create-crxjs`. The CLI accepts a positional project name and a `--template` flag (`react-ts` = React + TypeScript), which skips the interactive framework prompt. Bun only — no npm.

- [ ] **Step 1: Scaffold into `extension/`**

```bash
cd /Users/apple/space/Snaggit
bun x create-crxjs extension --template react-ts
```

If the CLI still asks interactive questions the shell can't answer (non-TTY), have the user run `! bun x create-crxjs extension --template react-ts` from the Claude Code prompt instead, then continue.

Expected: `ls extension` shows `manifest.config.ts package.json public README.md src tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts` and a `.gitignore`.

- [ ] **Step 2: Set the package name**

In `extension/package.json`, set the `"name"` field (the scaffolder writes either the project dir name or `template-react-ts`) to:

```json
  "name": "snaggit",
```

- [ ] **Step 3: Install dependencies and verify the build**

```bash
cd extension
bun install
bun run build
```

Expected: `bun run build` completes with `✓ built in …` and a `dist/` directory containing `manifest.json`.

- [ ] **Step 4: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension
git commit -m "chore: scaffold extension from crxjs react-ts template"
```

---

### Task 2: Shared types + storage module (TDD)

**Files:**
- Create: `extension/src/shared/types.ts`
- Create: `extension/src/shared/storage.ts`
- Create: `extension/src/test/chrome-mock.ts`
- Create: `extension/vitest.config.ts`
- Modify: `extension/package.json` (test script + vitest dep)
- Test: `extension/src/shared/storage.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by every later task):
  - Types: `Highlight { id, text, pageUrl, pageTitle, createdAt, summary? }`, `HighlightSummary { text, model, createdAt }`, `NewHighlight`, `Settings { openaiApiKey, model }`, `DEFAULT_SETTINGS`, `MODEL_OPTIONS`, `SaveHighlightMessage { type: 'SAVE_HIGHLIGHT', payload: NewHighlight }`.
  - Storage functions: `getHighlights(): Promise<Highlight[]>`, `addHighlight(input: NewHighlight): Promise<Highlight>` (prepends → list is newest-first), `deleteHighlight(id: string): Promise<void>`, `setSummary(id: string, summary: HighlightSummary): Promise<void>`, `getSettings(): Promise<Settings>`, `saveSettings(s: Settings): Promise<void>`, `watchHighlights(cb: (h: Highlight[]) => void): () => void` (returns unsubscribe).

- [ ] **Step 1: Add Vitest**

```bash
cd extension
bun add -d vitest
```

In `extension/package.json` `"scripts"`, add:

```json
    "test": "vitest run",
```

Create `extension/vitest.config.ts` (separate from vite.config.ts so the crx/zip plugins don't run during tests):

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write the shared types**

Create `extension/src/shared/types.ts`:

```ts
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
```

- [ ] **Step 3: Write the chrome.storage test mock**

Create `extension/src/test/chrome-mock.ts` — an in-memory stand-in for `chrome.storage.local` + `onChanged`:

```ts
type StorageChanges = Record<string, chrome.storage.StorageChange>
type Listener = (changes: StorageChanges, area: string) => void

export function installChromeMock() {
  let store: Record<string, unknown> = {}
  const listeners = new Set<Listener>()

  const chromeMock = {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (items: Record<string, unknown>) => {
          const changes: StorageChanges = {}
          for (const [key, newValue] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue }
            store[key] = newValue
          }
          listeners.forEach(listener => listener(changes, 'local'))
        },
      },
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      },
    },
  }

  globalThis.chrome = chromeMock as unknown as typeof chrome

  return {
    reset: () => {
      store = {}
      listeners.clear()
    },
  }
}
```

- [ ] **Step 4: Write the failing storage tests**

Create `extension/src/shared/storage.test.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd extension
bun run test
```

Expected: FAIL — `Cannot find module './storage'` (or equivalent resolve error).

- [ ] **Step 6: Implement the storage module**

Create `extension/src/shared/storage.ts`:

```ts
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
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
bun run test
```

Expected: PASS — 7 tests.

- [ ] **Step 8: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension/src/shared extension/src/test extension/vitest.config.ts extension/package.json extension/bun.lock
git commit -m "feat: add highlight/settings storage over chrome.storage.local"
```

---

### Task 3: Summarizer — snippet guards + DirectOpenAIProvider (TDD)

**Files:**
- Create: `extension/src/shared/summarizer.ts`
- Test: `extension/src/shared/summarizer.test.ts`

**Interfaces:**
- Consumes: `Settings` from `src/shared/types.ts` (Task 2).
- Produces (used by Task 7 popup row):
  - `MIN_SNIPPET_CHARS = 100`, `MAX_SNIPPET_CHARS = 12000`, `TRUNCATION_NOTE = ' (summarized from first 12,000 characters)'`
  - `prepareSnippet(raw: string): SnippetCheck` where `SnippetCheck = { ok: true, text: string, truncated: boolean } | { ok: false, reason: 'too-short' }`
  - `class SummarizeError extends Error { kind: 'no-key' | 'invalid-key' | 'rate-limited' | 'network' | 'api' }`
  - `interface Summarizer { summarize(text: string, settings: Settings): Promise<string> }`
  - `class DirectOpenAIProvider implements Summarizer`

- [ ] **Step 1: Write the failing tests**

Create `extension/src/shared/summarizer.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd extension
bun run test
```

Expected: FAIL — cannot resolve `./summarizer`.

- [ ] **Step 3: Implement the summarizer**

Create `extension/src/shared/summarizer.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: PASS — 17 tests total (7 storage + 10 summarizer).

- [ ] **Step 5: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension/src/shared/summarizer.ts extension/src/shared/summarizer.test.ts
git commit -m "feat: add snippet guards and OpenAI summarizer provider"
```

---

### Task 4: Manifest rewrite + background service worker

**Files:**
- Modify: `extension/manifest.config.ts` (full rewrite below)
- Create: `extension/src/background/index.ts`
- Delete: `extension/src/sidepanel/` (entire directory)

**Interfaces:**
- Consumes: `addHighlight` from `src/shared/storage.ts`, `SaveHighlightMessage` from `src/shared/types.ts` (Task 2).
- Produces: a `SAVE_HIGHLIGHT` message handler — content script (Task 5) calls `chrome.runtime.sendMessage(message)` and receives `{ ok: boolean }`.

- [ ] **Step 1: Delete the sidepanel (not in spec — YAGNI)**

```bash
rm -rf /Users/apple/space/Snaggit/extension/src/sidepanel
```

- [ ] **Step 2: Rewrite the manifest**

Replace the entire contents of `extension/manifest.config.ts` with:

```ts
import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Snaggit',
  description: 'Save text highlights from any page and summarize them with AI.',
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: ['storage'],
  host_permissions: ['https://api.openai.com/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [{
    js: ['src/content/main.tsx'],
    matches: ['http://*/*', 'https://*/*'],
    run_at: 'document_idle',
  }],
})
```

Note: `content_scripts.js` still points at the template's `main.tsx`; Task 5 replaces it with `main.ts`. `host_permissions` for `api.openai.com` lets the popup call OpenAI cross-origin.

- [ ] **Step 3: Implement the background worker**

Create `extension/src/background/index.ts`:

```ts
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
```

- [ ] **Step 4: Verify build and load in Chrome**

```bash
cd extension
bun run build
```

Expected: build passes. Then manually: Chrome → `chrome://extensions` → Developer mode on → "Load unpacked" → select `extension/dist`. Expected: "Snaggit" loads with no errors; its service worker link appears under the card.

- [ ] **Step 5: Smoke-test the message handler**

In `chrome://extensions` → Snaggit → "service worker" → Console, run:

```js
chrome.runtime.sendMessage({ type: 'SAVE_HIGHLIGHT', payload: { text: 'x'.repeat(120), pageUrl: 'https://example.com', pageTitle: 'Example' } }, console.log)
  .then?.(() => {})
await chrome.storage.local.get('highlights')
```

Expected: response `{ ok: true }` and one stored highlight with `id` and `createdAt`.

- [ ] **Step 6: Commit**

```bash
cd /Users/apple/space/Snaggit
git add -A extension/manifest.config.ts extension/src/background extension/src/sidepanel
git commit -m "feat: add background save handler and Snaggit manifest"
```

---

### Task 5: Content script — selection bubble

**Files:**
- Create: `extension/src/content/main.ts`
- Delete: `extension/src/content/main.tsx`, `extension/src/content/views/` (template React content script)
- Modify: `extension/manifest.config.ts` (content script path only)

**Interfaces:**
- Consumes: `SaveHighlightMessage` type (Task 2); the background `SAVE_HIGHLIGHT` handler responding `{ ok: boolean }` (Task 4).
- Produces: user-facing save bubble; nothing imported by other tasks.

- [ ] **Step 1: Remove the template React content script**

```bash
rm /Users/apple/space/Snaggit/extension/src/content/main.tsx
rm -rf /Users/apple/space/Snaggit/extension/src/content/views
```

- [ ] **Step 2: Update the manifest content script path**

In `extension/manifest.config.ts`, change:

```ts
    js: ['src/content/main.tsx'],
```

to:

```ts
    js: ['src/content/main.ts'],
```

- [ ] **Step 3: Implement the bubble**

Create `extension/src/content/main.ts`:

```ts
import type { SaveHighlightMessage } from '../shared/types'

const MIN_SELECTION_CHARS = 3
const BUBBLE_WIDTH_PX = 140
const BUBBLE_OFFSET_PX = 40

let host: HTMLDivElement | null = null

function removeBubble() {
  host?.remove()
  host = null
}

function isEditable(node: Node | null): boolean {
  if (!node)
    return false
  const element = node instanceof Element ? node : node.parentElement
  return !!element?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]')
}

function showBubble(rect: DOMRect, text: string) {
  removeBubble()
  host = document.createElement('div')
  host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;'
  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    button {
      all: initial;
      font: 13px/1.4 -apple-system, system-ui, sans-serif;
      background: #1a1a2e;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
      user-select: none;
    }
    button:hover { background: #33334d; }
  `
  const button = document.createElement('button')
  button.textContent = 'Save Highlight?'
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    const message: SaveHighlightMessage = {
      type: 'SAVE_HIGHLIGHT',
      payload: { text, pageUrl: location.href, pageTitle: document.title },
    }
    chrome.runtime.sendMessage(message, (response?: { ok: boolean }) => {
      button.textContent = !chrome.runtime.lastError && response?.ok ? 'Saved ✓' : 'Save failed'
      setTimeout(removeBubble, 900)
    })
  })

  shadow.append(style, button)
  document.body.appendChild(host)

  const maxX = window.scrollX + document.documentElement.clientWidth - BUBBLE_WIDTH_PX
  const x = Math.min(Math.max(rect.left + window.scrollX, 8), maxX)
  const y = Math.max(rect.top + window.scrollY - BUBBLE_OFFSET_PX, window.scrollY + 8)
  host.style.transform = `translate(${x}px, ${y}px)`
}

document.addEventListener('mouseup', (event) => {
  if (host && event.composedPath().includes(host))
    return
  // Defer so a click that collapses the selection is processed first
  setTimeout(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? ''
    if (!selection || selection.isCollapsed || text.length < MIN_SELECTION_CHARS
      || isEditable(selection.anchorNode)) {
      removeBubble()
      return
    }
    showBubble(selection.getRangeAt(0).getBoundingClientRect(), text)
  }, 0)
})

document.addEventListener('mousedown', (event) => {
  if (host && !event.composedPath().includes(host))
    removeBubble()
})

document.addEventListener('scroll', removeBubble, true)
```

- [ ] **Step 4: Build and verify manually**

```bash
cd extension
bun run build
```

Then in Chrome (`chrome://extensions` → Snaggit → reload icon), open any article (e.g. a Wikipedia page) and check:

1. Selecting a sentence shows the "Save Highlight?" bubble near the selection.
2. Clicking it flips to "Saved ✓" and the bubble disappears.
3. Clicking elsewhere or scrolling dismisses the bubble; selections in a search input show no bubble.
4. In the service-worker console: `await chrome.storage.local.get('highlights')` shows the saved entry.

- [ ] **Step 5: Commit**

```bash
cd /Users/apple/space/Snaggit
git add -A extension/src/content extension/manifest.config.ts
git commit -m "feat: add save-highlight selection bubble content script"
```

---

### Task 6: Popup — highlight list, delete, empty state

**Files:**
- Modify: `extension/src/popup/App.tsx` (full rewrite)
- Modify: `extension/src/popup/App.css` (full rewrite)
- Modify: `extension/src/popup/index.css` (full rewrite)
- Create: `extension/src/popup/useHighlights.ts`
- Create: `extension/src/popup/components/HighlightRow.tsx`
- Delete: `extension/src/components/HelloWorld.tsx`, `extension/src/assets/` (template leftovers)

**Interfaces:**
- Consumes: `getHighlights`, `watchHighlights`, `deleteHighlight`, `getSettings` (Task 2 storage); `Highlight`, `Settings` types.
- Produces: `useHighlights(): Highlight[] | null`; `HighlightRow({ highlight, settings, onOpenSettings })` — Task 8 rewrites `HighlightRow` to add summarize, and Task 7 supplies the real settings view behind `onOpenSettings` (this task stubs it with `() => {}`).

- [ ] **Step 1: Remove template leftovers**

```bash
rm /Users/apple/space/Snaggit/extension/src/components/HelloWorld.tsx
rmdir /Users/apple/space/Snaggit/extension/src/components
rm -rf /Users/apple/space/Snaggit/extension/src/assets
```

- [ ] **Step 2: Create the highlights hook**

Create `extension/src/popup/useHighlights.ts`:

```ts
import { useEffect, useState } from 'react'
import type { Highlight } from '../shared/types'
import { getHighlights, watchHighlights } from '../shared/storage'

export function useHighlights(): Highlight[] | null {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null)

  useEffect(() => {
    getHighlights().then(setHighlights)
    return watchHighlights(setHighlights)
  }, [])

  return highlights
}
```

- [ ] **Step 3: Create the row component (list/delete only — Task 8 adds summarize)**

Create `extension/src/popup/components/HighlightRow.tsx`:

```tsx
import { useState } from 'react'
import type { Highlight, Settings } from '../../shared/types'
import { deleteHighlight } from '../../shared/storage'

interface Props {
  highlight: Highlight
  settings: Settings
  onOpenSettings: () => void
}

export function HighlightRow({ highlight }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="row">
      <p
        className={expanded ? 'text' : 'text clamped'}
        onClick={() => setExpanded(current => !current)}
        title={expanded ? 'Click to collapse' : 'Click to expand'}
      >
        {highlight.text}
      </p>
      <a className="source" href={highlight.pageUrl} target="_blank" rel="noreferrer">
        {highlight.pageTitle || highlight.pageUrl}
      </a>
      {highlight.summary && <p className="summary">{highlight.summary.text}</p>}
      <div className="actions">
        <button onClick={() => void deleteHighlight(highlight.id)}>Delete</button>
      </div>
    </article>
  )
}
```

Note: `settings` and `onOpenSettings` are declared but unused until Task 8 — destructure only `highlight` (as above) so `noUnusedParameters` stays green.

- [ ] **Step 4: Rewrite the popup app**

Replace the entire contents of `extension/src/popup/App.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'
import { getSettings } from '../shared/storage'
import { HighlightRow } from './components/HighlightRow'
import { useHighlights } from './useHighlights'
import './App.css'

export default function App() {
  const highlights = useHighlights()
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!highlights || !settings)
    return <div className="empty">Loading…</div>

  return (
    <div className="app">
      <header className="header">
        <h1>Snaggit</h1>
      </header>
      {highlights.length === 0
        ? (
            <div className="empty">
              Select text on any page and click “Save Highlight?” to get started.
            </div>
          )
        : (
            <ul className="list">
              {highlights.map(highlight => (
                <li key={highlight.id}>
                  <HighlightRow
                    highlight={highlight}
                    settings={settings}
                    onOpenSettings={() => {}}
                  />
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
```

- [ ] **Step 5: Rewrite the styles**

Replace the entire contents of `extension/src/popup/index.css` with:

```css
body {
  margin: 0;
  font-family: -apple-system, system-ui, sans-serif;
  color: #1a1a2e;
  background: #fff;
}
```

Replace the entire contents of `extension/src/popup/App.css` with:

```css
.app {
  width: 380px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5ef;
}

.header h1 {
  font-size: 16px;
  margin: 0;
}

.icon {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.empty {
  padding: 32px 20px;
  text-align: center;
  color: #6b6b80;
  font-size: 13px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.list li {
  border-bottom: 1px solid #f0f0f6;
}

.row {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
}

.text.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.source {
  font-size: 11px;
  color: #4a4ae0;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary {
  margin: 0;
  padding: 8px 10px;
  background: #f5f5fb;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #3a3a50;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.actions button {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid #d5d5e5;
  border-radius: 5px;
  background: #fff;
  cursor: pointer;
}

.actions button:hover:not(:disabled) {
  background: #f5f5fb;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  font-size: 12px;
  color: #c0392b;
  display: flex;
  gap: 8px;
  align-items: center;
}

.error button,
.error .link {
  font-size: 12px;
  background: none;
  border: none;
  color: #4a4ae0;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.note {
  font-size: 11px;
  color: #6b6b80;
}
```

(`.icon`, `.error`, `.note` are used by Tasks 7–8.)

- [ ] **Step 6: Build and verify manually**

```bash
cd extension
bun run build
```

Reload the extension, then click the Snaggit toolbar icon:

1. With no highlights: empty-state message shows.
2. Save a highlight on a page, reopen popup: it appears; save another while the popup is open — the list updates live, newest first.
3. Long text clamps to 4 lines; clicking expands/collapses.
4. Page-title link opens the source in a new tab; Delete removes the row immediately.

- [ ] **Step 7: Commit**

```bash
cd /Users/apple/space/Snaggit
git add -A extension/src/popup extension/src/components extension/src/assets
git commit -m "feat: add popup highlight list with live updates and delete"
```

---

### Task 7: Popup — settings view (API key + model)

**Files:**
- Create: `extension/src/popup/components/SettingsView.tsx`
- Modify: `extension/src/popup/App.tsx` (add view switching + gear button)

**Interfaces:**
- Consumes: `Settings`, `MODEL_OPTIONS` (Task 2 types); `saveSettings` (Task 2 storage).
- Produces: `SettingsView({ settings, onSave, onBack })`; `App` now passes a real `onOpenSettings` to rows (Task 8 uses it).

- [ ] **Step 1: Create the settings view**

Create `extension/src/popup/components/SettingsView.tsx`:

```tsx
import { useState } from 'react'
import type { Settings } from '../../shared/types'
import { MODEL_OPTIONS } from '../../shared/types'
import { saveSettings } from '../../shared/storage'

interface Props {
  settings: Settings
  onSave: (settings: Settings) => void
  onBack: () => void
}

export function SettingsView({ settings, onSave, onBack }: Props) {
  const [apiKey, setApiKey] = useState(settings.openaiApiKey)
  const [model, setModel] = useState(settings.model)

  async function handleSave() {
    const next: Settings = { openaiApiKey: apiKey.trim(), model }
    await saveSettings(next)
    onSave(next)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Settings</h1>
        <button className="icon" onClick={onBack} title="Back">←</button>
      </header>
      <div className="settings">
        <label>
          OpenAI API key
          <input
            type="password"
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="sk-…"
          />
        </label>
        <label>
          Model
          <select value={model} onChange={event => setModel(event.target.value)}>
            {MODEL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button className="save" onClick={() => void handleSave()}>Save</button>
        <p className="note">
          Your key is stored only on this device, in extension storage. Anyone with
          access to this browser profile could read it.
        </p>
      </div>
    </div>
  )
}
```

Append to `extension/src/popup/App.css`:

```css
.settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.settings label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #3a3a50;
}

.settings input,
.settings select {
  font-size: 13px;
  padding: 6px 8px;
  border: 1px solid #d5d5e5;
  border-radius: 5px;
}

.settings .save {
  align-self: flex-start;
  font-size: 13px;
  padding: 6px 14px;
  border: none;
  border-radius: 5px;
  background: #1a1a2e;
  color: #fff;
  cursor: pointer;
}
```

- [ ] **Step 2: Wire view switching into App**

Replace the entire contents of `extension/src/popup/App.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'
import { getSettings } from '../shared/storage'
import { HighlightRow } from './components/HighlightRow'
import { SettingsView } from './components/SettingsView'
import { useHighlights } from './useHighlights'
import './App.css'

export default function App() {
  const highlights = useHighlights()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [view, setView] = useState<'list' | 'settings'>('list')

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  if (!highlights || !settings)
    return <div className="empty">Loading…</div>

  if (view === 'settings') {
    return (
      <SettingsView
        settings={settings}
        onSave={(next) => {
          setSettings(next)
          setView('list')
        }}
        onBack={() => setView('list')}
      />
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Snaggit</h1>
        <button className="icon" onClick={() => setView('settings')} title="Settings">⚙️</button>
      </header>
      {highlights.length === 0
        ? (
            <div className="empty">
              Select text on any page and click “Save Highlight?” to get started.
            </div>
          )
        : (
            <ul className="list">
              {highlights.map(highlight => (
                <li key={highlight.id}>
                  <HighlightRow
                    highlight={highlight}
                    settings={settings}
                    onOpenSettings={() => setView('settings')}
                  />
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
```

- [ ] **Step 3: Build and verify manually**

```bash
cd extension
bun run build
```

Reload extension → popup: gear opens Settings; enter a key, pick a model, Save returns to the list; reopen the popup — Settings shows the persisted values (key field populated, model selected).

- [ ] **Step 4: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension/src/popup
git commit -m "feat: add settings view with API key and model selection"
```

---

### Task 8: Popup — per-highlight Summarize

**Files:**
- Modify: `extension/src/popup/components/HighlightRow.tsx` (full rewrite below)

**Interfaces:**
- Consumes: `prepareSnippet`, `DirectOpenAIProvider`, `SummarizeError`, `MIN_SNIPPET_CHARS`, `TRUNCATION_NOTE` (Task 3); `setSummary`, `deleteHighlight` (Task 2); `onOpenSettings` prop wired in Task 7.
- Produces: complete Phase 1 row behavior. The provider is instantiated behind the `Summarizer` interface — Phase 2 swaps in `ProxyServerProvider` here and nowhere else.

- [ ] **Step 1: Rewrite the row with summarize states**

Replace the entire contents of `extension/src/popup/components/HighlightRow.tsx` with:

```tsx
import { useState } from 'react'
import type { Highlight, Settings } from '../../shared/types'
import { deleteHighlight, setSummary } from '../../shared/storage'
import {
  DirectOpenAIProvider,
  MIN_SNIPPET_CHARS,
  prepareSnippet,
  SummarizeError,
  TRUNCATION_NOTE,
} from '../../shared/summarizer'
import type { Summarizer } from '../../shared/summarizer'

const provider: Summarizer = new DirectOpenAIProvider()

interface Props {
  highlight: Highlight
  settings: Settings
  onOpenSettings: () => void
}

export function HighlightRow({ highlight, settings, onOpenSettings }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string, needsKey: boolean } | null>(null)

  const snippet = prepareSnippet(highlight.text)

  async function summarize() {
    if (!snippet.ok)
      return
    setPending(true)
    setError(null)
    try {
      const text = await provider.summarize(snippet.text, settings)
      const suffix = snippet.truncated ? TRUNCATION_NOTE : ''
      await setSummary(highlight.id, {
        text: text + suffix,
        model: settings.model,
        createdAt: Date.now(),
      })
    }
    catch (thrown) {
      const isSummarizeError = thrown instanceof SummarizeError
      setError({
        message: isSummarizeError ? thrown.message : 'Something went wrong',
        needsKey: isSummarizeError && (thrown.kind === 'no-key' || thrown.kind === 'invalid-key'),
      })
    }
    finally {
      setPending(false)
    }
  }

  return (
    <article className="row">
      <p
        className={expanded ? 'text' : 'text clamped'}
        onClick={() => setExpanded(current => !current)}
        title={expanded ? 'Click to collapse' : 'Click to expand'}
      >
        {highlight.text}
      </p>
      <a className="source" href={highlight.pageUrl} target="_blank" rel="noreferrer">
        {highlight.pageTitle || highlight.pageUrl}
      </a>
      {highlight.summary && <p className="summary">{highlight.summary.text}</p>}
      <div className="actions">
        <button
          onClick={() => void summarize()}
          disabled={pending || !snippet.ok}
          title={snippet.ok ? undefined : `Too short to summarize (under ${MIN_SNIPPET_CHARS} characters)`}
        >
          {pending ? 'Summarizing…' : highlight.summary ? 'Re-summarize' : 'Summarize'}
        </button>
        <button onClick={() => void deleteHighlight(highlight.id)}>Delete</button>
      </div>
      {error && (
        <div className="error">
          <span>{error.message}</span>
          {error.needsKey
            ? <button className="link" onClick={onOpenSettings}>Open Settings</button>
            : <button onClick={() => void summarize()}>Retry</button>}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Run the unit test suite (regression check)**

```bash
cd extension
bun run test
```

Expected: PASS — all 17 tests still green.

- [ ] **Step 3: Build and verify manually**

```bash
bun run build
```

Reload extension, then in the popup:

1. With no API key: Summarize on a long-enough highlight shows "Add your OpenAI key in Settings" with an Open Settings link that switches views.
2. With a real key: Summarize shows "Summarizing…", then the summary appears and persists after closing/reopening the popup; the button now reads "Re-summarize".
3. A highlight under 100 chars: button disabled with the too-short tooltip.
4. With a bogus key (`sk-wrong`): "Invalid API key" + Open Settings link.

- [ ] **Step 4: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension/src/popup/components/HighlightRow.tsx
git commit -m "feat: add per-highlight OpenAI summarize with error states"
```

---

### Task 9: README + full E2E pass

**Files:**
- Modify: `extension/README.md` (full rewrite)

**Interfaces:**
- Consumes: everything built in Tasks 1–8.
- Produces: user-facing docs; final verification that the spec's E2E checklist passes.

- [ ] **Step 1: Rewrite the README**

Replace the entire contents of `extension/README.md` with:

````markdown
# Snaggit

Chrome extension: save text highlights from any page and summarize them with OpenAI.

## Develop

```bash
bun install
bun run dev     # dev build with HMR
bun run build   # production build → dist/
bun run test    # unit tests (Vitest)
```

Load in Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/dist`.

## Use

1. Select text on any page → click the **Save Highlight?** bubble.
2. Click the Snaggit toolbar icon to see saved highlights (newest first), delete them, or summarize one.
3. For summaries: open Settings (⚙️), paste your OpenAI API key, pick a model.

## Limitations

- Highlights are stored locally (`chrome.storage.local`) — no sync, no server.
- Saved highlights are not re-marked on the page when you revisit it.
- The bubble cannot appear on `chrome://` pages or the Chrome Web Store (Chrome blocks content scripts there).
- Your API key lives in local extension storage; anyone with access to this browser profile could read it.
- Summaries: snippets under 100 characters can't be summarized; snippets over 12,000 characters are truncated.
````

- [ ] **Step 2: Run the full E2E checklist manually**

With a fresh `bun run build` and the extension reloaded:

1. Load unpacked → no manifest errors.
2. Highlight text on a real article → bubble → save → "Saved ✓".
3. Popup shows the highlight; delete works; live-update works with popup open.
4. Settings: save key + model, values persist.
5. Summarize a long highlight → summary appears and persists across popup reopen.
6. Open a `chrome://` page → no bubble (expected limitation).
7. `bun run test` → all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/apple/space/Snaggit
git add extension/README.md
git commit -m "docs: add usage, development, and limitations to README"
```
