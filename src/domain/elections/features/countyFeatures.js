import { clamp01, countTrue, hasAnyFeature, norm, num } from '../normalization/numbers'

const FOOD_RESOURCES = ['Rice', 'Wheat', 'Maize', 'Bananas']
const STRATEGIC_RESOURCES = ['Iron', 'Coal', 'Oil', 'Uranium', 'Niter', 'Aluminum']
const MARITIME_IMPROVEMENTS = ['Harbor', 'Fishing Boats', 'Seastead', 'Offshore Wind Farm']
const EXTRACTIVE_IMPROVEMENTS = ['Mine', 'Quarry', 'Camp', 'Oil Well', 'Offshore Oil Rig']
const RESIDENTIAL_IMPROVEMENTS = ['City Center', 'Neighborhood']
const LEISURE_TOURISM_IMPROVEMENTS = ['National Park', 'Preserve', 'Entertainment Complex', 'Water Park', 'Estadio do Maracana']
const CIVIC_MONUMENT_IMPROVEMENTS = [
  'City Center',
  'Forbidden City',
  'Orsaghaz',
  'Orszaghaz',
  'Torre de Belem',
  'Temple of Artemis',
]
const NATURAL_FEATURES = ['Woods (old-growth)', 'Rainforest', 'Marsh', 'Cliff', 'Volcano', 'Volcanic Soil', 'Oasis']
const HARBOR_BUILDINGS = ['Lighthouse', 'Shipyard', 'Seaport']

function improvementName(county) {
  return String(county?.improvement?.name || '').trim()
}

