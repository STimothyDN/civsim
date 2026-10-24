import {
  matchFeaturePatterns,
  resolveBuilding,
  resolveFeature,
  resolveImprovement,
  resolveResource,
  resolveTerrain,
} from '../../civ6'

/**
 * Profile dimensions a Civ 6 catalog entry can express, and the county feature
 * each one feeds. An entry's `profile` says how strongly that thing, on its
 * own, makes a county belong to each dimension (0.1 faint … 0.9 defining);
 * negative values dampen a dimension instead (a preserve cutting pollution).
 */
export const PROFILE_DIMENSIONS = {
  urban: 'urban_index',
  rural: 'rural_index',
  agrarian: 'agrarian_index',
  industrial: 'industrial_index',
  extractive: 'extractive_index',
  commercial: 'commercial_index',
  maritime: 'maritime_index',
  worker: 'worker_index',
  development: 'development_index',
  military: 'military_index',
  intellectual: 'intellectual_index',
  spiritual: 'spiritual_index',
  cultural: 'cultural_elite_index',
  civic: 'civic_monument_index',
  middle_class: 'middle_class_index',
  leisure: 'leisure_tourism_index',
  heritage: 'heritage_index',
  coastal: 'coastal_index',
  mountain: 'mountain_index',
  wilderness: 'wilderness_index',
  ecology: 'ecology_index',
  hardship: 'hardship_index',
  watershed: 'watershed_index',
  infrastructure: 'infrastructure_index',
  pollution: 'pollution_index',
  traditionalist: 'traditionalist_index',
  localist: 'localist_index',
  restorationist: 'restorationist_index',
}

export const PROFILE_KEYS = Object.keys(PROFILE_DIMENSIONS)

// An untapped deposit shapes local life less than a worked one.
const UNIMPROVED_RESOURCE_SCALE = 0.5

const ONES = Object.fromEntries(PROFILE_KEYS.map((key) => [key, 1]))

function enabledKeys(map) {
  if (!map || typeof map !== 'object') return []
  return Object.keys(map).filter((key) => map[key])
}

/**
 * Combine every catalog entry that describes a county.
 *
 * Positive weights combine with diminishing returns — "soft OR",
 * 1 − Π(1 − w) — so a Campus plus a Library plus a University lands near, but
 * never past, 1. Negative weights multiply the result by Π(1 + w).
 *
 * @returns {{ remain: Record<string, number>, damp: Record<string, number> }}
 *   remain[d] = Π(1 − w) over positive weights (lift = 1 − remain),
 *   damp[d]   = Π(1 + w) over negative weights.
 */
export function collectCountyProfile(county) {
  const remain = { ...ONES }
  const damp = { ...ONES }
  const seen = []

  const add = (entry, scale = 1) => {
    if (!entry || !entry.profile || seen.includes(entry)) return
    seen.push(entry)
    for (const key in entry.profile) {
      if (!(key in remain)) continue
      const weight = entry.profile[key] * scale
      if (weight > 0) remain[key] *= 1 - Math.min(1, weight)
      else if (weight < 0) damp[key] *= 1 + Math.max(-1, weight)
    }
  }

  const improvement = resolveImprovement(county?.improvement?.name)
  add(resolveTerrain(county?.terrain))
  // Keys the catalog doesn't know — map-named regions, user parks, and the
  // resource the editor mirrors into `features` (scored once, below) — go
  // through the keyword patterns.
  for (const key of enabledKeys(county?.features)) {
    const entry = resolveFeature(key)
    if (entry) add(entry)
    else matchFeaturePatterns(key).forEach((pattern) => add(pattern))
  }
  const improved = String(county?.improvement?.name || '').trim().length > 0
  add(resolveResource(county?.resource), improved ? 1 : UNIMPROVED_RESOURCE_SCALE)
  add(improvement)
  for (const key of enabledKeys(county?.improvement?.buildings)) add(resolveBuilding(key))

  return { remain, damp }
}

/** Soft-OR any number of 0..1 contributions: 1 − Π(1 − c). */
export function softOr(...contributions) {
  let remain = 1
  for (const c of contributions) {
    if (c > 0) remain *= 1 - Math.min(1, c)
  }
  return 1 - remain
}
