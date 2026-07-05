# Snaggit landing page — design

## Purpose

A minimal marketing/download page for the Snaggit Chrome extension, deployed to Vercel, so users can:
- Download the packaged extension build (unpacked-load zip)
- Find the GitHub repo (https://github.com/Tejs1/Snaggit)

## Repo link

The extension code will be pushed to `https://github.com/Tejs1/Snaggit`. The landing page links to this repo directly (no repo creation needed by Claude — user owns pushing).

## Structure

New top-level folder `web/` (sibling to `extension/`), a separate Vite + React + TS project using `bun`, matching the extension's stack and tooling conventions. Deployed as its own Vercel project with root directory `web`.

```
web/
  src/
    App.tsx        # single page: hero, download button, repo link, features, install steps
    App.css
    main.tsx
  scripts/
    copy-extension-zip.mjs   # build-time step, see below
  index.html
  package.json
  vite.config.ts
  tsconfig.json
```

## Build pipeline (zip delivery)

The extension already produces a packaged zip via `vite-plugin-zip-pack` at `extension/release/crx-snaggit-{version}.zip` when `bun run build` runs in `extension/`.

`web/package.json` build script:
```
"build": "node scripts/copy-extension-zip.mjs && vite build"
```

`scripts/copy-extension-zip.mjs`:
1. Runs `bun install && bun run build` in `../extension` (via child_process).
2. Locates the newest `*.zip` in `extension/release/`.
3. Copies it to `web/public/snaggit-extension.zip` — a **stable filename** regardless of version, so the download link on the page never needs to change across releases.

This means the zip is always freshly built from current extension source on every Vercel deploy, and no binary is committed to git.

Vercel project settings (root directory `web`):
- Build command: `bun run build` (the script above handles the extension sub-build internally)
- Output directory: `dist`
- Install command: `bun install`

## Page content

Single page, no routing:

1. **Hero** — "Snaggit" name + tagline ("Save text highlights from any page and summarize them with AI.")
2. **Download button** — links to `/snaggit-extension.zip` (stable name, direct download)
3. **GitHub button** — links to `https://github.com/Tejs1/Snaggit`
4. **Feature list** — short bullets adapted from `extension/README.md` ("Use" section): save via bubble or right-click, view/delete/summarize in popup, full-page view.
5. **Install instructions** — "Load unpacked" steps adapted from `extension/README.md`: unzip the download, go to `chrome://extensions`, enable Developer mode, Load unpacked, select the unzipped folder.

No FAQ/limitations section, no screenshots — kept minimal per requirements.

## Styling

Simple, clean single-page layout. No design system dependency beyond what's already used in the extension popup (plain CSS). Visual polish applied during implementation (frontend-design skill) but scope stays to one page, no extra sections beyond the above.

## Deployment

Vercel CLI is already authenticated on this machine. Implementation includes running `vercel link` / `vercel --prod` (or equivalent) from `web/` to create the project and deploy it directly, after verifying the build succeeds locally.

## Out of scope

- No Chrome Web Store listing/publishing.
- No analytics, contact form, or additional pages.
- No CI workflow changes — Vercel's own build step handles the fresh zip generation.
- No versioned download links (only the stable-name zip).
