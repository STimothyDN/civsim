import { clamp01, norm, num } from '../normalization/numbers'

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
]

function groupIncludes(province, text) {
  return String(province?.group || '').includes(text)
}

function religionFollowers(province, religionName) {
  if (!religionName || !Array.isArray(province?.religions)) return 0
  return province.religions
    .filter((religion) => religion?.name === religionName)
    .reduce((sum, religion) => sum + num(religion.followers), 0)
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
  const stateReligionShare = clamp01(religionFollowers(province, stateReligion) / civPopulation)
  const taoistShare = clamp01(religionFollowers(province, 'Taoism') / civPopulation)
  const loyaltyIndex = norm(province?.loyalty, 50)
  const happinessIndex = norm(province?.happiness_percentage, 120)
  const growthIndex = norm(province?.growth_percentage, 120)
  const amenityIndex = norm(province?.net_amenities, 10)
  const foodIndex = norm(num(province?.yields?.food) / civPopulation, 4)
  const productionIndex = norm(num(province?.yields?.production) / civPopulation, 5)
  const goldIndex = norm(num(province?.yields?.gold) / civPopulation, 10)
  const cultureIndex = norm(num(province?.yields?.culture) / civPopulation, 6)
  const scienceIndex = norm(num(province?.yields?.science) / civPopulation, 5)
  const faithIndex = norm(num(province?.yields?.faith) / civPopulation, 5)
  const americanIdentityIndex = groupIncludes(province, 'American') ? 1 : 0
  const romanIdentityIndex = groupIncludes(province, 'Roman') ? 1 : 0

  let imperialCoreIndex = clamp01(
    0.25 * (province?.is_national_capital ? 1 : 0) +
    0.15 * (province?.is_regional_capital ? 1 : 0) +
    0.15 * (province?.is_founded ? 1 : 0) +
    0.15 * loyaltyIndex +
    0.1 * stateReligionShare +
    0.1 * cultureIndex +
    0.1 * scienceIndex
  )
  if (province?.is_conquered) imperialCoreIndex *= 0.75

  return {
    state_religion_share: stateReligionShare,
    minority_religion_share: clamp01(1 - stateReligionShare),
    taoist_share: taoistShare,
    american_identity_index: americanIdentityIndex,
    roman_identity_index: romanIdentityIndex,
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
  }
}

export function calculateProvinceFeatures(province, country = {}, counties = [], provincialPopulation = 0) {
  const base = calculateProvinceBaseFeatures(province, country)
  const aggregated = COUNTY_AGGREGATED_FEATURES.reduce((result, featureName) => {
    result[featureName] = clamp01(populationWeightedFeature(counties, featureName, provincialPopulation))
    return result
  }, {})

  const workerGrievanceIndex = clamp01(
    0.3 * (1 - base.amenity_index) +
    0.25 * (1 - base.happiness_index) +
    0.2 * base.production_index +
    0.15 * aggregated.industrial_index +
    0.1 * aggregated.urban_index
  )
  const localistIndex = clamp01(
    0.75 * aggregated.localist_index +
    0.15 * base.minority_religion_share +
    0.1 * (province?.is_conquered ? 1 : 0)
  )
  const restorationistIndex = clamp01(
    0.35 * base.roman_identity_index +
    0.2 * (province?.is_conquered ? 1 : 0) +
    0.2 * aggregated.spiritual_index +
    0.15 * localistIndex +
    0.1 * base.minority_religion_share
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
    worker_index: aggregated.worker_index,
    worker_grievance_index: workerGrievanceIndex,
  }
}

