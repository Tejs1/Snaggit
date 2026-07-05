# Snaggit — Chrome Highlight-Saver Extension (Phase 1 Design)

## Context

Snaggit is a Chrome extension that lets users highlight text on any webpage and save those highlights locally, with per-highlight AI summaries. Greenfield project in `/Users/apple/space/Snaggit`.

Decisions validated during brainstorming:

- **No on-page re-highlighting on revisit** — highlights live only in the toolbar-popup list. This deliberately avoids the text re-anchoring problem (re-finding saved text in a changed DOM), the hardest part of highlighter extensions.
- **Per-highlight Summarize** button (not a global digest of all highlights).
- **Phased delivery**: Phase 1 (this spec) ships the extension with a bring-your-own OpenAI key and model selection. Phase 2 (separate spec later) adds a Node.js + Express proxy server with Google OAuth (`chrome.identity.getAuthToken`, token verified server-side), per-email rate limiting, prompt guardrails, snippet-size bounds, and a cheap fast model. The extension is designed with a provider seam so the server drops in without rework.
- **Stack**: TypeScript + Vite + CRXJS, React popup, **Bun** as package manager/runtime. Scaffold via `bun x create-crxjs` (React + TS template); develop via `bun dev`.

## Architecture

```
Snaggit/
├── extension/            # Phase 1 (this spec)
│   ├── manifest.json     # MV3, managed by CRXJS
│   ├── src/
│   │   ├── content/      # selection detection + "Save Highlight?" bubble
│   │   ├── background/   # service worker: sole storage writer, message hub
│   │   ├── popup/        # React: list, delete, summarize, settings
│   │   └── shared/       # types, storage module, Summarizer providers
│   └── vite.config.ts
└── server/               # Phase 2 — later spec
```

### Components (one responsibility each)

1. **Content script** (vanilla TS — no React; it runs on every page and must stay light). On `mouseup` with a non-empty trimmed selection, shows a small "Save Highlight?" bubble near the selection (positioned via the range's `getBoundingClientRect`, clamped to the viewport), rendered inside a **Shadow DOM** so page CSS can't break it and its styles can't leak out. Clicking the bubble sends a `SAVE_HIGHLIGHT` message to the background worker, then the bubble flips to "Saved ✓" and dismisses. The bubble also dismisses on outside click, scroll, or a new selection. Selections inside inputs/textareas are ignored.
2. **Background service worker** — the only writer to `chrome.storage.local`. Receives `SAVE_HIGHLIGHT` messages, assigns IDs, persists. Prevents the content script and popup racing on writes.
3. **Popup (React)** — scrollable newest-first highlight list. Each row: text snippet (clamped to ~4 lines, expandable), page title linked to the source URL (opens in a new tab), stored summary if present, **Summarize** and **Delete** buttons with per-row loading/error states. A gear icon opens the settings view. The list live-updates via `chrome.storage.onChanged`.
4. **Summarizer seam** — `interface Summarizer { summarize(text: string, settings: Settings): Promise<string> }`. Phase 1 implementation: `DirectOpenAIProvider` (fetch to OpenAI chat completions with the user's key). Phase 2 adds `ProxyServerProvider` behind the same interface.

## Data model (`chrome.storage.local`)

```ts
interface Highlight {
  id: string;            // crypto.randomUUID()
  text: string;
  pageUrl: string;
  pageTitle: string;
  createdAt: number;
  summary?: { text: string; model: string; createdAt: number };
}

interface Settings {
  openaiApiKey: string;
  model: string;         // dropdown: "gpt-4o-mini" (default), "gpt-4.1-mini", "gpt-4o"
}
```

Summaries persist on the highlight record — fetched once, they survive popup close (MV3 popups are ephemeral; their JS context dies on close). `chrome.storage.local`'s ~10 MB quota comfortably holds thousands of highlights.

## Flows

- **Save**: select text → bubble appears → click → background persists → "Saved ✓".
- **Summarize**: row button → `DirectOpenAIProvider` → `POST https://api.openai.com/v1/chat/completions` with the user-selected model and a fixed system prompt ("Summarize this passage in 2–3 sentences") → result written to `highlight.summary` in storage.
- **Delete**: immediate removal from storage, no confirmation dialog (low stakes).

## Error handling & guards

| Case | Behavior |
|---|---|
| No API key set | Summarize shows "Add your OpenAI key in Settings" with a link to the settings view |
| Snippet < 100 chars | Summarize disabled with a hint — nothing worth summarizing |
| Snippet > 12,000 chars | Truncate to 12,000; result notes "summarized from first 12,000 characters" |
| 401 from OpenAI | Inline "Invalid API key" + settings link |
| 429 / network failure | Inline error with a Retry button on the row |
| Restricted pages (chrome://, Chrome Web Store) | Content scripts cannot run there — documented limitation, no code needed |

The settings UI includes one honest caveat: a locally stored API key is readable by anyone with access to the machine profile — inherent to bring-your-own-key extensions.

## Testing

- **Vitest (run via Bun)**: unit tests for the storage module and `DirectOpenAIProvider` with mocked `fetch` — success, 401, 429, truncation, and short-snippet guard cases.
- **Manual E2E checklist**: load unpacked → highlight text on a real article → save → verify it appears in the popup → summarize → delete → confirm restricted-page limitation.

## Phase 2 API contract (defined now, built later)

`POST /summarize` with header `Authorization: Bearer <Google OAuth token>` and body `{ text }` → `{ summary }`. The server verifies the token with Google, rate-limits per email, enforces snippet-size bounds (30–50% of the model's context), applies prompt guardrails, and uses the cheapest fast model. On the extension side this is one new `Summarizer` implementation plus a settings toggle between server mode and bring-your-own-key mode (with per-mode model selection).

## Verification

- `bun dev` builds; Chrome loads the unpacked extension with no manifest errors.
- The full manual E2E checklist passes on a live article page.
- `bun test` (Vitest) is green.
