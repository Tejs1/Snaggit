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
