import { DEFAULT_PARTIES } from '../constants/defaultParties'
import { DEFAULT_VOTER_BLOCS } from '../constants/defaultVoterBlocs'
import { scoreUnit } from './scoreUnit'
import { applyNationalVoterBlocs } from '../features/voterBlocs'

/**
 * National party scores from the aggregated national feature vector.
 *
 * `blocMembership` is the population-weighted national membership per voter
 * bloc (see aggregateNationalBlocMembership). It is supplied by the caller
 * (simulateElection / electionPipeline) so national identity contributions
 * match the old additive national identity terms without re-deriving them here.
 */
export function calculateNationalPartyScores(nationalFeatures, options = {}) {
  const parties = options.parties || DEFAULT_PARTIES
  const voterBlocs = options.voterBlocs || DEFAULT_VOTER_BLOCS
  const blocMembership = options.blocMembership || {}
  const scores = scoreUnit(nationalFeatures, parties, 'national')
  return applyNationalVoterBlocs(scores, blocMembership, voterBlocs)
}
