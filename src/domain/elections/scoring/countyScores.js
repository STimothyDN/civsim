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
  const maritimeIndex = f(county, 'maritime_index')
  const mountainIndex = f(county, 'mountain_index')
  const wildernessIndex = f(county, 'wilderness_index')
  const residentialIndex = f(county, 'residential_index')
  const extractiveIndex = f(county, 'extractive_index')
  const leisureTourismIndex = f(county, 'leisure_tourism_index')
  const civicMonumentIndex = f(county, 'civic_monument_index')
  const whiteDiasporaScore =
    PARTY_FLOORS.white -
    0.01 +
    0.03 * f(county, 'commercial_index') +
    0.022 * f(county, 'urban_index') +
    0.018 * localistIndex +
    0.013 * maritimeIndex +
    0.013 * wildernessIndex
  const purpleDiasporaScore =
    PARTY_FLOORS.purple +
    0.01 +
    0.055 * f(county, 'spiritual_index') +
    0.04 * f(county, 'faith_index') +
    0.03 * religiousMinorityIndex +
    0.025 * f(county, 'restorationist_index') +
    0.025 * wildernessIndex +
    0.015 * mountainIndex
  const whiteNaturalScore =
    PARTY_FLOORS.white -
    0.01 +
    0.65 * americanIdentityIndex +
    0.175 * conqueredAmericanIndex +
    0.09 * f(county, 'commercial_index') +
    0.065 * f(county, 'urban_index') +
    0.045 * localistIndex +
    0.03 * maritimeIndex +
    0.025 * wildernessIndex
  const purpleNaturalScore =
    PARTY_FLOORS.purple +
    0.015 +
    0.55 * taoistShare +
    0.35 * f(county, 'restorationist_index') +
    0.275 * f(county, 'spiritual_index') +
    0.18 * f(county, 'faith_index') +
    0.15 * religiousMinorityIndex +
    0.28 * romanIdentityIndex +
    0.04 * wildernessIndex +
    0.03 * mountainIndex
  const isAmericanBase = americanIdentityIndex >= 0.5
  const isLotusBase = romanIdentityIndex >= 0.5 || taoistShare >= 0.05

  return {
    yellow:
      PARTY_FLOORS.yellow -
      0.02 +
      0.25 * imperialCore +
      0.18 * f(county, 'cultural_elite_index') +
      0.13 * f(county, 'intellectual_index') +
      0.1 * f(county, 'infrastructure_index') +
      0.09 * f(county, 'improved_status_index') +
      0.08 * stateReligionShare +
      0.06 * f(county, 'religious_homogeneity_index') +
      0.05 * civicMonumentIndex +
      0.04 * residentialIndex +
      0.06 * loyaltyIndex -
      0.18 * conqueredPenalty -
      0.08 * localistIndex,

    orange:
      PARTY_FLOORS.orange +
      0.02 +
      0.37 * f(county, 'industrial_index') +
      0.3 * f(county, 'worker_index') +
      0.19 * f(county, 'urban_index') +
      0.16 * f(county, 'production_index') +
      0.13 * f(county, 'yield_diversity_index') +
      0.1 * f(county, 'mine_or_corporation_index') +
      0.09 * extractiveIndex +
      0.07 * maritimeIndex +
      0.1 * workerGrievanceIndex -
      0.08 * f(county, 'spiritual_index') -
      0.06 * imperialCore,

    red:
      PARTY_FLOORS.red +
      0.32 * f(county, 'agrarian_index') +
      0.22 * f(county, 'rural_index') +
      0.2 * f(county, 'military_index') +
      0.14 * f(county, 'food_index') +
      0.12 * f(county, 'traditionalist_index') +
      0.1 * f(county, 'isolation_index') +
      0.08 * wildernessIndex +
      0.05 * mountainIndex +
      0.04 * extractiveIndex +
      0.06 * inverseScienceCultureIndex -
      0.1 * f(county, 'urban_index'),

    blue:
      PARTY_FLOORS.blue +
      0.22 * f(county, 'intellectual_index') +
      0.2 * f(county, 'spiritual_index') +
      0.18 * f(county, 'neighborhood_index') +
      0.15 * f(county, 'appeal_index') +
      0.14 * f(county, 'commercial_middle_class_index') +
      0.12 * f(county, 'yield_diversity_index') +
      0.1 * f(county, 'cultural_output_index') +
      0.1 * f(county, 'culture_index') +
      0.08 * f(county, 'science_index') +
      0.08 * residentialIndex +
      0.06 * leisureTourismIndex +
      0.04 * maritimeIndex +
      0.1 * localistIndex -
      0.06 * imperialCore,

    white: isAmericanBase ? whiteNaturalScore : whiteDiasporaScore,

    purple: isLotusBase ? purpleNaturalScore : purpleDiasporaScore,
  }
}
