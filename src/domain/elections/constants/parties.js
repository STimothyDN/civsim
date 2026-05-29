import { DEFAULT_PARTIES } from './defaultParties'

export { DEFAULT_PARTIES }

/**
 * Default party id list. Party-map helpers (createEmptySeats, scoresToVoteShares,
 * apportionment, …) default to this when no explicit party list is threaded
 * through, preserving legacy behavior. The live engine threads the actual
 * configured id list via electionConfig.partyList.
 */
export const PARTIES = DEFAULT_PARTIES.map((party) => party.id)

const DEFAULT_PARTY_BY_ID = Object.fromEntries(DEFAULT_PARTIES.map((p) => [p.id, p]))

export const PARTY_COLOR_PALETTE = [
  { name: 'Yellow', color: '#d4a843' },
  { name: 'Orange', color: '#fb923c' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Blue', color: '#60a5fa' },
  { name: 'White', color: '#f8fafc' },
  { name: 'Purple', color: '#a78bfa' },
  { name: 'Teal', color: '#2dd4bf' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Slate', color: '#94a3b8' },
]

function sanitizeColor(value) {
  const color = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : ''
}

function paletteOptionForValue(value, fallbackName = 'Yellow') {
  const text = String(value || '').trim()
  const lowered = text.toLowerCase()
  const byName = PARTY_COLOR_PALETTE.find((option) => option.name.toLowerCase() === lowered)
  if (byName) return byName

  const color = sanitizeColor(text)
  const byColor = PARTY_COLOR_PALETTE.find((option) => option.color.toLowerCase() === color)
  if (byColor) return byColor

  return PARTY_COLOR_PALETTE.find((option) => option.name === fallbackName) || PARTY_COLOR_PALETTE[0]
}

export function partyPaletteOption(value, fallbackName = 'Yellow') {
  return paletteOptionForValue(value, fallbackName)
}

function sanitizeAbbreviation(value, fallback) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  return text.slice(0, 8) || fallback
}

function slugify(value, index) {
  const base = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || `party-${index + 1}`
}

const EMPTY_AFFINITIES = () => ({ county: {}, province: {}, national: {} })
const EMPTY_BIAS = () => ({ county: 0, province: 0, national: 0 })

function normalizeScopeMap(value, fallback) {
  const out = {}
  for (const scope of ['county', 'province', 'national']) {
    const src = value?.[scope]
    out[scope] = src && typeof src === 'object' ? { ...src } : (fallback?.[scope] ?? (typeof fallback === 'object' ? {} : 0))
  }
  return out
}

function normalizeBias(value, fallback) {
  const out = {}
  for (const scope of ['county', 'province', 'national']) {
    const v = value?.[scope]
    out[scope] = Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : Number(fallback?.[scope] ?? 0)
  }
  return out
}

function normalizeOneParty(source, index, usedIds) {
  const requestedId = String(source?.id || '').trim()
  const defaults = DEFAULT_PARTY_BY_ID[requestedId] || {}
  let id = requestedId || slugify(source?.name || source?.colorName, index)
  while (usedIds.has(id)) id = `${id}-${index}`
  usedIds.add(id)

  const colorOption = paletteOptionForValue(
    source?.colorName || source?.color,
    defaults.colorName || 'Yellow'
  )

  return {
    id,
    name: String(source?.name ?? defaults.name ?? '').trim() || defaults.name || `Party ${index + 1}`,
    abbreviation: sanitizeAbbreviation(
      source?.abbreviation || source?.shortName,
      defaults.abbreviation || id.slice(0, 3).toUpperCase()
    ),
    colorName: colorOption.name,
    color: colorOption.color,
    tier: (source?.tier ?? defaults.tier) === 'minor' ? 'minor' : 'major',
    ideology: String(source?.ideology ?? defaults.ideology ?? '').trim(),
    coalitionPartners: Array.isArray(source?.coalitionPartners)
      ? source.coalitionPartners.slice()
      : (defaults.coalitionPartners ? defaults.coalitionPartners.slice() : []),
    bias: normalizeBias(source?.bias, defaults.bias || EMPTY_BIAS()),
    affinities: {
      county: normalizeScopeMap({ county: source?.affinities?.county }, { county: defaults.affinities?.county }).county || {},
      province: normalizeScopeMap({ province: source?.affinities?.province }, { province: defaults.affinities?.province }).province || {},
      national: normalizeScopeMap({ national: source?.affinities?.national }, { national: defaults.affinities?.national }).national || {},
    },
  }
}

/**
 * Normalize party configuration into the canonical ARRAY form.
 * Accepts:
 *   - the new array form: [{ id, name, ... }]
 *   - the legacy map form: { yellow: { name, color, ... }, ... }
 *   - undefined/empty → DEFAULT_PARTIES (deep-cloned)
 */
export function normalizePartyConfig(value) {
  let sourceArray
  if (Array.isArray(value)) {
    sourceArray = value
  } else if (value && typeof value === 'object') {
    // Legacy map keyed by color id — preserve DEFAULT order.
    sourceArray = DEFAULT_PARTIES.map((p) => ({ id: p.id, ...value[p.id] }))
    // Include any extra keys not in defaults.
    Object.keys(value).forEach((key) => {
      if (!DEFAULT_PARTY_BY_ID[key]) sourceArray.push({ id: key, ...value[key] })
    })
  } else {
    sourceArray = DEFAULT_PARTIES
  }

  const usedIds = new Set()
  return sourceArray.map((source, index) => normalizeOneParty(source, index, usedIds))
}

/** Party id list from any config form. */
export function partyIdsFromConfig(value) {
  return normalizePartyConfig(value).map((party) => party.id)
}

/** Display metadata MAP keyed by party id. */
export function partyMetaFromConfig(value) {
  const config = normalizePartyConfig(value)
  return Object.fromEntries(
    config.map((party) => [
      party.id,
      {
        id: party.id,
        name: party.name,
        abbreviation: party.abbreviation,
        colorName: party.colorName,
        colorKey: party.id,
        colorLabel: `${party.colorName} Party`,
        color: party.color,
        ideology: party.ideology,
      },
    ])
  )
}

/** id -> name map. */
export function partyNamesFromConfig(value) {
  return Object.fromEntries(normalizePartyConfig(value).map((p) => [p.id, p.name]))
}

/** id -> color map. */
export function partyColorsFromConfig(value) {
  return Object.fromEntries(normalizePartyConfig(value).map((p) => [p.id, p.color]))
}

// ── Back-compat constants derived from DEFAULT_PARTIES ──
// Used as fallback defaults by helpers that accept a partyMeta map; the live
// engine passes config-derived maps. The legacy {color: {...}} map form
// remains accepted by normalizePartyConfig for old saved templates.
export const PARTY_META = partyMetaFromConfig(DEFAULT_PARTIES)
export const PARTY_NAMES = partyNamesFromConfig(DEFAULT_PARTIES)
export const PARTY_COLORS = partyColorsFromConfig(DEFAULT_PARTIES)
export const PARTY_COLOR_NAMES = Object.fromEntries(DEFAULT_PARTIES.map((p) => [p.id, p.colorName]))
export const PARTY_ABBREVIATIONS = Object.fromEntries(DEFAULT_PARTIES.map((p) => [p.id, p.abbreviation]))

/** Default party config in canonical array form (alias of DEFAULT_PARTIES). */
export const DEFAULT_PARTY_CONFIG = DEFAULT_PARTIES
