import { PARTY_FLOORS } from '../constants/parties'
import { num } from '../normalization/numbers'

function f(features, key) {
  return num(features?.[key])
}

export function calculateNationalPartyScores(nationalFeatures) {
  return {
    yellow:
      0.055 +
      0.2 * f(nationalFeatures, 'imperial_core_index') +
      0.18 * f(nationalFeatures, 'culture_index') +
      0.14 * f(nationalFeatures, 'science_index') +
      0.1 * f(nationalFeatures, 'state_religion_share') +
      0.08 * f(nationalFeatures, 'development_index') +
      0.07 * f(nationalFeatures, 'provincial_power_index') +
      0.05 * f(nationalFeatures, 'religious_homogeneity_index') +
      0.04 * f(nationalFeatures, 'civic_monument_index') +
      0.03 * f(nationalFeatures, 'residential_index') +
      0.08 * f(nationalFeatures, 'loyalty_index'),

    orange:
      0.12 +
      0.32 * f(nationalFeatures, 'industrial_index') +
      0.24 * f(nationalFeatures, 'production_index') +
      0.19 * f(nationalFeatures, 'urbanization_index') +
      0.16 * f(nationalFeatures, 'worker_grievance_index') +
      0.13 * f(nationalFeatures, 'economic_diversity_index') +
      0.09 * f(nationalFeatures, 'extractive_index') +
      0.07 * f(nationalFeatures, 'maritime_index') +
      0.06 * f(nationalFeatures, 'improved_status_index'),

    red:
      0.1 +
      0.32 * f(nationalFeatures, 'agrarian_index') +
      0.22 * f(nationalFeatures, 'military_index') +
      0.18 * f(nationalFeatures, 'rural_index') +
      0.14 * f(nationalFeatures, 'food_index') +
      0.12 * f(nationalFeatures, 'traditionalist_index') +
      0.1 * f(nationalFeatures, 'isolation_index') +
      0.08 * f(nationalFeatures, 'wilderness_index') +
      0.04 * f(nationalFeatures, 'mountain_index'),

    blue:
      0.11 +
      0.25 * f(nationalFeatures, 'intellectual_index') +
      0.2 * f(nationalFeatures, 'spiritual_index') +
      0.18 * f(nationalFeatures, 'commerce_index') +
      0.15 * f(nationalFeatures, 'localist_index') +
      0.12 * f(nationalFeatures, 'minority_religion_share') +
      0.1 * f(nationalFeatures, 'economic_diversity_index') +
      0.08 * f(nationalFeatures, 'cultural_output_index') +
      0.06 * f(nationalFeatures, 'residential_index') +
      0.05 * f(nationalFeatures, 'leisure_tourism_index') +
      0.04 * f(nationalFeatures, 'maritime_index'),

    white:
      PARTY_FLOORS.white -
      0.005 +
      0.28 * f(nationalFeatures, 'american_identity_index') +
      0.03 * f(nationalFeatures, 'localist_index') +
      0.01 * f(nationalFeatures, 'maritime_index') +
      0.008 * f(nationalFeatures, 'wilderness_index'),

    purple:
      PARTY_FLOORS.purple +
      0.003 +
      0.22 * f(nationalFeatures, 'taoist_share') +
      0.16 * f(nationalFeatures, 'restorationist_index') +
      0.1 * f(nationalFeatures, 'spiritual_index') +
      0.1 * f(nationalFeatures, 'roman_identity_index') +
      0.018 * f(nationalFeatures, 'wilderness_index') +
      0.015 * f(nationalFeatures, 'mountain_index'),
  }
}
