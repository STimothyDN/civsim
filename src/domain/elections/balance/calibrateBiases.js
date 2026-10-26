import { simulateElection } from '../simulateElection'
import { buildProvinceComparisonRows } from '../../provinceVisualizations'
import { deepClone } from '../../../utils/object'

/**
 * Tools for balancing party base support (bias) against a world. The bundled
 * defaults were calibrated with these against the Khmer example (see
 * MODEL.md, "Balance").
 */

// National vote each default party is tuned to in an expected election.
export const DEFAULT_BALANCE_TARGETS = {
  yellow: 0.195,
  orange: 0.195,
  red: 0.195,
  blue: 0.195,
  white: 0.075,
  purple: 0.065,
  green: 0.08,
}

const NO_NOISE = { national: 0, region: 0, province: 0, county: 0 }
const BIAS_FLOOR = 0.02
const SCOPES = ['county', 'province', 'national']

/** The election with every random swing at zero — what the model expects. */
export function expectedElection(data, provinceRows = buildProvinceComparisonRows(data)) {
  return simulateElection({
    data,
    provinceRows,
    electionConfig: { seed: 'expected', jitterSeed: 'expected', trends: [], volatility: NO_NOISE },
  })
}

function positiveTotal(scores = {}) {
  return Object.values(scores).reduce((sum, value) => sum + Math.max(0, value), 0)
}

function weightedMean(items, weightOf, valueOf) {
  let total = 0
  let weight = 0
  for (const item of items) {
    const w = Math.max(0, weightOf(item))
    total += w * valueOf(item)
    weight += w
  }
  return weight ? total / weight : 0
}

/**
 * Tune each party's bias, per scope, until an expected election gives every
 * party its target national vote. Phase one fits each scope's own vote
 * (county votes, province climate, national climate); phase two nudges county
 * biases — the bulk of every result — by whatever the final national vote
 * still misses. Affinities are never touched.
 *
 * @param {{ data: object, parties: Array, targets?: Record<string, number>, iterations?: number, refineIterations?: number }} options
 * @returns {{ parties: Array, national: Record<string, number> }} parties with
 *   calibrated biases, and the national vote they produce
 */
export function calibrateBiases({ data, parties, targets = DEFAULT_BALANCE_TARGETS, iterations = 25, refineIterations = 15 }) {
  const world = deepClone(data)
  world.config = { ...(world.config || {}), parties: deepClone(parties) }
  const tuned = world.config.parties
  const rows = buildProvinceComparisonRows(world)
  const target = (id) => targets[id] ?? 0

  let result = null
  for (let iter = 0; iter < iterations + refineIterations; iter += 1) {
    result = expectedElection(world, rows)
    const counties = result.provinces.flatMap((province) => province.counties || [])
      .filter((county) => county.vote_shares && county.county_population > 0)
    const share = {
      county: (id) => weightedMean(counties, (c) => c.county_population, (c) => c.vote_shares[id] || 0),
      province: (id) => weightedMean(result.provinces, (p) => p.provincial_population, (p) => p.assembly.climate_vote_shares[id] || 0),
      national: (id) => result.national.assembly.climate_vote_shares[id] || 0,
    }
    const provinceTotal = weightedMean(result.provinces, (p) => p.provincial_population, (p) => positiveTotal(p.assembly.raw_scores))
    const totals = {
      county: weightedMean(counties, (c) => c.county_population, (c) => positiveTotal(c.raw_scores)),
      province: provinceTotal,
      national: provinceTotal,
    }

    for (const party of tuned) {
      if (!(party.id in targets)) continue
      if (iter >= iterations) {
        const miss = target(party.id) - (result.national.assembly.vote_shares[party.id] || 0)
        party.bias.county = round(Math.max(BIAS_FLOOR, party.bias.county + 0.3 * miss * totals.county))
        continue
      }
      for (const scope of SCOPES) {
        const current = share[scope](party.id)
        const step = 0.8 * (target(party.id) - current) * totals[scope] / Math.max(0.5, 1 - current)
        party.bias[scope] = round(Math.max(BIAS_FLOOR, party.bias[scope] + step))
      }
    }
    // Shares barely move when every bias rises together, but results flatten.
    // Keep base support as low as the targets allow: the lowest bias at each
    // level sits on the floor, so parties' features — their heartlands — carry
    // the vote.
    if (iter < iterations) {
      const calibrated = tuned.filter((party) => party.id in targets)
      for (const scope of SCOPES) {
        const lowest = Math.min(...calibrated.map((party) => party.bias[scope]))
        const shift = lowest - BIAS_FLOOR
        if (shift > 0) calibrated.forEach((party) => { party.bias[scope] = round(party.bias[scope] - shift) })
      }
    }
  }

  return { parties: tuned, national: { ...expectedElection(world, rows).national.assembly.vote_shares } }
}

function round(value) {
  return Math.round(value * 1e4) / 1e4
}
