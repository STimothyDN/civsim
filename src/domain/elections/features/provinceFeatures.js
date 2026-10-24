import { clamp01, norm, normRange, num } from '../normalization/numbers'
import { NORMALIZATION_MAX, NORMALIZATION_MIN, hhiIndex, yieldEvenness } from '../normalization/dataStats'
import { calcProvincialPopulation } from '../../../utils/calculatedFields'
import {
  buildScaledFollowerMap,
  applyReligionGlobalization,
  provinceReligionAffinity,
} from './religionDistribution'
import { attitudeFeatures } from './attitudes'

// Province distance scaling constants - creates drastic effect where remote provinces are frontier/isolated
const MIN_PROVINCE_DISTANCE = 3
const MAX_PROVINCE_DISTANCE = 15
const PROVINCE_DISTANCE_EXPONENT = 1.8
// Population at which a province reads as fully urban when its counties are blank.
const URBAN_POPULATION_REFERENCE = 30

// How a province reads its counties, by kind of feature:
//   population — economy and class: what most of its people do
//   land       — the land itself: share of the province's tiles
//   presence   — institutions: one Campus or Encampment marks the whole
//                province, more so the more people it serves
const POPULATION_FEATURES = [
  'urban_index',
  'rural_index',
  'agrarian_index',
  'industrial_index',
  'extractive_index',
  'commercial_index',
  'worker_index',
  'development_index',
  'middle_class_index',
]
const LAND_FEATURES = [
  'coastal_index',
  'mountain_index',
  'wilderness_index',
  'ecology_index',
  'hardship_index',
  'watershed_index',
  'appeal_index',
  'infrastructure_index',
  'pollution_index',
]
const PRESENCE_FEATURES = [
  'maritime_index',
  'military_index',
  'intellectual_index',
  'spiritual_index',
  'cultural_elite_index',
  'civic_monument_index',
  'leisure_tourism_index',
  'heritage_index',
]
// Weight on a province's single strongest county for presence features.
const PRESENCE_PEAK_WEIGHT = 0.6

const ATTITUDE_FEATURES = ['traditionalist_index', 'localist_index', 'restorationist_index', 'worker_grievance_index']

function originalCountry(province) {
  return String(province?.original_country || '').trim()
}

function currentCountryName(country = {}) {
  return String(country?.basic_info?.name || '').trim()
}

