import { describe, expect, it } from 'vitest'
import { generateJurisdictionLabels, generateSeatDetails, orderedPartiesBySeats } from './jurisdictionLabels'

function province(name, voteShares, delegation, extra = {}) {
  return {
    name,
    group: 'North',
    provincial_population: 1000,
    assembly: { vote_shares: voteShares, seats: {} },
    prelates: { vote_shares: voteShares, seats: delegation },
    national_prelate_delegation: delegation,
    counties: [],
    ...extra,
  }
}

describe('jurisdiction labels with a configured party set', () => {
  // Engine seat maps are keyed by the world's parties in config order,
  // including user-defined ones the bundled defaults don't know about.
  const seats = { yellow: 3, 'regional-independents': 2, red: 1 }
  const provinces = [
    province('Oslo', { yellow: 0.5, 'regional-independents': 0.3, red: 0.2 }, { yellow: 2, 'regional-independents': 1, red: 0 }, { is_national_capital: true }),
    province('Bergen', { yellow: 0.3, 'regional-independents': 0.4, red: 0.3 }, { yellow: 1, 'regional-independents': 1, red: 1 }),
  ]

  it('labels and details every seat, custom parties included', () => {
    const details = generateSeatDetails({ seats, chamberType: 'prelates', scope: 'national', provinces })

    expect(details).toHaveLength(6)
    expect(details.filter((seat) => seat.party === 'regional-independents')).toHaveLength(2)
    expect(details.map((seat) => seat.seatIndex)).toEqual([0, 1, 2, 3, 4, 5])
    expect(details.every((seat) => seat.jurisdiction && seat.jurisdiction !== 'Unknown')).toBe(true)
  })

  it('orders parties by seats, breaking ties by config order', () => {
    expect(orderedPartiesBySeats(seats)).toEqual(['yellow', 'regional-independents', 'red'])
    expect(orderedPartiesBySeats({ red: 2, 'regional-independents': 2, yellow: 0 })).toEqual(['red', 'regional-independents'])
  })

  it('keeps labels aligned with seat details', () => {
    const labels = generateJurisdictionLabels({ seats, chamberType: 'prelates', scope: 'national', provinces })
    const details = generateSeatDetails({ seats, chamberType: 'prelates', scope: 'national', provinces })

    expect(labels).toEqual(details.map((seat) => seat.jurisdiction))
  })
})
