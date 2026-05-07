import { clamp01, countTrue, hasAnyFeature, norm, num } from '../normalization/numbers'
import { NORMALIZATION_MAX, coefficientOfVariation } from '../normalization/dataStats'

// Distance scaling constants - creates drastic effect where remote areas have fundamentally different character
const MAX_COUNTY_DISTANCE = 5
const COUNTY_DISTANCE_EXPONENT = 2.5

const FOOD_RESOURCES = ['Rice', 'Wheat', 'Maize', 'Bananas']
const STRATEGIC_RESOURCES = ['Iron', 'Coal', 'Oil', 'Uranium', 'Niter', 'Aluminum']
const MARITIME_IMPROVEMENTS = ['Harbor', 'Fishing Boats', 'Seastead', 'Offshore Wind Farm']
const EXTRACTIVE_IMPROVEMENTS = ['Mine', 'Quarry', 'Camp', 'Oil Well', 'Offshore Oil Rig']
const RESIDENTIAL_IMPROVEMENTS = ['City Center', 'Neighborhood']
const LEISURE_TOURISM_IMPROVEMENTS = ['National Park', 'Preserve', 'Entertainment Complex', 'Water Park', 'Estadio do Maracana', 'Biosphere']
const CIVIC_MONUMENT_IMPROVEMENTS = [
  'City Center',
  'Forbidden City',
  'Orsaghaz',
  'Orszaghaz',
  'Torre de Belem',
  'Temple of Artemis',
  'Eiffel Tower',
  'Taj Mahal',
  'Kotoku-in',
  'Mausoleum at Halicarnassus',
  'Venetian Arsenal',
  'Venetial Arsenal',
  'Great Zimbabwe',
]
const INFRASTRUCTURE_IMPROVEMENTS = ['Dam', 'Aqueduct', 'Golden Gate Bridge']
const NATURAL_FEATURES = ['Woods (old-growth)', 'Rainforest', 'Marsh', 'Cliff', 'Volcano', 'Volcanic Soil', 'Oasis']
const HARBOR_BUILDINGS = ['Lighthouse', 'Shipyard', 'Seaport']

// Shared geographic features for cross-tile effects
const MARITIME_BASIN_FEATURES = [
  'Gulf of Thailand', 'San Francisco Bay', 'Adriatic Sea', 'Bering Sea',
  'Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Mediterranean Sea',
  'North Sea', 'Baltic Sea', 'South China Sea', 'Caribbean Sea',
  'Red Sea', 'Black Sea', 'Sea of Japan', 'Arabian Sea',
  'Gulf', 'Bay', 'Sea', 'Ocean', 'Strait'
]
const DESERT_FEATURES = ['Bledowska Desert', 'Sahara', 'Gobi', 'Kalahari', 'Outback', 'Desert']
const FLOODPLAIN_FEATURES = ['Grassland Floodplains', 'Plains Floodplains', 'Floodplains']
const PROTECTED_MARINE_FEATURES = ['Reef', 'Turtles', 'Coral', 'Marine Reserve']
const ENERGY_RESOURCES = ['Coal', 'Oil', 'Uranium', 'Niter', 'Aluminum']
const LUXURY_RESOURCES = ['Amber', 'Marble', 'Cocoa', 'Spices', 'Silk', 'Wine', 'Ivory', 'Pearls', 'Jade', 'Gems', 'Gold', 'Silver']
const OFFSHORE_IMPROVEMENTS = ['Offshore Wind Farm', 'Offshore Oil Rig', 'Seastead', 'Fishing Boats']

function improvementName(county) {
  return String(county?.improvement?.name || '').trim()
}

function terrainIncludes(county, text) {
  return String(county?.terrain || '').toLowerCase().includes(String(text || '').toLowerCase())
}

function boolIndex(value) {
  return value ? 1 : 0
}

function featureNameIncludes(features, keywords) {
  const featureNames = Object.keys(features || {})
  return keywords.some(keyword =>
    featureNames.some(name => name.toLowerCase().includes(keyword.toLowerCase()))
  )
}

function detectMaritimeBasin(county) {
  const features = county?.features || {}
  const found = MARITIME_BASIN_FEATURES.find(basin =>
    Object.keys(features).some(name => name.toLowerCase().includes(basin.toLowerCase()))
  )
  return found || null
}

function detectRiver(county) {
  const river = county?.river
  return river && String(river).trim().length > 0 ? String(river).trim() : null
}

