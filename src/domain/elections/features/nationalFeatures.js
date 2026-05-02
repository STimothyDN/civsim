import { clamp01, num } from '../normalization/numbers'

export function calculateNationalFeatures(provinces = []) {
  const nationalPopulation = provinces.reduce((sum, province) => sum + num(province.provincial_population), 0)
  const featureNames = [
    'state_religion_share',
    'minority_religion_share',
    'taoist_share',
    'american_identity_index',
    'roman_identity_index',
    'imperial_core_index',
    'urbanization_index',
    'rural_index',
    'industrial_index',
    'agrarian_index',
    'military_index',
    'intellectual_index',
    'spiritual_index',
    'commerce_index',
    'cultural_elite_index',
    'worker_grievance_index',
    'localist_index',
    'traditionalist_index',
    'restorationist_index',
    'loyalty_index',
    'happiness_index',
    'growth_index',
    'amenity_index',
    'food_index',
    'production_index',
    'gold_index',
    'culture_index',
    'science_index',
    'faith_index',
  ]

  const features = featureNames.reduce((result, featureName) => {
    if (nationalPopulation <= 0) {
      result[featureName] = provinces.length
        ? clamp01(provinces.reduce((sum, province) => sum + num(province.political_features?.[featureName]), 0) / provinces.length)
        : 0
      return result
    }

    result[featureName] = clamp01(provinces.reduce((sum, province) => {
      return sum + num(province.provincial_population) * num(province.political_features?.[featureName])
    }, 0) / nationalPopulation)
    return result
  }, {})

  return {
    ...features,
    national_population: nationalPopulation,
  }
}

