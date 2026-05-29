import { deepClone } from '../../utils/object'
import { normalizePartyConfig } from './constants/parties'
import {
  DEFAULT_CHAMBERS,
  DEFAULT_CALCULATIONS,
  DEFAULT_ELECTION_RULES,
  createDefaultConfig,
} from './constants/defaultConfig'
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
  }
}
