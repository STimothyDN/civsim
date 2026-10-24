import { clamp01, norm, num } from '../normalization/numbers'
import { NORMALIZATION_MAX, yieldEvenness } from '../normalization/dataStats'
import { MARITIME_BASIN_KEYWORDS, normalizeName, resolveTerrain } from '../../civ6'
import { collectCountyProfile, softOr } from './countyProfile'
import { attitudeFeatures } from './attitudes'
import { PROVINCE_IDENTITY_FEATURES } from './featureCatalog'

// Tiles from the city center at which a county counts as fully remote.
const MAX_COUNTY_DISTANCE = 5
const REMOTE_EXPONENT = 1.5
// Appeal when the county doesn't record it.
const DEFAULT_APPEAL_INDEX = 0.35

const BASIN_KEYWORDS = MARITIME_BASIN_KEYWORDS.map((basin) => [basin, normalizeName(basin)])

function improvementName(county) {
  return String(county?.improvement?.name || '').trim()
}

function enabledKeys(map) {
  if (!map || typeof map !== 'object') return []
  return Object.keys(map).filter((key) => map[key])
}

function detectMaritimeBasin(county) {
  const featureKeys = enabledKeys(county?.features).map(normalizeName)
  if (!featureKeys.length) return null
  const match = BASIN_KEYWORDS.find(([, keyword]) => featureKeys.some((key) => key.includes(keyword)))
  return match ? match[0] : null
}

function detectRiver(county) {
  const river = county?.river
  return river && String(river).trim().length > 0 ? String(river).trim() : null
}

function countyYieldIndices(county) {
  return {
    food_index: norm(county?.yields?.food, NORMALIZATION_MAX.county_food),
    production_index: norm(county?.yields?.production, NORMALIZATION_MAX.county_production),
    gold_index: norm(county?.yields?.gold, NORMALIZATION_MAX.county_gold),
    culture_index: norm(county?.yields?.culture, NORMALIZATION_MAX.county_culture),
    science_index: norm(county?.yields?.science, NORMALIZATION_MAX.county_science),
    faith_index: norm(county?.yields?.faith, NORMALIZATION_MAX.county_faith),
  }
}

function provinceIdentity(provinceContext = {}) {
  const identity = {}
  for (const key of PROVINCE_IDENTITY_FEATURES) identity[key] = clamp01(provinceContext[key])
  if (provinceContext.is_conquered !== undefined) identity.conquered_index = provinceContext.is_conquered ? 1 : 0
  return identity
}

/**
 * County political features (see MODEL.md).
 *
 * What the county *is* comes from the Civ 6 catalog: every entry it holds —
 * terrain, features, resource, improvement, buildings — contributes its profile,
 * combined with diminishing returns. The formulas below add the context the
 * catalog can't know (distance from the center, yields, railroad, river, great
 * works, appeal) and the province's identity, which the county inherits.
 */
export function calculateCountyFeatures(county, provinceContext = {}) {
  const { remain, damp } = collectCountyProfile(county)
  const lift = (dim, ...context) => clamp01(softOr(1 - remain[dim], ...context) * damp[dim])

  const developed = improvementName(county) ? 1 : 0
  const distance = Math.max(0, num(county?.distance_from_center))
  const proximity = 1 / (1 + distance)
  const remote = clamp01(Math.pow(distance / MAX_COUNTY_DISTANCE, REMOTE_EXPONENT))
  const rail = county?.has_railroad ? 1 : 0
  const river = detectRiver(county)
  const land = resolveTerrain(county?.terrain)?.water ? 0 : 1
  const yields = countyYieldIndices(county)
  const appeal = county?.appeal === null || county?.appeal === undefined || county?.appeal === ''
    ? DEFAULT_APPEAL_INDEX
    : norm(county.appeal, NORMALIZATION_MAX.appeal)
  const greatWorks = norm(enabledKeys(county?.improvement?.great_works).length, 4)
  const builtBuildings = norm(enabledKeys(county?.improvement?.buildings).length, 6)

  const urban = lift('urban', 0.3 * proximity * developed, 0.12 * rail)
  const pollution = lift('pollution', 0.12 * urban)
  const heritage = lift('heritage', 0.15 * greatWorks)

  const composition = {
    urban_index: urban,
    rural_index: clamp01(lift('rural', 0.45 * remote, land && !developed ? 0.3 : 0) * (1 - 0.7 * urban)),
    agrarian_index: lift('agrarian', 0.35 * yields.food_index),
    industrial_index: lift('industrial', 0.12 * rail * developed),
    extractive_index: lift('extractive'),
    commercial_index: lift('commercial', 0.35 * yields.gold_index, river && developed ? 0.1 : 0),
    maritime_index: lift('maritime'),
    worker_index: lift('worker', 0.3 * yields.production_index),
    development_index: lift('development', 0.3 * developed, 0.4 * builtBuildings, 0.3 * rail),
    economic_diversity_index: yieldEvenness(Object.values(yields)),
    military_index: lift('military', 0.12 * remote),
    intellectual_index: lift('intellectual', 0.4 * yields.science_index),
    spiritual_index: lift('spiritual', 0.4 * yields.faith_index),
    cultural_elite_index: lift('cultural', 0.35 * yields.culture_index, 0.5 * greatWorks, 0.25 * heritage),
    civic_monument_index: lift('civic'),
    middle_class_index: lift('middle_class', 0.3 * urban * appeal),
    leisure_tourism_index: lift('leisure', 0.3 * appeal, 0.2 * greatWorks, 0.25 * heritage),
    heritage_index: heritage,
    coastal_index: lift('coastal'),
    mountain_index: lift('mountain'),
    wilderness_index: clamp01(lift('wilderness', developed ? 0 : 0.3 * remote) * (1 - 0.7 * urban)),
    ecology_index: clamp01(lift('ecology') * (1 - 0.5 * pollution)),
    hardship_index: lift('hardship'),
    watershed_index: lift('watershed', river ? 0.9 : 0),
    appeal_index: appeal,
    infrastructure_index: lift('infrastructure', 0.45 * rail, river ? 0.15 : 0, 0.15 * developed),
    pollution_index: pollution,
    ...yields,
  }

  const identity = provinceIdentity(provinceContext)
  const attitudes = attitudeFeatures({ ...composition, ...identity }, remote)

  return {
    county_population: Math.max(0, Math.round(num(county?.county_population))),
    county_population_share: clamp01(county?.county_population_share),
    ...composition,
    traditionalist_index: lift('traditionalist', attitudes.traditionalist_index),
    localist_index: lift('localist', attitudes.localist_index),
    restorationist_index: lift('restorationist', attitudes.restorationist_index),
    worker_grievance_index: attitudes.worker_grievance_index,
    ...identity,
    // Not weighted; kept for trends, charts and the narrative planner.
    distance_index: remote,
    improvement_name: improvementName(county),
    maritime_basin_name: detectMaritimeBasin(county),
    river_name: river,
  }
}
