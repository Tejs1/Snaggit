# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a minimal Vite+React+TS landing page at `web/`, deployed to Vercel, that lets visitors download the Snaggit extension build and links to its GitHub repo.

**Architecture:** A standalone Vite+React+TS project (`web/`) sibling to `extension/`. Its build script first shells out to build the extension (`bun install && bun run build` in `extension/`), copies the resulting zip to a stable filename in `web/public/`, then runs `vite build` for the page itself. Deployed as its own Vercel project rooted at `web/`.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, bun (matches `extension/`'s stack). No new runtime dependencies beyond react/react-dom.

## Global Constraints

- Use `bun` for all install/run commands in `web/`, matching `extension/`.
- Extension repo link: `https://github.com/Tejs1/Snaggit` (already pushed by user).
- Download link must be a **stable filename** (`snaggit-extension.zip`) — never versioned — so the link never breaks across releases.
- No committed binaries: the zip is generated at build time, not committed to git.
- Single page, no routing, no extra sections beyond: hero, download button, GitHub button, feature list, install steps.
- Deploy via Vercel CLI (already authenticated on this machine).

---

### Task 1: Scaffold the `web/` Vite+React+TS project

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/tsconfig.app.json`
- Create: `web/tsconfig.node.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/.gitignore`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx` (placeholder, replaced fully in Task 3)
- Create: `web/src/App.css` (placeholder, replaced fully in Task 3)
- Create: `web/src/vite-env.d.ts`

**Interfaces:**
- Produces: a working `bun run dev` / `bun run build` / `bun run preview` project at `web/`, mounting `<App />` into `#root`. `App.tsx` exports a default `App` component with no props (later tasks fill in content).

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "snaggit-web",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "typescript": "~5.9.3",
    "vite": "^8.0.0"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "files": []
}
```

- [ ] **Step 3: Create `web/tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleDetection": "force",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["vite/client"],
    "allowImportingTsExtensions": true,
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "scripts/**/*.mjs"]
}
```

- [ ] **Step 5: Create `web/vite.config.ts`**

```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 6: Create `web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snaggit — save highlights from any page</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `web/src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 8: Create `web/src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Create placeholder `web/src/App.tsx`**

```typescript
export default function App() {
  return <div className="app">Snaggit</div>
}
```

- [ ] **Step 10: Create placeholder `web/src/App.css`**

```css
.app {
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 11: Create `web/.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.DS_Store
public/snaggit-extension.zip
```

- [ ] **Step 12: Install and verify dev server boots**

Run: `cd web && bun install`
Expected: dependencies install without error, `bun.lock` created.

Run: `bun run build`
Expected: `vite build` succeeds, `web/dist/index.html` exists.

- [ ] **Step 13: Commit**

```bash
git add web/package.json web/tsconfig*.json web/vite.config.ts web/index.html web/.gitignore web/src/main.tsx web/src/App.tsx web/src/App.css web/src/vite-env.d.ts web/bun.lock
git commit -m "chore: scaffold web landing page project"
```

---

### Task 2: Build-time extension zip copy script

**Files:**
- Create: `web/scripts/copy-extension-zip.mjs`
- Modify: `web/package.json` (`build` script)

**Interfaces:**
- Consumes: `extension/release/*.zip` (produced by `bun run build` in `extension/`, via the existing `vite-plugin-zip-pack` config at `extension/vite.config.ts:24`).
- Produces: `web/public/snaggit-extension.zip` (stable filename), created before `vite build` runs. Script exits non-zero (and prints a clear error) if the extension build fails or no zip is found, so a broken extension build fails the Vercel deploy loudly instead of shipping a stale/missing download.

- [ ] **Step 1: Create `web/scripts/copy-extension-zip.mjs`**

```javascript
import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = join(__dirname, '..')
const extensionRoot = join(webRoot, '..', 'extension')
const releaseDir = join(extensionRoot, 'release')
const publicDir = join(webRoot, 'public')
const destPath = join(publicDir, 'snaggit-extension.zip')

console.log('[copy-extension-zip] building extension...')
execSync('bun install && bun run build', {
  cwd: extensionRoot,
  stdio: 'inherit',
})

const zipFiles = readdirSync(releaseDir).filter((f) => f.endsWith('.zip'))
if (zipFiles.length === 0) {
  console.error(`[copy-extension-zip] no zip found in ${releaseDir}`)
  process.exit(1)
}

// vite-plugin-zip-pack writes exactly one zip per build; if more than one
// is ever present, picking the most recently modified one is correct.
const newest = zipFiles
  .map((f) => ({ f, mtime: statSync(join(releaseDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)[0].f

mkdirSync(publicDir, { recursive: true })
copyFileSync(join(releaseDir, newest), destPath)
console.log(`[copy-extension-zip] copied ${newest} -> ${destPath}`)
```

- [ ] **Step 2: Wire into `web/package.json` build script**

```json
"scripts": {
  "dev": "vite",
  "build": "node scripts/copy-extension-zip.mjs && vite build",
  "preview": "vite preview"
}
```

- [ ] **Step 3: Run the build and verify the zip lands correctly**

Run: `cd web && bun run build`
Expected: console shows `[copy-extension-zip] building extension...` then `[copy-extension-zip] copied crx-snaggit-1.0.0.zip -> .../web/public/snaggit-extension.zip`, then vite build output, and `web/public/snaggit-extension.zip` exists.

Run: `unzip -l web/public/snaggit-extension.zip | head -5`
Expected: lists `manifest.json` among the entries, confirming it's a valid extension package.

- [ ] **Step 4: Verify failure path (extension build broken) fails loudly**

Run: `cd extension && mv vite.config.ts vite.config.ts.bak && cd ../web && bun run build; echo "exit code: $?"`
Expected: non-zero exit code, error surfaced from the extension build (not a silent empty zip).

Run: `cd extension && mv vite.config.ts.bak vite.config.ts` to restore.

- [ ] **Step 5: Commit**

```bash
git add web/scripts/copy-extension-zip.mjs web/package.json
git commit -m "feat: generate extension zip at web build time"
```

---

### Task 3: Landing page content and styling

**Files:**
- Modify: `web/src/App.tsx` (full replacement of Task 1's placeholder)
- Modify: `web/src/App.css` (full replacement of Task 1's placeholder)

**Interfaces:**
- Consumes: `/snaggit-extension.zip` (static asset from Task 2), `https://github.com/Tejs1/Snaggit` (constant).
- Produces: final `App` component rendering the full landing page — no props, no external state.

- [ ] **Step 1: Replace `web/src/App.tsx`**

```typescript
import './App.css'

const REPO_URL = 'https://github.com/Tejs1/Snaggit'
const DOWNLOAD_URL = '/snaggit-extension.zip'

const FEATURES = [
  'Select text on any page and click the "Save Highlight?" bubble, or right-click a selection.',
  'Keyboard selections (Cmd/Ctrl+A, Shift+arrows) trigger the save bubble too.',
  'View, delete, or summarize saved highlights from the toolbar popup.',
  'Summaries run through OpenAI using your own API key, set in Settings.',
  'Open the full-page highlights view for more room.',
]

const INSTALL_STEPS = [
  'Click Download below and unzip the file.',
  'Open chrome://extensions in Chrome.',
  'Enable Developer mode (top right).',
  'Click Load unpacked and select the unzipped folder.',
]

export default function App() {
  return (
    <div className="app">
      <header className="hero">
        <h1>Snaggit</h1>
        <p className="tagline">Save text highlights from any page and summarize them with AI.</p>
        <div className="cta-row">
          <a className="button button--primary" href={DOWNLOAD_URL} download>
            Download for Chrome
          </a>
          <a className="button button--secondary" href={REPO_URL} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
        </div>
      </header>

      <section className="section">
        <h2>What it does</h2>
        <ul>
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Install</h2>
        <ol>
          {INSTALL_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Replace `web/src/App.css`**

```css
:root {
  color-scheme: light dark;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f1115;
  color: #e8e8ec;
}

.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 4rem 1.5rem 6rem;
}

.hero {
  text-align: center;
  margin-bottom: 3.5rem;
}

.hero h1 {
  font-size: 3rem;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 1.15rem;
  color: #a8adb8;
  margin: 0 0 2rem;
}

.cta-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
}

.button--primary {
  background: #6d5efc;
  color: #fff;
}

.button--secondary {
  background: transparent;
  color: #e8e8ec;
  border: 1px solid #3a3f4b;
}

.section {
  margin-bottom: 2.5rem;
}

.section h2 {
  font-size: 1.1rem;
  color: #a8adb8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.section ul,
.section ol {
  padding-left: 1.25rem;
  line-height: 1.7;
}
```

- [ ] **Step 3: Visual check locally**

Run: `cd web && bun run dev`
Expected: dev server starts; open the printed localhost URL and confirm the hero, download button, GitHub button, feature list, and install steps all render without console errors. Confirm the download button downloads `snaggit-extension.zip` (built once in Task 2, still present in `public/`).

Stop the dev server after checking (Ctrl-C).

- [ ] **Step 4: Commit**

```bash
git add web/src/App.tsx web/src/App.css
git commit -m "feat: add landing page content and styling"
```

---

### Task 4: Deploy to Vercel

**Files:**
- Create: `web/vercel.json` (only if default zero-config detection needs overriding — see Step 1)

**Interfaces:**
- Consumes: the `web/` project built in Tasks 1–3.
- Produces: a live Vercel deployment URL.

- [ ] **Step 1: Check whether Vercel's auto-detection needs an override**

Vercel auto-detects Vite projects and runs `bun install` + `bun run build` with output `dist` when it finds `web/package.json` and a `bun.lock`. Since the `build` script already runs the extension sub-build internally (Task 2), no `vercel.json` should be needed. Confirm by reading Vercel's framework detection: if `vercel dev`/`vercel build` in Step 3 below picks the wrong output directory, add:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install"
}
```

to `web/vercel.json` and re-run Step 3.

- [ ] **Step 2: Link the Vercel project**

Run: `cd web && vercel link`
Expected: interactive prompts to select scope/project name; accept defaults or name it `snaggit`. Creates `web/.vercel/` (already covered by needing a gitignore entry — add `.vercel` to `web/.gitignore` if the CLI doesn't do so automatically).

- [ ] **Step 3: Deploy to production**

Run: `cd web && vercel --prod`
Expected: build logs show the extension sub-build running, then the Vite build, then a production URL is printed (e.g. `https://snaggit-xyz.vercel.app`).

- [ ] **Step 4: Verify the live deployment**

Run: `curl -sI https://<deployed-url>/snaggit-extension.zip | head -1`
Expected: `HTTP/2 200`.

Open the deployed URL in a browser and confirm the download button and GitHub link both work.

- [ ] **Step 5: Commit any vercel.json / gitignore changes**

```bash
git add web/vercel.json web/.gitignore 2>/dev/null
git commit -m "chore: configure vercel deployment for web"
```

(Skip this step if no files changed in Step 1/2.)
