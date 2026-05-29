import { num } from '../normalization/numbers'

export const IMPROVEMENT_POP_MULTIPLIERS = {
  'City Center': 3,
  Neighborhood: 2.4,
  'Commercial Hub': 2.2,
  'Industrial Zone': 2,
  Campus: 1.9,
  'Holy Site': 1.8,
  'Theater Square': 1.8,
  'Entertainment Complex': 1.7,
  Encampment: 1.6,
  Aqueduct: 1.4,
  Farm: 1.25,
  Plantation: 1.25,
  Pasture: 1.25,
  Mine: 1.25,
  Corporation: 1.25,
  'Wind Farm': 1.1,
  'National Park': 0.85,
  Preserve: 0.85,
  Biosphere: 0.85,
}

const AMBIENT_POPULATION_BLOCKED_TERRAINS = ['Ocean', 'Coast', 'Mountain']
const WATER_TERRAINS = ['Ocean', 'Coast', 'Lake']
const WATER_POPULATION_MULTIPLIER = 0.3

const DISTANCE_DECAY_COEFFICIENT = 0.22
const CONCENTRATION_EXPONENT = 1.5
const CITIZEN_WEIGHT = 0.35
const APPEAL_WEIGHT = 0.06
const APPEAL_MIN = -3
const APPEAL_MAX = 5

const TERRAIN_BASE_MULTIPLIERS = [
  { match: 'Snow', value: 0.2 },
  { match: 'Desert', value: 0.4 },
  { match: 'Tundra (Hills)', value: 0.45 },
  { match: 'Tundra', value: 0.5 },
  { match: 'Grassland (Hills)', value: 0.75 },
  { match: 'Plains (Hills)', value: 0.75 },
  { match: 'Grassland', value: 1 },
  { match: 'Plains', value: 1 },
  { match: 'Lake', value: 0.55 },
]

const FEATURE_MULTIPLIERS = [
  { match: 'Floodplains', value: 1.4 },
  { match: 'Volcanic Soil', value: 1.25 },
  { match: 'Oasis', value: 1.3 },
  { match: 'Marsh', value: 0.7 },
  { match: 'Rainforest', value: 0.65 },
  { match: 'Woods', value: 0.9 },
  { match: 'Reef', value: 0.85 },
]

const HOUSING_BUILDING_BONUSES = {
  Sewer: 0.25,
  Aqueduct: 0.2,
  Neighborhood: 0.3,
  'Water Mill': 0.1,
  Granary: 0.1,
  'Flood Barrier': 0.15,
}

const YIELD_COEFFICIENTS = {
  food: 0.03,
  production: 0.015,
  gold: 0.008,
  culture: 0.008,
  science: 0.008,
  faith: 0.008,
}

function isWaterCounty(county) {
  const terrain = terrainName(county)
  return WATER_TERRAINS.some((waterTerrain) => terrain.includes(waterTerrain))
}

function terrainBaseMultiplier(county) {
  const terrain = terrainName(county)
  for (const entry of TERRAIN_BASE_MULTIPLIERS) {
    if (terrain.includes(entry.match)) return entry.value
  }
  return 0.75
}

function featureMultiplier(county) {
  const features = county?.features || {}
  let multiplier = 1
  for (const featureKey of Object.keys(features)) {
    if (!features[featureKey]) continue
    for (const entry of FEATURE_MULTIPLIERS) {
      if (featureKey.includes(entry.match)) {
        multiplier *= entry.value
        break
      }
    }
  }
  return multiplier
}

function housingBuildingBonus(county) {
  const buildings = county?.improvement?.buildings || {}
  let bonus = 0
  for (const [name, value] of Object.entries(HOUSING_BUILDING_BONUSES)) {
    if (buildings[name]) bonus += value
  }
  return bonus
}

function cloneCounty(county, index) {
  return {
    ...(county || {}),
    name: county?.name || '',
    tile_id: county?.tile_id || `tile_${index + 1}`,
    features: county?.features || {},
    improvement: {
      name: county?.improvement?.name || '',
      buildings: county?.improvement?.buildings || {},
      great_works: county?.improvement?.great_works || {},
    },
    yields: county?.yields || {},
  }
}

function terrainName(county) {
  return String(county?.terrain || '')
}

function hasImprovement(county) {
  return String(county?.improvement?.name || '').trim().length > 0
}

