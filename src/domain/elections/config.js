import { deepClone } from '../../utils/object'
import { normalizePartyConfig } from './constants/parties'
import {
  DEFAULT_CHAMBERS,
  DEFAULT_CALCULATIONS,
  DEFAULT_ELECTION_RULES,
  DEFAULT_NAMING,
  DEFAULT_STRUCTURE,
  createDefaultConfig,
} from './constants/defaultConfig'
import { POLITICAL_STRUCTURES } from './constants/politicalStructures'
import { DEFAULT_VOTER_BLOCS } from './constants/defaultVoterBlocs'

export { createDefaultConfig }

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

/** Deep-merge `overrides` onto a clone of `defaults`. Arrays are replaced wholesale. */
function mergeDefaults(defaults, overrides) {
  const out = deepClone(defaults)
  if (!isPlainObject(overrides)) return out
  for (const key of Object.keys(overrides)) {
    const value = overrides[key]
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = mergeDefaults(out[key], value)
    } else if (value !== undefined) {
      out[key] = deepClone(value)
    }
  }
  return out
}

function normalizeVoterBlocs(value) {
  if (!Array.isArray(value)) return deepClone(DEFAULT_VOTER_BLOCS)
  return value
    .filter((bloc) => bloc && typeof bloc === 'object')
    .map((bloc, index) => ({
      id: String(bloc.id || `bloc-${index + 1}`),
      label: String(bloc.label || bloc.id || `Voter bloc ${index + 1}`),
      party: String(bloc.party || ''),
      // Optional link to a representative-naming culture (config.naming.cultures[].id).
      // When set, reps of this bloc's party draw on that culture's names in
      // provinces where the bloc is present (province-aware naming).
      cultureId: bloc.cultureId ? String(bloc.cultureId) : null,
      source: isPlainObject(bloc.source) ? deepClone(bloc.source) : {},
      strength: isPlainObject(bloc.strength)
        ? { county: Number(bloc.strength.county) || 0, province: Number(bloc.strength.province) || 0, national: Number(bloc.strength.national) || 0 }
        : { county: Number(bloc.strength) || 0, province: Number(bloc.strength) || 0, national: Number(bloc.strength) || 0 },
    }))
}

function normalizeCalculations(value) {
  const calc = mergeDefaults(DEFAULT_CALCULATIONS, value)
  // prelateTiers: keep provided array (sorted desc by min) or default.
  if (Array.isArray(value?.prelateTiers) && value.prelateTiers.length) {
    calc.prelateTiers = value.prelateTiers
      .filter((tier) => tier && typeof tier === 'object')
      .map((tier) => ({ min: Number(tier.min) || 0, seats: Math.max(0, Math.round(Number(tier.seats) || 0)) }))
      .sort((a, b) => b.min - a.min)
  }
  return calc
}

function normalizeNameList(value) {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

function normalizeCulture(raw, index) {
  return {
    id: String(raw?.id || `culture-${index + 1}`),
    label: String(raw?.label || raw?.id || `Culture ${index + 1}`),
    givenMale: normalizeNameList(raw?.givenMale),
    givenFemale: normalizeNameList(raw?.givenFemale),
    surnames: normalizeNameList(raw?.surnames),
    selector: isPlainObject(raw?.selector) ? deepClone(raw.selector) : null,
    parties: Array.isArray(raw?.parties) ? raw.parties.map((p) => String(p)) : [],
    influence: Number.isFinite(Number(raw?.influence)) ? Number(raw.influence) : 1,
    ambient: Number.isFinite(Number(raw?.ambient)) ? Number(raw.ambient) : 0,
    surnameBlend: Number.isFinite(Number(raw?.surnameBlend)) ? Number(raw.surnameBlend) : 0,
  }
}

function normalizeNaming(value) {
  if (!isPlainObject(value)) return deepClone(DEFAULT_NAMING)
  const home = value.homeCulture || {}
  return {
    homeCulture: {
      id: 'home',
      label: String(home.label || DEFAULT_NAMING.homeCulture.label),
      givenMale: normalizeNameList(home.givenMale).length ? normalizeNameList(home.givenMale) : deepClone(DEFAULT_NAMING.homeCulture.givenMale),
      givenFemale: normalizeNameList(home.givenFemale).length ? normalizeNameList(home.givenFemale) : deepClone(DEFAULT_NAMING.homeCulture.givenFemale),
      surnames: normalizeNameList(home.surnames).length ? normalizeNameList(home.surnames) : deepClone(DEFAULT_NAMING.homeCulture.surnames),
    },
    cultures: Array.isArray(value.cultures) ? value.cultures.map(normalizeCulture) : deepClone(DEFAULT_NAMING.cultures),
  }
}

const VALID_UPPER_BASES = new Set(['equalPerProvince', 'degressiveTiers'])

/**
 * Normalize the per-template political structure knobs. Only the predefined
 * structure shape is trusted (resolved at engine time); this validates the
 * user-editable id + knobs, falling back to decentralized defaults.
 */
function normalizeStructure(value) {
  const out = mergeDefaults(DEFAULT_STRUCTURE, value)
  out.id = POLITICAL_STRUCTURES[value?.id] ? value.id : DEFAULT_STRUCTURE.id
  if (!isPlainObject(out.national)) out.national = deepClone(DEFAULT_STRUCTURE.national)
  if (!isPlainObject(out.national.lower)) out.national.lower = {}
  if (!isPlainObject(out.national.upper)) out.national.upper = {}

  const divisor = Number(out.national.lower.populationDivisor)
  out.national.lower.populationDivisor =
    Number.isFinite(divisor) && divisor > 0 ? divisor : DEFAULT_STRUCTURE.national.lower.populationDivisor

  out.national.upper.basis = VALID_UPPER_BASES.has(out.national.upper.basis)
    ? out.national.upper.basis
    : DEFAULT_STRUCTURE.national.upper.basis

  const seats = Math.round(Number(out.national.upper.seatsPerProvince))
  out.national.upper.seatsPerProvince =
    Number.isFinite(seats) && seats >= 0 ? seats : DEFAULT_STRUCTURE.national.upper.seatsPerProvince

  return out
}

/**
 * Build the canonical, fully-populated config block from raw template data.
 * Migrates the legacy top-level `election_parties` map into `config.parties`.
 */
export function normalizeConfig(data) {
  const raw = isPlainObject(data?.config) ? data.config : {}
  return {
    parties: normalizePartyConfig(raw.parties ?? data?.election_parties),
    voterBlocs: normalizeVoterBlocs(raw.voterBlocs),
    chambers: mergeDefaults(DEFAULT_CHAMBERS, raw.chambers),
    calculations: normalizeCalculations(raw.calculations),
    elections: mergeDefaults(DEFAULT_ELECTION_RULES, raw.elections),
    structure: normalizeStructure(raw.structure),
    naming: normalizeNaming(raw.naming),
  }
}
