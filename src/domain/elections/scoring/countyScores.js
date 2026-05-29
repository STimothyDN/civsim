import { DEFAULT_PARTIES } from '../constants/defaultParties'
import { DEFAULT_VOTER_BLOCS } from '../constants/defaultVoterBlocs'
import { scoreUnit } from './scoreUnit'
import { applyVoterBlocs } from '../features/voterBlocs'
import { clamp01, num } from '../normalization/numbers'

// Province-context features inherited into the county feature vector (the
// original engine read these straight off province.political_features).
const INHERITED_PROVINCE_FEATURES = [
  'imperial_core_index',
  'state_religion_share',
  'loyalty_index',
  'worker_grievance_index',
]

/**
 * Build the county scoring vector: the county's own political features plus a
 * few inherited province-context signals and two derived indices.
 */
export function buildCountyFeatureVector(county, province) {
  const cf = county?.political_features || {}
  const pf = province?.political_features || {}
  const vector = { ...cf }
  for (const key of INHERITED_PROVINCE_FEATURES) vector[key] = num(pf[key])
  vector.conquered_index = province?.is_conquered ? 1 : 0
  vector.inverse_science_culture_index = clamp01(
    1 - ((num(cf.science_index) + num(cf.culture_index)) / 2)
  )
  return vector
}

export function calculateCountyPartyScores(county, province, options = {}) {
  const parties = options.parties || DEFAULT_PARTIES
  const voterBlocs = options.voterBlocs || DEFAULT_VOTER_BLOCS
  const vector = buildCountyFeatureVector(county, province)
  const scores = scoreUnit(vector, parties, 'county')
  // County identity inherits from its province.
  return applyVoterBlocs(scores, province, 'county', voterBlocs)
}
