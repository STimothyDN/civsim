import { normalizeTemplateInput } from './templateCodec'

export const AUTOSAVE_KEY = 'civ:active-template:v1'
export const AUTOSAVE_VERSION = 1

export function getBrowserStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage || null
}

export function createAutosavePayload(data, savedAt = new Date().toISOString()) {
  return {
    version: AUTOSAVE_VERSION,
    savedAt,
    data,
  }
}

export function readAutosavedTemplate(storage = getBrowserStorage()) {
  if (!storage) return { template: null, savedAt: null, error: null }

  try {
    const raw = storage.getItem(AUTOSAVE_KEY)
    if (!raw) return { template: null, savedAt: null, error: null }

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== AUTOSAVE_VERSION || !parsed.data) {
      throw new Error('Unsupported autosave payload')
    }

    return {
      template: normalizeTemplateInput(parsed.data),
      savedAt: parsed.savedAt || null,
      error: null,
    }
  } catch (error) {
    storage.removeItem(AUTOSAVE_KEY)
    return { template: null, savedAt: null, error }
  }
}

export function writeAutosavedTemplate(data, storage = getBrowserStorage()) {
  if (!storage || !data) return false

  const payload = createAutosavePayload(data)
  storage.setItem(AUTOSAVE_KEY, JSON.stringify(payload))
  return true
}

export function clearAutosavedTemplate(storage = getBrowserStorage()) {
  if (!storage) return false
  storage.removeItem(AUTOSAVE_KEY)
  return true
}
