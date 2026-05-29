/**
 * Calculated fields derived from user-input data.
 *
 * The scaling constants, prelate seat tiers, and election-year cadence are
 * configurable (config.calculations); the defaults below reproduce the original
 * hardcoded behavior. Each province gets a seeded random jitter that stays
 * stable for the lifetime of the data session, keyed on province index.
 */
import { DEFAULT_CALCULATIONS } from '../domain/elections/constants/defaultConfig'

const POP = DEFAULT_CALCULATIONS.provincialPopulation

// Store per-province random jitter so it doesn't jump on every keystroke.
const _jitterCache = new Map()

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function jitterForProvince(provinceIndex, params = POP) {
  if (_jitterCache.has(provinceIndex)) return _jitterCache.get(provinceIndex)

  const jitterRange = Number(params.jitterRange ?? POP.jitterRange)
  const exponentJitterMax = Number(params.exponentJitter ?? POP.exponentJitter)
  const j = {
    exponentJitter: Math.random() * exponentJitterMax,
    basePopRandBetween: randomIntInclusive(-jitterRange, jitterRange),
  }

  _jitterCache.set(provinceIndex, j)
  return j
}

/**
 * Clear cached jitter values (e.g. when a new template is loaded).
 */
export function resetJitterCache() {
  _jitterCache.clear()
}

/**
 * basePop follows:
 * (((population / divisor) ^ popPower) * scale) * (baseMultiplier + RANDBETWEEN(-jitterRange, jitterRange))
 * then raised to (exponentBase + exponentJitter).
 *
 * Returns null when the source population is null / undefined / <= 0.
 */
function applyPopulationScale(rawValue, provinceIndex, params = POP) {
  const { exponentJitter, basePopRandBetween } = jitterForProvince(provinceIndex, params)
  const divisor = Number(params.popDivisor ?? POP.popDivisor)
  const popPower = Number(params.popPower ?? POP.popPower)
  const scale = Number(params.scale ?? POP.scale)
  const baseMultiplier = Number(params.baseMultiplier ?? POP.baseMultiplier)
  const exponentBase = Number(params.exponentBase ?? POP.exponentBase)

  const basePop = Math.pow(rawValue / divisor, popPower) * scale * (baseMultiplier + basePopRandBetween)
  const exponent = exponentBase + exponentJitter
  return Math.round(Math.pow(basePop, exponent))
}

export function calcProvincialPopulation(population, provinceIndex, calculations) {
  if (population == null || population <= 0) return null
  return applyPopulationScale(Number(population), provinceIndex, calculations?.provincialPopulation || POP)
}

/**
 * Scale a raw religious follower count using the same per-province curve as
 * the provincial-population formula.
 */
export function calcScaledFollowers(followers, provinceIndex, calculations) {
  const value = Number(followers)
  if (!Number.isFinite(value) || value <= 0) return 0
  return applyPopulationScale(value, provinceIndex, calculations?.provincialPopulation || POP)
}

/**
 * Assemblypeople = raw population value from user input.
 */
export function calcAssemblypeople(population) {
  const pop = Number(population)
  if (isNaN(pop) || pop <= 0) return null
  return pop
}

/**
 * Prelates — tiered lookup based on Provincial Population. Tiers come from
 * config.calculations.prelateTiers (sorted desc by min), defaulting to the
 * original 5–11 ladder.
 */
export function calcPrelates(provincialPopulation, calculations) {
  if (provincialPopulation == null) return null
  const tiers = Array.isArray(calculations?.prelateTiers) && calculations.prelateTiers.length
    ? [...calculations.prelateTiers].sort((a, b) => b.min - a.min)
    : DEFAULT_CALCULATIONS.prelateTiers
  for (const tier of tiers) {
    if (provincialPopulation >= Number(tier.min)) return Number(tier.seats)
  }
  return Number(tiers[tiers.length - 1]?.seats ?? 5)
}

/**
 * Dominant Religion — highest followers in province. Default 'None'. Ties -> 'None'.
 */
export function calcDominantReligion(religions) {
  if (!Array.isArray(religions) || religions.length === 0) return 'None'
  let maxFollowers = -1
  let dominant = 'None'
  let tie = false
  for (const r of religions) {
    if (r.followers == null) continue
    if (r.followers > maxFollowers) {
      maxFollowers = r.followers
      dominant = r.name || 'Unnamed'
      tie = false
    } else if (r.followers === maxFollowers) {
      tie = true
    }
  }
  return tie ? 'None' : dominant
}

/**
 * Compute all calculated fields for every province in the dataset.
 * Returns an array parallel to `data.provinces`.
 */
export function computeAllProvinceCalcs(provinces, calculations) {
  if (!Array.isArray(provinces)) return []
  return provinces.map((p, i) => {
    const provincialPopulation = calcProvincialPopulation(p.population, i, calculations)
    return {
      provincialPopulation,
      assemblypeople: calcAssemblypeople(p.population),
      prelates: calcPrelates(provincialPopulation, calculations),
      dominantReligion: calcDominantReligion(p.religions),
    }
  })
}

/**
 * Regional totals — sums each numeric calculated field across provinces
 * that share the same province group.
 */
export function computeRegionalTotals(provinces, calcs) {
  const map = new Map()
  if (!Array.isArray(provinces) || !Array.isArray(calcs)) return map

  const FIELDS = ['provincialPopulation', 'assemblypeople', 'prelates']
  const OUT_KEYS = { provincialPopulation: 'regionalPopulation', assemblypeople: 'assemblypeople', prelates: 'prelates' }

  provinces.forEach((p, i) => {
    if (!p.group) return
    const calc = calcs[i]
    if (!calc) return

    let entry = map.get(p.group)
    if (!entry) {
      entry = {}
      FIELDS.forEach(f => { entry[OUT_KEYS[f]] = 0 })
      map.set(p.group, entry)
    }

    FIELDS.forEach(f => {
      const v = calc[f]
      if (v != null) entry[OUT_KEYS[f]] += v
    })
  })

  return map
}
