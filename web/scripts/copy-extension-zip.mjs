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
