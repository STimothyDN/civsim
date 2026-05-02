import { PARTY_FLOORS } from '../constants/parties'
import { num } from '../normalization/numbers'

function f(features, key) {
  return num(features?.[key])
}

export function calculateNationalPartyScores(nationalFeatures) {
  return {
    yellow:
      0.1 +
      0.375 * f(nationalFeatures, 'imperial_core_index') +
      0.275 * f(nationalFeatures, 'culture_index') +
      0.225 * f(nationalFeatures, 'science_index') +
      0.175 * f(nationalFeatures, 'state_religion_share') +
      0.08 * f(nationalFeatures, 'civic_monument_index') +
      0.04 * f(nationalFeatures, 'residential_index') +
      0.15 * f(nationalFeatures, 'loyalty_index'),

    orange:
      0.1 +
      0.35 * f(nationalFeatures, 'industrial_index') +
      0.25 * f(nationalFeatures, 'production_index') +
      0.225 * f(nationalFeatures, 'urbanization_index') +
      0.175 * f(nationalFeatures, 'worker_grievance_index') +
      0.08 * f(nationalFeatures, 'extractive_index') +
      0.05 * f(nationalFeatures, 'maritime_index'),

    red:
      0.1 +
      0.35 * f(nationalFeatures, 'agrarian_index') +
      0.25 * f(nationalFeatures, 'military_index') +
      0.2 * f(nationalFeatures, 'rural_index') +
      0.15 * f(nationalFeatures, 'food_index') +
      0.125 * f(nationalFeatures, 'traditionalist_index') +
      0.08 * f(nationalFeatures, 'wilderness_index') +
      0.04 * f(nationalFeatures, 'mountain_index'),

    blue:
      0.1 +
      0.275 * f(nationalFeatures, 'intellectual_index') +
      0.25 * f(nationalFeatures, 'spiritual_index') +
      0.2 * f(nationalFeatures, 'commerce_index') +
      0.175 * f(nationalFeatures, 'localist_index') +
      0.15 * f(nationalFeatures, 'minority_religion_share') +
      0.07 * f(nationalFeatures, 'residential_index') +
      0.06 * f(nationalFeatures, 'leisure_tourism_index') +
      0.04 * f(nationalFeatures, 'maritime_index'),

    white:
      PARTY_FLOORS.white +
      0.85 * f(nationalFeatures, 'american_identity_index') +
      0.1 * f(nationalFeatures, 'localist_index') +
      0.035 * f(nationalFeatures, 'maritime_index') +
      0.025 * f(nationalFeatures, 'wilderness_index'),

    purple:
      PARTY_FLOORS.purple +
      0.425 * f(nationalFeatures, 'taoist_share') +
      0.3 * f(nationalFeatures, 'restorationist_index') +
      0.2 * f(nationalFeatures, 'spiritual_index') +
      0.125 * f(nationalFeatures, 'roman_identity_index') +
      0.035 * f(nationalFeatures, 'wilderness_index') +
      0.025 * f(nationalFeatures, 'mountain_index'),
  }
}