function terrainIncludes(county, text) {
  return String(county?.terrain || '').toLowerCase().includes(String(text || '').toLowerCase())
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
  const farmOrPlantation = ['Farm', 'Plantation', 'Pasture'].includes(name) ? 1 : 0
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
  const coastTerrainIndex = terrainIncludes(county, 'Coast') ? 1 : 0
  const oceanTerrainIndex = terrainIncludes(county, 'Ocean') ? 1 : 0
  const waterTerrainIndex = coastTerrainIndex || oceanTerrainIndex ? 1 : 0
  const mountainTerrainIndex = terrainIncludes(county, 'Mountain') ? 1 : 0
  const maritimeImprovementIndex = MARITIME_IMPROVEMENTS.includes(name) ? 1 : 0
  const harborBuildingIndex = countTrue(HARBOR_BUILDINGS, buildings) / HARBOR_BUILDINGS.length
  const residentialImprovementIndex = RESIDENTIAL_IMPROVEMENTS.includes(name) ? 1 : 0
  const leisureTourismImprovementIndex = LEISURE_TOURISM_IMPROVEMENTS.includes(name) ? 1 : 0
  const civicMonumentImprovementIndex = CIVIC_MONUMENT_IMPROVEMENTS.includes(name) ? 1 : 0
  const extractiveImprovementIndex = EXTRACTIVE_IMPROVEMENTS.includes(name) ? 1 : 0
  const naturalFeatureIndex = hasAnyFeature(NATURAL_FEATURES, features) ? 1 : 0
  const resourceIndex = resource ? 1 : 0
  const workedDifficultTerrainIndex = (waterTerrainIndex || mountainTerrainIndex) && citizensWorking > 0 ? 1 : 0
  const terrainHabitationIndex = (waterTerrainIndex || mountainTerrainIndex) && citizensWorking <= 0 ? 0 : 1

  const yieldDensityIndex = clamp01(
    0.25 * yields.food_index +
    0.25 * yields.production_index +
    0.2 * yields.gold_index +
    0.15 * yields.culture_index +
    0.15 * yields.science_index
  )

  const coastalIndex = clamp01(
    0.5 * coastTerrainIndex +
    0.2 * maritimeImprovementIndex +
    0.15 * workedDifficultTerrainIndex +
    0.15 * yieldDensityIndex
  )
  const maritimeIndex = clamp01(
    0.3 * waterTerrainIndex +
    0.25 * maritimeImprovementIndex +
    0.2 * harborBuildingIndex +
    0.1 * citizensWorkingIndex +
    0.1 * yields.gold_index +
    0.05 * yields.food_index
  )
  const mountainIndex = clamp01(
    0.55 * mountainTerrainIndex +
    0.15 * preserveOrParkIndex +
    0.1 * appealIndex +
    0.1 * distanceIndex +
    0.1 * yields.faith_index
  )
  const wildernessIndex = clamp01(
    0.25 * preserveOrParkIndex +
    0.2 * naturalFeatureIndex +
    0.15 * mountainTerrainIndex +
    0.15 * appealIndex +
    0.1 * distanceIndex +
    0.1 * undevelopedIndex +
    0.05 * (1 - citizensWorkingIndex)
  )
  const residentialIndex = clamp01(
    0.45 * residentialImprovementIndex +
    0.2 * citizensWorkingIndex +
    0.15 * proximityIndex +
    0.1 * infrastructureSeed +
    0.1 * yieldDensityIndex
  )
  const extractiveIndex = clamp01(
    0.4 * extractiveImprovementIndex +
    0.2 * yields.production_index +
    0.15 * strategicResourceIndex +
    0.1 * resourceIndex +
    0.1 * citizensWorkingIndex +
    0.05 * railroadIndex
  )
  const leisureTourismIndex = clamp01(
    0.35 * leisureTourismImprovementIndex +
    0.2 * appealIndex +
    0.15 * yields.culture_index +
    0.1 * yields.faith_index +
    0.1 * naturalFeatureIndex +
    0.1 * clamp01(Object.keys(greatWorks).length / 6)
  )
  const civicMonumentIndex = clamp01(
    0.35 * civicMonumentImprovementIndex +
    0.2 * cityCenterOrNeighborhood +
    0.15 * (buildings.Monument ? 1 : 0) +
    0.15 * yields.culture_index +
    0.15 * clamp01(Object.keys(greatWorks).length / 6)
  )

  const urbanIndex = clamp01(
    0.25 * cityCenterOrNeighborhood +
    0.16 * commercialOrDistrict +
    0.14 * citizensWorkingIndex +
    0.13 * infrastructureSeed +
    0.1 * proximityIndex +
    0.08 * yieldDensityIndex +
    0.08 * residentialIndex +
    0.06 * civicMonumentIndex
  )
  const ruralIndex = clamp01(
    0.25 * distanceIndex +
    0.22 * farmOrPlantation +
    0.18 * foodResourceIndex +
    0.12 * undevelopedIndex +
    0.1 * (1 - urbanIndex) +
    0.08 * wildernessIndex +
    0.05 * mountainIndex
  )
  const industrialIndex = clamp01(
    0.32 * (name === 'Industrial Zone' ? 1 : 0) +
    0.18 * yields.production_index +
    0.18 * extractiveIndex +
    0.12 * citizensWorkingIndex +
    0.1 * railroadIndex +
    0.05 * strategicResourceIndex +
    0.05 * maritimeIndex
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
    0.32 * (name === 'Holy Site' ? 1 : 0) +
    0.18 * yields.faith_index +
    0.18 * (countTrue(['Shrine', 'Temple', 'Gurdwara', 'Prasat'], buildings) / 4) +
    0.1 * preserveOrParkIndex +
    0.08 * appealIndex +
    0.07 * naturalFeatureIndex +
    0.07 * wildernessIndex
  )
  const commercialIndex = clamp01(
    0.32 * (name === 'Commercial Hub' ? 1 : 0) +
    0.19 * (countTrue(['Market', 'Bank', 'Stock Exchange'], buildings) / 3) +
    0.18 * yields.gold_index +
    0.09 * (name === 'Corporation' ? 1 : 0) +
    0.08 * infrastructureSeed +
    0.08 * maritimeIndex +
    0.06 * urbanIndex
  )
  const culturalEliteIndex = clamp01(
    0.35 * (name === 'Theater Square' ? 1 : 0) +
    0.25 * clamp01(Object.keys(greatWorks).length / 6) +
    0.2 * yields.culture_index +
    0.1 * (buildings.Monument ? 1 : 0) +
    0.1 * appealIndex
  )
  const workerIndex = clamp01(
    0.27 * citizensWorkingIndex +
    0.24 * industrialIndex +
    0.18 * yields.production_index +
    0.13 * extractiveIndex +
    0.1 * (countTrue(['Workshop', 'Factory'], buildings) / 2) +
    0.08 * maritimeIndex
  )
  const infrastructureIndex = clamp01(
    0.4 * railroadIndex +
    0.22 * riverIndex +
    0.18 * (name ? 1 : 0) +
    0.1 * proximityIndex +
    0.1 * maritimeIndex
  )
  const localistIndex = clamp01(
    0.22 * distanceIndex +
    0.18 * num(provinceContext.minority_religion_share) +
    0.17 * preserveOrParkIndex +
    0.13 * neighborhoodIndex +
    0.1 * (provinceContext.is_conquered ? 1 : 0) +
    0.1 * (1 - num(provinceContext.imperial_core_index)) +
    0.1 * wildernessIndex
  )
  const traditionalistIndex = clamp01(
    0.27 * ruralIndex +
    0.18 * agrarianIndex +
    0.18 * militaryIndex +
    0.14 * num(provinceContext.state_religion_share) +
    0.13 * (1 - urbanIndex) +
    0.1 * wildernessIndex
  )
  const restorationistIndex = clamp01(
    0.32 * num(provinceContext.roman_identity_index) +
    0.23 * (provinceContext.is_conquered ? 1 : 0) +
    0.18 * spiritualIndex +
    0.1 * num(provinceContext.minority_religion_share) +
    0.09 * localistIndex +
    0.08 * wildernessIndex
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
    coastal_index: coastalIndex,
    maritime_index: maritimeIndex,
    mountain_index: mountainIndex,
    wilderness_index: wildernessIndex,
    residential_index: residentialIndex,
    extractive_index: extractiveIndex,
    leisure_tourism_index: leisureTourismIndex,
    civic_monument_index: civicMonumentIndex,
    terrain_habitation_index: terrainHabitationIndex,
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
