import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { simulateElection } from './index'
import { buildProvinceComparisonRows } from '../provinceVisualizations'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))

describe('jayavarman smoke', () => {
  it('produces differentiated results across all 55 provinces with no NaN', () => {
    const rows = buildProvinceComparisonRows(data)
    const result = simulateElection({
      data,
      provinceRows: rows,
      electionConfig: { seed: 'verify', jitterSeed: 'verify', trends: [] },
    })
    expect(result.provinces.length).toBe(55)

    const qualityCount = { stub: 0, sparse: 0, rich: 0 }
    let nanFound = false
    const flatProvinces = []
    let totalAssemblySeats = 0
    let expectedAssemblySeats = 0
    result.provinces.forEach((p) => {
      qualityCount[p.county_data_quality] = (qualityCount[p.county_data_quality] || 0) + 1
      const shares = Object.values(p.assembly.vote_shares)
      if (shares.some((v) => !Number.isFinite(v))) nanFound = true
      const max = Math.max(...shares)
      const min = Math.min(...shares)
      if (max - min < 0.005) flatProvinces.push(p.name)
      totalAssemblySeats += Object.values(p.assembly.seats).reduce((a, b) => a + b, 0)
      expectedAssemblySeats += p.assemblypeople
    })

    console.log('quality breakdown:', qualityCount)
    console.log('flat (max-min<0.005) provinces:', flatProvinces.length, flatProvinces.slice(0, 5))
    console.log('total assembly seats:', totalAssemblySeats, '/ expected:', expectedAssemblySeats)
    const stubOnly = result.provinces.find((p) => p.county_data_quality === 'stub')
    const richProv = result.provinces.find((p) => p.county_data_quality === 'rich')
    if (stubOnly) {
      console.log('stub sample:', stubOnly.name, 'shares:', Object.fromEntries(Object.entries(stubOnly.assembly.vote_shares).map(([k,v])=>[k,Number(v.toFixed(3))])), 'urban:', stubOnly.political_features.urbanization_index.toFixed(3), 'industrial:', stubOnly.political_features.industrial_index.toFixed(3))
    }
    if (richProv) {
      console.log('rich sample:', richProv.name, 'shares:', Object.fromEntries(Object.entries(richProv.assembly.vote_shares).map(([k,v])=>[k,Number(v.toFixed(3))])))
    }

    expect(nanFound).toBe(false)
    expect(flatProvinces.length).toBe(0)
    expect(totalAssemblySeats).toBe(expectedAssemblySeats)
    const natSum = Object.values(result.national.assembly.vote_shares).reduce((a, b) => a + b, 0)
    expect(natSum).toBeCloseTo(1, 5)
    expect(qualityCount.stub).toBeGreaterThan(0)
    expect(qualityCount.rich).toBeGreaterThan(0)
  })
})
