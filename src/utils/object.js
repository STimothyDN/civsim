export function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

/**
 * Recursively copy objects/arrays into fresh plain values, keeping primitives
 * (including NaN/undefined) exactly as they are. Reading through a reactive
 * proxy tracks every nested property once, so a computed that snapshots its
 * input this way stays fully reactive while the code it feeds runs on plain
 * objects (no per-access proxy overhead in hot loops).
 */
export function plainClone(value) {
  if (Array.isArray(value)) return value.map((item) => plainClone(item))
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = plainClone(value[key])
    return out
  }
  return value
}
