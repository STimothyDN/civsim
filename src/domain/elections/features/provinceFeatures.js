import { clamp01, norm, num } from '../normalization/numbers'
import { NORMALIZATION_MAX, coefficientOfVariation, hhiIndex } from '../normalization/dataStats'

const LISTED_RELIGION_FOLLOWER_FLOOR = 0.25

// Province distance scaling constants - creates drastic effect where remote provinces are frontier/isolated
const MIN_PROVINCE_DISTANCE = 3
const MAX_PROVINCE_DISTANCE = 15
const PROVINCE_DISTANCE_EXPONENT = 1.8

const COUNTY_AGGREGATED_FEATURES = [
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
  'appeal_index',
  'localist_index',
  'traditionalist_index',
  'restorationist_index',
  'coastal_index',
  'maritime_index',
  'mountain_index',
  'wilderness_index',
  'residential_index',
  'extractive_index',
  'leisure_tourism_index',
  'civic_monument_index',
  'terrain_habitation_index',
]

function textIncludes(value, text) {
  return String(value || '').toLowerCase().includes(String(text || '').toLowerCase())
}

function groupIncludes(province, text) {
  return textIncludes(province?.group, text)
}

function originalCountry(province) {
  return String(province?.original_country || '').trim()
}

function currentCountryName(country = {}) {
  return String(country?.basic_info?.name || 'Khmer Empire').trim()
}

function isImperialOrigin(province, country = {}) {
  const origin = originalCountry(province)
  if (!origin) return !province?.is_joined && !province?.is_conquered
  return origin.toLowerCase() === currentCountryName(country).toLowerCase() || origin.toLowerCase() === 'khmer empire'
}

function closestDistances(province = {}) {
  return (Array.isArray(province.closest_provinces) ? province.closest_provinces : [])
    .map((entry) => Number(entry?.distance))
    .filter((distance) => Number.isFinite(distance) && distance > 0)
}

function average(values = []) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function provinceConnectivity(province = {}) {
  const distances = closestDistances(province)
  const nearest = distances.length ? Math.min(...distances) : null
  const avg = average(distances)
  const connectednessIndex = avg === null ? 0.35 : clamp01(1 - Math.pow((avg - MIN_PROVINCE_DISTANCE) / (MAX_PROVINCE_DISTANCE - MIN_PROVINCE_DISTANCE), PROVINCE_DISTANCE_EXPONENT))
  const frontierIndex = avg === null ? 0.35 : clamp01(Math.pow((avg - MIN_PROVINCE_DISTANCE) / (MAX_PROVINCE_DISTANCE - MIN_PROVINCE_DISTANCE), PROVINCE_DISTANCE_EXPONENT))

  return {
    nearest_province_distance: nearest,
    average_closest_province_distance: avg,
    connectedness_index: connectednessIndex,
    frontier_index: frontierIndex,
    adjacency_known_index: clamp01(distances.length / 5),
  }
}

function religionFollowerCount(religion) {
  const followers = num(religion?.followers)
  return followers > 0 ? followers : LISTED_RELIGION_FOLLOWER_FLOOR
}

function religionFollowerMap(province) {
  if (!Array.isArray(province?.religions)) return {}

  return province.religions.reduce((followersByReligion, religion) => {
    const name = String(religion?.name || '').trim()
    if (!name) return followersByReligion
    followersByReligion[name] = num(followersByReligion[name]) + religionFollowerCount(religion)
    return followersByReligion
  }, {})
}

function religionFollowers(followersByReligion, religionName) {
  if (!religionName) return 0
  return num(followersByReligion?.[religionName])
}

function nonStateReligionFollowers(followersByReligion, stateReligion) {
  return Object.entries(followersByReligion || {}).reduce((sum, [religionName, followers]) => {
    return religionName === stateReligion ? sum : sum + num(followers)
  }, 0)
}

function populationWeightedFeature(counties, featureName, provincialPopulation) {
  const denominator = num(provincialPopulation)
  if (!denominator || denominator <= 0) {
    if (!counties.length) return 0
    return counties.reduce((sum, county) => sum + num(county.political_features?.[featureName]), 0) / counties.length
  }

  return counties.reduce((sum, county) => {
    return sum + num(county.county_population) * num(county.political_features?.[featureName])
  }, 0) / denominator
}

