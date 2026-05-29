import { DEFAULT_PARTIES } from '../constants/defaultParties'
import { DEFAULT_VOTER_BLOCS } from '../constants/defaultVoterBlocs'
import { scoreUnit } from './scoreUnit'
import { applyVoterBlocs } from '../features/voterBlocs'
import { num } from '../normalization/numbers'

/**
 * Build the province scoring vector: the province's political features plus two
 * derived indices the original formulas computed inline.
 */
export function buildProvinceFeatureVector(province) {
  const pf = province?.political_features || {}
  return {
    ...pf,
    cross_continental_index: 1 - num(pf.same_continent_index),
    conquered_index: province?.is_conquered ? 1 : 0,
  }
}

export function calculateProvincePartyScores(province, options = {}) {
  const parties = options.parties || DEFAULT_PARTIES
  const voterBlocs = options.voterBlocs || DEFAULT_VOTER_BLOCS
  const vector = buildProvinceFeatureVector(province)
  const scores = scoreUnit(vector, parties, 'province')
  return applyVoterBlocs(scores, province, 'province', voterBlocs)
}
