import { normalizeTemplateInput } from './templateCodec'
import { getDefaultAdapter } from './idbStorage'

export const AUTOSAVE_KEY = 'civ:active-template:v1'
export const AUTOSAVE_VERSION = 1
export const AUTOSAVE_STATE_VERSION = 2

export function createAutosavePayload(data, savedAt = new Date().toISOString()) {
  return {
    version: AUTOSAVE_VERSION,
    savedAt,
    data,
  }
}

function makeWorldId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `world-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

let migrationDone = false

/**
 * One-time lift of the legacy localStorage autosave into IndexedDB, so users
 * who saved under the old backend don't lose their working world. Only runs
 * when the active adapter is IndexedDB and a legacy key is present.
 */
async function migrateLegacyLocalStorage(storage) {
  if (migrationDone) return
  migrationDone = true
  if (!storage || storage.kind !== 'idb') return
  if (typeof localStorage === 'undefined' || !localStorage) return
  try {
    const legacy = localStorage.getItem(AUTOSAVE_KEY)
    if (!legacy) return
    const existing = await storage.get(AUTOSAVE_KEY)
    if (!existing) await storage.set(AUTOSAVE_KEY, legacy)
    localStorage.removeItem(AUTOSAVE_KEY)
  } catch {
    // Migration is best-effort; ignore failures.
  }
}

function wrapSingleWorld(data, savedAt) {
  const id = makeWorldId()
  return {
    worlds: [{ id, data: normalizeTemplateInput(data), election: null, polling: null, savedAt: savedAt || null }],
    activeWorldId: id,
  }
}

/**
 * Reads the persisted multi-world state. Handles the v2 multi-world payload,
 * the legacy v1 single-template payload (wrapped into one world), and missing
 * data. Returns `{ worlds, activeWorldId, error }`.
 */
export async function readAutosavedState(storage = getDefaultAdapter()) {
  try {
    await migrateLegacyLocalStorage(storage)
    const raw = await storage.get(AUTOSAVE_KEY)
    if (!raw) return { worlds: [], activeWorldId: null, error: null }

    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.version) throw new Error('Unsupported autosave payload')

    // v2 — multiple worlds
    if (parsed.version >= AUTOSAVE_STATE_VERSION && Array.isArray(parsed.worlds)) {
      const worlds = parsed.worlds
        .filter((world) => world && world.data)
        .map((world) => ({
          id: world.id || makeWorldId(),
          data: normalizeTemplateInput(world.data),
          election: world.election || null,
          polling: world.polling || null,
          savedAt: world.savedAt || parsed.savedAt || null,
        }))
      if (!worlds.length) return { worlds: [], activeWorldId: null, error: null }
      const activeWorldId = worlds.some((world) => world.id === parsed.activeWorldId)
        ? parsed.activeWorldId
        : worlds[0].id
      return { worlds, activeWorldId, error: null }
    }

    // v1 — single template
    if (parsed.version === AUTOSAVE_VERSION && parsed.data) {
      return { ...wrapSingleWorld(parsed.data, parsed.savedAt || null), error: null }
    }

    throw new Error('Unsupported autosave payload')
  } catch (error) {
    try {
      await storage.remove(AUTOSAVE_KEY)
    } catch {
      // ignore
    }
    return { worlds: [], activeWorldId: null, error }
  }
}

export async function writeAutosavedState({ worlds, activeWorldId }, storage = getDefaultAdapter()) {
  if (!Array.isArray(worlds) || !worlds.length) return false
  try {
    const payload = {
      version: AUTOSAVE_STATE_VERSION,
      savedAt: new Date().toISOString(),
      activeWorldId,
      worlds: worlds.map((world) => ({
        id: world.id,
        data: world.data,
        election: world.election || null,
        polling: world.polling || null,
        savedAt: world.savedAt || null,
      })),
    }
    await storage.set(AUTOSAVE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export async function clearAutosavedTemplate(storage = getDefaultAdapter()) {
  try {
    await storage.remove(AUTOSAVE_KEY)
    return true
  } catch {
    return false
  }
}
