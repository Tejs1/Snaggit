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
- Selections shorter than 3 characters don't trigger the save bubble.
- The bubble only works in the page's top frame, not inside iframes.
