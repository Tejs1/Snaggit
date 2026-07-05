import type { SaveHighlightMessage } from '../shared/types'

const MIN_SELECTION_CHARS = 3
const BUBBLE_WIDTH_PX = 140
const BUBBLE_OFFSET_PX = 40

const SELECTION_KEYUP_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']

let host: HTMLDivElement | null = null
let shownText: string | null = null

function removeBubble() {
  host?.remove()
  host = null
  shownText = null
}

function isEditable(node: Node | null): boolean {
  if (!node)
    return false
  const element = node instanceof Element ? node : node.parentElement
  return !!element?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]')
}

function showBubble(rect: DOMRect, text: string) {
  removeBubble()
  shownText = text
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

function maybeShowBubble() {
  const selection = window.getSelection()
  const text = selection?.toString().trim() ?? ''
  if (!selection || selection.isCollapsed || text.length < MIN_SELECTION_CHARS
    || isEditable(selection.anchorNode)) {
    removeBubble()
    return
  }
  if (host && shownText === text)
    return
  showBubble(selection.getRangeAt(0).getBoundingClientRect(), text)
}

document.addEventListener('mouseup', (event) => {
  if (host && event.composedPath().includes(host))
    return
  // Defer so a click that collapses the selection is processed first
  setTimeout(maybeShowBubble, 0)
})

document.addEventListener('keyup', (event) => {
  const isSelectAll = event.key === 'a' && (event.metaKey || event.ctrlKey)
  const isShiftNav = event.shiftKey && SELECTION_KEYUP_KEYS.includes(event.key)
  if (!isSelectAll && !isShiftNav)
    return
  setTimeout(maybeShowBubble, 0)
})

document.addEventListener('mousedown', (event) => {
  if (host && !event.composedPath().includes(host))
    removeBubble()
})

document.addEventListener('scroll', removeBubble, true)
