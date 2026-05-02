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
  const whiteDiasporaScore =
    PARTY_FLOORS.white +
    0.03 * f(province, 'commerce_index') +
    0.025 * f(province, 'localist_index') +
    0.015 * conqueredPenalty
  const purpleDiasporaScore =
    PARTY_FLOORS.purple +
    0.04 * f(province, 'spiritual_index') +
    0.035 * f(province, 'faith_index') +
    0.025 * f(province, 'minority_religion_share') +
    0.02 * f(province, 'restorationist_index')
  const whiteNaturalScore =
    PARTY_FLOORS.white +
    0.85 * americanIdentityIndex +
    0.2 * conqueredAmericanIndex +
    0.075 * f(province, 'commerce_index') +
    0.075 * f(province, 'localist_index')
  const purpleNaturalScore =
    PARTY_FLOORS.purple +
    0.475 * taoistShare +
    0.3 * f(province, 'restorationist_index') +
    0.225 * f(province, 'spiritual_index') +
    0.15 * f(province, 'faith_index') +
    0.125 * f(province, 'minority_religion_share') +
    0.125 * romanIdentityIndex
  const isAmericanBase = americanIdentityIndex >= 0.5
  const isLotusBase = romanIdentityIndex >= 0.5 || taoistShare >= 0.05

  return {
    yellow:
      0.1 +
      0.425 * f(province, 'imperial_core_index') +
      0.275 * f(province, 'cultural_elite_index') +
      0.225 * f(province, 'state_religion_share') +
      0.175 * f(province, 'science_index') +
      0.175 * f(province, 'culture_index') +
      0.15 * f(province, 'loyalty_index') +
      0.1 * f(province, 'infrastructure_index') -
      0.175 * conqueredPenalty -
      0.1 * f(province, 'localist_index'),

    orange:
      0.1 +
      0.35 * f(province, 'industrial_index') +
      0.275 * f(province, 'production_index') +
      0.225 * f(province, 'urbanization_index') +
      0.2 * f(province, 'worker_grievance_index') +
      0.125 * f(province, 'commerce_index') -
      0.075 * f(province, 'faith_index'),

    red:
      0.1 +
      0.35 * f(province, 'agrarian_index') +
      0.25 * f(province, 'military_index') +
      0.2 * f(province, 'rural_index') +
      0.175 * f(province, 'food_index') +
      0.15 * f(province, 'traditionalist_index') -
      0.1 * f(province, 'urbanization_index'),

    blue:
      0.1 +
      0.275 * f(province, 'intellectual_index') +
      0.25 * f(province, 'spiritual_index') +
      0.225 * f(province, 'commerce_index') +
      0.175 * f(province, 'appeal_index') +
      0.15 * f(province, 'minority_religion_share') +
      0.15 * f(province, 'localist_index') -
      0.075 * f(province, 'imperial_core_index'),

    white: isAmericanBase ? whiteNaturalScore : whiteDiasporaScore,

    purple: isLotusBase ? purpleNaturalScore : purpleDiasporaScore,
  }
}
