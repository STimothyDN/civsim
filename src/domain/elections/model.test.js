import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildFeatureUnitsByName, simulateElection } from './index'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import { normalizeConfig } from './config'
import { calculateNationalFeatures } from './features/nationalFeatures'
import { calculateProvinceFeatures } from './features/provinceFeatures'
import {
  FEATURE_KEYS,
  LEGACY_FEATURE_MAP,
  hasLegacyFeatureKeys,
  migrateAffinityMap,
  readFeature,
} from './features/featureCatalog'
import { matchesSelector } from './trends/matchTrend'

const here = dirname(fileURLToPath(import.meta.url))
const jayavarman = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))

describe('political model', () => {
  const units = [...buildFeatureUnitsByName(jayavarman, buildProvinceComparisonRows(jayavarman)).values()]

  it('emits every feature at county, province and national scope, within 0..1', () => {
    const national = calculateNationalFeatures(units.map((unit) => unit.province))
    const vectors = [
      ...units.flatMap((unit) => unit.counties.map((county) => county.political_features)),
      ...units.map((unit) => unit.province.political_features),
      national,
    ]
    const problems = []
    for (const vector of vectors) {
      for (const key of FEATURE_KEYS) {
        const value = vector[key]
        if (typeof value !== 'number' || !(value >= 0 && value <= 1)) problems.push(`${key}=${value}`)
      }
    }
    expect([...new Set(problems)]).toEqual([])
  })

  it('lets blank counties fall back to province yields', () => {
    const province = { population: 20, yields: { production: 200, science: 10 } }
    const base = { food_index: 0.2, production_index: 0.9, gold_index: 0.1, culture_index: 0.1, science_index: 0.1, faith_index: 0, frontier_index: 0.3, provincial_development: 0.2 }
    const blank = { county_population: 100, has_details: false, political_features: { industrial_index: 0 } }
    const described = { county_population: 100, has_details: true, political_features: { industrial_index: 0 } }
    const fromBlank = calculateProvinceFeatures(province, {}, [blank], 100, { baseFeatures: base })
    const fromDescribed = calculateProvinceFeatures(province, {}, [described], 100, { baseFeatures: base })
    expect(fromBlank.county_coverage).toBe(0)
    expect(fromBlank.industrial_index).toBeCloseTo(0.48 * 0.9, 5)
    expect(fromDescribed.industrial_index).toBe(0)
  })

  it('reads land by area, economy by population, and institutions by presence', () => {
    const base = { frontier_index: 0.3, provincial_development: 0 }
    const center = { county_population: 90, has_details: true, political_features: { coastal_index: 0, urban_index: 1, military_index: 0 } }
    const shore = { county_population: 5, has_details: true, political_features: { coastal_index: 1, urban_index: 0, military_index: 0 } }
    const garrison = { county_population: 5, has_details: true, political_features: { coastal_index: 1, urban_index: 0, military_index: 1 } }
    const features = calculateProvinceFeatures({}, {}, [center, shore, garrison], 100, { baseFeatures: base })
    expect(features.coastal_index).toBeCloseTo(2 / 3, 5)
    expect(features.urban_index).toBeCloseTo(0.9, 5)
    expect(features.military_index).toBeGreaterThan(0.6)
  })

  it('migrates weights saved against earlier versions of the model', () => {
    const { affinities, biasDelta } = migrateAffinityMap({
      urbanization_index: 0.2,
      imperial_origin_index: 0.1,
      neighborhood_index: 0.1,
      residential_index: 0.05,
      taoist_share: 0.3,
      industrial_index: 0.25,
    })
    expect(affinities).toEqual({ urban_index: 0.2, foreign_origin_index: -0.1, middle_class_index: 0.15, industrial_index: 0.25 })
    expect(biasDelta).toBeCloseTo(0.1, 6)

    const config = normalizeConfig(jayavarman)
    for (const party of config.parties) {
      for (const scope of ['county', 'province', 'national']) {
        expect(hasLegacyFeatureKeys(party.affinities[scope]), `${party.id} ${scope}`).toBe(false)
        Object.keys(party.affinities[scope]).forEach((key) => expect(FEATURE_KEYS).toContain(key))
      }
    }
  })

  it('answers old feature names in trends and blocs from current features', () => {
    const features = { foreign_origin_index: 0.25, frontier_index: 0.4, middle_class_index: 0.6 }
    expect(readFeature(features, 'imperial_origin_index')).toBeCloseTo(0.75, 6)
    expect(readFeature(features, 'connectedness_index')).toBeCloseTo(0.6, 6)
    expect(readFeature(features, 'commercial_middle_class_index')).toBe(0.6)
    expect(readFeature(features, 'not_a_feature')).toBeUndefined()
    expect(Object.keys(LEGACY_FEATURE_MAP)).not.toContain('urban_index')

    const unit = { political_features: features }
    expect(matchesSelector(unit, { minCommercialMiddleClassIndex: 0.5 })).toBe(true)
    expect(matchesSelector(unit, { minMiddleClassIndex: 0.7 })).toBe(false)
    expect(matchesSelector(unit, { maxConnectednessIndex: 0.5 })).toBe(false)
  })

  it('grades the Taoist bloc by the province Taoist share', () => {
    const result = simulateElection({
      data: jayavarman,
      provinceRows: buildProvinceComparisonRows(jayavarman),
      electionConfig: { seed: 'model', jitterSeed: 'model', trends: [] },
    })
    const taoistProvince = result.provinces.find((province) => (province.political_features?.religion_shares?.Taoism || 0) > 0.05)
    expect(taoistProvince).toBeTruthy()
  })
})
