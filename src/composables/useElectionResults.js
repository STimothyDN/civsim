import { computed, watch } from 'vue'
import { BASELINE_ELECTION_CONFIG, simulateElection } from '../domain/elections'
import { useElectionStore } from '../stores/electionStore'
import { useFormStore } from '../stores/formStore'
import { useCivilizationStore } from '../stores/civilizationStore'
import { generateAllScopeNames } from '../domain/elections/representativeNames'

export function useElectionResults() {
  const store = useFormStore()
  const civStore = useCivilizationStore()
  const electionStore = useElectionStore()

  const provinceRows = computed(() => civStore.provinceRows)
  const hasData = computed(() => provinceRows.value.length > 0)
  const results = computed(() => simulateElection({
    data: store.currentData,
    provinceRows: provinceRows.value,
    electionConfig: electionStore.electionConfig,
  }))
  const baselineResults = computed(() => simulateElection({
    data: store.currentData,
    provinceRows: provinceRows.value,
    electionConfig: BASELINE_ELECTION_CONFIG,
  }))
  const previousElectionResults = computed(() => {
    const config = electionStore.previousElectionConfig
    if (!config) return simulateElection({ data: store.currentData, provinceRows: provinceRows.value, electionConfig: BASELINE_ELECTION_CONFIG })
    return simulateElection({ data: store.currentData, provinceRows: provinceRows.value, electionConfig: config })
  })

  // Generate all representative names when results change
  watch(
    () => [results.value, hasData.value],
    ([resultsValue, hasDataValue]) => {
      if (!hasDataValue || !resultsValue?.provinces) return
      generateAllScopeNames(resultsValue, store, electionStore)
    },
    { immediate: true }
  )

  return {
    baselineResults,
    previousElectionResults,
    electionStore,
    hasData,
    partyMeta: computed(() => civStore.partyMeta),
    provinceRows,
    results,
    store,
  }
}
