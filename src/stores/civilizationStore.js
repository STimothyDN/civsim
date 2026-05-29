import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useFormStore } from './formStore'
import { buildProvinceComparisonRows, PROVINCE_YIELD_KEYS } from '../domain/provinceVisualizations'
import { toNumber } from '../domain/formatting'
import { partyColorsFromConfig, partyMetaFromConfig, partyNamesFromConfig } from '../domain/elections/constants/parties'

/**
 * Centralized store for all derived/calculated civilization data.
 *
 * This store subscribes to `formStore` and computes province rows,
 * regional summaries, yield totals, religion totals, and party metadata
 * exactly once. All downstream consumers (composables, pages, components)
 * read from this store instead of recomputing independently.
 *
 * formStore  ──▶  civilizationStore  ──▶  UI components
 *                                    ──▶  useBuilderOverview
 *                                    ──▶  useElectionResults
 *                                    ──▶  ProvinceDetails
 */
export const useCivilizationStore = defineStore('civilization', () => {
  const formStore = useFormStore()

  // ── Core Data ──

  /** Raw currentData passthrough for convenience. */
  const currentData = computed(() => formStore.currentData)

  /** Province calculation array from formStore (base calcs). */
  const provinceCalcs = computed(() => formStore.provinceCalcs)

  // ── Province Rows (single computation) ──

  /**
   * The single, canonical source for province comparison rows.
   * Previously computed independently in 4+ locations.
   */
  const provinceRows = computed(() =>
    buildProvinceComparisonRows(formStore.currentData, formStore.provinceCalcs)
  )

  const hasProvinceData = computed(() => provinceRows.value.length > 0)

  // ── Configured Groups ──

  const configuredGroups = computed(() => {
    return (formStore.currentData?.province_groups || [])
      .map((group) => {
        if (group && typeof group === 'object') return group.name
        return group
      })
      .map((name) => String(name || '').trim())
      .filter(Boolean)
  })

  // ── Yield Totals ──

  const yieldTotals = computed(() => {
    return PROVINCE_YIELD_KEYS.reduce((totals, key) => {
      totals[key] = provinceRows.value.reduce((sum, row) => sum + row.yields[key], 0)
      return totals
    }, {})
  })

  // ── Religion Totals ──

  const religionTotals = computed(() => {
    const totals = {}
    provinceRows.value.forEach((row) => {
      row.religions.forEach((religion) => {
        if (religion.followers <= 0) return
        totals[religion.name] = (totals[religion.name] || 0) + religion.followers
      })
    })
    return totals
  })

  // ── National Aggregate Totals ──

  const totalRawPopulation = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.population, 0)
  )

  const totalProvincialPopulation = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.provincialPopulation, 0)
  )

  const totalAssemblypeople = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.assemblypeople, 0)
  )

  const totalPrelates = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.prelates, 0)
  )

  const countyCount = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.countyCount, 0)
  )

  const countyDetailCount = computed(() =>
    provinceRows.value.reduce((sum, row) => sum + row.countyDetailCount, 0)
  )

  // ── Party Metadata ──

  // ── Config block (single source of truth for tunables) ──
  const config = computed(() => formStore.currentData?.config || {})
  const chambers = computed(() => config.value.chambers || {})
  const calculations = computed(() => config.value.calculations || {})
  const electionParams = computed(() => config.value.elections || {})
  const voterBlocs = computed(() => config.value.voterBlocs || [])

  const partyConfig = computed(() => formStore.currentData?.config?.parties)

  /** Ordered party list (array of party definitions) — the canonical source. */
  const parties = computed(() => partyConfig.value || [])

  /** Ordered party id list. */
  const partyIds = computed(() => parties.value.map((party) => party.id))

  const partyMeta = computed(() => partyMetaFromConfig(partyConfig.value))

  const partyNames = computed(() => partyNamesFromConfig(partyConfig.value))

  const partyColors = computed(() => partyColorsFromConfig(partyConfig.value))

  return {
    // Core data passthrough
    currentData,
    provinceCalcs,

    // Province rows (single computation)
    provinceRows,
    hasProvinceData,

    // Groups
    configuredGroups,

    // Aggregates
    yieldTotals,
    religionTotals,
    totalRawPopulation,
    totalProvincialPopulation,
    totalAssemblypeople,
    totalPrelates,
    countyCount,
    countyDetailCount,

    // Config
    config,
    chambers,
    calculations,
    electionParams,
    voterBlocs,

    // Party
    parties,
    partyIds,
    partyMeta,
    partyNames,
    partyColors,
  }
})
