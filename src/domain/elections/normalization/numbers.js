export function num(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function clamp01(value) {
  return clamp(num(value), 0, 1)
}

export function norm(value, maxValue) {
  const max = num(maxValue)
  if (!max || max <= 0) return 0
  return clamp01(num(value) / max)
}

export function normRange(value, minValue, maxValue) {
  const min = num(minValue)
  const max = num(maxValue)
  const span = max - min
  if (!span || span <= 0) return 0
  return clamp01((num(value) - min) / span)
}

export function countTrue(names, obj = {}) {
  return names.reduce((count, name) => count + (obj?.[name] ? 1 : 0), 0)
}

export function hasAnyFeature(featureNames, features = {}) {
  return featureNames.some((name) => features?.[name])
}

export function sumObjectValues(obj = {}) {
  return Object.values(obj).reduce((sum, value) => sum + num(value), 0)
}

export function roundTo(value, digits = 4) {
  const factor = 10 ** digits
  return Math.round(num(value) * factor) / factor
}

