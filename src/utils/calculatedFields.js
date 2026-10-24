/**
 * Calculated fields derived from user-input data.
 *
 * The scaling constants, prelate seat tiers, and election-year cadence are
 * configurable (config.calculations); the defaults below reproduce the original
 * hardcoded behavior. Each province gets a random jitter seeded from the
 * world's survey seed (config.calculations.provincialPopulation.jitterSeed)
 * and its index, so a world's provincial populations — and every seat count
 * derived from them — are identical across reloads, imports, and world
 * switches. "Re-survey" rolls a new seed.
 */
import { DEFAULT_CALCULATIONS } from '../domain/elections/constants/defaultConfig'
import { createSeededRng } from '../domain/elections/randomness/seededRandom'

const POP = DEFAULT_CALCULATIONS.provincialPopulation

// Seed used by worlds that have never been re-surveyed.
export const DEFAULT_JITTER_SEED = 'survey-baseline'

// Memo of seeded jitter draws; keyed by everything that determines them.
const _jitterCache = new Map()

function jitterForProvince(provinceIndex, params = POP) {
  const jitterRange = Number(params.jitterRange ?? POP.jitterRange)
  const exponentJitterMax = Number(params.exponentJitter ?? POP.exponentJitter)
  const seed = params.jitterSeed || DEFAULT_JITTER_SEED
  const key = `${seed}|${provinceIndex}|${jitterRange}|${exponentJitterMax}`
  const cached = _jitterCache.get(key)
  if (cached) return cached

  const rng = createSeededRng(`${seed}:${provinceIndex}`)
  const j = {
    exponentJitter: rng() * exponentJitterMax,
    basePopRandBetween: Math.floor(rng() * (2 * jitterRange + 1)) - jitterRange,
  }

  _jitterCache.set(key, j)
  return j
}

/**
 * Drop memoized jitter draws (e.g. when a new template is loaded). Draws are
 * deterministic, so this only bounds memory.
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
