import {
  BUILDING_TIERS,
  matchFeaturePatterns,
  resolveBuilding,
  resolveFeature,
  resolveImprovement,
  resolveResource,
  resolveTerrain,
} from '../../civ6'

/** Classification signals calculateCountyFeatures reads from catalog entries. */
export const SIGNAL_KEYS = [
  // terrain
  'coast_terrain', 'ocean_terrain', 'mountain_terrain',
  // features
  'natural', 'rainforest', 'floodplain', 'desert', 'protected_marine',
  // resources
  'food_resource', 'strategic_resource', 'energy_resource', 'luxury_resource',
  // improvements, districts and wonders
  'residential', 'neighborhood', 'agrarian', 'extractive', 'mine_or_corporation', 'infrastructure',
  'industry', 'corporation', 'diplomatic', 'preserve', 'maritime', 'offshore', 'leisure',
  'civic_monument', 'campus', 'holy_site', 'theater', 'encampment', 'aerodrome',
  'commercial_hub', 'industrial_zone', 'energy',
]

/**
 * County political features a Civ 6 catalog entry may nudge directly via its
 * `lean`. calculateCountyFeatures adds the county's lean total to each of these
 * as it computes them, so a nudge also flows into the indices built on top.
 */
export const LEAN_KEYS = [
  'coastal_index',
  'maritime_index',
  'mountain_index',
  'wilderness_index',
  'residential_index',
  'extractive_index',
  'leisure_tourism_index',
  'civic_monument_index',
  'urban_index',
  'rural_index',
  'industrial_index',
  'agrarian_index',
  'military_index',
  'intellectual_index',
  'spiritual_index',
  'commercial_index',
  'cultural_elite_index',
  'worker_index',
  'infrastructure_index',
  'localist_index',
  'traditionalist_index',
  'restorationist_index',
  'cultural_output_index',
  'terrain_habitation_index',
]

// However many entries pile onto one index, their combined lean stays within ±LEAN_CAP.
export const LEAN_CAP = 0.3

// Every county starts from the same zeroed shape, so the formulas' many reads
// stay fast property lookups instead of dictionary probes.
const ZERO_SIGNALS = Object.fromEntries(SIGNAL_KEYS.map((key) => [key, 0]))
const ZERO_LEAN = Object.fromEntries(LEAN_KEYS.map((key) => [key, 0]))
const ZERO_TIERS = Object.fromEntries(Object.keys(BUILDING_TIERS).map((key) => [key, 0]))

function enabledKeys(map) {
  if (!map || typeof map !== 'object') return []
  return Object.keys(map).filter((key) => map[key])
}

/**
 * Everything the catalog knows about a county, folded into:
 *   signals — strongest value of each classification signal across the
 *             county's terrain, features, resource, improvement and buildings
 *   tiers   — how many built buildings climb each BUILDING_TIERS ladder
 *   lean    — summed (and capped) direct nudges per LEAN_KEYS feature
 */
export function collectCountySignals(county) {
  const signals = { ...ZERO_SIGNALS }
  const tiers = { ...ZERO_TIERS }
  const lean = { ...ZERO_LEAN }
  const seen = []

  const add = (entry) => {
    if (!entry || seen.includes(entry)) return
    seen.push(entry)
    if (entry.signals) {
      for (const key in entry.signals) {
        if (entry.signals[key] > (signals[key] || 0)) signals[key] = entry.signals[key]
      }
    }
    if (entry.tier) tiers[entry.tier] = (tiers[entry.tier] || 0) + 1
    if (entry.lean) {
      for (const key in entry.lean) lean[key] = (lean[key] || 0) + entry.lean[key]
    }
  }

  add(resolveTerrain(county?.terrain))
  // Keys the catalog doesn't know — named regions, and the resource the editor
  // mirrors into `features` (scored once, below) — go through the patterns.
  for (const key of enabledKeys(county?.features)) {
    const entry = resolveFeature(key)
    if (entry) add(entry)
    else matchFeaturePatterns(key).forEach(add)
  }
  add(resolveResource(county?.resource))
  add(resolveImprovement(county?.improvement?.name))
  for (const key of enabledKeys(county?.improvement?.buildings)) add(resolveBuilding(key))

  for (const key in lean) lean[key] = Math.max(-LEAN_CAP, Math.min(LEAN_CAP, lean[key]))
  return { signals, tiers, lean }
}

/** Share of a building ladder that's built (0..1). */
export function tierShare(tiers, tier) {
  const size = BUILDING_TIERS[tier]
  if (!size) return 0
  return Math.min(1, (tiers[tier] || 0) / size)
}