export function calculateProvinceBaseFeatures(province, country = {}) {
  const civPopulation = Math.max(1, num(province?.population, 1))
  const stateReligion = country?.state_religion || null
  const followersByReligion = religionFollowerMap(province)
  const stateReligionShare = clamp01(religionFollowers(followersByReligion, stateReligion) / civPopulation)
  const minorityReligionShare = clamp01(nonStateReligionFollowers(followersByReligion, stateReligion) / civPopulation)
  const taoistShare = clamp01(religionFollowers(followersByReligion, 'Taoism') / civPopulation)
  const loyaltyIndex = norm(province?.loyalty, 50)
  const happinessIndex = norm(province?.happiness_percentage, 120)
  const growthIndex = norm(province?.growth_percentage, 120)
  const amenityIndex = norm(province?.net_amenities, NORMALIZATION_MAX.net_amenities)
  const foodIndex = norm(num(province?.yields?.food) / civPopulation, NORMALIZATION_MAX.food_per_capita)
  const productionIndex = norm(num(province?.yields?.production) / civPopulation, NORMALIZATION_MAX.production_per_capita)
  const goldIndex = norm(num(province?.yields?.gold) / civPopulation, NORMALIZATION_MAX.gold_per_capita)
  const cultureIndex = norm(num(province?.yields?.culture) / civPopulation, NORMALIZATION_MAX.culture_per_capita)
  const scienceIndex = norm(num(province?.yields?.science) / civPopulation, NORMALIZATION_MAX.science_per_capita)
  const faithIndex = norm(num(province?.yields?.faith) / civPopulation, NORMALIZATION_MAX.faith_per_capita)
  const origin = originalCountry(province)
  const imperialOriginIndex = isImperialOrigin(province, country) ? 1 : 0
  const foreignOriginIndex = imperialOriginIndex ? 0 : 1
  const americanIdentityIndex = groupIncludes(province, 'American') || textIncludes(origin, 'American') || textIncludes(origin, 'United States') ? 1 : 0
  const romanIdentityIndex = groupIncludes(province, 'Roman') || textIncludes(origin, 'Roman') ? 1 : 0
  const connectivity = provinceConnectivity(province)

  // Calculate economic diversity index based on yield variation
  const yieldValues = [
    num(province?.yields?.food),
    num(province?.yields?.production),
    num(province?.yields?.gold),
    num(province?.yields?.culture),
    num(province?.yields?.science),
    num(province?.yields?.faith),
  ]
  const economicDiversityIndex = clamp01(coefficientOfVariation(yieldValues))

  // Calculate religious homogeneity using HHI
  const religionFollowersList = Object.values(followersByReligion || {})
  const religiousHomogeneityIndex = clamp01(hhiIndex(religionFollowersList))

  // Calculate development index as composite of infrastructure, culture, science
  const developmentIndex = clamp01(
    0.35 * (cultureIndex + scienceIndex) / 2 +
    0.3 * amenityIndex +
    0.2 * happinessIndex +
    0.15 * goldIndex
  )

  // Calculate provincial power index from military and production indicators
  const provincialPowerIndex = clamp01(
    0.4 * productionIndex +
    0.25 * goldIndex +
    0.2 * foodIndex +
    0.15 * (province?.assemblypeople ? province.assemblypeople / 50 : 0)
  )

  // Calculate isolation index as inverse of connectivity
  const isolationIndex = clamp01(1 - connectivity.connectedness_index)

  let imperialCoreIndex = clamp01(
    0.3 * (province?.is_national_capital ? 1 : 0) +
    0.15 * (province?.is_regional_capital ? 1 : 0) +
    0.06 * (province?.is_founded ? 1 : 0) +
    0.12 * loyaltyIndex +
    0.08 * stateReligionShare +
    0.08 * cultureIndex +
    0.06 * scienceIndex +
    0.05 * connectivity.connectedness_index -
    0.08 * foreignOriginIndex
  )
  if (province?.is_conquered) imperialCoreIndex *= 0.6

  return {
    state_religion_share: stateReligionShare,
    minority_religion_share: minorityReligionShare,
    taoist_share: taoistShare,
    american_identity_index: americanIdentityIndex,
    roman_identity_index: romanIdentityIndex,
    imperial_origin_index: imperialOriginIndex,
    foreign_origin_index: foreignOriginIndex,
    connectedness_index: connectivity.connectedness_index,
    frontier_index: connectivity.frontier_index,
    adjacency_known_index: connectivity.adjacency_known_index,
    nearest_province_distance: connectivity.nearest_province_distance,
    average_closest_province_distance: connectivity.average_closest_province_distance,
    imperial_core_index: imperialCoreIndex,
    loyalty_index: loyaltyIndex,
    happiness_index: happinessIndex,
    growth_index: growthIndex,
    amenity_index: amenityIndex,
    food_index: foodIndex,
    production_index: productionIndex,
    gold_index: goldIndex,
    culture_index: cultureIndex,
    science_index: scienceIndex,
    faith_index: faithIndex,
    // New features
    economic_diversity_index: economicDiversityIndex,
    religious_homogeneity_index: religiousHomogeneityIndex,
    development_index: developmentIndex,
    provincial_power_index: provincialPowerIndex,
    isolation_index: isolationIndex,
  }
}

