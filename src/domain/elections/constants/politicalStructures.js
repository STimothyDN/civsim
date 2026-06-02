/**
 * Predefined political structures.
 *
 * A structure definition is *data* the election engine reads to decide which
 * governing tiers exist and how the national chambers are composed. Two
 * structures ship today:
 *
 *   - decentralized: the original model — county → province → region → national,
 *     with devolved bicameral governments at province, region, and national.
 *   - federalist: two governing tiers (province + national, no region). The
 *     national lower house is population-driven (seats apportioned across
 *     provinces by population, then filled from each province's vote); the
 *     national upper house over-represents smaller provinces (equal seats per
 *     province by default, or the degressive prelate tiers).
 *
 * The structural shape (tiers, sizing/basis strategy names) lives here and is
 * NOT user-editable. The user-tunable knobs (population divisor, upper-house
 * basis, seats per province) live in `config.structure` and are merged on top
 * at engine read time via {@link resolveStructure}.
 */
import { deepClone } from '../../../utils/object'

export const DEFAULT_POPULATION_DIVISOR = 1000000

export const DECENTRALIZED = {
  id: 'decentralized',
  label: 'Decentralized / Devolved',
  description:
    'Devolved bicameral governments at every level — province, region, and national. ' +
    'Regional assemblies and councils aggregate from the provinces beneath them.',
  tiers: ['province', 'region', 'national'],
  hasRegionTier: true,
  national: {
    lower: { sizing: 'sumProvincialAssemblies', basis: 'blendedNationalClimate' },
    upper: { sizing: 'sumProvincialPrelateDelegations', basis: 'provinceByProvinceDhondt' },
  },
}

export const FEDERALIST = {
  id: 'federalist',
  label: 'Federalist',
  description:
    'Two governing tiers: provinces and a national government (no regional tier). ' +
    'The national lower house is apportioned across provinces by population; the ' +
    'national upper house over-represents smaller provinces.',
  tiers: ['province', 'national'],
  hasRegionTier: false,
  national: {
    lower: {
      sizing: 'populationDivisor',
      basis: 'hamiltonAcrossProvinces',
      apportionmentMethod: 'dhondt',
      populationDivisor: DEFAULT_POPULATION_DIVISOR,
    },
    upper: {
      sizing: 'equalPerProvince',
      basis: 'equalPerProvince',
      seatsPerProvince: 2,
    },
  },
}

export const POLITICAL_STRUCTURES = {
  decentralized: DECENTRALIZED,
  federalist: FEDERALIST,
}

export const POLITICAL_STRUCTURE_LIST = [DECENTRALIZED, FEDERALIST]

export const DEFAULT_STRUCTURE_ID = 'decentralized'

/**
 * The user-tunable structure knobs stored in `config.structure`. The `id`
 * selects which predefined structure is active; the `national` block holds the
 * editable knobs (defaults supplied so older templates normalize cleanly).
 */
export const DEFAULT_STRUCTURE = {
  id: DEFAULT_STRUCTURE_ID,
  national: {
    lower: { populationDivisor: DEFAULT_POPULATION_DIVISOR },
    upper: { basis: 'equalPerProvince', seatsPerProvince: 2 },
  },
}

/** A deep clone of the predefined definition for `id` (defaults to decentralized). */
export function getStructure(id) {
  return deepClone(POLITICAL_STRUCTURES[id] || DECENTRALIZED)
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function deepMerge(base, over) {
  const out = deepClone(base)
  if (!isPlainObject(over)) return out
  for (const key of Object.keys(over)) {
    const value = over[key]
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value)
    } else if (value !== undefined) {
      out[key] = deepClone(value)
    }
  }
  return out
}

/**
 * Resolve a stored `config.structure` into a full structure definition: start
 * from the predefined definition for its `id`, then overlay the user knobs.
 * The structural shape (id, tiers, hasRegionTier) is locked to the definition
 * so user data can never produce an unknown/invalid structure.
 */
export function resolveStructure(structureConfig) {
  const base = getStructure(structureConfig?.id)
  if (!isPlainObject(structureConfig)) return base
  const merged = deepMerge(base, structureConfig)
  merged.id = base.id
  merged.tiers = base.tiers
  merged.hasRegionTier = base.hasRegionTier
  return merged
}
