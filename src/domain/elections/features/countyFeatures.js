import { clamp01, countTrue, hasAnyFeature, norm, num } from '../normalization/numbers'

const FOOD_RESOURCES = ['Rice', 'Wheat', 'Maize', 'Bananas']
const STRATEGIC_RESOURCES = ['Iron', 'Coal', 'Oil', 'Uranium', 'Niter', 'Aluminum']

function improvementName(county) {
  return String(county?.improvement?.name || '').trim()
}

function boolIndex(value) {
  return value ? 1 : 0
}

function countyYieldIndices(county) {
  return {
    food_index: norm(county?.yields?.food, 8),
    production_index: norm(county?.yields?.production, 12),
    gold_index: norm(county?.yields?.gold, 24),
    culture_index: norm(county?.yields?.culture, 15),
    science_index: norm(county?.yields?.science, 12),
    faith_index: norm(county?.yields?.faith, 12),
  }
}

export function calculateCountyFeatures(county, provinceContext = {}) {
  const name = improvementName(county)
  const buildings = county?.improvement?.buildings || {}
  const greatWorks = county?.improvement?.great_works || {}
  const features = county?.features || {}
  const resource = String(county?.resource || '')
  const distanceFromCenter = Math.max(0, num(county?.distance_from_center))
  const citizensWorking = Math.max(0, num(county?.citizens_working))
  const yields = countyYieldIndices(county)
  const cityCenterOrNeighborhood = ['City Center', 'Neighborhood'].includes(name) ? 1 : 0
  const neighborhoodIndex = name === 'Neighborhood' ? 1 : 0
  const commercialOrDistrict = name ? 1 : 0
  const citizensWorkingIndex = norm(citizensWorking, 3)
  const infrastructureSeed = clamp01((county?.has_railroad ? 0.6 : 0) + (county?.river ? 0.4 : 0))
  const proximityIndex = 1 / (1 + distanceFromCenter)
  const distanceIndex = clamp01(distanceFromCenter / 5)
  const farmOrPlantation = ['Farm', 'Plantation'].includes(name) ? 1 : 0
  const foodResourceIndex = FOOD_RESOURCES.includes(resource) ? 1 : 0
  const undevelopedIndex = name ? 0 : 1
  const mineOrCorporationIndex = ['Mine', 'Corporation'].includes(name) ? 1 : 0
  const railroadIndex = boolIndex(county?.has_railroad)
  const riverIndex = boolIndex(county?.river)
  const strategicResourceIndex = STRATEGIC_RESOURCES.includes(resource) ? 1 : 0
  const appealIndex = county?.appeal === null || county?.appeal === undefined || county?.appeal === ''
    ? 0.35
    : norm(county.appeal, 8)
  const preserveOrParkIndex = ['Preserve', 'National Park'].includes(name) ? 1 : 0

  const yieldDensityIndex = clamp01(
    0.25 * yields.food_index +
    0.25 * yields.production_index +
    0.2 * yields.gold_index +
    0.15 * yields.culture_index +
    0.15 * yields.science_index
  )

  const urbanIndex = clamp01(
    0.3 * cityCenterOrNeighborhood +
    0.2 * commercialOrDistrict +
    0.15 * citizensWorkingIndex +
    0.15 * infrastructureSeed +
    0.1 * proximityIndex +
    0.1 * yieldDensityIndex
  )
  const ruralIndex = clamp01(
    0.3 * distanceIndex +
    0.25 * farmOrPlantation +
    0.2 * foodResourceIndex +
    0.15 * undevelopedIndex +
    0.1 * (1 - urbanIndex)
  )
  const industrialIndex = clamp01(
    0.35 * (name === 'Industrial Zone' ? 1 : 0) +
    0.2 * yields.production_index +
    0.15 * mineOrCorporationIndex +
    0.15 * citizensWorkingIndex +
    0.1 * railroadIndex +
    0.05 * strategicResourceIndex
  )
  const agrarianIndex = clamp01(
    0.35 * farmOrPlantation +
    0.25 * foodResourceIndex +
    0.2 * yields.food_index +
    0.1 * ruralIndex +
    0.1 * (county?.river && farmOrPlantation ? 1 : 0)
  )
  const militaryIndex = clamp01(
    0.45 * (name === 'Encampment' ? 1 : 0) +
    0.25 * (countTrue(['Barracks', 'Armory', 'Military Academy'], buildings) / 3) +
    0.15 * (name === 'Aerodrome' ? 1 : 0) +
    0.1 * strategicResourceIndex +
    0.05 * distanceIndex
  )
  const intellectualIndex = clamp01(
    0.4 * (name === 'Campus' ? 1 : 0) +
    0.25 * yields.science_index +
    0.2 * (countTrue(['Library', 'University', 'Research Lab'], buildings) / 3) +
    0.1 * yields.culture_index +
    0.05 * appealIndex
  )
  const spiritualIndex = clamp01(
    0.35 * (name === 'Holy Site' ? 1 : 0) +
    0.2 * yields.faith_index +
    0.2 * (countTrue(['Shrine', 'Temple', 'Gurdwara', 'Prasat'], buildings) / 4) +
    0.1 * preserveOrParkIndex +
    0.1 * appealIndex +
    0.05 * (hasAnyFeature(['Woods (old-growth)', 'Rainforest', 'Marsh'], features) ? 1 : 0)
  )
  const commercialIndex = clamp01(
    0.35 * (name === 'Commercial Hub' ? 1 : 0) +
    0.2 * (countTrue(['Market', 'Bank', 'Stock Exchange'], buildings) / 3) +
    0.2 * yields.gold_index +
    0.1 * (name === 'Corporation' ? 1 : 0) +
    0.1 * infrastructureSeed +
    0.05 * urbanIndex
  )
  const culturalEliteIndex = clamp01(
    0.35 * (name === 'Theater Square' ? 1 : 0) +
    0.25 * clamp01(Object.keys(greatWorks).length / 6) +
    0.2 * yields.culture_index +
    0.1 * (buildings.Monument ? 1 : 0) +
    0.1 * appealIndex
  )
  const workerIndex = clamp01(
    0.3 * citizensWorkingIndex +
    0.25 * industrialIndex +
    0.2 * yields.production_index +
    0.15 * mineOrCorporationIndex +
    0.1 * (countTrue(['Workshop', 'Factory'], buildings) / 2)
  )
  const infrastructureIndex = clamp01(
    0.45 * railroadIndex +
    0.25 * riverIndex +
    0.2 * (name ? 1 : 0) +
    0.1 * proximityIndex
  )
  const localistIndex = clamp01(
    0.25 * distanceIndex +
    0.2 * num(provinceContext.minority_religion_share) +
    0.2 * preserveOrParkIndex +
    0.15 * neighborhoodIndex +
    0.1 * (provinceContext.is_conquered ? 1 : 0) +
    0.1 * (1 - num(provinceContext.imperial_core_index))
  )
  const traditionalistIndex = clamp01(
    0.3 * ruralIndex +
    0.2 * agrarianIndex +
    0.2 * militaryIndex +
    0.15 * num(provinceContext.state_religion_share) +
    0.15 * (1 - urbanIndex)
  )
  const restorationistIndex = clamp01(
    0.35 * num(provinceContext.roman_identity_index) +
    0.25 * (provinceContext.is_conquered ? 1 : 0) +
    0.2 * spiritualIndex +
    0.1 * num(provinceContext.minority_religion_share) +
    0.1 * localistIndex
  )

  return {
    county_population: Math.max(0, Math.round(num(county?.county_population))),
    county_population_share: clamp01(county?.county_population_share),
    urban_index: urbanIndex,
    rural_index: ruralIndex,
    industrial_index: industrialIndex,
    agrarian_index: agrarianIndex,
    military_index: militaryIndex,
    intellectual_index: intellectualIndex,
    spiritual_index: spiritualIndex,
    commercial_index: commercialIndex,
    cultural_elite_index: culturalEliteIndex,
    worker_index: workerIndex,
    infrastructure_index: infrastructureIndex,
    appeal_index: appealIndex,
    localist_index: localistIndex,
    traditionalist_index: traditionalistIndex,
    restorationist_index: restorationistIndex,
    ...yields,
    distance_index: distanceIndex,
    citizens_working_index: citizensWorkingIndex,
    mine_or_corporation_index: mineOrCorporationIndex,
    neighborhood_index: neighborhoodIndex,
    commercial_middle_class_index: clamp01((commercialIndex + urbanIndex + appealIndex) / 3),
    religious_minority_index: num(provinceContext.minority_religion_share),
    improvement_name: name,
  }
}

