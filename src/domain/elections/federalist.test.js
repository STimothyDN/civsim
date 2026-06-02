import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { simulateElection } from './index'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { calcPrelates } from '../../utils/calculatedFields'
import { generateSeatDetails } from './chambers/jurisdictionLabels'
import { deepClone } from '../../utils/object'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))

const sumSeats = (map) => Object.values(map).reduce((a, b) => a + b, 0)

describe('federalist structure', () => {
  const rows = buildProvinceComparisonRows(data)
  const electionConfig = { seed: 'verify', jitterSeed: 'verify', trends: [] }

  const run = (structure) => {
    const d = deepClone(data)
    d.config = d.config || {}
    d.config.structure = structure
    return simulateElection({ data: d, provinceRows: rows, electionConfig })
  }

  it('drops the region tier', () => {
    expect(run({ id: 'federalist' }).regions).toEqual({})
  })

  it('lower house: population-apportioned across provinces, min 1, total from divisor', () => {
    const divisor = 1000000
    const r = run({ id: 'federalist', national: { lower: { populationDivisor: divisor } } })
    const numProvinces = r.provinces.length
    const nationalPop = r.provinces.reduce((s, p) => s + p.provincial_population, 0)
    const expectedTotal = Math.max(numProvinces, Math.round(nationalPop / divisor))

    const alloc = r.national.assembly.province_allocation
    expect(alloc.length).toBe(numProvinces)
    expect(alloc.every((a) => a.seats >= 1)).toBe(true)
    expect(alloc.reduce((s, a) => s + a.seats, 0)).toBe(expectedTotal)
    expect(r.national.assembly.seat_count).toBe(expectedTotal)
    expect(sumSeats(r.national.assembly.seats)).toBe(expectedTotal)
  })

  it('lower house is districted: each province delegation matches its population allotment, and seats attribute per-province', () => {
    const r = run({ id: 'federalist', national: { lower: { populationDivisor: 1000000 } } })
    const allocByName = {}
    r.national.assembly.province_allocation.forEach((a) => { allocByName[a.name] = a.seats })

    // Each province's lower-house delegation sums to its Hamilton allotment.
    r.provinces.forEach((p) => {
      expect(sumSeats(p.national_assembly_delegation)).toBe(allocByName[p.name])
    })

    // Seat labels attribute each national assembly seat to the electing province,
    // and the per-province seat counts match the allotment exactly.
    const details = generateSeatDetails({
      seats: r.national.assembly.seats,
      chamberType: 'assembly',
      scope: 'national',
      provinces: r.provinces,
    })
    const perProvince = {}
    details.forEach((d) => { perProvince[d.jurisdiction] = (perProvince[d.jurisdiction] || 0) + 1 })
    r.provinces.forEach((p) => {
      expect(perProvince[p.name] || 0).toBe(allocByName[p.name])
    })
  })

  it('upper house equalPerProvince: numProvinces × seatsPerProvince', () => {
    const r = run({ id: 'federalist', national: { upper: { basis: 'equalPerProvince', seatsPerProvince: 2 } } })
    const expected = r.provinces.length * 2
    expect(r.national.prelates.seat_count).toBe(expected)
    expect(sumSeats(r.national.prelates.seats)).toBe(expected)
  })

  it('every province sends exactly seatsPerProvince to the national upper house', () => {
    const r = run({ id: 'federalist', national: { upper: { basis: 'equalPerProvince', seatsPerProvince: 2 } } })
    r.provinces.forEach((p) => {
      expect(sumSeats(p.national_prelate_delegation)).toBe(2)
    })
  })

  it('national council seats are attributed across provinces, not piled on one', () => {
    // Regression: seat labels must use the federalist per-province delegation, not
    // the decentralized one — otherwise many seats get assigned to the capital.
    const r = run({ id: 'federalist', national: { upper: { basis: 'equalPerProvince', seatsPerProvince: 2 } } })
    const details = generateSeatDetails({
      seats: r.national.prelates.seats,
      chamberType: 'prelates',
      scope: 'national',
      provinces: r.provinces,
    })
    expect(details.length).toBe(r.provinces.length * 2)
    const perProvince = {}
    details.forEach((d) => { perProvince[d.jurisdiction] = (perProvince[d.jurisdiction] || 0) + 1 })
    // No province may hold more than its allotment (2) of national upper-house seats.
    Object.values(perProvince).forEach((count) => expect(count).toBeLessThanOrEqual(2))
    // Seats should be spread across (almost) every province.
    expect(Object.keys(perProvince).length).toBeGreaterThan(r.provinces.length - 2)
  })

  it('upper house degressiveTiers: sum of per-province tier seats', () => {
    const r = run({ id: 'federalist', national: { upper: { basis: 'degressiveTiers' } } })
    const expected = r.provinces.reduce(
      (s, p) => s + calcPrelates(p.provincial_population, data.config?.calculations),
      0
    )
    expect(r.national.prelates.seat_count).toBe(expected)
    expect(sumSeats(r.national.prelates.seats)).toBe(expected)
  })

  it('produces finite national vote shares that sum to 1', () => {
    const r = run({ id: 'federalist' })
    const assemblyShares = Object.values(r.national.assembly.vote_shares)
    const prelateShares = Object.values(r.national.prelates.vote_shares)
    expect(assemblyShares.every(Number.isFinite)).toBe(true)
    expect(prelateShares.every(Number.isFinite)).toBe(true)
    expect(assemblyShares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    expect(prelateShares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
  })

  it('leaves provincial results identical to decentralized (province build is tier-agnostic)', () => {
    const fed = run({ id: 'federalist' })
    const dec = run({ id: 'decentralized' })
    expect(fed.provinces[0].assembly.seats).toEqual(dec.provinces[0].assembly.seats)
    expect(fed.provinces[0].prelates.seats).toEqual(dec.provinces[0].prelates.seats)
  })
})
