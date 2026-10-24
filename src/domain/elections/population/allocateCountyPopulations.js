import { num } from '../normalization/numbers'
import {
  DEFAULT_TERRAIN_POPULATION,
  matchFeaturePatterns,
  resolveBuilding,
  resolveFeature,
  resolveImprovement,
  resolveTerrain,
} from '../../civ6'

// Terrain, feature, improvement and housing multipliers come from the Civ 6
// catalog (src/domain/civ6): each entry's `population`, and each building's
// `housing`.
const WATER_POPULATION_MULTIPLIER = 0.3

const DISTANCE_DECAY_COEFFICIENT = 0.22
const CONCENTRATION_EXPONENT = 1.5
const CITIZEN_WEIGHT = 0.35
const APPEAL_WEIGHT = 0.06
const APPEAL_MIN = -3
const APPEAL_MAX = 5

const YIELD_COEFFICIENTS = {
  food: 0.03,
  production: 0.015,
  gold: 0.008,
  culture: 0.008,
  science: 0.008,
  faith: 0.008,
}

function isWaterCounty(county) {
  return Boolean(resolveTerrain(county?.terrain)?.water)
}

function terrainBaseMultiplier(county) {
  return resolveTerrain(county?.terrain)?.population ?? DEFAULT_TERRAIN_POPULATION
}

function featurePopulation(featureKey) {
  const entry = resolveFeature(featureKey)
  if (entry) return entry.population ?? 1
  const pattern = matchFeaturePatterns(featureKey).find((match) => match.population !== undefined)
  return pattern ? pattern.population : 1
}

function featureMultiplier(county) {
  const features = county?.features || {}
  let multiplier = 1
  for (const featureKey of Object.keys(features)) {
    if (!features[featureKey]) continue
    multiplier *= featurePopulation(featureKey)
  }
  return multiplier
}

function housingBuildingBonus(county) {
  const buildings = county?.improvement?.buildings || {}
  let bonus = 0
  for (const [name, built] of Object.entries(buildings)) {
    if (built) bonus += resolveBuilding(name)?.housing || 0
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

function hasImprovement(county) {
  return String(county?.improvement?.name || '').trim().length > 0
}

export function countyAllowsAmbientPopulation(county) {
  if (Math.max(0, num(county?.citizens_working)) > 0) return true
  if (hasImprovement(county)) return true
  return !resolveTerrain(county?.terrain)?.blocksAmbientPopulation
}

function improvementMultiplier(county) {
  if (hasImprovement(county)) return resolveImprovement(county.improvement.name)?.population ?? 1
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
