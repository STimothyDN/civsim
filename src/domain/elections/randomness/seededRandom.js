export function hashStringToUint32(seed) {
  const input = String(seed ?? '')
  let hash = 2166136261

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function createSeededRng(seed) {
  let state = hashStringToUint32(seed) || 1

  return function rng() {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomFloat(rng, min = 0, max = 1) {
  return min + rng() * (max - min)
}

export function randomInt(rng, min, max) {
  return Math.floor(randomFloat(rng, min, max + 1))
}

export function sampleWithoutReplacement(rng, items, count) {
  const pool = [...items]
  const result = []
  const target = Math.min(count, pool.length)

  while (result.length < target) {
    const index = randomInt(rng, 0, pool.length - 1)
    result.push(pool.splice(index, 1)[0])
  }

  return result
}

export function normalRandom(seed) {
  const rng = createSeededRng(seed)
  const u1 = Math.max(rng(), Number.EPSILON)
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

export function makeSeed(prefix = 'election') {
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`
}

export function shortId(rng, length = 6) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let output = ''
  for (let i = 0; i < length; i += 1) {
    output += alphabet[randomInt(rng, 0, alphabet.length - 1)]
  }
  return output
}

