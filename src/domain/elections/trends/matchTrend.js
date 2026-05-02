import { num } from '../normalization/numbers'

function featuresFor(unit) {
  return unit?.political_features || unit?.features || unit || {}
}

function featureValue(unit, key, fallbackKeys = []) {
  const features = featuresFor(unit)
  const keys = [key, ...fallbackKeys]
  for (const candidate of keys) {
    if (features[candidate] !== undefined) return num(features[candidate])
  }
  return 0
}

function improvementName(unit) {
  return String(unit?.improvement_name || unit?.improvement?.name || unit?.raw?.improvement?.name || '').trim()
}

export function matchesSelector(unit, selector = {}) {
  if (!selector || Object.keys(selector).length === 0) return true

  if (selector.groupIncludes && !String(unit?.group || '').includes(selector.groupIncludes)) return false
  if (selector.improvementNames && !selector.improvementNames.includes(improvementName(unit))) return false
  if (selector.isConquered !== undefined && Boolean(unit?.is_conquered) !== Boolean(selector.isConquered)) return false

  const checks = [
    ['minIndustrialIndex', 'industrial_index'],
    ['minProductionIndex', 'production_index'],
    ['minTaoistShare', 'taoist_share'],
    ['minRomanIdentityIndex', 'roman_identity_index'],
    ['minImperialCoreIndex', 'imperial_core_index'],
    ['minAgrarianIndex', 'agrarian_index'],
    ['minLocalistIndex', 'localist_index'],
    ['minSpiritualIndex', 'spiritual_index'],
    ['minMilitaryIndex', 'military_index'],
    ['minIntellectualIndex', 'intellectual_index'],
    ['minCommercialMiddleClassIndex', 'commercial_middle_class_index'],
    ['minCulturalEliteIndex', 'cultural_elite_index'],
    ['minInfrastructureIndex', 'infrastructure_index'],
    ['minWorkerGrievanceIndex', 'worker_grievance_index'],
    ['minLoyaltyIndex', 'loyalty_index'],
    ['maxLoyaltyIndex', 'loyalty_index', 'max'],
    ['maxUrbanIndex', 'urban_index', 'max', ['urbanization_index']],
  ]

  for (const [selectorKey, featureKey, type = 'min', fallbackKeys = []] of checks) {
    if (selector[selectorKey] === undefined) continue
    const value = featureValue(unit, featureKey, fallbackKeys)
    if (type === 'max' && value > selector[selectorKey]) return false
    if (type !== 'max' && value < selector[selectorKey]) return false
  }

  return true
}

export function trendEffect(unit, party, level, trends = []) {
  return trends
    .filter((trend) => trend.level === level)
    .filter((trend) => trend.party === party)
    .filter((trend) => matchesSelector(unit, trend.selector))
    .reduce((sum, trend) => sum + num(trend.magnitude), 0)
}

