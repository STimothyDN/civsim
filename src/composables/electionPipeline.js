import { computed, effectScope } from 'vue'
import { getActivePinia } from 'pinia'
import {
  BASELINE_ELECTION_CONFIG,
  buildElectionConfig,
  buildFeatureContext,
  buildProvinceFeatureUnitFor,
  buildProvinceResultFor,
  calculateScoreNorms,
  sameScoreNorms,
  aggregateRegions,
  addRegionControls,
  calculateNational,
  validateResults,
  provinceNameKey,
} from '../domain/elections'
import { calcAssemblypeople, calcPrelates, calcProvincialPopulation } from '../utils/calculatedFields'
import { plainClone } from '../utils/object'
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

function makeRowForProvince(province, index, calculations) {
  const provincialPopulation = calcProvincialPopulation(province?.population, index, calculations)
  return {
    index,
    name: province?.name || `Province ${index + 1}`,
    group: province?.group || 'Unassigned',
    population: province?.population,
    provincialPopulation,
    assemblypeople: calcAssemblypeople(province?.population),
    prelates: calcPrelates(provincialPopulation, calculations),
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

    // The engine runs on plain snapshots rather than reactive proxies: each
    // snapshot computed deep-reads (and so tracks) exactly its slice of state
    // once, then the hot scoring loops touch plain objects only. Reading
    // trends/voter blocs through proxies per county made a climate change ~7x
    // slower than the raw engine.

    // Only the config slices buildElectionConfig reads — naming/chamber edits
    // must not invalidate every province result.
    const engineConfigData = computed(() => {
      const d = data.value
      const config = d?.config
      return {
        election_parties: plainClone(d?.election_parties),
        config: config
          ? {
            parties: plainClone(config.parties),
            voterBlocs: plainClone(config.voterBlocs),
            elections: plainClone(config.elections),
            structure: plainClone(config.structure),
            calculations: plainClone(config.calculations),
          }
          : undefined,
      }
    })

    // Election configs — depend only on the engine config slices + the relevant
    // electionStore slice. Won't invalidate on per-county edits.
    const currentConfig = computed(() =>
      buildElectionConfig(engineConfigData.value, plainClone(electionStore.electionConfig))
    )
    const baselineConfig = computed(() => buildElectionConfig(engineConfigData.value, BASELINE_ELECTION_CONFIG))
    const previousConfig = computed(() =>
      buildElectionConfig(
        engineConfigData.value,
        plainClone(electionStore.previousElectionConfig || BASELINE_ELECTION_CONFIG)
      )
    )

    // Empire-wide feature inputs (country, calculation knobs, capital
    // continent, religion totals), computed once instead of once per province.
    const featureContext = computed(() => {
      const d = data.value
      return plainClone(buildFeatureContext(d || {}))
    })

    // Per-province plain snapshots, tracking only that province's data.
    const provinceSnapshots = []
    function ensureProvinceSnapshot(index) {
      if (!provinceSnapshots[index]) {
        provinceSnapshots[index] = computed(() => plainClone(data.value?.provinces?.[index]))
      }
      return provinceSnapshots[index]
    }

    // Per-province feature units. Each is a stable computed scoped to its
    // own province's snapshot; created lazily on first access and reused
    // across re-evaluations.
    const featureUnitComputeds = []
    function ensureFeatureUnit(index) {
      if (!featureUnitComputeds[index]) {
        featureUnitComputeds[index] = computed(() => {
          const province = ensureProvinceSnapshot(index).value
          if (!province) return null
          const context = featureContext.value
          const row = makeRowForProvince(province, index, context.calculations)
          stats.buildUnit++
          return buildProvinceFeatureUnitFor(province, row, context)
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
        const province = ensureProvinceSnapshot(index).value
        if (!province) return null
        const ownUnit = ensureFeatureUnit(index).value
        if (!ownUnit) return null

        const context = featureContext.value
        const row = makeRowForProvince(province, index, context.calculations)
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
        return buildProvinceResultFor(province, row, configRef.value, units, context)
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
        configRef.value.structure?.hasRegionTier
          ? addRegionControls(
            aggregateRegions(provinces.value, configRef.value.partyList),
            configRef.value.trends,
            configRef.value.partyNames,
            configRef.value.coalitionPartners
          )
          : {}
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

    // Each party's typical score per level across the world, which vote
    // decisiveness sharpens against. The engine rounds it, and the same object
    // is returned while the rounded values hold, so an ordinary edit still
    // recomputes only the edited province.
    let lastScoreNorms = null
    const scoreNorms = computed(() => {
      const units = []
      for (let i = 0; i < provinceCount.value; i++) {
        const unit = ensureFeatureUnit(i).value
        if (unit) units.push(unit)
      }
      const next = calculateScoreNorms(units, currentConfig.value)
      if (sameScoreNorms(lastScoreNorms, next)) return lastScoreNorms
      lastScoreNorms = next
      return next
    })
    const withScoreNorms = (configRef) => computed(() => ({ ...configRef.value, scoreNorms: scoreNorms.value }))

    const results = makeVariant(withScoreNorms(currentConfig))
    const baselineResults = makeVariant(withScoreNorms(baselineConfig))
    const previousElectionResults = makeVariant(withScoreNorms(previousConfig))
    const hasData = computed(() => provinceCount.value > 0)

    const provinceRows = computed(() => civStore.provinceRows)

    return {
      pinia,
      stop: () => scope.stop(),
      // Lets derived singletons (e.g. shared poll scopes) live as long as the
      // pipeline instead of the component that first asked for them.
      runInScope: (fn) => scope.run(fn),
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