function isImperialOrigin(province, country = {}) {
  const origin = originalCountry(province)
  if (!origin) return !province?.is_joined && !province?.is_conquered
  const home = currentCountryName(country).toLowerCase()
  if (!home) return !province?.is_joined && !province?.is_conquered
  return origin.toLowerCase() === home
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
  const spread = avg === null
    ? null
    : clamp01(Math.pow(Math.max(0, avg - MIN_PROVINCE_DISTANCE) / (MAX_PROVINCE_DISTANCE - MIN_PROVINCE_DISTANCE), PROVINCE_DISTANCE_EXPONENT))
  const frontierIndex = spread === null ? 0.35 : spread

  return {
    nearest_province_distance: nearest,
    average_closest_province_distance: avg,
    frontier_index: frontierIndex,
    adjacency_known_index: clamp01(distances.length / 5),
  }
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

/**
 * Province-native features: identity, religion, yields per citizen and the
 * province-wide development and diversity readings. Counties inherit the
 * identity features from here.
 */
export function calculateProvinceBaseFeatures(province, country = {}, options = {}) {
  const civPopulation = Math.max(1, num(province?.population, 1))
  const provinceIndex = num(options.provinceIndex ?? province?.provinceIndex, 0)
  const empireReligionTotals = options.empireReligionTotals || {}
  const stateReligion = country?.state_religion || null

  const scaledProvincePop = Math.max(1, num(calcProvincialPopulation(num(province?.population), provinceIndex, options.calculations), 1))
  const perCitizen = (value, max) => norm(num(value) / civPopulation, max)
  const yields = {
    food_index: perCitizen(province?.yields?.food, NORMALIZATION_MAX.food_per_capita),
    production_index: perCitizen(province?.yields?.production, NORMALIZATION_MAX.production_per_capita),
    gold_index: perCitizen(province?.yields?.gold, NORMALIZATION_MAX.gold_per_capita),
    culture_index: perCitizen(province?.yields?.culture, NORMALIZATION_MAX.culture_per_capita),
    science_index: perCitizen(province?.yields?.science, NORMALIZATION_MAX.science_per_capita),
    faith_index: perCitizen(province?.yields?.faith, NORMALIZATION_MAX.faith_per_capita),
  }
  const loyaltyIndex = norm(province?.loyalty, NORMALIZATION_MAX.loyalty)
  const happinessIndex = clamp01(
    0.6 * normRange(province?.happiness_percentage, NORMALIZATION_MIN.happiness_percentage, NORMALIZATION_MAX.happiness_percentage) +
    0.4 * norm(province?.net_amenities, NORMALIZATION_MAX.net_amenities)
  )
  const foreignOriginIndex = isImperialOrigin(province, country) ? 0 : 1
  const conqueredIndex = province?.is_conquered ? 1 : 0
  const connectivity = provinceConnectivity(province)
  const sameContinentIndex = (province?.continent && country?.national_capital_continent && province.continent === country.national_capital_continent && province?.is_founded) ? 1 : 0

  // Religion shares are computed in scaled-population space: raw follower
  // counts share the same scale as raw province.population, so they're run
  // through the same calcProvincialPopulation curve and divided by the
  // province's own scaled population. Empire-wide globalization adds a small
  // ambient floor for every religion in every province.
  const followersByReligion = buildScaledFollowerMap(province, provinceIndex, options.calculations)
  const religionAffinity = provinceReligionAffinity({
    connectednessIndex: 1 - connectivity.frontier_index,
    faithIndex: yields.faith_index,
    foreignOriginIndex,
  })
  applyReligionGlobalization(followersByReligion, empireReligionTotals, religionAffinity)

  const religionShares = Object.fromEntries(
    Object.entries(followersByReligion).map(([religion, followers]) => [religion, clamp01(num(followers) / scaledProvincePop)])
  )
  const stateReligionShare = clamp01(religionFollowers(followersByReligion, stateReligion) / scaledProvincePop)
  const minorityReligionShare = clamp01(nonStateReligionFollowers(followersByReligion, stateReligion) / scaledProvincePop)
  const religiousHomogeneityIndex = clamp01(hhiIndex(Object.values(followersByReligion || {})))

  let imperialCoreIndex = clamp01(
    0.28 * (province?.is_national_capital ? 1 : 0) +
    0.12 * (province?.is_regional_capital ? 1 : 0) +
    0.08 * (province?.is_founded ? 1 : 0) +
    0.14 * loyaltyIndex +
    0.1 * stateReligionShare +
    0.1 * sameContinentIndex +
    0.08 * (1 - connectivity.frontier_index) +
    0.05 * yields.culture_index +
    0.05 * yields.science_index -
    0.12 * foreignOriginIndex
  )
  if (conqueredIndex) imperialCoreIndex *= 0.6

  return {
    ...yields,
    imperial_core_index: imperialCoreIndex,
    loyalty_index: loyaltyIndex,
    happiness_index: happinessIndex,
    state_religion_share: stateReligionShare,
    minority_religion_share: minorityReligionShare,
    religious_homogeneity_index: religiousHomogeneityIndex,
    foreign_origin_index: foreignOriginIndex,
    same_continent_index: sameContinentIndex,
    conquered_index: conqueredIndex,
    frontier_index: connectivity.frontier_index,
    economic_diversity_index: yieldEvenness(Object.values(yields)),
    // Province-wide reading of development, blended with the counties' below.
    provincial_development: clamp01(
      0.35 * (yields.culture_index + yields.science_index) / 2 +
      0.3 * yields.gold_index +
      0.35 * happinessIndex
    ),
    // Not weighted; used by voter blocs, trend selectors and the planner.
    religion_shares: religionShares,
    nearest_province_distance: connectivity.nearest_province_distance,
    average_closest_province_distance: connectivity.average_closest_province_distance,
    adjacency_known_index: connectivity.adjacency_known_index,
  }
}

function landShare(counties, featureName) {
  if (!counties.length) return 0
  return counties.reduce((sum, county) => sum + num(county.political_features?.[featureName]), 0) / counties.length
}

function presence(counties, featureName, totalPopulation) {
  const peak = counties.reduce((max, county) => Math.max(max, num(county.political_features?.[featureName])), 0)
  const spread = populationWeighted(counties, featureName, totalPopulation)
  return 1 - (1 - spread) * (1 - PRESENCE_PEAK_WEIGHT * peak)
}

function aggregateCounties(counties, featureName, totalPopulation) {
  if (LAND_FEATURES.includes(featureName)) return landShare(counties, featureName)
  if (PRESENCE_FEATURES.includes(featureName)) return presence(counties, featureName, totalPopulation)
  return populationWeighted(counties, featureName, totalPopulation)
}

function populationWeighted(counties, featureName, totalPopulation) {
  if (!counties.length) return 0
  if (!totalPopulation) {
    return counties.reduce((sum, county) => sum + num(county.political_features?.[featureName]), 0) / counties.length
  }
  return counties.reduce((sum, county) => {
    return sum + num(county.county_population) * num(county.political_features?.[featureName])
  }, 0) / totalPopulation
}

// Share of the province (by population, else by count) living in counties the
// player has actually described.
function countyCoverage(counties, totalPopulation) {
  if (!counties.length) return 0
  if (totalPopulation > 0) {
    return clamp01(counties.reduce((sum, county) => sum + (county.has_details ? num(county.county_population) : 0), 0) / totalPopulation)
  }
  return counties.filter((county) => county.has_details).length / counties.length
}

/**
 * Where counties are blank, the province's own yields stand in for what its
 * counties would have shown.
 */
function yieldStandIns(base, province) {
  return {
    urban_index: clamp01(norm(province?.population, URBAN_POPULATION_REFERENCE) * 0.7),
    agrarian_index: base.food_index,
    industrial_index: 0.7 * base.production_index,
    extractive_index: 0.5 * base.production_index,
    worker_index: 0.7 * base.production_index,
    commercial_index: base.gold_index,
    intellectual_index: base.science_index,
    spiritual_index: base.faith_index,
    cultural_elite_index: base.culture_index,
  }
}

export function calculateProvinceFeatures(province, country = {}, counties = [], provincialPopulation = 0, options = {}) {
  const base = options.baseFeatures || calculateProvinceBaseFeatures(province, country, options)
  const totalPopulation = counties.reduce((sum, county) => sum + num(county.county_population), 0) || num(provincialPopulation)
  const coverage = countyCoverage(counties, totalPopulation)
  const standIns = yieldStandIns(base, province)

  const composition = {}
  for (const key of [...POPULATION_FEATURES, ...LAND_FEATURES, ...PRESENCE_FEATURES]) {
    const fromCounties = aggregateCounties(counties, key, totalPopulation)
    composition[key] = clamp01(key in standIns ? coverage * fromCounties + (1 - coverage) * standIns[key] : fromCounties)
  }
  composition.development_index = clamp01(0.5 * composition.development_index + 0.5 * base.provincial_development)

  const { provincial_development, ...baseFeatures } = base
  const features = { ...baseFeatures, ...composition }
  const provinceAttitudes = attitudeFeatures(features, base.frontier_index)
  for (const key of ATTITUDE_FEATURES) {
    // Half the province's own reading, half its counties' (which carry county
    // remoteness and catalog nudges such as a Government Plaza).
    features[key] = clamp01(0.5 * provinceAttitudes[key] + 0.5 * populationWeighted(counties, key, totalPopulation))
  }
  features.county_coverage = coverage
  return features
}
