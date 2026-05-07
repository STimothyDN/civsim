import { deepClone } from '../utils/object'
import { defaultTemplate, normalizeIds, sortClosestProvinces } from '../utils/schema'
import { normalizePartyConfig } from './elections/constants/parties'

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
  delete normalized.election_state

  normalized.country = normalized.country || deepClone(defaultTemplate.country)
  normalized.provinces = Array.isArray(normalized.provinces) ? normalized.provinces : []
  normalized.province_groups = normalizeNameArray(normalized.province_groups)
  normalized.global_religions = normalizeNameArray(normalized.global_religions)
  normalized.election_parties = normalizePartyConfig(normalized.election_parties)

  stripCalculatedProvinceFields(normalized.provinces)
  normalizeIds(normalized)

  return normalized
}

export function buildExportTemplate(currentData, provinceCalcs, regionalTotals) {
  if (!currentData) return null

  const output = deepClone(currentData)
  output.election_parties = normalizePartyConfig(output.election_parties)
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

      if (province.is_founded && !province.is_joined && !province.is_conquered) {
        province.original_country = "Khmer Empire"
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

export function buildFullExportEnvelope(currentData, provinceCalcs, regionalTotals, electionSnapshot) {
  const civData = buildExportTemplate(currentData, provinceCalcs, regionalTotals)
  if (!civData) return null
  return { ...civData, election_state: electionSnapshot || null }
}

export function extractElectionState(template) {
  return template?.election_state || null
}
