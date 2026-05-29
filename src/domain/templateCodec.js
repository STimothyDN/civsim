import { deepClone } from '../utils/object'
import { defaultTemplate, normalizeIds, sortClosestProvinces } from '../utils/schema'
import { normalizeConfig } from './elections/config'

export const CALCULATED_PROVINCE_KEYS = [
  'provincial_population',
  'assemblypeople',
  'prelates',
  'dominant_religion',
]

function normalizeNameArray(value) {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    if (item && typeof item === 'object') return item.name || ''
    return item
  })
}

function stripCalculatedProvinceFields(provinces) {
  if (!Array.isArray(provinces)) return

  provinces.forEach((province) => {
    CALCULATED_PROVINCE_KEYS.forEach((key) => {
      delete province[key]
    })
  })
}

export function normalizeTemplateInput(template) {
  const source = template || defaultTemplate
  const normalized = deepClone(source)
  // election_state is restored separately; computed/meta are recomputed on load.
  delete normalized.election_state
  delete normalized.computed
  delete normalized.schema_version
  delete normalized.exported_at

  normalized.country = normalized.country || deepClone(defaultTemplate.country)
  normalized.provinces = Array.isArray(normalized.provinces) ? normalized.provinces : []
  normalized.province_groups = normalizeNameArray(normalized.province_groups)
  normalized.global_religions = normalizeNameArray(normalized.global_religions)

  stripCalculatedProvinceFields(normalized.provinces)
  normalizeIds(normalized) // migrates legacy election_parties -> config and normalizes config

  return normalized
}

export function buildExportTemplate(currentData, provinceCalcs, regionalTotals) {
  if (!currentData) return null

  const output = deepClone(currentData)
  output.config = normalizeConfig(output)
  delete output.election_parties
  const homeCountryName = String(currentData?.country?.basic_info?.name || '').trim()
  const calcs = Array.isArray(provinceCalcs) ? provinceCalcs : []
  const totals = regionalTotals instanceof Map ? regionalTotals : new Map()

  if (Array.isArray(output.provinces)) {
    output.provinces.forEach((province, index) => {
      sortClosestProvinces(province.closest_provinces)
      const calc = calcs[index] || {}
      province.provincial_population = calc.provincialPopulation ?? null
      province.assemblypeople = calc.assemblypeople ?? null
      province.prelates = calc.prelates ?? null
      province.dominant_religion = calc.dominantReligion ?? 'None'

      if (homeCountryName && province.is_founded && !province.is_joined && !province.is_conquered) {
        province.original_country = homeCountryName
      }
    })
  }

  if (Array.isArray(output.province_groups)) {
    output.province_groups = output.province_groups.map((name) => {
      const total = totals.get(name)
      return {
        name,
        regional_population: total?.regionalPopulation ?? null,
        assemblypeople: total?.assemblypeople ?? null,
        prelates: total?.prelates ?? null,
      }
    })
  }

  return output
}

export const EXPORT_SCHEMA_VERSION = 2

/**
 * Full state export: source-of-truth (country/provinces/config + per-province
 * calcs + regional totals) PLUS the scenario snapshot and a `computed` block
 * capturing everything the app derived for the current scenario (full election
 * results incl. political features, vote shares, seats, controls, diagnostics).
 *
 * The `computed` block is for inspection/portability — it is ignored on import
 * (derived data is recomputed deterministically from inputs + seeds).
 */
export function buildFullExportEnvelope(currentData, provinceCalcs, regionalTotals, electionSnapshot, computed = {}) {
  const civData = buildExportTemplate(currentData, provinceCalcs, regionalTotals)
  if (!civData) return null
  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    ...civData,
    election_state: electionSnapshot || null,
    computed: {
      election_results: computed.results || null,
      baseline_results: computed.baselineResults || null,
    },
  }
}

export function extractElectionState(template) {
  return template?.election_state || null
}
