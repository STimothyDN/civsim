import { clamp01, num } from '../normalization/numbers'

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

function normalizedList(value) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function normalizedText(value) {
  return String(value || '').toLowerCase()
}

function stringIncludesAny(value, needles) {
  const source = normalizedText(value)
  return normalizedList(needles).some((needle) => source.includes(normalizedText(needle)))
}

function includesAny(values, expectedValues) {
  const actual = normalizedList(values).map(normalizedText)
  const expected = normalizedList(expectedValues).map(normalizedText)
  return expected.some((value) => actual.includes(value))
}

function originalCountry(unit) {
  return unit?.original_country || unit?.raw?.original_country || ''
}

function matchesFeatureRules(unit, rules = [], type = 'min') {
  return normalizedList(rules).every((rule) => {
    if (!rule) return true
    const feature = rule.feature || rule.key
    if (!feature) return true
    const value = featureValue(unit, feature, rule.fallbackKeys || [])
    const threshold = num(rule.value ?? rule.threshold)
    return type === 'max' ? value <= threshold : value >= threshold
  })
}

export function matchesSelector(unit, selector = {}) {
  if (!selector || Object.keys(selector).length === 0) return true

  if (selector.any) return normalizedList(selector.any).some((childSelector) => matchesSelector(unit, childSelector))
  if (selector.all && !normalizedList(selector.all).every((childSelector) => matchesSelector(unit, childSelector))) return false
  if (selector.not && matchesSelector(unit, selector.not)) return false

  if (selector.groupIncludes && !stringIncludesAny(unit?.group, selector.groupIncludes)) return false
  if (selector.groupEquals && !includesAny(unit?.group, selector.groupEquals)) return false
  if (selector.originalCountryIncludes && !stringIncludesAny(originalCountry(unit), selector.originalCountryIncludes)) return false
  if (selector.originalCountryEquals && !includesAny(originalCountry(unit), selector.originalCountryEquals)) return false
  if (selector.isImperialOrigin !== undefined && Boolean(featureValue(unit, 'imperial_origin_index')) !== Boolean(selector.isImperialOrigin)) return false
  if (selector.nameIncludes && !stringIncludesAny(unit?.name, selector.nameIncludes)) return false
  if (selector.provinceIndexIn && !normalizedList(selector.provinceIndexIn).includes(unit?.provinceIndex)) return false
  if (selector.improvementNames && !selector.improvementNames.includes(improvementName(unit))) return false
  if (selector.improvementIncludes && !stringIncludesAny(improvementName(unit), selector.improvementIncludes)) return false
  if (selector.terrains && !includesAny(unit?.terrain, selector.terrains)) return false
  if (selector.resources && !includesAny(unit?.resource, selector.resources)) return false
  if (selector.isConquered !== undefined && Boolean(unit?.is_conquered) !== Boolean(selector.isConquered)) return false
  if (selector.isNationalCapital !== undefined && Boolean(unit?.is_national_capital) !== Boolean(selector.isNationalCapital)) return false
  if (selector.isRegionalCapital !== undefined && Boolean(unit?.is_regional_capital) !== Boolean(selector.isRegionalCapital)) return false
  if (selector.isFounded !== undefined && Boolean(unit?.is_founded) !== Boolean(selector.isFounded)) return false
  if (selector.isJoined !== undefined && Boolean(unit?.is_joined) !== Boolean(selector.isJoined)) return false
  if (selector.minFeatures && !matchesFeatureRules(unit, selector.minFeatures, 'min')) return false
  if (selector.maxFeatures && !matchesFeatureRules(unit, selector.maxFeatures, 'max')) return false

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
    ['minCoastalIndex', 'coastal_index'],
    ['minMaritimeIndex', 'maritime_index'],
    ['minMountainIndex', 'mountain_index'],
    ['minWildernessIndex', 'wilderness_index'],
    ['minResidentialIndex', 'residential_index'],
    ['minExtractiveIndex', 'extractive_index'],
    ['minLeisureTourismIndex', 'leisure_tourism_index'],
    ['minCivicMonumentIndex', 'civic_monument_index'],
    ['minWorkerGrievanceIndex', 'worker_grievance_index', 'min', ['worker_index']],
    ['minLoyaltyIndex', 'loyalty_index'],
    ['minForeignOriginIndex', 'foreign_origin_index'],
    ['minFrontierIndex', 'frontier_index'],
    ['minConnectednessIndex', 'connectedness_index'],
    ['maxConnectednessIndex', 'connectedness_index', 'max'],
    ['maxNearestProvinceDistance', 'nearest_province_distance', 'max'],
    ['minNearestProvinceDistance', 'nearest_province_distance'],
    ['maxAverageClosestProvinceDistance', 'average_closest_province_distance', 'max'],
    ['minAverageClosestProvinceDistance', 'average_closest_province_distance'],
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

export function trendTags(trend = {}) {
  return [
    ...(trend.tags || []),
    trend.templateId,
    trend.family,
    trend.narrative?.arc,
  ].filter(Boolean)
}

export function trendEffects(trend = {}) {
  if (Array.isArray(trend.effects) && trend.effects.length) {
    return trend.effects.map((effect, index) => ({
      id: effect.id || `${trend.id || trend.templateId || 'trend'}-effect-${index}`,
      level: effect.level || trend.level,
      party: effect.party || trend.party,
      selector: effect.selector || trend.selector || {},
      magnitude: effect.magnitude ?? trend.magnitude,
      mode: effect.mode || trend.mode || 'boost',
      weightBy: effect.weightBy || trend.weightBy || null,
      adjacency: effect.adjacency || trend.adjacency || null,
      interactions: [...(trend.interactions || []), ...(effect.interactions || [])],
      tags: [...trendTags(trend), ...(effect.tags || [])],
    }))
  }

  return [{
    id: trend.id || trend.templateId || 'trend',
    level: trend.level,
    party: trend.party,
    selector: trend.selector || {},
    magnitude: trend.magnitude,
    mode: trend.mode || 'boost',
    weightBy: trend.weightBy || null,
    adjacency: trend.adjacency || null,
    interactions: trend.interactions || [],
    tags: trendTags(trend),
  }]
}

function levelMatches(effectLevel, level) {
  return normalizedList(effectLevel).includes(level)
}

function areaWeightMultiplier(unit, weightBy) {
  if (!weightBy) return 1
  const weights = normalizedList(weightBy)

  return weights.reduce((multiplier, weight) => {
    if (!weight?.feature) return multiplier
    const value = featureValue(unit, weight.feature, weight.fallbackKeys || [])
    const min = num(weight.min ?? 0)
    const max = num(weight.max ?? 1)
    const span = max - min || 1
    const t = clamp01((value - min) / span)
    const low = num(weight.minMultiplier ?? 0.75, 0.75)
    const high = num(weight.maxMultiplier ?? 1.35, 1.35)
    return multiplier * (low + (high - low) * t)
  }, 1)
}

export function trendHasMatchingEffect(trend, unit, level, party = null) {
  return trendEffects(trend).some((effect) => {
    if (!levelMatches(effect.level, level)) return false
    if (party && effect.party !== party) return false
    return matchesSelector(unit, effect.selector)
  })
}

function relatedTrendHasTags(unit, level, trends, currentTrend, rule) {
  const wantedTags = new Set(normalizedList(rule.withTags))
  if (!wantedTags.size) return false
  const levels = normalizedList(rule.levels || level)

  return trends.some((trend) => {
    if (trend === currentTrend) return false
    if (!trendTags(trend).some((tag) => wantedTags.has(tag))) return false
    return levels.some((candidateLevel) => trendHasMatchingEffect(trend, unit, candidateLevel))
  })
}

function interactionAdjustment(unit, level, trends, trend, effect) {
  return normalizedList(effect.interactions).reduce((state, rule) => {
    if (!relatedTrendHasTags(unit, level, trends, trend, rule)) return state
    return {
      multiplier: state.multiplier * num(rule.multiplier ?? 1, 1),
      add: state.add + num(rule.add ?? 0),
    }
  }, { multiplier: 1, add: 0 })
}

function signedMagnitude(effect) {
  const sign = effect.mode === 'suppress' || effect.mode === 'penalty' ? -1 : 1
  return sign * num(effect.magnitude)
}

function adjacencyConfig(effect) {
  if (!effect?.adjacency) return null
  if (effect.adjacency === true) return {}
  if (typeof effect.adjacency === 'object') return effect.adjacency
  return null
}

function adjacentProvinceUnits(unit) {
  return normalizedList(unit?.adjacent_provinces || unit?.adjacentProvinceUnits)
}

function adjacencyDistance(entry) {
  const distance = num(entry?.distance)
  return distance > 0 ? distance : null
}

function adjacencyMultiplier(unit, effect) {
  const config = adjacencyConfig(effect)
  if (!config) return 0
  if (config.targetSelector && !matchesSelector(unit, config.targetSelector)) return 0

  const maxDistance = Math.max(0.1, num(config.maxDistance ?? 10, 10))
  const minMultiplier = num(config.minMultiplier ?? 0.08, 0.08)
  const maxMultiplier = num(config.maxMultiplier ?? 0.35, 0.35)
  const cap = num(config.cap ?? maxMultiplier, maxMultiplier)
  const sourceSelector = config.sourceSelector || config.selector || effect.selector || {}

  const spillover = adjacentProvinceUnits(unit).reduce((sum, adjacent) => {
    const distance = adjacencyDistance(adjacent)
    if (distance === null || distance > maxDistance) return sum
    if (!matchesSelector(adjacent, sourceSelector)) return sum
    const closeness = clamp01(1 - distance / maxDistance)
    return sum + minMultiplier + (maxMultiplier - minMultiplier) * closeness
  }, 0)

  return Math.min(Math.max(0, cap), Math.max(0, spillover))
}

export function trendEffect(unit, party, level, trends = []) {
  return trends.reduce((sum, trend) => {
    return sum + trendEffects(trend)
      .filter((effect) => levelMatches(effect.level, level))
      .filter((effect) => effect.party === party)
      .reduce((effectSum, effect) => {
        const directMultiplier = matchesSelector(unit, effect.selector) ? 1 : 0
        const neighborMultiplier = level === 'province' ? adjacencyMultiplier(unit, effect) : 0
        if (!directMultiplier && !neighborMultiplier) return effectSum
        const interaction = interactionAdjustment(unit, level, trends, trend, effect)
        const areaMultiplier = areaWeightMultiplier(unit, effect.weightBy)
        const effectMultiplier = directMultiplier * areaMultiplier + neighborMultiplier
        return effectSum + signedMagnitude(effect) * effectMultiplier * interaction.multiplier + interaction.add
      }, 0)
  }, 0)
}

export function trendClimateScore(party, trends = []) {
  return trends.reduce((sum, trend) => {
    const strongestEffect = trendEffects(trend)
      .filter((effect) => effect.party === party)
      .reduce((max, effect) => Math.max(max, Math.max(0, signedMagnitude(effect))), 0)
    return sum + strongestEffect
  }, 0)
}
