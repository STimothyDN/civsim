import { clamp01, norm, num } from '../normalization/numbers'
import { NORMALIZATION_MAX, coefficientOfVariation } from '../normalization/dataStats'
import { MARITIME_BASIN_KEYWORDS, normalizeName } from '../../civ6'
import { collectCountySignals, tierShare } from './countySignals'

// Distance scaling constants - creates drastic effect where remote areas have fundamentally different character
const MAX_COUNTY_DISTANCE = 5
const COUNTY_DISTANCE_EXPONENT = 2.5

function improvementName(county) {
  return String(county?.improvement?.name || '').trim()
}

const BASIN_KEYWORDS = MARITIME_BASIN_KEYWORDS.map((basin) => [basin, normalizeName(basin)])

function detectMaritimeBasin(county) {
  const features = county?.features
  if (!features) return null
  const featureKeys = Object.keys(features).filter((key) => features[key]).map(normalizeName)
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

/**
 * County political features. What a county *is* — terrain, features, resource,
 * improvement, buildings — comes from the Civ 6 catalog (src/domain/civ6) as
 * signals, building-ladder shares and lean; these formulas combine that with
 * yields, distance and province context.
 */
export function calculateCountyFeatures(county, provinceContext = {}) {
  const name = improvementName(county)
  const buildings = county?.improvement?.buildings || {}
  const greatWorks = county?.improvement?.great_works || {}
  const resource = String(county?.resource || '')
  const { signals, tiers, lean } = collectCountySignals(county)
  const signal = (key) => signals[key] || 0
  const withLean = (key, value) => clamp01(value + (lean[key] || 0))
  const distanceFromCenter = Math.max(0, num(county?.distance_from_center))
  const citizensWorking = Math.max(0, num(county?.citizens_working))
  const yields = countyYieldIndices(county)
  const residentialImprovementIndex = signal('residential')
  const neighborhoodIndex = signal('neighborhood')
  const commercialOrDistrict = name ? 1 : 0
  const citizensWorkingIndex = norm(citizensWorking, 3)
  const housingBuildingIndex = tierShare(tiers, 'housing')
  // Power plants and renewable improvements (wind, solar, geothermal) alike.
  const energyIndex = Math.max(tierShare(tiers, 'energy'), signal('energy'))
  const industryBuildingIndex = tierShare(tiers, 'industry')
  const greatWorkDensityIndex = norm(Object.keys(greatWorks).length, 4)
  const infrastructureSeed = clamp01((county?.has_railroad ? 0.6 : 0) + (county?.river ? 0.4 : 0))
  const proximityIndex = 1 / (1 + distanceFromCenter)
  const distanceIndex = clamp01(Math.pow(distanceFromCenter / MAX_COUNTY_DISTANCE, COUNTY_DISTANCE_EXPONENT))
  const radiatingDecayMultiplier = clamp01(Math.pow(1 - distanceFromCenter / MAX_COUNTY_DISTANCE, COUNTY_DISTANCE_EXPONENT))
  const farmOrPlantation = signal('agrarian')
  const foodResourceIndex = signal('food_resource')
  const undevelopedIndex = name ? 0 : 1
  const mineOrCorporationIndex = signal('mine_or_corporation')
  const infrastructureImprovementIndex = signal('infrastructure')
  const industryIndex = signal('industry')
  const diplomaticIndex = signal('diplomatic')
  const railroadIndex = county?.has_railroad ? 1 : 0
  const riverIndex = county?.river ? 1 : 0
  const strategicResourceIndex = signal('strategic_resource')
  const appealIndex = county?.appeal === null || county?.appeal === undefined || county?.appeal === ''
    ? 0.35
    : norm(county.appeal, NORMALIZATION_MAX.appeal)
  const preserveOrParkIndex = signal('preserve')
  const coastTerrainIndex = signal('coast_terrain')
  const oceanTerrainIndex = signal('ocean_terrain')
  const waterTerrainIndex = Math.max(coastTerrainIndex, oceanTerrainIndex)
  const mountainTerrainIndex = signal('mountain_terrain')
  const maritimeImprovementIndex = signal('maritime')
  const harborBuildingIndex = tierShare(tiers, 'harbor')
  const leisureTourismImprovementIndex = signal('leisure')
  const civicMonumentImprovementIndex = signal('civic_monument')
  const extractiveImprovementIndex = signal('extractive')
  const naturalFeatureIndex = signal('natural')
  const monumentIndex = tierShare(tiers, 'monument')
  const resourceIndex = resource ? 1 : 0
  const developedOrNaturalGate = name || naturalFeatureIndex ? 1 : 0
  const workedDifficultTerrainIndex = (waterTerrainIndex || mountainTerrainIndex) && developedOrNaturalGate ? 1 : 0
  const terrainHabitationIndex = withLean('terrain_habitation_index', (waterTerrainIndex || mountainTerrainIndex) && !developedOrNaturalGate ? 0 : 1)

  const yieldDensityIndex = clamp01(
    0.25 * yields.food_index +
    0.25 * yields.production_index +
    0.2 * yields.gold_index +
    0.15 * yields.culture_index +
    0.15 * yields.science_index
  )

  const coastalIndex = withLean('coastal_index',
    0.5 * coastTerrainIndex +
    0.2 * maritimeImprovementIndex +
    0.15 * workedDifficultTerrainIndex +
    0.15 * yieldDensityIndex
  )
  const maritimeIndex = withLean('maritime_index',
    0.3 * waterTerrainIndex +
    0.25 * maritimeImprovementIndex +
    0.25 * harborBuildingIndex +
    0.15 * yields.gold_index +
    0.05 * yields.food_index
  )
  const mountainIndex = withLean('mountain_index',
    0.55 * mountainTerrainIndex +
    0.15 * preserveOrParkIndex +
    0.1 * appealIndex +
    0.1 * distanceIndex +
    0.1 * yields.faith_index
  )
  const wildernessIndex = withLean('wilderness_index',
    0.25 * preserveOrParkIndex +
    0.22 * naturalFeatureIndex +
    0.15 * mountainTerrainIndex +
    0.15 * appealIndex +
    0.1 * distanceIndex +
    0.13 * undevelopedIndex
  )
  const residentialIndex = withLean('residential_index',
    0.45 * residentialImprovementIndex +
    0.25 * proximityIndex +
    0.15 * infrastructureSeed +
    0.05 * housingBuildingIndex +
    0.1 * yieldDensityIndex
  )
  const extractiveIndex = withLean('extractive_index',
    0.4 * extractiveImprovementIndex +
    0.26 * yields.production_index +
    0.19 * strategicResourceIndex +
    0.1 * resourceIndex +
    0.05 * railroadIndex
  )
  const leisureTourismIndex = withLean('leisure_tourism_index',
    0.35 * leisureTourismImprovementIndex +
    0.2 * appealIndex +
    0.15 * yields.culture_index +
    0.1 * yields.faith_index +
    0.1 * naturalFeatureIndex +
    0.1 * greatWorkDensityIndex
  )
  const civicMonumentIndex = withLean('civic_monument_index',
    0.35 * civicMonumentImprovementIndex +
    0.2 * residentialImprovementIndex +
    0.15 * monumentIndex +
    0.15 * yields.culture_index +
    0.15 * greatWorkDensityIndex
  )

  const urbanIndex = withLean('urban_index',
    0.25 * residentialImprovementIndex +
    0.19 * commercialOrDistrict +
    0.20 * infrastructureSeed +
    0.1 * proximityIndex +
    0.08 * yieldDensityIndex +
    0.08 * residentialIndex +
    0.10 * civicMonumentIndex
  )
  const ruralIndex = withLean('rural_index',
    0.25 * distanceIndex +
    0.22 * farmOrPlantation +
    0.18 * foodResourceIndex +
    0.12 * undevelopedIndex +
    0.1 * (1 - urbanIndex) +
    0.08 * wildernessIndex +
    0.05 * mountainIndex
  )
  const industrialIndex = withLean('industrial_index',
    0.30 * signal('industrial_zone') +
    0.12 * industryIndex +
    0.24 * yields.production_index +
    0.18 * extractiveIndex +
    0.04 * energyIndex +
    0.07 * railroadIndex +
    0.05 * strategicResourceIndex
  )
  const agrarianIndex = withLean('agrarian_index',
    0.33 * farmOrPlantation +
    0.23 * foodResourceIndex +
    0.18 * yields.food_index +
    0.10 * ruralIndex +
    0.09 * (county?.river ? farmOrPlantation : 0) +
    0.07 * infrastructureImprovementIndex
  )
  const militaryIndex = withLean('military_index',
    0.45 * signal('encampment') +
    0.25 * tierShare(tiers, 'military') +
    0.15 * signal('aerodrome') +
    0.1 * strategicResourceIndex +
    0.05 * distanceIndex
  )
  const intellectualIndex = withLean('intellectual_index',
    0.40 * signal('campus') +
    0.24 * yields.science_index +
    0.19 * tierShare(tiers, 'science') +
    0.09 * yields.culture_index +
    0.05 * diplomaticIndex +
    0.03 * appealIndex
  )
  const spiritualIndex = withLean('spiritual_index',
    0.32 * signal('holy_site') +
    0.18 * yields.faith_index +
    0.18 * tierShare(tiers, 'faith') +
    0.1 * preserveOrParkIndex +
    0.08 * appealIndex +
    0.07 * naturalFeatureIndex +
    0.07 * wildernessIndex
  )
  const commercialIndex = withLean('commercial_index',
    0.32 * signal('commercial_hub') +
    0.18 * tierShare(tiers, 'commerce') +
    0.17 * yields.gold_index +
    0.09 * signal('corporation') +
    0.07 * industryIndex +
    0.05 * diplomaticIndex +
    0.06 * infrastructureSeed +
    0.04 * maritimeIndex +
    0.02 * urbanIndex
  )
  const culturalEliteIndex = withLean('cultural_elite_index',
    0.35 * signal('theater') +
    0.25 * greatWorkDensityIndex +
    0.2 * yields.culture_index +
    0.1 * monumentIndex +
    0.1 * appealIndex
  )
  const workerIndex = withLean('worker_index',
    0.32 * industrialIndex +
    0.31 * yields.production_index +
    0.13 * extractiveIndex +
    0.16 * industryBuildingIndex +
    0.08 * maritimeIndex
  )
  const infrastructureIndex = withLean('infrastructure_index',
    0.37 * railroadIndex +
    0.20 * riverIndex +
    0.16 * (name ? 1 : 0) +
    0.10 * proximityIndex +
    0.10 * maritimeIndex +
    0.07 * infrastructureImprovementIndex
  )
  const localistIndex = withLean('localist_index',
    0.22 * distanceIndex +
    0.18 * num(provinceContext.minority_religion_share) * radiatingDecayMultiplier +
    0.17 * preserveOrParkIndex +
    0.13 * neighborhoodIndex +
    0.1 * (provinceContext.is_conquered ? 1 : 0) +
    0.1 * (1 - num(provinceContext.imperial_core_index)) +
    0.1 * wildernessIndex
  )
  const traditionalistIndex = withLean('traditionalist_index',
    0.27 * ruralIndex +
    0.18 * agrarianIndex +
    0.18 * militaryIndex +
    0.14 * num(provinceContext.state_religion_share) * radiatingDecayMultiplier +
    0.13 * (1 - urbanIndex) +
    0.1 * wildernessIndex
  )
  const restorationistIndex = withLean('restorationist_index',
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
  const culturalOutputIndex = withLean('cultural_output_index',
    0.4 * yields.culture_index +
    0.3 * signal('theater') +
    0.2 * norm(greatWorkCount, 6) +
    0.1 * (civicMonumentIndex > 0.5 ? 1 : 0)
  )

  // Calculate new shared feature indices
  const maritimeBasinName = detectMaritimeBasin(county)
  const maritimeBasinIndex = maritimeBasinName ? 1 : 0
  const riverName = detectRiver(county)
  const watershedIndex = riverName ? 1 : 0
  const rainforestIndex = signal('rainforest')
  const desertRegionIndex = signal('desert')
  const floodplainIndex = signal('floodplain')
  const protectedMarineIndex = signal('protected_marine')
  const energyResourceIndex = signal('energy_resource')
  const luxuryResourceIndex = signal('luxury_resource')
  const offshoreDevelopmentIndex = clamp01(
    0.4 * signal('offshore') +
    0.3 * waterTerrainIndex +
    0.24 * maritimeImprovementIndex +
    0.06 * harborBuildingIndex
  )
  const resourceClusterIndex = clamp01(
    0.5 * Math.max(energyResourceIndex, luxuryResourceIndex) +
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
