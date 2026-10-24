import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  CIV6_BUILDINGS,
  CIV6_FEATURES,
  CIV6_IMPROVEMENTS,
  CIV6_RESOURCES,
  CIV6_TERRAINS,
  FEATURE_PATTERNS,
  buildingsForImprovement,
  normalizeName,
  resolveBuilding,
  resolveFeature,
  resolveImprovement,
  resolveResource,
  resolveTerrain,
  suggestionsFor,
} from './index'
import { calculateCountyFeatures } from '../elections/features/countyFeatures'
import { PROFILE_KEYS } from '../elections/features/countyProfile'
import { featuresForScope } from '../elections/features/featureCatalog'

const CATALOGS = {
  terrain: CIV6_TERRAINS,
  features: CIV6_FEATURES,
  resource: CIV6_RESOURCES,
  improvement: CIV6_IMPROVEMENTS,
  buildings: CIV6_BUILDINGS,
}

const WEIGHTED_COUNTY_FEATURES = featuresForScope('county').map((entry) => entry.key)
// Smallest move in some weighted county feature that counts as an impact.
const MEANINGFUL = 0.015

function blankCounty(overrides = {}) {
  return {
    terrain: 'Placeholder Terrain',
    features: {},
    resource: null,
    improvement: { name: '', buildings: {}, great_works: {} },
    distance_from_center: 2,
    citizens_working: 1,
    appeal: null,
    yields: {},
    ...overrides,
  }
}

const CONTEXT = { imperial_core_index: 0.5, minority_religion_share: 0.2, state_religion_share: 0.6, happiness_index: 0.5 }

function largestWeightedShift(withEntry, without) {
  const a = calculateCountyFeatures(withEntry, CONTEXT)
  const b = calculateCountyFeatures(without, CONTEXT)
  return Math.max(...WEIGHTED_COUNTY_FEATURES.map((key) => Math.abs((a[key] || 0) - (b[key] || 0))))
}

// Each pair compares a county holding the entry against the same county holding
// an unknown value in its place, so only the catalog's weights differ.
const PLACEMENTS = {
  terrain: (name) => [blankCounty({ terrain: name }), blankCounty()],
  features: (name) => [blankCounty({ features: { [name]: true } }), blankCounty({ features: { 'Placeholder Feature': true } })],
  resource: (name) => [
    blankCounty({ resource: name, features: { [name]: true } }),
    blankCounty({ resource: 'Placeholder Ore', features: { 'Placeholder Ore': true } }),
  ],
  improvement: (name) => [
    blankCounty({ improvement: { name, buildings: {}, great_works: {} } }),
    blankCounty({ improvement: { name: 'Placeholder Works', buildings: {}, great_works: {} } }),
  ],
  buildings: (name, entry) => {
    const district = entry.district || 'City Center'
    return [
      blankCounty({ improvement: { name: district, buildings: { [name]: true }, great_works: {} } }),
      blankCounty({ improvement: { name: district, buildings: { 'Placeholder Hall': true }, great_works: {} } }),
    ]
  },
}

