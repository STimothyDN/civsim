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
  Mine: 1.25,
  Corporation: 1.25,
  'Wind Farm': 1.1,
  'National Park': 0.85,
  Preserve: 0.85,
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

function improvementMultiplier(county) {
  const name = String(county?.improvement?.name || '').trim()
  if (IMPROVEMENT_POP_MULTIPLIERS[name] !== undefined) return IMPROVEMENT_POP_MULTIPLIERS[name]
  if (String(county?.terrain || '').includes('Mountain')) return 0.45
  return 0.75
}

export function countyPopulationWeight(county) {
  const distance = Math.max(0, num(county?.distance_from_center))
  const distanceMultiplier = 1 / (1 + 0.28 * distance)
  const citizenMultiplier = 1 + 0.35 * Math.max(0, num(county?.citizens_working))
  const infrastructureMultiplier = 1 + (county?.has_railroad ? 0.15 : 0) + (county?.river ? 0.1 : 0)
  const yields = county?.yields || {}
  const yieldMultiplier =
    1 +
    0.015 * num(yields.food) +
    0.02 * num(yields.production) +
    0.01 * num(yields.gold) +
    0.01 * num(yields.culture) +
    0.01 * num(yields.science) +
    0.01 * num(yields.faith)

  return Math.max(
    0.0001,
    distanceMultiplier * improvementMultiplier(county) * citizenMultiplier * infrastructureMultiplier * yieldMultiplier
  )
}

export function allocateCountyPopulations(province, provincialPopulation) {
  const provincePopulation = Math.max(0, Math.round(num(provincialPopulation)))
  const sourceCounties = Array.isArray(province?.counties) && province.counties.length
    ? province.counties
    : [{ name: '', tile_id: 'tile_1', improvement: { name: '', buildings: {}, great_works: {} }, features: {}, yields: {} }]
  const counties = sourceCounties.map(cloneCounty)

  if (counties.length === 1) {
    return counties.map((county) => ({
      ...county,
      county_population: provincePopulation,
      county_population_share: provincePopulation > 0 ? 1 : 0,
      population_weight: 1,
    }))
  }

  const weights = counties.map(countyPopulationWeight)
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

