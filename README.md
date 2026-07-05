# Snaggit

Chrome extension for saving text highlights from any page and summarizing them with OpenAI, plus its marketing landing page.

Landing page: [snaggit.vercel.app](https://snaggit.vercel.app)

## Features

- Save a highlight by selecting text on any page (bubble prompt) or via the right-click context menu; keyboard selections trigger the bubble too.
- Browse saved highlights (newest first) from the toolbar popup, or expand to a full-page view for more room.
- Summarize any saved highlight with OpenAI, bringing your own API key and choice of model.
- Delete highlights you no longer need.
- Everything is stored locally via `chrome.storage.local` — no account, no server round-trip for storage.

## Layout

- **`extension/`** — the Chrome extension (React + TypeScript, crxjs/Vite). See [extension/README.md](extension/README.md) for setup, usage, and limitations.
- **`web/`** — the landing page (React + Vite), deployed via Vercel. Its build copies a zip of the built extension into `web/dist` for download.
- **`docs/`** — implementation and design plans.

## How to use

1. Build and load the extension — see [extension/README.md](extension/README.md#develop) for the `bun` commands and how to load it unpacked in Chrome.
2. Select text on any page and click the **Save Highlight?** bubble (or right-click → **Save highlight to Snaggit**).
3. Open the toolbar popup to view, delete, or summarize saved highlights.
4. Add your OpenAI API key and pick a model under Settings (⚙️) to enable summaries.

## Deployment

`vercel.json` at the repo root builds and deploys `web/` (`cd web && bun run build`, output `web/dist`).

## Planned (Phase 2)

Per `docs/superpowers/specs/2026-07-05-snaggit-highlighter-design.md`:

- A Node.js + Express proxy server so users don't need their own OpenAI key.
- Google OAuth sign-in (`chrome.identity.getAuthToken`), verified server-side.
- Per-email rate limiting, prompt guardrails, and snippet-size bounds on the server.
- A cheap, fast default model for server-backed summaries.
- A settings toggle between server mode and bring-your-own-key mode.

The extension's `Summarizer` interface is already designed with this seam in mind, so Phase 2 swaps in a `ProxyServerProvider` without reworking existing code.
