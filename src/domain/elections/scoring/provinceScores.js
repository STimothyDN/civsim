import { DEFAULT_PARTIES } from '../constants/defaultParties'
import { DEFAULT_VOTER_BLOCS } from '../constants/defaultVoterBlocs'
import { scoreUnit } from './scoreUnit'
import { applyVoterBlocs } from '../features/voterBlocs'

/** The province scoring vector: its political features. */
export function buildProvinceFeatureVector(province) {
  const vector = { ...(province?.political_features || {}) }
  if (province?.is_conquered !== undefined) vector.conquered_index = province.is_conquered ? 1 : 0
  return vector
}

export function calculateProvincePartyScores(province, options = {}) {
  const parties = options.parties || DEFAULT_PARTIES
  const voterBlocs = options.voterBlocs || DEFAULT_VOTER_BLOCS
  const vector = buildProvinceFeatureVector(province)
  const scores = scoreUnit(vector, parties, 'province')
  return applyVoterBlocs(scores, province, 'province', voterBlocs)
}
