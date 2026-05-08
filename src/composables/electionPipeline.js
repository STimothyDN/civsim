import { computed, effectScope } from 'vue'
import { getActivePinia } from 'pinia'
import {
  BASELINE_ELECTION_CONFIG,
  buildElectionConfig,
  buildProvinceFeatureUnit,
  buildProvinceResult,
  aggregateRegions,
  addRegionControls,
  calculateNational,
  validateResults,
  provinceNameKey,
} from '../domain/elections'
import { calcAssemblypeople, calcPrelates, calcProvincialPopulation } from '../utils/calculatedFields'
import { useFormStore } from '../stores/formStore'
import { useCivilizationStore } from '../stores/civilizationStore'
import { useElectionStore } from '../stores/electionStore'

// Dev instrumentation. Inspect via window.__electionPipelineStats in the
// browser preview to verify per-province granularity.
const stats = {
  buildResult: 0,
  buildUnit: 0,
  reset() { this.buildResult = 0; this.buildUnit = 0 },
}
if (typeof window !== 'undefined') window.__electionPipelineStats = stats

let singleton = null

function makeRowForProvince(province, index) {
  const provincialPopulation = calcProvincialPopulation(province?.population, index)
  return {
    index,
    name: province?.name || `Province ${index + 1}`,
    group: province?.group || 'Unassigned',
    population: province?.population,
    provincialPopulation,
    assemblypeople: calcAssemblypeople(province?.population),
    prelates: calcPrelates(provincialPopulation),
  }
}

function buildPipeline() {
  const pinia = getActivePinia()
  const scope = effectScope(true)
  const pipeline = scope.run(() => {
    const formStore = useFormStore()
    const civStore = useCivilizationStore()
    const electionStore = useElectionStore()

    const data = computed(() => formStore.currentData)
    const partyMeta = computed(() => civStore.partyMeta)
    const provinceCount = computed(() => data.value?.provinces?.length || 0)

    // Election configs — depend only on data.election_parties + the relevant
    // electionStore slice. Won't invalidate on per-county edits.
    const currentConfig = computed(() => buildElectionConfig(data.value, electionStore.electionConfig))
    const baselineConfig = computed(() => buildElectionConfig(data.value, BASELINE_ELECTION_CONFIG))
    const previousConfig = computed(() =>
      buildElectionConfig(data.value, electionStore.previousElectionConfig || BASELINE_ELECTION_CONFIG)
    )

    // Per-province feature units. Each is a stable computed scoped to its
    // own province's data via deep proxy tracking; created lazily on first
    // access and reused across re-evaluations.
    const featureUnitComputeds = []
    function ensureFeatureUnit(index) {
      if (!featureUnitComputeds[index]) {
        featureUnitComputeds[index] = computed(() => {
          const d = data.value
          const province = d?.provinces?.[index]
          if (!province) return null
          const row = makeRowForProvince(province, index)
          stats.buildUnit++
          return buildProvinceFeatureUnit(d, row)
        })
      }
      return featureUnitComputeds[index]
    }

    // Name → row index. Re-evaluates only when names/order/count change —
    // not on every county edit.
    const nameToIndex = computed(() => {
      const d = data.value
      const map = new Map()
      const provinces = d?.provinces || []
      for (let i = 0; i < provinces.length; i++) {
        const key = provinceNameKey(provinces[i]?.name)
        if (key) map.set(key, i)
      }
      return map
    })

    // Per-province result factory — one per (variant config, province index).
    function makeProvinceResultComputed(index, configRef) {
      return computed(() => {
        const d = data.value
        const province = d?.provinces?.[index]
        if (!province) return null
        const ownUnit = ensureFeatureUnit(index).value
        if (!ownUnit) return null

        const row = makeRowForProvince(province, index)
        const units = new Map()
        const ownKey = provinceNameKey(row.name || ownUnit.province.name)
        if (ownKey) units.set(ownKey, ownUnit)

        const closest = Array.isArray(ownUnit.province.closest_provinces)
          ? ownUnit.province.closest_provinces
          : []
        const idxMap = nameToIndex.value
        for (const entry of closest) {
          const key = provinceNameKey(entry?.province_name)
          if (!key || key === ownKey) continue
          const ni = idxMap.get(key)
          if (ni === undefined || ni === index) continue
          const neighborUnit = ensureFeatureUnit(ni).value
          if (neighborUnit) units.set(key, neighborUnit)
        }

        stats.buildResult++
        return buildProvinceResult(d, row, configRef.value, units)
      })
    }

    function makeVariant(configRef) {
      const cache = []
      const provinces = computed(() => {
        const count = provinceCount.value
        const out = []
        for (let i = 0; i < count; i++) {
          if (!cache[i]) cache[i] = makeProvinceResultComputed(i, configRef)
          const v = cache[i].value
          if (v) out.push(v)
        }
        if (cache.length > count) cache.length = count
        return out
      })
      const regions = computed(() =>
        addRegionControls(aggregateRegions(provinces.value), configRef.value.trends, configRef.value.partyNames)
      )
      const national = computed(() => calculateNational(provinces.value, configRef.value))
      const diagnostics = computed(() => {
        const v = validateResults(provinces.value, national.value)
        return {
          ...v,
          validation: Object.fromEntries(
            Object.entries(v.validation).map(([k, val]) => [k, Boolean(val)])
          ),
        }
      })
      return computed(() => ({
        config: configRef.value,
        parties: partyMeta.value,
        provinces: provinces.value,
        regions: regions.value,
        national: national.value,
        diagnostics: diagnostics.value,
      }))
    }

    const results = makeVariant(currentConfig)
    const baselineResults = makeVariant(baselineConfig)
    const previousElectionResults = makeVariant(previousConfig)
    const hasData = computed(() => provinceCount.value > 0)

    const provinceRows = computed(() => civStore.provinceRows)

    return {
      pinia,
      stop: () => scope.stop(),
      formStore,
      electionStore,
      data,
      partyMeta,
      provinceRows,
      hasData,
      results,
      baselineResults,
      previousElectionResults,
      stats,
    }
  })
  return pipeline
}

export function useElectionPipeline() {
  const activePinia = getActivePinia()
  if (!singleton || singleton.pinia !== activePinia) {
    singleton?.stop?.()
    singleton = buildPipeline()
  }
  return singleton
}
