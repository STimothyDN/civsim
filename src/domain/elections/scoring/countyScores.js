import { DEFAULT_PARTIES } from '../constants/defaultParties'
import { DEFAULT_VOTER_BLOCS } from '../constants/defaultVoterBlocs'
import { scoreUnit } from './scoreUnit'
import { applyVoterBlocs } from '../features/voterBlocs'
import { PROVINCE_IDENTITY_FEATURES } from '../features/featureCatalog'
import { num } from '../normalization/numbers'

/**
 * The county scoring vector: the county's own features, with the identity
 * features (imperial core, religion, origin, conquest, frontier…) taken from
 * its province so county and province scores read the same identity.
 */
export function buildCountyFeatureVector(county, province) {
  const vector = { ...(county?.political_features || {}) }
  const pf = province?.political_features
  if (pf) {
    for (const key of PROVINCE_IDENTITY_FEATURES) {
      if (pf[key] !== undefined) vector[key] = num(pf[key])
    }
  }
  if (province?.is_conquered !== undefined) vector.conquered_index = province.is_conquered ? 1 : 0
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