function hasRainforest(county) {
  return (county?.features?.Rainforest === true) ||
    Object.keys(county?.features || {}).some(name => name.toLowerCase().includes('rainforest'))
}

function hasDesertFeature(county) {
  return featureNameIncludes(county?.features, DESERT_FEATURES)
}

function hasFloodplain(county) {
  return featureNameIncludes(county?.features, FLOODPLAIN_FEATURES)
}

function hasProtectedMarine(county) {
  return featureNameIncludes(county?.features, PROTECTED_MARINE_FEATURES)
}

function isEnergyResource(county) {
  return ENERGY_RESOURCES.includes(String(county?.resource || ''))
}

function isLuxuryResource(county) {
  return LUXURY_RESOURCES.includes(String(county?.resource || ''))
}

function hasOffshoreImprovement(county) {
  return OFFSHORE_IMPROVEMENTS.includes(improvementName(county))
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
  const distanceIndex = clamp01(Math.pow(distanceFromCenter / MAX_COUNTY_DISTANCE, COUNTY_DISTANCE_EXPONENT))
  const radiatingDecayMultiplier = clamp01(Math.pow(1 - distanceFromCenter / MAX_COUNTY_DISTANCE, COUNTY_DISTANCE_EXPONENT))
  const farmOrPlantation = ['Farm', 'Plantation', 'Pasture'].includes(name) ? 1 : 0
  const foodResourceIndex = FOOD_RESOURCES.includes(resource) ? 1 : 0
  const undevelopedIndex = name ? 0 : 1
  const mineOrCorporationIndex = ['Mine', 'Corporation'].includes(name) ? 1 : 0
  const infrastructureImprovementIndex = INFRASTRUCTURE_IMPROVEMENTS.includes(name) ? 1 : 0
  const industryIndex = name === 'Industry' ? 1 : 0
  const diplomaticIndex = name === 'Diplomatic Quarter' ? 1 : 0
  const railroadIndex = boolIndex(county?.has_railroad)
  const riverIndex = boolIndex(county?.river)
  const strategicResourceIndex = STRATEGIC_RESOURCES.includes(resource) ? 1 : 0
  const appealIndex = county?.appeal === null || county?.appeal === undefined || county?.appeal === ''
    ? 0.35
    : norm(county.appeal, NORMALIZATION_MAX.appeal)
  const preserveOrParkIndex = ['Preserve', 'National Park', 'Biosphere'].includes(name) ? 1 : 0
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
    0.30 * (name === 'Industrial Zone' ? 1 : 0) +
    0.12 * industryIndex +
    0.18 * yields.production_index +
    0.18 * extractiveIndex +
    0.12 * citizensWorkingIndex +
    0.05 * railroadIndex +
    0.05 * strategicResourceIndex
  )
  const agrarianIndex = clamp01(
    0.33 * farmOrPlantation +
    0.23 * foodResourceIndex +
    0.18 * yields.food_index +
    0.10 * ruralIndex +
    0.09 * (county?.river && farmOrPlantation ? 1 : 0) +
    0.07 * infrastructureImprovementIndex
  )
  const militaryIndex = clamp01(
    0.45 * (name === 'Encampment' ? 1 : 0) +
    0.25 * (countTrue(['Barracks', 'Armory', 'Military Academy'], buildings) / 3) +
    0.15 * (name === 'Aerodrome' ? 1 : 0) +
    0.1 * strategicResourceIndex +
    0.05 * distanceIndex
  )
  const intellectualIndex = clamp01(
    0.40 * (name === 'Campus' ? 1 : 0) +
    0.24 * yields.science_index +
    0.19 * (countTrue(['Library', 'University', 'Research Lab'], buildings) / 3) +
    0.09 * yields.culture_index +
    0.05 * diplomaticIndex +
    0.03 * appealIndex
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
    0.18 * (countTrue(['Market', 'Bank', 'Stock Exchange'], buildings) / 3) +
    0.17 * yields.gold_index +
    0.09 * (name === 'Corporation' ? 1 : 0) +
    0.07 * industryIndex +
    0.05 * diplomaticIndex +
    0.06 * infrastructureSeed +
    0.04 * maritimeIndex +
    0.02 * urbanIndex
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
    0.37 * railroadIndex +
    0.20 * riverIndex +
    0.16 * (name ? 1 : 0) +
    0.10 * proximityIndex +
    0.10 * maritimeIndex +
    0.07 * infrastructureImprovementIndex
  )
  const localistIndex = clamp01(
    0.22 * distanceIndex +
    0.18 * num(provinceContext.minority_religion_share) * radiatingDecayMultiplier +
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
    0.14 * num(provinceContext.state_religion_share) * radiatingDecayMultiplier +
    0.13 * (1 - urbanIndex) +
    0.1 * wildernessIndex
  )
  const restorationistIndex = clamp01(
    0.32 * num(provinceContext.roman_identity_index) +
    0.23 * (provinceContext.is_conquered ? 1 : 0) +
    0.18 * spiritualIndex +
    0.1 * num(provinceContext.minority_religion_share) * radiatingDecayMultiplier +
    0.09 * localistIndex +
    0.08 * wildernessIndex
  )

  // Calculate yield diversity index
  const yieldValues = [
    num(yields.food_index),
    num(yields.production_index),
    num(yields.gold_index),
    num(yields.culture_index),
    num(yields.science_index),
    num(yields.faith_index),
  ]
  const yieldDiversityIndex = clamp01(coefficientOfVariation(yieldValues.filter(v => v > 0)))

  // Calculate improved status index based on buildings and improvements
  const buildingCount = Object.keys(buildings).length
  const hasImprovement = name ? 1 : 0
  const improvedStatusIndex = clamp01(
    0.5 * hasImprovement +
    0.3 * norm(buildingCount, 6) +
    0.2 * (county?.has_railroad ? 1 : 0)
  )

  // Calculate resource development index
  const resourceDevelopmentIndex = clamp01(
    (strategicResourceIndex ? 1 : 0) +
    (resource ? 0.5 : 0)
  )

  // Calculate cultural output index
  const greatWorkCount = Object.keys(greatWorks).length
  const culturalOutputIndex = clamp01(
    0.4 * yields.culture_index +
    0.3 * (name === 'Theater Square' ? 1 : 0) +
    0.2 * norm(greatWorkCount, 6) +
    0.1 * (civicMonumentIndex > 0.5 ? 1 : 0)
  )

  // Calculate new shared feature indices
  const maritimeBasinName = detectMaritimeBasin(county)
  const maritimeBasinIndex = maritimeBasinName ? 1 : 0
  const riverName = detectRiver(county)
  const watershedIndex = riverName ? 1 : 0
  const rainforestIndex = hasRainforest(county) ? 1 : 0
  const desertRegionIndex = hasDesertFeature(county) ? 1 : 0
  const floodplainIndex = hasFloodplain(county) ? 1 : 0
  const protectedMarineIndex = hasProtectedMarine(county) ? 1 : 0
  const energyResourceIndex = isEnergyResource(county) ? 1 : 0
  const luxuryResourceIndex = isLuxuryResource(county) ? 1 : 0
  const offshoreDevelopmentIndex = clamp01(
    0.4 * (hasOffshoreImprovement(county) ? 1 : 0) +
    0.3 * (coastTerrainIndex || oceanTerrainIndex ? 1 : 0) +
    0.2 * maritimeImprovementIndex +
    0.1 * citizensWorkingIndex
  )
  const resourceClusterIndex = clamp01(
    0.5 * (energyResourceIndex || luxuryResourceIndex ? 1 : 0) +
    0.3 * resourceIndex +
    0.2 * strategicResourceIndex
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
    // New features
    yield_diversity_index: yieldDiversityIndex,
    improved_status_index: improvedStatusIndex,
    resource_development_index: resourceDevelopmentIndex,
    cultural_output_index: culturalOutputIndex,
    ...yields,
    distance_index: distanceIndex,
    citizens_working_index: citizensWorkingIndex,
    mine_or_corporation_index: mineOrCorporationIndex,
    neighborhood_index: neighborhoodIndex,
    commercial_middle_class_index: clamp01((commercialIndex + urbanIndex + appealIndex) / 3),
    religious_minority_index: num(provinceContext.minority_religion_share),
    improvement_name: name,
    // Shared geographic feature indices
    maritime_basin_index: maritimeBasinIndex,
    maritime_basin_name: maritimeBasinName,
    watershed_index: watershedIndex,
    river_name: riverName,
    rainforest_index: rainforestIndex,
    desert_region_index: desertRegionIndex,
    floodplain_index: floodplainIndex,
    protected_marine_index: protectedMarineIndex,
    energy_resource_index: energyResourceIndex,
    luxury_resource_index: luxuryResourceIndex,
    offshore_development_index: offshoreDevelopmentIndex,
    resource_cluster_index: resourceClusterIndex,
  }
}
