import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  buildEmpireFeatureProfile,
  compileNarrativePoliticalModel,
  generatePoliticalModel,
  WEIGHT_BOUNDS,
} from './weightGenerators'
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

  it('builds an empire feature profile with cleavages and dominant characteristics', () => {
    const profile = buildEmpireFeatureProfile(data)
    expect(profile.strongestCleavages.length).toBeGreaterThan(0)
    expect(profile.dominantCharacteristics.length).toBeGreaterThan(0)
    expect(profile.strongestCleavages[0]).toMatchObject({
      key: expect.any(String),
      label: expect.any(String),
      group: expect.any(String),
      mean: expect.any(Number),
      std: expect.any(Number),
    })
  })

  it('compiles narrative political model weights across scopes, maps legacy keys, and calibrates biases', () => {
    const plan = {
      title: 'Workers vs Temple Core',
      summary: 'Industrial river corridors rally behind Orange while Yellow holds the sacred core.',
      partyWeights: {
        yellow: {
          rationale: 'Dominates the imperial core and state religion centers.',
          bias: 0.08,
          affinities: {
            imperial_core_index: 0.28,
            state_religion_share: 0.18,
            conquered_index: -0.22,
          },
        },
        // Matched by party name alias; old feature keys map onto today's (urbanization_index -> urban_index)
        'United Workers Congress': {
          rationale: 'Sweeps urban industrial counties.',
          bias: { county: 0.11, province: 0.12, national: 0.12 },
          affinities: {
            industrial_index: 0.36,
            urbanization_index: 0.24,
            commerce_index: 0.15,
            unknown_feature_key: 0.99,
          },
        },
      },
    }

    const compiled = compileNarrativePoliticalModel(plan, data, parties)
    expectWellFormed(compiled)

    const yellow = compiled.find((p) => p.id === 'yellow')
    const orange = compiled.find((p) => p.id === 'orange')

    expect(yellow.rationale).toBe('Dominates the imperial core and state religion centers.')
    expect(yellow.affinities.province.imperial_core_index).toBe(0.28)
    expect(yellow.affinities.county.imperial_core_index).toBe(0.28)
    expect(yellow.affinities.province.conquered_index).toBe(-0.22)

    // Legacy keys land on the features that replaced them, at every scope.
    for (const scope of ['county', 'province', 'national']) {
      expect(orange.affinities[scope].urban_index).toBe(0.24)
      expect(orange.affinities[scope].commercial_index).toBe(0.15)
      expect(orange.affinities[scope]).not.toHaveProperty('urbanization_index')
    }
    expect(orange.affinities.province).not.toHaveProperty('unknown_feature_key')
  })
})
