import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { generatePoliticalModel, WEIGHT_BOUNDS } from './weightGenerators'
import { normalizeTemplateInput } from '../templateCodec'

const here = dirname(fileURLToPath(import.meta.url))
const data = normalizeTemplateInput(
  JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))
)
const parties = data.config.parties
const SCOPES = ['county', 'province', 'national']

function expectWellFormed(model) {
  expect(model.length).toBe(parties.length)
  model.forEach((entry) => {
    SCOPES.forEach((scope) => {
      expect(entry.affinities[scope]).toBeTypeOf('object')
      expect(Number.isFinite(entry.bias[scope])).toBe(true)
    })
  })
}

describe('weight generators', () => {
  it('all three modes produce well-formed, scoped models', () => {
    expectWellFormed(generatePoliticalModel('balanced', data, parties))
    expectWellFormed(generatePoliticalModel('data-driven', data, parties))
    expectWellFormed(generatePoliticalModel('random', data, parties))
  })

  it('random weights stay within the acceptable bounds', () => {
    const model = generatePoliticalModel('random', data, parties, () => 0.9)
    model.forEach((entry) => {
      Object.values(entry.affinities.province).forEach((w) => {
        expect(w).toBeGreaterThanOrEqual(WEIGHT_BOUNDS.randomMin - 1e-9)
        expect(w).toBeLessThanOrEqual(WEIGHT_BOUNDS.randomMax + 1e-9)
      })
    })
  })

  it('balanced keeps minor-tier parties focused (fewer features) and below majors', () => {
    const model = generatePoliticalModel('balanced', data, parties)
    const countyFeatureCount = (i) => Object.keys(model[i].affinities.county).length
    const majorIdx = parties.findIndex((p) => p.tier !== 'minor')
    const minorIdx = parties.findIndex((p) => p.tier === 'minor')
    expect(majorIdx).toBeGreaterThanOrEqual(0)
    expect(minorIdx).toBeGreaterThanOrEqual(0)
    // Focused minors carry no more feature weights than a wide-appeal major.
    expect(countyFeatureCount(minorIdx)).toBeLessThanOrEqual(countyFeatureCount(majorIdx))
    expect(model[minorIdx].bias.province).toBeTypeOf('number')
  })
})
