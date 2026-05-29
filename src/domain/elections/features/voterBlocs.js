import { matchesSelector } from '../trends/matchTrend'
import { num } from '../normalization/numbers'

/**
 * Generic voter-bloc engine. Replaces the hardcoded american/roman/taoist
 * identity branches with configurable rules: "voters matching <source> lean
 * toward <party> by <strength>". Reuses `matchesSelector` (the trend selector
 * grammar) so blocs can target origin country, province group, conquered
 * status, etc. Religion-targeted blocs read per-religion shares.
 *
 * Bloc shape:
 *   { id, label, party: partyId,
 *     strength: { county, province, national },   // per-scope magnitude
 *     source: { selector?, religion?, feature?, threshold? } }
 *
 * Membership ∈ [0,1+]:
 *   - selector → 1 / 0 (matchesSelector)
 *   - religion → that religion's share (graded)
 *   - feature  → that feature value (graded)
 *   - threshold → hard gate: membership 0 below the threshold
 * Multiple sources multiply (selector gates a graded religion/feature).
 */

function strengthFor(bloc, scope) {
  const s = bloc?.strength
  if (s == null) return 0
  if (typeof s === 'number') return s
  return num(s[scope])
}

function featuresFor(unit) {
  return unit?.political_features || unit?.features || unit || {}
}

function religionShare(unit, religion) {
  if (!religion) return 0
  const shares = unit?.religion_shares || unit?.political_features?.religion_shares
  if (shares && shares[religion] != null) return num(shares[religion])
  // Back-compat fallback for the legacy taoist_share feature.
  if (religion === 'Taoism') return num(unit?.political_features?.taoist_share)
  return 0
}

/**
 * Membership of a unit (province object for province/county scope) in a bloc.
 * For county scope, the province object is passed — county identity inherits
 * from its province, matching the original engine.
 */
export function blocMembership(unit, bloc) {
  const source = bloc?.source || {}
  let gate = 1

  if (source.selector) {
    gate = matchesSelector(unit, source.selector) ? 1 : 0
    if (!gate) return 0
  }

  let graded = null
  if (source.religion) graded = religionShare(unit, source.religion)
  else if (source.feature) graded = num(featuresFor(unit)[source.feature])

  if (graded !== null) {
    if (source.threshold != null && graded < num(source.threshold)) return 0
    return gate * graded
  }

  return gate
}

/**
 * Add bloc contributions to a base score map (mutates and returns it).
 * `unit` provides the membership context (province object).
 */
export function applyVoterBlocs(scores, unit, scope, blocs = []) {
  for (const bloc of blocs) {
    const strength = strengthFor(bloc, scope)
    if (!strength || !(bloc.party in scores)) continue
    const membership = blocMembership(unit, bloc)
    if (membership) scores[bloc.party] += strength * membership
  }
  return scores
}

/**
 * Population-weighted national membership per bloc, aggregated from province
 * units. Mirrors how nationalFeatures aggregates identity signals, so national
 * bloc contributions match the old additive national identity terms.
 *
 * @param {Array<{ political_features?:object, provincial_population?:number }>} provinces
 * @param {Array} blocs
 * @returns {Record<string, number>} blocId -> national membership
 */
export function aggregateNationalBlocMembership(provinces = [], blocs = []) {
  const totalPop = provinces.reduce((sum, p) => sum + num(p.provincial_population), 0)
  const out = {}
  for (const bloc of blocs) {
    if (totalPop <= 0) {
      out[bloc.id] = provinces.length
        ? provinces.reduce((s, p) => s + blocMembership(p, bloc), 0) / provinces.length
        : 0
      continue
    }
    out[bloc.id] = provinces.reduce(
      (s, p) => s + num(p.provincial_population) * blocMembership(p, bloc),
      0
    ) / totalPop
  }
  return out
}

/**
 * Add national-scope bloc contributions given precomputed national membership.
 */
export function applyNationalVoterBlocs(scores, blocMembershipByBloc = {}, blocs = []) {
  for (const bloc of blocs) {
    const strength = strengthFor(bloc, 'national')
    if (!strength || !(bloc.party in scores)) continue
    const membership = num(blocMembershipByBloc[bloc.id])
    if (membership) scores[bloc.party] += strength * membership
  }
  return scores
}
