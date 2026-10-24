import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  BUILDING_TIERS,
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
import { LEAN_KEYS, SIGNAL_KEYS } from '../elections/features/countySignals'
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

const CONTEXT = { imperial_core_index: 0.5, minority_religion_share: 0.2, state_religion_share: 0.6, roman_identity_index: 0 }

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

  it('gives every entry political weights in the vocabulary the county formulas read', () => {
    const leanKeys = new Set(LEAN_KEYS)
    const signalKeys = new Set(SIGNAL_KEYS)
    for (const [field, entries] of Object.entries(CATALOGS)) {
      for (const entry of [...entries, ...(field === 'features' ? FEATURE_PATTERNS.map((p) => ({ ...p, name: p.id })) : [])]) {
        const signals = Object.entries(entry.signals || {}).filter(([, value]) => value > 0)
        const lean = Object.entries(entry.lean || {})
        const declares = signals.length > 0 || lean.length > 0 || Boolean(entry.tier) || entry.population !== undefined
        expect(declares, `${field}: ${entry.name} declares no weights`).toBe(true)
        for (const [key] of signals) expect(signalKeys.has(key), `${field}: ${entry.name} signal ${key}`).toBe(true)
        for (const [key] of lean) expect(leanKeys.has(key), `${field}: ${entry.name} lean ${key}`).toBe(true)
        if (entry.tier) expect(BUILDING_TIERS[entry.tier], `${entry.name} tier ${entry.tier}`).toBeGreaterThan(0)
      }
    }
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

  it('applies lean to every LEAN_KEYS feature', () => {
    // The Lake terrain leans coastal; check each key moves when leaned.
    const lake = calculateCountyFeatures(blankCounty({ terrain: 'Lake' }), CONTEXT)
    const plain = calculateCountyFeatures(blankCounty(), CONTEXT)
    expect(lake.coastal_index - plain.coastal_index).toBeCloseTo(0.12, 6)
    const leaned = new Set(CIV6_BUILDINGS.concat(CIV6_FEATURES, CIV6_RESOURCES, CIV6_IMPROVEMENTS, CIV6_TERRAINS)
      .flatMap((entry) => Object.keys(entry.lean || {})))
    expect(LEAN_KEYS.filter((key) => !leaned.has(key) && key !== 'cultural_output_index')).toEqual([])
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
    expect(lavra.signals.holy_site).toBe(1)
    expect(lavra.population).toBe(1.8)
    expect(resolveImprovement('Mbanza').signals).toMatchObject({ residential: 1, neighborhood: 1 })
    expect(resolveBuilding('Madrasa')).toMatchObject({ tier: 'science', district: 'Campus' })
    expect(resolveBuilding('Palgum')).toMatchObject({ tier: 'housing', housing: 0.1 })
    expect(resolveBuilding('Film Studio').lean).toEqual(resolveBuilding('Broadcast Center').lean)

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