describe('Civ 6 catalog', () => {
  it('covers the game: every terrain, feature, natural wonder, resource, improvement, district, wonder and building', () => {
    const kinds = (list) => new Set(list.map((entry) => entry.kind))
    expect(CIV6_TERRAINS.length).toBe(19)
    expect(CIV6_FEATURES.filter((entry) => entry.kind === 'Natural wonder').length).toBe(34)
    expect(CIV6_RESOURCES.filter((entry) => !entry.hidden).length).toBe(52)
    expect(CIV6_IMPROVEMENTS.filter((entry) => entry.kind === 'World wonder').length).toBe(53)
    expect(kinds(CIV6_IMPROVEMENTS)).toEqual(new Set([
      'District', 'Unique district', 'World wonder', 'Tile improvement', 'Unique improvement',
      'City-state improvement', 'Governor improvement', 'Game mode',
    ]))
    expect(CIV6_BUILDINGS.filter((entry) => !entry.hidden).length).toBeGreaterThan(85)
  })

  it('has no duplicate names or aliases within a field', () => {
    for (const [field, entries] of Object.entries(CATALOGS)) {
      const seen = new Map()
      for (const entry of entries) {
        for (const name of [entry.name, ...(entry.aliases || [])]) {
          const key = normalizeName(name)
          expect(seen.get(key), `${field}: "${name}" duplicates "${seen.get(key)}"`).toBeUndefined()
          seen.set(key, entry.name)
        }
      }
    }
  })

  it('gives every entry a profile in the vocabulary the county formulas read', () => {
    const known = new Set(PROFILE_KEYS)
    const problems = []
    const patterns = FEATURE_PATTERNS.map((pattern) => ({ ...pattern, name: `pattern:${pattern.id}` }))
    for (const [field, entries] of Object.entries({ ...CATALOGS, patterns })) {
      for (const entry of entries) {
        const profile = Object.entries(entry.profile || {})
        if (!profile.length && !entry.population) problems.push(`${field}: ${entry.name} has no profile`)
        for (const [key, value] of profile) {
          if (!known.has(key)) problems.push(`${field}: ${entry.name} profile key ${key}`)
          if (!(value >= -1 && value <= 1)) problems.push(`${field}: ${entry.name} ${key}=${value}`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('reads entries as what they are', () => {
    const features = (county) => calculateCountyFeatures(blankCounty(county), CONTEXT)
    const with_ = (name) => features({ improvement: { name, buildings: {}, great_works: {} } })
    expect(with_('Campus').intellectual_index).toBeGreaterThan(0.8)
    expect(with_('Farm').agrarian_index).toBeGreaterThan(0.75)
    expect(with_('Mine').extractive_index).toBeGreaterThan(0.8)
    expect(with_('Mine').worker_index).toBeGreaterThan(0.4)
    expect(with_('Industrial Zone').pollution_index).toBeGreaterThan(0.5)
    expect(with_('Neighborhood').middle_class_index).toBeGreaterThan(0.8)
    expect(with_('Hagia Sophia').spiritual_index).toBeGreaterThan(0.85)
    expect(with_('Government Plaza').localist_index).toBeLessThan(with_('Placeholder Works').localist_index)

    // Buildings stack with diminishing returns, never past 1.
    const campus = (buildings) => features({ improvement: { name: 'Campus', buildings, great_works: {} } }).intellectual_index
    const full = campus({ Library: true, University: true, 'Research Lab': true })
    expect(full).toBeGreaterThan(campus({ Library: true }))
    expect(full).toBeLessThanOrEqual(1)

    // Clean energy and preserves cut pollution; an untapped deposit counts half.
    const mine = features({ improvement: { name: 'Mine', buildings: {}, great_works: {} }, resource: 'Coal' })
    const deposit = features({ resource: 'Coal' })
    expect(deposit.extractive_index).toBeLessThan(mine.extractive_index)
    expect(features({ terrain: 'Snow' }).hardship_index).toBeGreaterThan(0.85)
    expect(features({ terrain: 'Grassland (Hills)' }).mountain_index).toBeGreaterThan(0.35)
    expect(features({ features: { 'Sonoran Desert': true } }).hardship_index).toBeGreaterThan(0.4)
  })

  it('moves at least one weighted county feature for every entry players can pick', () => {
    const weak = []
    for (const [field, entries] of Object.entries(CATALOGS)) {
      for (const entry of entries) {
        if (entry.hidden) continue
        const [withEntry, without] = PLACEMENTS[field](entry.name, entry)
        const shift = largestWeightedShift(withEntry, without)
        if (shift < MEANINGFUL) weak.push(`${field}: ${entry.name} (${shift.toFixed(4)})`)
      }
    }
    expect(weak).toEqual([])
  })

  it('resolves names case-, accent- and punctuation-insensitively, with aliases', () => {
    expect(resolveImprovement('Estádio do Maracanã').name).toBe('Estadio do Maracana')
    expect(resolveImprovement('biosphère').name).toBe('Biosphere')
    expect(resolveImprovement('Orsaghaz').name).toBe('Orszaghaz')
    expect(resolveImprovement('Venetial Arsenal').name).toBe('Venetian Arsenal')
    expect(resolveImprovement('st basils cathedral').name).toBe("St. Basil's Cathedral")
    expect(resolveFeature('Cliff').name).toBe('Cliffs')
    expect(resolveFeature('Hạ Long Bay').name).toBe('Ha Long Bay')
    expect(resolveBuilding('Ampitheater').name).toBe('Amphitheater')
    expect(resolveResource('aluminium').name).toBe('Aluminum')
    expect(resolveTerrain('Grassland (Hills)').name).toBe('Grassland (Hills)')
    expect(resolveTerrain('grassland hills').name).toBe('Grassland (Hills)')
    expect(resolveTerrain('Tundra Mountain').name).toBe('Tundra (Mountain)')
    expect(resolveTerrain('Coastal waters').name).toBe('Coast')
    expect(resolveTerrain('')).toBeNull()
  })

  it('lets unique districts and buildings inherit from what they replace', () => {
    const lavra = resolveImprovement('Lavra')
    expect(lavra.profile.spiritual).toBe(resolveImprovement('Holy Site').profile.spiritual)
    expect(lavra.profile.cultural).toBeGreaterThan(0)
    expect(lavra.population).toBe(1.8)
    expect(resolveImprovement('Mbanza').profile).toMatchObject({ middle_class: 0.85, commercial: 0.2 })
    expect(resolveBuilding('Madrasa')).toMatchObject({ district: 'Campus', profile: { intellectual: 0.5, spiritual: 0.3 } })
    expect(resolveBuilding('Palgum')).toMatchObject({ housing: 0.1, profile: { agrarian: 0.35 } })
    expect(resolveBuilding('Gilded Vault').profile.commercial).toBeGreaterThan(0.5)

    const lavraBuildings = buildingsForImprovement('Lavra')
    expect(lavraBuildings).toEqual(expect.arrayContaining(['Shrine', 'Temple', 'Prasat', 'Cathedral', 'Wat']))
    expect(lavraBuildings).not.toContain('Library')
    expect(buildingsForImprovement('Farm')).toEqual([])
    expect(buildingsForImprovement('Eiffel Tower')).toEqual([])
  })

  it('suggests catalog values first, then the world\'s own values the catalog does not know', () => {
    const options = suggestionsFor('features', ['Gulf of Thailand', 'Cliff', 'woods', 'Deer'])
    const values = options.map((option) => option.value)
    expect(values).toContain('Cliffs')
    expect(values).not.toContain('Cliff')
    expect(values).not.toContain('woods')
    expect(values.slice(-2)).toEqual(['Gulf of Thailand', 'Deer'])
    expect(options.find((option) => option.value === 'Mount Everest').label).toBe('Natural wonder')

    const campusFirst = suggestionsFor('buildings', [], buildingsForImprovement('Seowon')).slice(0, 6).map((o) => o.value)
    expect(campusFirst).toEqual(expect.arrayContaining(['Library', 'University', 'Research Lab', 'Madrasa']))
    expect(suggestionsFor('resource').some((option) => option.value === 'Gems')).toBe(false)
  })

  it('knows every terrain, resource, improvement and building used in the Khmer save', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const data = JSON.parse(readFileSync(resolve(here, '../../../jayavarman.json'), 'utf8'))
    const unknown = new Set()
    for (const province of data.provinces) {
      for (const county of province.counties || []) {
        if (county.terrain && !resolveTerrain(county.terrain)) unknown.add(`terrain: ${county.terrain}`)
        if (county.resource && !resolveResource(county.resource)) unknown.add(`resource: ${county.resource}`)
        const improvement = county.improvement?.name
        if (improvement && !resolveImprovement(improvement)) unknown.add(`improvement: ${improvement}`)
        for (const building of Object.keys(county.improvement?.buildings || {})) {
          if (!resolveBuilding(building)) unknown.add(`building: ${building}`)
        }
      }
    }
    expect([...unknown]).toEqual([])
  })
})
