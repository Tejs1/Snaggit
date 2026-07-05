type StorageChanges = Record<string, chrome.storage.StorageChange>
type Listener = (changes: StorageChanges, area: string) => void

type RuntimeSendResponse = (response?: unknown) => void
type RuntimeListener = (message: unknown, sender: unknown, sendResponse: RuntimeSendResponse) => boolean | void

export function installChromeMock() {
  let store: Record<string, unknown> = {}
  const listeners = new Set<Listener>()
  const runtimeListeners = new Set<RuntimeListener>()

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
    runtime: {
      lastError: undefined as { message: string } | undefined,
      onMessage: {
        addListener: (listener: RuntimeListener) => runtimeListeners.add(listener),
        removeListener: (listener: RuntimeListener) => runtimeListeners.delete(listener),
      },
      sendMessage: (message: unknown, callback?: RuntimeSendResponse) => {
        let responded = false
        const sendResponse: RuntimeSendResponse = (response) => {
          responded = true
          callback?.(response)
        }
        for (const listener of runtimeListeners) {
          const keepChannelOpen = listener(message, {}, sendResponse)
          if (keepChannelOpen === true)
            return
        }
        if (!responded)
          callback?.(undefined)
      },
    },
  }

  globalThis.chrome = chromeMock as unknown as typeof chrome

  return {
    reset: () => {
      store = {}
      listeners.clear()
      chromeMock.runtime.lastError = undefined
    },
  }
}