export function calculateProvinceFeatures(province, country = {}, counties = [], provincialPopulation = 0) {
  const base = calculateProvinceBaseFeatures(province, country)
  const aggregated = COUNTY_AGGREGATED_FEATURES.reduce((result, featureName) => {
    result[featureName] = clamp01(populationWeightedFeature(counties, featureName, provincialPopulation))
    return result
  }, {})

  const workerGrievanceIndex = clamp01(
    0.25 * (1 - base.amenity_index) +
    0.25 * (1 - base.happiness_index) +
    0.2 * base.production_index +
    0.13 * aggregated.industrial_index +
    0.09 * aggregated.urban_index +
    0.08 * aggregated.extractive_index
  )
  const localistIndex = clamp01(
    0.65 * aggregated.localist_index +
    0.15 * base.minority_religion_share +
    0.1 * (province?.is_conquered ? 1 : 0) +
    0.1 * aggregated.wilderness_index +
    0.08 * base.frontier_index +
    0.08 * base.foreign_origin_index
  )
  const restorationistIndex = clamp01(
    0.35 * base.roman_identity_index +
    0.2 * (province?.is_conquered ? 1 : 0) +
    0.2 * aggregated.spiritual_index +
    0.15 * localistIndex +
    0.1 * base.minority_religion_share +
    0.08 * base.foreign_origin_index
  )

  return {
    ...base,
    urbanization_index: aggregated.urban_index,
    rural_index: aggregated.rural_index,
    industrial_index: aggregated.industrial_index,
    agrarian_index: aggregated.agrarian_index,
    military_index: aggregated.military_index,
    intellectual_index: aggregated.intellectual_index,
    spiritual_index: aggregated.spiritual_index,
    commerce_index: aggregated.commercial_index,
    cultural_elite_index: aggregated.cultural_elite_index,
    infrastructure_index: aggregated.infrastructure_index,
    appeal_index: aggregated.appeal_index,
    traditionalist_index: aggregated.traditionalist_index,
    localist_index: localistIndex,
    restorationist_index: restorationistIndex,
    imperial_origin_index: base.imperial_origin_index,
    foreign_origin_index: base.foreign_origin_index,
    connectedness_index: base.connectedness_index,
    frontier_index: base.frontier_index,
    adjacency_known_index: base.adjacency_known_index,
    nearest_province_distance: base.nearest_province_distance,
    average_closest_province_distance: base.average_closest_province_distance,
    worker_index: aggregated.worker_index,
    worker_grievance_index: workerGrievanceIndex,
    coastal_index: aggregated.coastal_index,
    maritime_index: aggregated.maritime_index,
    mountain_index: aggregated.mountain_index,
    wilderness_index: aggregated.wilderness_index,
    residential_index: aggregated.residential_index,
    extractive_index: aggregated.extractive_index,
    leisure_tourism_index: aggregated.leisure_tourism_index,
    civic_monument_index: aggregated.civic_monument_index,
    terrain_habitation_index: aggregated.terrain_habitation_index,
    // Pass through new base features
    economic_diversity_index: base.economic_diversity_index,
    religious_homogeneity_index: base.religious_homogeneity_index,
    development_index: base.development_index,
    provincial_power_index: base.provincial_power_index,
    isolation_index: base.isolation_index,
  }
}
