import { computed } from 'vue'
import { BASELINE_ELECTION_CONFIG, simulateElection } from '../domain/elections'
import { buildProvinceComparisonRows } from '../domain/provinceVisualizations'
import { useElectionStore } from '../stores/electionStore'
import { useFormStore } from '../stores/formStore'

export function useElectionResults() {
  const store = useFormStore()
  const electionStore = useElectionStore()

  const provinceRows = computed(() => buildProvinceComparisonRows(store.currentData, store.provinceCalcs))
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

  return {
    baselineResults,
    electionStore,
    hasData,
    provinceRows,
    results,
    store,
  }
}
