import { describe, expect, it, vi } from 'vitest'
import {
  calcAssemblypeople,
  calcDominantReligion,
  calcPrelates,
  calcProvincialPopulation,
  computeRegionalTotals,
  resetJitterCache,
} from './calculatedFields'

describe('calculatedFields', () => {
  it('calculates deterministic values while jitter is cached', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    resetJitterCache()

    const first = calcProvincialPopulation(10, 0)
    const second = calcProvincialPopulation(10, 0)

    expect(first).toBe(second)
    expect(calcAssemblypeople('12')).toBe(12)
    expect(calcPrelates(50_000_000)).toBe(11)
  })

  it('resolves dominant religion and regional totals', () => {
    expect(calcDominantReligion([
      { name: 'Sun Cult', followers: 10 },
      { name: 'Moon Cult', followers: 5 },
    ])).toBe('Sun Cult')
    expect(calcDominantReligion([
      { name: 'Sun Cult', followers: 10 },
      { name: 'Moon Cult', followers: 10 },
    ])).toBe('None')

    const totals = computeRegionalTotals(
      [{ group: 'Core' }, { group: 'Core' }, { group: null }],
      [
        { provincialPopulation: 100, assemblypeople: 3, prelates: 15 },
        { provincialPopulation: 200, assemblypeople: 4, prelates: 16 },
        { provincialPopulation: 300, assemblypeople: 5, prelates: 17 },
      ]
    )

    expect(totals.get('Core')).toEqual({
      regionalPopulation: 300,
      assemblypeople: 7,
      prelates: 31,
    })
  })
})