export function countyAllowsAmbientPopulation(county) {
  if (Math.max(0, num(county?.citizens_working)) > 0) return true
  if (hasImprovement(county)) return true
  const terrain = terrainName(county)
  return !AMBIENT_POPULATION_BLOCKED_TERRAINS.some((blockedTerrain) => terrain.includes(blockedTerrain))
}

function improvementMultiplier(county) {
  const name = String(county?.improvement?.name || '').trim()
  if (IMPROVEMENT_POP_MULTIPLIERS[name] !== undefined) return IMPROVEMENT_POP_MULTIPLIERS[name]
  if (hasImprovement(county)) return 1
  if (terrainName(county).includes('Mountain')) return 0.45
  return terrainBaseMultiplier(county)
}

function rawCountyPopulationWeight(county) {
  const distance = Math.max(0, num(county?.distance_from_center))
  const distanceMultiplier = 1 / (1 + DISTANCE_DECAY_COEFFICIENT * distance)
  const citizens = Math.max(0, num(county?.citizens_working))
  const citizenMultiplier = 1 + CITIZEN_WEIGHT * Math.sqrt(citizens)
  const infrastructureMultiplier =
    1 +
    (county?.has_railroad ? 0.15 : 0) +
    (county?.river ? 0.1 : 0) +
    housingBuildingBonus(county)
  const yields = county?.yields || {}
  const yieldMultiplier =
    1 +
    YIELD_COEFFICIENTS.food * num(yields.food) +
    YIELD_COEFFICIENTS.production * num(yields.production) +
    YIELD_COEFFICIENTS.gold * num(yields.gold) +
    YIELD_COEFFICIENTS.culture * num(yields.culture) +
    YIELD_COEFFICIENTS.science * num(yields.science) +
    YIELD_COEFFICIENTS.faith * num(yields.faith)

  const appealValue = Math.max(APPEAL_MIN, Math.min(APPEAL_MAX, num(county?.appeal)))
  const appealMultiplier = 1 + APPEAL_WEIGHT * appealValue

  const waterMultiplier = isWaterCounty(county) && !hasImprovement(county) ? WATER_POPULATION_MULTIPLIER : 1

  const rawWeight =
    distanceMultiplier *
    improvementMultiplier(county) *
    citizenMultiplier *
    infrastructureMultiplier *
    yieldMultiplier *
    featureMultiplier(county) *
    appealMultiplier *
    waterMultiplier

  return Math.max(0.0001, Math.pow(Math.max(0, rawWeight), CONCENTRATION_EXPONENT))
}

export function countyPopulationWeight(county) {
  return countyAllowsAmbientPopulation(county) ? rawCountyPopulationWeight(county) : 0
}

export function allocateCountyPopulations(province, provincialPopulation) {
  const provincePopulation = Math.max(0, Math.round(num(provincialPopulation)))
  const sourceCounties = Array.isArray(province?.counties) && province.counties.length
    ? province.counties
    : [{ name: '', tile_id: 'tile_1', improvement: { name: '', buildings: {}, great_works: {} }, features: {}, yields: {} }]
  const counties = sourceCounties.map(cloneCounty)

  const eligibilityWeights = counties.map(countyPopulationWeight)
  const totalEligibilityWeight = eligibilityWeights.reduce((sum, weight) => sum + weight, 0)
  const weights = totalEligibilityWeight > 0 ? eligibilityWeights : counties.map(rawCountyPopulationWeight)

  if (counties.length === 1) {
    return counties.map((county) => ({
      ...county,
      county_population: provincePopulation,
      county_population_share: provincePopulation > 0 ? 1 : 0,
      population_weight: weights[0] || 1,
    }))
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || counties.length
  const allocations = counties.map((county, index) => {
    const rawPopulation = provincePopulation * weights[index] / totalWeight
    const floorPopulation = Math.floor(rawPopulation)
    return {
      county,
      index,
      population: floorPopulation,
      remainder: rawPopulation - floorPopulation,
      weight: weights[index],
    }
  })

  let missingPeople = provincePopulation - allocations.reduce((sum, allocation) => sum + allocation.population, 0)
  const byRemainder = [...allocations].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder
    return String(a.county.tile_id).localeCompare(String(b.county.tile_id))
  })

  for (let i = 0; i < byRemainder.length && missingPeople > 0; i += 1) {
    byRemainder[i].population += 1
    missingPeople -= 1
  }

  return allocations
    .sort((a, b) => a.index - b.index)
    .map(({ county, population, weight }) => ({
      ...county,
      county_population: population,
      county_population_share: provincePopulation > 0 ? population / provincePopulation : 0,
      population_weight: weight,
    }))
}
