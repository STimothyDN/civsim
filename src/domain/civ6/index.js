import { TERRAINS, TERRAIN_BASE_ORDER, DEFAULT_TERRAIN_POPULATION } from './terrains'
import { TERRAIN_FEATURES, SPECIAL_FEATURES, NATURAL_WONDERS, FEATURE_PATTERNS, MARITIME_BASIN_KEYWORDS } from './features'
import { RESOURCES } from './resources'
import { TILE_IMPROVEMENTS } from './improvements'
import { DISTRICTS } from './districts'
import { WONDERS } from './wonders'
import { BUILDINGS, BUILDING_TIERS } from './buildings'

/**
 * Civ 6 reference catalog: every terrain, feature, resource, improvement,
 * district, wonder and building the county editor suggests, each carrying the
 * weights the election engine reads (see terrains.js for the entry fields).
 *
 * Lookups are case-, accent- and punctuation-insensitive and accept aliases,
 * so "Estádio do Maracanã", "estadio do maracana" and a save's old typo all
 * resolve to the same entry.
 */

export { BUILDING_TIERS, DEFAULT_TERRAIN_POPULATION, FEATURE_PATTERNS, MARITIME_BASIN_KEYWORDS }

const normalizedCache = new Map()

export function normalizeName(value) {
  const raw = String(value ?? '')
  let key = normalizedCache.get(raw)
  if (key === undefined) {
    key = raw
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[.'’`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    normalizedCache.set(raw, key)
  }
  return key
}

/** Fold a unique entry onto the entry it replaces; its own fields win. */
function inherit(entries, baseIndex) {
  return entries.map((entry) => {
    if (!entry.replaces) return entry
    const base = baseIndex.get(normalizeName(entry.replaces))
    if (!base) return entry
    const { name, kind, aliases, hidden, civ, ...baseFields } = base
    return { ...baseFields, ...entry, signals: { ...base.signals, ...entry.signals } }
  })
}

function buildIndex(entries) {
  const index = new Map()
  for (const entry of entries) {
    for (const name of [entry.name, ...(entry.aliases || [])]) {
      const key = normalizeName(name)
      if (!index.has(key)) index.set(key, entry)
    }
  }
  return index
}

function withInheritance(entries) {
  return inherit(entries, buildIndex(entries))
}

export const CIV6_TERRAINS = TERRAINS
export const CIV6_FEATURES = [...TERRAIN_FEATURES, ...NATURAL_WONDERS, ...SPECIAL_FEATURES]
export const CIV6_RESOURCES = RESOURCES
// Everything that can sit in a county's `improvement.name`.
export const CIV6_IMPROVEMENTS = withInheritance([...DISTRICTS, ...WONDERS, ...TILE_IMPROVEMENTS])
export const CIV6_BUILDINGS = withInheritance(BUILDINGS)

const TERRAIN_INDEX = buildIndex(CIV6_TERRAINS)
const FEATURE_INDEX = buildIndex(CIV6_FEATURES)
const RESOURCE_INDEX = buildIndex(CIV6_RESOURCES)
const IMPROVEMENT_INDEX = buildIndex(CIV6_IMPROVEMENTS)
const BUILDING_INDEX = buildIndex(CIV6_BUILDINGS)

const parsedTerrainCache = new Map()

// Terrain strings not spelled like an entry ("grassland hills", "Coastal
// waters") resolve by the base and elevation words they contain.
function parseTerrain(key) {
  if (parsedTerrainCache.has(key)) return parsedTerrainCache.get(key)
  let name = null
  if (key.includes('coast')) name = 'Coast'
  else if (key.includes('ocean')) name = 'Ocean'
  else {
    const base = TERRAIN_BASE_ORDER.find((candidate) => key.includes(candidate.toLowerCase()))
    const elevation = key.includes('mountain') ? 'Mountain' : key.includes('hill') ? 'Hills' : null
    if (base) name = elevation ? `${base} (${elevation})` : base
    else if (elevation === 'Mountain') name = 'Mountains'
    else if (key.includes('lake')) name = 'Lake'
  }
  const entry = name ? TERRAIN_INDEX.get(normalizeName(name)) : null
  parsedTerrainCache.set(key, entry || null)
  return entry || null
}

export function resolveTerrain(value) {
  const key = normalizeName(value)
  if (!key) return null
  return TERRAIN_INDEX.get(key) || parseTerrain(key)
}

export function resolveFeature(value) {
  return FEATURE_INDEX.get(normalizeName(value)) || null
}

const patternCache = new Map()

/** Named-geography patterns a non-catalog feature key matches, in order. */
export function matchFeaturePatterns(value) {
  const key = normalizeName(value)
  let matches = patternCache.get(key)
  if (!matches) {
    matches = key
      ? FEATURE_PATTERNS.filter((pattern) => pattern.keywords.some((keyword) => key.includes(normalizeName(keyword))))
      : []
    patternCache.set(key, matches)
  }
  return matches
}

export function resolveResource(value) {
  return RESOURCE_INDEX.get(normalizeName(value)) || null
}

export function resolveImprovement(value) {
  return IMPROVEMENT_INDEX.get(normalizeName(value)) || null
}

export function resolveBuilding(value) {
  return BUILDING_INDEX.get(normalizeName(value)) || null
}

/** The standard district an improvement name belongs to, if it is a district. */
export function districtOf(improvementName) {
  const entry = resolveImprovement(improvementName)
  if (!entry || (entry.kind !== 'District' && entry.kind !== 'Unique district')) return null
  return entry.replaces || entry.name
}

/** Catalog buildings that can be built in this improvement's district. */
export function buildingsForImprovement(improvementName) {
  const district = districtOf(improvementName)
  if (!district) return []
  return CIV6_BUILDINGS.filter((entry) => !entry.hidden && entry.district === district).map((entry) => entry.name)
}

// ── Editor suggestions ─────────────────────────────────────────────────────

function suggestionLabel(entry) {
  const parts = [entry.district && entry.kind === 'Building' ? `${entry.district} building` : entry.kind]
  if (entry.civ) parts.push(entry.civ)
  if (entry.replaces) parts.push(`replaces ${entry.replaces}`)
  return parts.filter(Boolean).join(' · ')
}

function toSuggestions(entries) {
  return entries
    .filter((entry) => !entry.hidden)
    .map((entry) => ({ value: entry.name, label: suggestionLabel(entry) }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

export const CIV6_SUGGESTIONS = {
  terrain: toSuggestions(CIV6_TERRAINS),
  features: toSuggestions(CIV6_FEATURES),
  resource: toSuggestions(CIV6_RESOURCES),
  improvement: toSuggestions(CIV6_IMPROVEMENTS),
  buildings: toSuggestions(CIV6_BUILDINGS),
}

const RESOLVERS = {
  terrain: (value) => TERRAIN_INDEX.get(normalizeName(value)),
  features: resolveFeature,
  resource: resolveResource,
  improvement: resolveImprovement,
  buildings: resolveBuilding,
}

/**
 * Catalog suggestions for a county field followed by the world's own values the
 * catalog doesn't know (named seas, custom parks, …). Values that are only a
 * different spelling of a catalog entry are folded into that entry.
 *
 * @param {'terrain'|'features'|'resource'|'improvement'|'buildings'} field
 * @param {string[]} worldValues values already used in the loaded world
 * @param {string[]} [priority] catalog names to list first (e.g. a district's buildings)
 */
export function suggestionsFor(field, worldValues = [], priority = []) {
  const catalog = CIV6_SUGGESTIONS[field] || []
  const resolve = RESOLVERS[field] || (() => null)
  const custom = []
  const seen = new Set(catalog.map((option) => normalizeName(option.value)))
  for (const value of worldValues) {
    const key = normalizeName(value)
    const entry = key ? resolve(value) : null
    if (!key || seen.has(key) || (entry && !entry.hidden)) continue
    seen.add(key)
    custom.push({ value, label: 'In this world' })
  }
  if (!priority.length) return [...catalog, ...custom]
  const first = new Set(priority.map(normalizeName))
  return [
    ...catalog.filter((option) => first.has(normalizeName(option.value))),
    ...catalog.filter((option) => !first.has(normalizeName(option.value))),
    ...custom,
  ]
}
