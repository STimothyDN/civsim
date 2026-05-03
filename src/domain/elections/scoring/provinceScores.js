import { PARTY_FLOORS } from '../constants/parties'
import { num } from '../normalization/numbers'

function f(province, key) {
  return num(province?.political_features?.[key])
}

export function calculateProvincePartyScores(province) {
  const conqueredPenalty = province?.is_conquered ? 1 : 0
  const americanIdentityIndex = f(province, 'american_identity_index')
  const conqueredAmericanIndex = americanIdentityIndex && conqueredPenalty ? 1 : 0
  const romanIdentityIndex = f(province, 'roman_identity_index')
  const taoistShare = f(province, 'taoist_share')
  const maritimeIndex = f(province, 'maritime_index')
  const mountainIndex = f(province, 'mountain_index')
  const wildernessIndex = f(province, 'wilderness_index')
  const residentialIndex = f(province, 'residential_index')
  const extractiveIndex = f(province, 'extractive_index')
  const leisureTourismIndex = f(province, 'leisure_tourism_index')
  const civicMonumentIndex = f(province, 'civic_monument_index')
  const foreignOriginIndex = f(province, 'foreign_origin_index')
  const frontierIndex = f(province, 'frontier_index')
  const connectednessIndex = f(province, 'connectedness_index')
  const whiteDiasporaScore =
    PARTY_FLOORS.white -
    0.01 +
    0.025 * f(province, 'commerce_index') +
    0.02 * f(province, 'localist_index') +
    0.015 * conqueredPenalty +
    0.015 * maritimeIndex +
    0.015 * wildernessIndex +
    0.025 * foreignOriginIndex +
    0.02 * frontierIndex
  const purpleDiasporaScore =
    PARTY_FLOORS.purple +
    0.01 +
    0.045 * f(province, 'spiritual_index') +
    0.04 * f(province, 'faith_index') +
    0.03 * f(province, 'minority_religion_share') +
    0.025 * f(province, 'restorationist_index') +
    0.025 * wildernessIndex +
    0.015 * mountainIndex +
    0.02 * foreignOriginIndex
  const whiteNaturalScore =
    PARTY_FLOORS.white -
    0.01 +
    0.8 * americanIdentityIndex +
    0.2 * conqueredAmericanIndex +
    0.07 * f(province, 'commerce_index') +
    0.07 * f(province, 'localist_index') +
    0.03 * maritimeIndex +
    0.025 * wildernessIndex
  const purpleNaturalScore =
    PARTY_FLOORS.purple +
    0.015 +
    0.5 * taoistShare +
    0.35 * f(province, 'restorationist_index') +
    0.25 * f(province, 'spiritual_index') +
    0.18 * f(province, 'faith_index') +
    0.15 * f(province, 'minority_religion_share') +
    0.25 * romanIdentityIndex +
    0.04 * wildernessIndex +
    0.03 * mountainIndex
  const isAmericanBase = americanIdentityIndex >= 0.5
  const isLotusBase = romanIdentityIndex >= 0.5 || taoistShare >= 0.05

  return {
    yellow:
      0.075 +
      0.32 * f(province, 'imperial_core_index') +
      0.22 * f(province, 'cultural_elite_index') +
      0.17 * f(province, 'state_religion_share') +
      0.13 * f(province, 'science_index') +
      0.13 * f(province, 'culture_index') +
      0.09 * f(province, 'development_index') +
      0.08 * f(province, 'provincial_power_index') +
      0.1 * f(province, 'loyalty_index') +
      0.06 * f(province, 'religious_homogeneity_index') +
      0.06 * civicMonumentIndex +
      0.04 * residentialIndex +
      0.05 * connectednessIndex -
      0.2 * conqueredPenalty -
      0.1 * f(province, 'localist_index') -
      0.08 * foreignOriginIndex -
      0.04 * frontierIndex,

    orange:
      0.105 +
      0.34 * f(province, 'industrial_index') +
      0.24 * f(province, 'production_index') +
      0.19 * f(province, 'urbanization_index') +
      0.16 * f(province, 'worker_grievance_index') +
      0.13 * f(province, 'economic_diversity_index') +
      0.09 * extractiveIndex +
      0.06 * maritimeIndex +
      0.1 * f(province, 'commerce_index') -
      0.06 * f(province, 'faith_index'),

    red:
      0.1 +
      0.3 * f(province, 'agrarian_index') +
      0.22 * f(province, 'military_index') +
      0.18 * f(province, 'rural_index') +
      0.14 * f(province, 'food_index') +
      0.12 * f(province, 'traditionalist_index') +
      0.1 * f(province, 'isolation_index') +
      0.08 * wildernessIndex +
      0.04 * mountainIndex -
      0.08 * f(province, 'urbanization_index'),

    blue:
      0.1 +
      0.25 * f(province, 'intellectual_index') +
      0.2 * f(province, 'spiritual_index') +
      0.18 * f(province, 'commerce_index') +
      0.14 * f(province, 'appeal_index') +
      0.12 * f(province, 'minority_religion_share') +
      0.12 * f(province, 'economic_diversity_index') +
      0.1 * f(province, 'localist_index') +
      0.08 * f(province, 'cultural_output_index') +
      0.06 * residentialIndex +
      0.05 * leisureTourismIndex +
      0.04 * maritimeIndex -
      0.06 * f(province, 'imperial_core_index') +
      0.06 * foreignOriginIndex +
      0.04 * frontierIndex,

    white: isAmericanBase ? whiteNaturalScore : whiteDiasporaScore,

    purple: isLotusBase ? purpleNaturalScore : purpleDiasporaScore,
  }
}
