import { PARTY_FLOORS } from '../constants/parties'
import { clamp01, num } from '../normalization/numbers'

function f(unit, key) {
  return num(unit?.political_features?.[key])
}

export function calculateCountyPartyScores(county, province) {
  const provinceFeatures = province?.political_features || {}
  const imperialCore = num(provinceFeatures.imperial_core_index)
  const stateReligionShare = num(provinceFeatures.state_religion_share)
  const loyaltyIndex = num(provinceFeatures.loyalty_index)
  const conqueredPenalty = province?.is_conquered ? 1 : 0
  const localistIndex = f(county, 'localist_index')
  const workerGrievanceIndex = num(provinceFeatures.worker_grievance_index)
  const americanIdentityIndex = num(provinceFeatures.american_identity_index)
  const romanIdentityIndex = num(provinceFeatures.roman_identity_index)
  const taoistShare = num(provinceFeatures.taoist_share)
  const religiousMinorityIndex = num(provinceFeatures.minority_religion_share)
  const conqueredAmericanIndex = americanIdentityIndex && conqueredPenalty ? 1 : 0
  const inverseScienceCultureIndex = clamp01(1 - ((f(county, 'science_index') + f(county, 'culture_index')) / 2))
  const whiteDiasporaScore =
    PARTY_FLOORS.white +
    0.035 * f(county, 'commercial_index') +
    0.025 * f(county, 'urban_index') +
    0.02 * localistIndex
  const purpleDiasporaScore =
    PARTY_FLOORS.purple +
    0.05 * f(county, 'spiritual_index') +
    0.035 * f(county, 'faith_index') +
    0.025 * religiousMinorityIndex +
    0.02 * f(county, 'restorationist_index')
  const whiteNaturalScore =
    PARTY_FLOORS.white +
    0.7 * americanIdentityIndex +
    0.175 * conqueredAmericanIndex +
    0.1 * f(county, 'commercial_index') +
    0.075 * f(county, 'urban_index') +
    0.05 * localistIndex
  const purpleNaturalScore =
    PARTY_FLOORS.purple +
    0.5 * taoistShare +
    0.275 * f(county, 'restorationist_index') +
    0.225 * f(county, 'spiritual_index') +
    0.15 * f(county, 'faith_index') +
    0.125 * religiousMinorityIndex +
    0.1 * romanIdentityIndex
  const isAmericanBase = americanIdentityIndex >= 0.5
  const isLotusBase = romanIdentityIndex >= 0.5 || taoistShare >= 0.05

  return {
    yellow:
      PARTY_FLOORS.yellow +
      0.35 * imperialCore +
      0.25 * f(county, 'cultural_elite_index') +
      0.175 * f(county, 'intellectual_index') +
      0.15 * f(county, 'infrastructure_index') +
      0.125 * stateReligionShare +
      0.1 * loyaltyIndex -
      0.15 * conqueredPenalty -
      0.1 * localistIndex,

    orange:
      PARTY_FLOORS.orange +
      0.4 * f(county, 'industrial_index') +
      0.3 * f(county, 'worker_index') +
      0.2 * f(county, 'urban_index') +
      0.2 * f(county, 'production_index') +
      0.125 * f(county, 'mine_or_corporation_index') +
      0.1 * workerGrievanceIndex -
      0.1 * f(county, 'spiritual_index') -
      0.075 * imperialCore,

    red:
      PARTY_FLOORS.red +
      0.375 * f(county, 'agrarian_index') +
      0.275 * f(county, 'rural_index') +
      0.25 * f(county, 'military_index') +
      0.175 * f(county, 'food_index') +
      0.15 * f(county, 'traditionalist_index') +
      0.075 * inverseScienceCultureIndex -
      0.125 * f(county, 'urban_index'),

    blue:
      PARTY_FLOORS.blue +
      0.275 * f(county, 'intellectual_index') +
      0.25 * f(county, 'spiritual_index') +
      0.225 * f(county, 'neighborhood_index') +
      0.2 * f(county, 'appeal_index') +
      0.175 * f(county, 'commercial_middle_class_index') +
      0.125 * f(county, 'culture_index') +
      0.125 * f(county, 'science_index') +
      0.125 * localistIndex -
      0.075 * imperialCore,

    white: isAmericanBase ? whiteNaturalScore : whiteDiasporaScore,

    purple: isLotusBase ? purpleNaturalScore : purpleDiasporaScore,
  }
}
