import { PARTY_FLOORS } from '../constants/parties'
import { num } from '../normalization/numbers'

function f(province, key) {
  return num(province?.political_features?.[key])
}

function hasNationalPark(province) {
  return (province?.improvements || []).some(imp =>
    String(imp?.name || '').toLowerCase().includes('park') ||
    String(imp?.type || '').toLowerCase().includes('park')
  ) ? 1 : 0
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
  const sameContinentIndex = f(province, 'same_continent_index')
  const crossContinentalIndex = 1 - sameContinentIndex
  const whiteDiasporaScore =
    PARTY_FLOORS.white -
    0.005 +
    0.025 * f(province, 'commerce_index') +
    0.02 * f(province, 'localist_index') +
    0.025 * f(province, 'urbanization_index') +
    0.02 * f(province, 'connectedness_index') +
    0.015 * conqueredPenalty +
    0.015 * maritimeIndex +
    0.015 * wildernessIndex +
    0.025 * foreignOriginIndex +
    0.02 * frontierIndex +
    0.02 * crossContinentalIndex
  const purpleDiasporaScore =
    PARTY_FLOORS.purple +
    0.005 +
    0.045 * f(province, 'spiritual_index') +
    0.04 * f(province, 'faith_index') +
    0.03 * f(province, 'minority_religion_share') +
    0.025 * f(province, 'urbanization_index') +
    0.02 * f(province, 'connectedness_index') +
    0.025 * f(province, 'restorationist_index') +
    0.025 * wildernessIndex +
    0.015 * mountainIndex +
    0.02 * foreignOriginIndex
  const whiteNaturalScore =
    PARTY_FLOORS.white -
    0.005 +
    0.28 * americanIdentityIndex +
    0.07 * conqueredAmericanIndex +
    0.025 * f(province, 'commerce_index') +
    0.025 * f(province, 'localist_index') +
    0.012 * maritimeIndex +
    0.01 * wildernessIndex
  const purpleNaturalScore =
    PARTY_FLOORS.purple +
    0.003 +
    0.26 * taoistShare +
    0.18 * f(province, 'restorationist_index') +
    0.13 * f(province, 'spiritual_index') +
    0.09 * f(province, 'faith_index') +
    0.08 * f(province, 'minority_religion_share') +
    0.13 * romanIdentityIndex +
    0.02 * wildernessIndex +
    0.015 * mountainIndex
  const isAmericanBase = americanIdentityIndex >= 0.5
  const isLotusBase = romanIdentityIndex >= 0.5 || taoistShare >= 0.05

  return {
    yellow:
      0.056 +
      0.235 * f(province, 'imperial_core_index') +
      0.165 * f(province, 'cultural_elite_index') +
      0.125 * f(province, 'state_religion_share') +
      0.10 * f(province, 'science_index') +
      0.10 * f(province, 'culture_index') +
      0.08 * f(province, 'development_index') +
      0.07 * f(province, 'provincial_power_index') +
      0.08 * f(province, 'loyalty_index') +
      0.05 * f(province, 'religious_homogeneity_index') +
      0.05 * civicMonumentIndex +
      0.03 * residentialIndex +
      0.04 * connectednessIndex +
      0.04 * sameContinentIndex -
      0.215 * conqueredPenalty -
      0.11 * f(province, 'localist_index') -
      0.09 * foreignOriginIndex -
      0.05 * frontierIndex,

    orange:
      0.12 +
      0.36 * f(province, 'industrial_index') +
      0.26 * f(province, 'production_index') +
      0.21 * f(province, 'urbanization_index') +
      0.18 * f(province, 'worker_grievance_index') +
      0.14 * f(province, 'economic_diversity_index') +
      0.1 * extractiveIndex +
      0.07 * maritimeIndex +
      0.11 * f(province, 'commerce_index') -
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
      0.04 * mountainIndex +
      0.02 * crossContinentalIndex -
      0.08 * f(province, 'urbanization_index'),

    blue:
      0.11 +
      0.27 * f(province, 'intellectual_index') +
      0.22 * f(province, 'spiritual_index') +
      0.2 * f(province, 'commerce_index') +
      0.16 * f(province, 'appeal_index') +
      0.13 * f(province, 'minority_religion_share') +
      0.13 * f(province, 'economic_diversity_index') +
      0.07 * f(province, 'localist_index') +
      0.09 * f(province, 'cultural_output_index') +
      0.07 * residentialIndex +
      0.06 * leisureTourismIndex +
      0.05 * maritimeIndex -
      0.06 * f(province, 'imperial_core_index') +
      0.06 * foreignOriginIndex +
      0.04 * frontierIndex,

    white: isAmericanBase ? whiteNaturalScore : whiteDiasporaScore,

    purple: isLotusBase ? purpleNaturalScore : purpleDiasporaScore,

    green:
      PARTY_FLOORS.green +
      0.015 +
      0.12 * f(province, 'appeal_index') +
      0.09 * f(province, 'wilderness_index') +
      0.09 * f(province, 'rainforest_index') +
      0.06 * f(province, 'mountain_index') +
      0.05 * f(province, 'coastal_index') +
      0.08 * f(province, 'leisure_tourism_index') +
      0.06 * f(province, 'protected_marine_index') +
      0.04 * f(province, 'maritime_index') +
      0.04 * f(province, 'offshore_development_index') +
      0.03 * hasNationalPark(province) +
      0.03 * crossContinentalIndex -
      0.04 * f(province, 'industrial_index') -
      0.03 * f(province, 'urbanization_index') -
      0.02 * f(province, 'pollution_index'),
  }
}
