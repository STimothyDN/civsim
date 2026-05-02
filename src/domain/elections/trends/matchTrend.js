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

function stringIncludesAny(value, needles) {
  const source = String(value || '').toLowerCase()
  return normalizedList(needles).some((needle) => source.includes(String(needle || '').toLowerCase()))
}

function includesAny(values, expectedValues) {
  const actual = normalizedList(values).map((value) => String(value || '').toLowerCase())
  const expected = normalizedList(expectedValues).map((value) => String(value || '').toLowerCase())
  return expected.some((value) => actual.includes(value))
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

export function trendEffect(unit, party, level, trends = []) {
  return trends.reduce((sum, trend) => {
    return sum + trendEffects(trend)
      .filter((effect) => levelMatches(effect.level, level))
      .filter((effect) => effect.party === party)
      .filter((effect) => matchesSelector(unit, effect.selector))
      .reduce((effectSum, effect) => {
        const interaction = interactionAdjustment(unit, level, trends, trend, effect)
        const areaMultiplier = areaWeightMultiplier(unit, effect.weightBy)
        return effectSum + signedMagnitude(effect) * areaMultiplier * interaction.multiplier + interaction.add
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
