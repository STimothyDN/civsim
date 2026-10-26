import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildElectionConfig, buildFeatureUnitsByName, calculateScoreNorms, simulateElection } from './index'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { DEFAULT_BALANCE_TARGETS, expectedElection } from './balance/calibrateBiases'
import { DEFAULT_VOTER_BLOCS } from './constants/defaultVoterBlocs'
import { calculateCountyFeatures } from './features/countyFeatures'
import { calculateCountyPartyScores } from './scoring/countyScores'
import { scoresToVoteShares, sharpenScores } from './scoring/normalizeScores'

/**
 * Balance of the default party model on the bundled Khmer world (default
 * parties and voter blocs; the save's own weights are ignored). If a change to
 * the engine or catalog trips these, re-run calibrateBiases and review
 * MODEL.md "Balance" rather than loosening the bounds.
 */
const here = dirname(fileURLToPath(import.meta.url))
const world = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))
delete world.config.parties
delete world.config.voterBlocs
const rows = buildProvinceComparisonRows(world)
const MAJORS = ['yellow', 'orange', 'red', 'blue']
const top = (shares) => Object.entries(shares).sort((a, b) => b[1] - a[1])[0][0]

function correlation(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2 })
  return sxy / Math.sqrt(sxx * syy)
}

describe('default party balance (Khmer world)', () => {
  const expected = expectedElection(world, rows)

  it('sits at the calibrated national vote', () => {
    for (const [party, target] of Object.entries(DEFAULT_BALANCE_TARGETS)) {
      expect(expected.national.assembly.vote_shares[party], party).toBeCloseTo(target, 2)
    }
  })

  it('gives every party its own heartland and a floor everywhere', () => {
    const counties = expected.provinces.flatMap((p) => p.counties || []).filter((c) => c.county_population > 0)
    const core = {
      yellow: 'imperial_core_index',
      orange: 'worker_index',
      red: 'traditionalist_index',
      blue: 'middle_class_index',
      green: 'ecology_index',
      white: 'foreign_origin_index',
      purple: 'restorationist_index',
    }
    for (const [party, feature] of Object.entries(core)) {
      const r = correlation(counties.map((c) => c.political_features[feature] || 0), counties.map((c) => c.vote_shares[party]))
      expect(r, `${party} vs ${feature}`).toBeGreaterThan(0.35)
    }
    // Strongholds squeeze rivals, but nobody is wiped out.
    for (const province of expected.provinces) {
      for (const party of MAJORS) expect(province.assembly.vote_shares[party], `${party} in ${province.name}`).toBeGreaterThan(0.02)
      for (const party of ['white', 'purple', 'green']) expect(province.assembly.vote_shares[party], `${party} in ${province.name}`).toBeGreaterThan(0.002)
    }
  })

  const elections = Array.from({ length: 20 }, (_, i) => simulateElection({
    data: world,
    provinceRows: rows,
    electionConfig: { seed: `b${i}`, jitterSeed: `b${i}`, trends: [] },
  }))

  it('lets every major party win, and no party run away with the chambers', () => {
    const largest = Object.fromEntries(MAJORS.map((party) => [party, 0]))
    const seats = Object.fromEntries(MAJORS.map((party) => [party, 0]))
    for (const result of elections) {
      const winner = top(result.national.assembly.seats)
      if (winner in largest) largest[winner] += 1
      MAJORS.forEach((party) => { seats[party] += result.national.assembly.seats[party] / elections.length })
      const total = Object.values(result.national.assembly.seats).reduce((a, b) => a + b, 0)
      expect(Math.max(...Object.values(result.national.assembly.seats))).toBeLessThan(total * 0.3)
    }
    MAJORS.forEach((party) => expect(largest[party], `${party} largest`).toBeGreaterThan(0))
    const mean = MAJORS.reduce((a, party) => a + seats[party], 0) / MAJORS.length
    MAJORS.forEach((party) => expect(Math.abs(seats[party] - mean) / mean, `${party} seats`).toBeLessThan(0.08))
  })

  it('has strongholds as well as battlegrounds', () => {
    let safe = 0
    let tossup = 0
    const safeHolders = new Set()
    for (const result of elections) {
      for (const province of result.provinces) {
        const [first, second] = Object.entries(province.assembly.vote_shares).sort((a, b) => b[1] - a[1])
        const margin = first[1] - second[1]
        if (margin >= 0.12) { safe += 1; safeHolders.add(first[0]) }
        if (margin < 0.05) tossup += 1
      }
    }
    const provinces = expected.provinces.length
    // Per election: a real share of safe seats, and still plenty of contests.
    expect(safe / elections.length).toBeGreaterThan(provinces * 0.2)
    expect(tossup / elections.length).toBeGreaterThan(provinces * 0.2)
    expect(tossup / elections.length).toBeLessThan(provinces * 0.5)
    ;[...MAJORS, 'white', 'purple'].forEach((party) => expect(safeHolders.has(party), `${party} holds a safe seat`).toBe(true))
  })

  it('wins identity parties their home provinces and keeps them minor elsewhere', () => {
    const home = { white: /america/i, purple: /rom/i }
    for (const [party, pattern] of Object.entries(home)) {
      const inside = expected.provinces.filter((p) => pattern.test(p.original_country || ''))
      const outside = expected.provinces.filter((p) => !pattern.test(p.original_country || ''))
      expect(inside.filter((p) => top(p.assembly.vote_shares) === party).length, `${party} home wins`).toBeGreaterThan(0)
      outside.forEach((p) => expect(p.assembly.vote_shares[party], `${party} in ${p.name}`).toBeLessThan(0.1))
    }
  })

  it('moves a county decisively toward the party its improvement belongs to', () => {
    const units = buildFeatureUnitsByName(world, rows)
    const capital = units.get('angkor thom').province
    const config = buildElectionConfig(world)
    const norms = calculateScoreNorms(units.values(), config)
    const farm = { terrain: 'Grassland', features: {}, resource: null, distance_from_center: 2, citizens_working: 1, appeal: 3, yields: { food: 3, production: 1 } }
    const winnerAs = (improvement, buildings = {}, extra = {}) => {
      const county = { ...farm, ...extra, improvement: { name: improvement, buildings, great_works: {} } }
      const features = calculateCountyFeatures(county, { ...capital.political_features, is_conquered: capital.is_conquered })
      const scores = calculateCountyPartyScores({ political_features: features }, capital, { voterBlocs: DEFAULT_VOTER_BLOCS })
      const shares = scoresToVoteShares(sharpenScores(scores, config.decisiveness.county, norms.county))
      const winner = top(shares)
      expect(shares[winner], `${improvement} winner share`).toBeGreaterThan(0.4)
      return winner
    }
    expect(winnerAs('Farm')).toBe('red')
    expect(winnerAs('Encampment', { Barracks: true })).toBe('red')
    expect(winnerAs('Industrial Zone', { Workshop: true, Factory: true }, { yields: { production: 8 } })).toBe('orange')
    expect(winnerAs('Mine', {}, { terrain: 'Plains (Hills)', resource: 'Coal', yields: { production: 5 } })).toBe('orange')
    expect(winnerAs('Campus', { Library: true, University: true }, { yields: { science: 6 } })).toBe('blue')
    expect(winnerAs('Commercial Hub', { Market: true, Bank: true }, { yields: { gold: 10 } })).toBe('blue')
    expect(winnerAs('Government Plaza', { 'Audience Chamber': true })).toBe('yellow')
    expect(winnerAs('National Park', {}, { features: { 'Woods (old-growth)': true }, appeal: 6, yields: {} })).toBe('green')
  })
})
