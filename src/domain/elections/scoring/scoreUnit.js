import { num } from '../normalization/numbers'

/**
 * Generic, data-driven party scorer.
 *
 * Replaces the hand-tuned per-party formulas with a linear model:
 *   score(party) = floor + bias + Σ_feature affinity[feature] * featureValue[feature]
 *
 * `affinities` is a flat map of feature key -> weight for a single scope
 * (county | province | national). Features absent from the vector count as 0,
 * so unused weights and unweighted features are both harmless.
 *
 * @param {Record<string,number>} features  computed feature vector for the unit
 * @param {{ floor?: number, bias?: number, affinities?: Record<string,number> }} party
 * @returns {number} raw (un-normalized, un-floored-to-0) party score
 */
export function scoreUnitForParty(features, affinities = {}, floor = 0, bias = 0) {
  let score = num(floor) + num(bias)
  for (const key in affinities) {
    const weight = affinities[key]
    if (!weight) continue
    score += weight * num(features?.[key])
  }
  return score
}

/**
 * Score every configured party for one unit at a given scope.
 *
 * @param {Record<string,number>} features
 * @param {Array<{id:string, floor?:number, scopeBias?:object, affinities?:object}>} parties
 * @param {'county'|'province'|'national'} scope
 * @returns {Record<string, number>} party id -> raw score
 */
export function scoreUnit(features, parties = [], scope = 'province') {
  const out = {}
  for (const party of parties) {
    const affinities = party?.affinities?.[scope] || {}
    const bias = party?.bias?.[scope] ?? 0
    out[party.id] = scoreUnitForParty(features, affinities, party.floor ?? 0, bias)
  }
  return out
}
