/**
 * Tiny async key→string storage adapters.
 *
 * The app persists its autosave through one of these so the backend can be
 * swapped without touching call sites. The default is IndexedDB (large quota,
 * unblocks multiple loaded worlds); in environments without it (e.g. jsdom in
 * tests) it transparently falls back to localStorage, then to memory.
 *
 * Every adapter exposes the same async surface:
 *   { kind, get(key) → string|null, set(key, value), remove(key) }
 */

const DB_NAME = 'civ-sim'
const DB_VERSION = 1
const STORE = 'kv'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('IndexedDB open blocked'))
  })
  return dbPromise
}

function runTransaction(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const store = transaction.objectStore(STORE)
        const request = run(store)
        transaction.oncomplete = () => resolve(request ? request.result : undefined)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
  )
}

export function createIdbAdapter() {
  return {
    kind: 'idb',
    async get(key) {
      const value = await runTransaction('readonly', (store) => store.get(key))
      return value === undefined ? null : value
    },
    set(key, value) {
      return runTransaction('readwrite', (store) => store.put(value, key))
    },
    remove(key) {
      return runTransaction('readwrite', (store) => store.delete(key))
    },
  }
}

export function createLocalStorageAdapter(storage = globalThis.localStorage) {
  return {
    kind: 'local',
    async get(key) {
      return storage.getItem(key)
    },
    async set(key, value) {
      storage.setItem(key, value)
    },
    async remove(key) {
      storage.removeItem(key)
    },
  }
}

export function createMemoryAdapter() {
  const map = new Map()
  return {
    kind: 'memory',
    async get(key) {
      return map.has(key) ? map.get(key) : null
    },
    async set(key, value) {
      map.set(key, value)
    },
    async remove(key) {
      map.delete(key)
    },
  }
}

let cachedAdapter = null

export function getDefaultAdapter() {
  if (cachedAdapter) return cachedAdapter
  if (typeof indexedDB !== 'undefined' && indexedDB) cachedAdapter = createIdbAdapter()
  else if (typeof localStorage !== 'undefined' && localStorage) cachedAdapter = createLocalStorageAdapter()
  else cachedAdapter = createMemoryAdapter()
  return cachedAdapter
}

// Test seam — lets specs force a deterministic backend.
export function __setDefaultAdapter(adapter) {
  cachedAdapter = adapter
}
