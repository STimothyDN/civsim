export function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}
