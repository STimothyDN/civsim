import { describe, expect, it } from 'vitest'
import { PARTIES } from '../constants/parties'
import { runPolls } from './runPolls'

function seats(values) {
  return { yellow: values[0], orange: values[1], red: values[2], blue: values[3], white: values[4], purple: values[5] }
}

function shares(values) {
  return { yellow: values[0], orange: values[1], red: values[2], blue: values[3], white: values[4], purple: values[5] }
}

function chamber(voteShares, seatMap, seatCount = Object.values(seatMap).reduce((sum, value) => sum + value, 0)) {
  return {
    vote_shares: voteShares,
    climate_vote_shares: shares([0.37, 0.25, 0.14, 0.11, 0.08, 0.05]),
    local_vote_shares: shares([0.29, 0.27, 0.18, 0.13, 0.08, 0.05]),
    seats: seatMap,
    seat_count: seatCount,
  }
}

function sampleResults() {
  const province = {
    provinceIndex: 0,
    name: 'Angkor Thom',
    group: 'Capital Region',
    provincial_population: 1000,
    assemblypeople: 12,
    political_features: { agrarian_index: 0.35, localist_index: 0.28 },
    assembly: chamber(shares([0.34, 0.25, 0.16, 0.12, 0.08, 0.05]), seats([5, 3, 2, 1, 1, 0]), 12),
    prelates: {
      vote_shares: shares([0.33, 0.25, 0.17, 0.12, 0.08, 0.05]),
      seats: seats([2, 1, 1, 0, 0, 0]),
      seat_count: 4,
    },
    national_prelate_delegation: seats([2, 1, 1, 0, 0, 0]),
    counties: [],
  }

  return {
    config: {
      trends: [{ id: 'trend-1', party: 'yellow', magnitude: 0.12, label: 'Mandate Weather' }],
      partyMeta: {},
    },
    national: {
      population: 1000,
      assembly: chamber(shares([0.35, 0.24, 0.16, 0.12, 0.08, 0.05]), seats([11, 7, 5, 4, 2, 1]), 30),
      prelates: { seats: seats([4, 3, 2, 1, 1, 1]), seat_count: 12 },
    },
    regions: {
      'Capital Region': {
        name: 'Capital Region',
        population: 1000,
        province_count: 1,
        assemblypeople: 12,
        prelate_count: 4,
        assembly: chamber(shares([0.34, 0.25, 0.16, 0.12, 0.08, 0.05]), seats([5, 3, 2, 1, 1, 0]), 12),
        prelates: {
          vote_shares: shares([0.33, 0.25, 0.17, 0.12, 0.08, 0.05]),
          seats: seats([2, 1, 1, 0, 0, 0]),
        },
      },
    },
    provinces: [province],
  }
}

function seatTotal(seatMap) {
  return Object.values(seatMap || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

function shareTotal(sharesMap) {
  return Object.values(sharesMap || {}).reduce((sum, value) => sum + Number(value || 0), 0)
}

function expectedSeatCounts(scope) {
  if (scope.scope === 'national') return { assembly: 30, prelates: 12 }
  if (scope.scope === 'regional') return { assembly: 12, prelates: 4 }
  return { assembly: 12, prelates: 4 }
}

describe('runPolls', () => {
  it('is deterministic for a fixed seed', () => {
    const first = runPolls({ results: sampleResults(), baselineResults: sampleResults(), pollSeed: 'fixed-poll' })
    const second = runPolls({ results: sampleResults(), baselineResults: sampleResults(), pollSeed: 'fixed-poll' })

    expect(first).toEqual(second)
  })

  it('keeps vote shares normalized and seat totals at chamber size', () => {
    const scopes = runPolls({ results: sampleResults(), baselineResults: sampleResults(), pollSeed: 'fixed-poll' })

    scopes.forEach((scope) => {
      const expected = expectedSeatCounts(scope)
      scope.pollsters.forEach((pollster) => {
        expect(shareTotal(pollster.voteShares)).toBeCloseTo(1, 8)
        expect(seatTotal(pollster.seats.assembly)).toBe(expected.assembly)
        expect(seatTotal(pollster.seats.prelates)).toBe(expected.prelates)
      })
      expect(shareTotal(scope.aggregate.voteShares)).toBeCloseTo(1, 8)
      expect(seatTotal(scope.aggregate.seats.assembly)).toBe(expected.assembly)
      expect(seatTotal(scope.aggregate.seats.prelates)).toBe(expected.prelates)
    })
  })

  it('keeps aggregate vote share inside the pollster min/max for each party', () => {
    const scopes = runPolls({ results: sampleResults(), baselineResults: sampleResults(), pollSeed: 'fixed-poll' })

    scopes.forEach((scope) => {
      PARTIES.forEach((party) => {
        const values = scope.pollsters.map((pollster) => pollster.voteShares[party])
        const aggregate = scope.aggregate.voteShares[party]
        expect(aggregate).toBeGreaterThanOrEqual(Math.min(...values) - 0.00000001)
        expect(aggregate).toBeLessThanOrEqual(Math.max(...values) + 0.00000001)
      })
    })
  })
})
