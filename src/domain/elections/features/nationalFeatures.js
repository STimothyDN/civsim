import { clamp01, num } from '../normalization/numbers'
import { FEATURE_KEYS } from './featureCatalog'

/** National features: every model feature, weighted by provincial population. */
export function calculateNationalFeatures(provinces = []) {
  const nationalPopulation = provinces.reduce((sum, province) => sum + num(province.provincial_population), 0)

  const features = FEATURE_KEYS.reduce((result, featureName) => {
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
