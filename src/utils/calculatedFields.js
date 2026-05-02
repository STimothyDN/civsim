/**
 * Calculated fields derived from user-input data.
 *
 * Each province gets a seeded random jitter (0–0.025) that stays stable
 * for the lifetime of the data session.  The jitter is keyed on province
 * index so it doesn't change when unrelated provinces are edited.
 */

// Store per-province random jitter so it doesn't jump on every keystroke.
const _jitterCache = new Map()

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function jitterForProvince(provinceIndex) {
  if (_jitterCache.has(provinceIndex)) return _jitterCache.get(provinceIndex)

  const j = {
    exponentJitter: Math.random() * 0.025,
    basePopRandBetween: randomIntInclusive(-7500, 7500),
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
 * (((population / 4) ^ 2.2) * 0.25) * (350000 + RANDBETWEEN(-7500, 7500))
 *
 * Then ProvincialPop applies the existing exponent adjustment.
 *
 * Returns null when the source population is null / undefined / <= 0.
 */
export function calcProvincialPopulation(population, provinceIndex) {
  if (population == null || population <= 0) return null

  const { exponentJitter, basePopRandBetween } = jitterForProvince(provinceIndex)

  const basePop =
    Math.pow(population / 4, 2.1) *
    0.25 *
    (350000 + basePopRandBetween)

  const exponent = 1 + 0.08 + exponentJitter

  return Math.round(Math.pow(basePop, exponent))
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
 * Prelates — tiered lookup based on Provincial Population.
 *
 *   >= 45,000,000 → 11
 *   >= 37,500,000 → 10
 *   >= 30,000,000 → 9
 *   >= 22,500,000 → 8
 *   >= 15,000,000 → 7
 *   >=  7,500,000 → 6
 *   otherwise     → 5
 */
export function calcPrelates(provincialPopulation) {
  if (provincialPopulation == null) return null
  if (provincialPopulation >= 45_000_000) return 11
  if (provincialPopulation >= 37_500_000) return 10
  if (provincialPopulation >= 30_000_000) return 9
  if (provincialPopulation >= 22_500_000) return 8
  if (provincialPopulation >= 15_000_000) return 7
  if (provincialPopulation >= 7_500_000) return 6
  return 5
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
 * Returns an array parallel to `data.provinces` where each entry
 * contains the calculated values for that province.
 */
export function computeAllProvinceCalcs(provinces) {
  if (!Array.isArray(provinces)) return []
  return provinces.map((p, i) => {
    const provincialPopulation = calcProvincialPopulation(p.population, i)
    return {
      provincialPopulation,
      assemblypeople: calcAssemblypeople(p.population),
      prelates: calcPrelates(provincialPopulation),
      dominantReligion: calcDominantReligion(p.religions),
    }
  })
}

/**
 * Regional totals — sums each numeric calculated field across provinces
 * that share the same province group.
 *
 * Returns a Map<groupName, { regionalPopulation, assemblypeople, prelates }>.
 */
export function computeRegionalTotals(provinces, calcs) {
  const map = new Map()
  if (!Array.isArray(provinces) || !Array.isArray(calcs)) return map

  const FIELDS = ['provincialPopulation', 'assemblypeople', 'prelates']
  // Rename provincialPopulation → regionalPopulation in the output
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
