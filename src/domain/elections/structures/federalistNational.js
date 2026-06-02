/**
 * Federalist national-chamber computation.
 *
 * Unlike the decentralized model (where the national chambers aggregate
 * provincial delegations / blend a national "climate"), the federalist national
 * tier is built directly from the provinces in two distinct ways:
 *
 *   - Lower house ("population-driven"): a national seat total derived from
 *     national population is apportioned ACROSS provinces by population using
 *     largest-remainder with a guaranteed minimum of 1 seat per province; each
 *     province's allotment is then filled from that province's own assembly
 *     vote, and the per-province seat maps are summed.
 *   - Upper house ("small-province parity"): each province contributes a fixed
 *     equal number of seats (default) — or a degressive tier count — filled
 *     from that province's council vote, then summed.
 */
import {
  apportionDHondt,
  apportionModifiedSainteLague,
  apportionSainteLague,
  apportionLargestRemainder,
} from '../apportionment/highestAverages'
import { sumPartyMaps, weightedVoteShares } from '../scoring/normalizeScores'
import { calculateNationalFeatures } from '../features/nationalFeatures'
import { determineHouseControl } from '../coalitions/houseControl'
import { THRESHOLDS } from '../constants/apportionmentRules'
import { num, sumObjectValues } from '../normalization/numbers'
import { DEFAULT_POPULATION_DIVISOR } from '../constants/politicalStructures'

function selectApportion(method) {
  switch (method) {
    case 'sainteLague': return apportionSainteLague
    case 'modifiedSainteLague': return apportionModifiedSainteLague
    case 'dhondt':
    default: return apportionDHondt
  }
}

/**
 * National lower house: population-apportioned across provinces, filled per
 * province, summed.
 */
export function computeFederalistNationalLower(provinces, config) {
  const partyList = config.partyList
  const lowerCfg = config.structure?.national?.lower || {}
  const divisor = Math.max(1, num(lowerCfg.populationDivisor, DEFAULT_POPULATION_DIVISOR))
  const numProvinces = provinces.length

  const nationalPopulation = provinces.reduce((sum, p) => sum + num(p.provincial_population), 0)
  let total = Math.round(nationalPopulation / divisor)
  if (!Number.isFinite(total) || total < numProvinces) total = numProvinces

  const keys = provinces.map((_, index) => index)
  const weights = Object.fromEntries(provinces.map((p, index) => [index, Math.max(0, num(p.provincial_population))]))
  const allocation = apportionLargestRemainder(weights, total, { keys, minSeats: 1 })

  const apportion = selectApportion(lowerCfg.apportionmentMethod)
  const threshold = config.thresholds?.nationalAssembly ?? THRESHOLDS.nationalAssembly
  const perProvinceSeatMaps = provinces.map((p, index) =>
    apportion(p.assembly.vote_shares, allocation[index], {
      parties: partyList,
      threshold,
      rawScores: p.assembly.adjusted_scores,
    })
  )
  // Attach each province's national lower-house delegation so seat labels can
  // attribute each national assembly seat to the province that elected it — the
  // federalist lower house is districted by province (unlike the at-large
  // decentralized assembly). Mirrors national_prelate_delegation. The Hamilton
  // allotment is inherently national, so this is computed here rather than in
  // buildProvinceResult.
  provinces.forEach((p, index) => { p.national_assembly_delegation = perProvinceSeatMaps[index] })
  const seats = sumPartyMaps(perProvinceSeatMaps, partyList)
  const voteShares = weightedVoteShares(
    provinces,
    (p) => p.provincial_population,
    (p) => p.assembly.vote_shares,
    partyList
  )

  return {
    vote_shares: voteShares,
    local_vote_shares: voteShares,
    climate_vote_shares: voteShares,
    vote_blend: { local_weight: 1, climate_weight: 0 },
    seats,
    control: determineHouseControl(seats, config.trends, config.partyNames, null, config.coalitionPartners),
    seat_count: sumObjectValues(seats),
    province_allocation: provinces.map((p, index) => ({
      name: p.name,
      provinceIndex: p.provinceIndex,
      seats: allocation[index],
    })),
  }
}

/**
 * National upper house: the sum of each province's national delegation
 * (`national_prelate_delegation`, computed structure-aware in buildProvinceResult
 * as equal-per-province or degressive tiers, filled from the province's council
 * vote). Summing the same per-province delegations the seat-labels read keeps the
 * national totals and the per-seat → province attribution in lockstep.
 */
export function computeFederalistNationalUpper(provinces, config, priorControl = null) {
  const partyList = config.partyList
  const seats = sumPartyMaps(provinces.map((p) => p.national_prelate_delegation || {}), partyList)
  const voteShares = weightedVoteShares(
    provinces,
    (p) => p.provincial_population,
    (p) => p.prelates.vote_shares,
    partyList
  )

  return {
    vote_shares: voteShares,
    seats,
    control: determineHouseControl(seats, config.trends, config.partyNames, priorControl, config.coalitionPartners),
    seat_count: sumObjectValues(seats),
  }
}

/**
 * Compose the federalist national result (same shape as the decentralized one,
 * minus the climate-blend internals which don't apply).
 */
export function calculateNationalFederalist(provinces, config) {
  const features = calculateNationalFeatures(provinces)
  const assembly = computeFederalistNationalLower(provinces, config)
  const prelates = computeFederalistNationalUpper(provinces, config, assembly.control)

  return {
    features,
    population: features.national_population,
    assembly,
    prelates,
  }
}
