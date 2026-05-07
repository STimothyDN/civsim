import { watch } from 'vue'
import { useElectionPipeline } from './electionPipeline'
import { generateAllScopeNames } from '../domain/elections/representativeNames'

let nameWatcherInstalled = false

export function useElectionResults() {
  const pipeline = useElectionPipeline()

  // Install the post-results name generation watch exactly once. The pipeline
  // is a singleton, so a single watcher serves every consumer.
  if (!nameWatcherInstalled) {
    nameWatcherInstalled = true
    watch(
      () => [pipeline.results.value, pipeline.hasData.value],
      ([resultsValue, hasDataValue]) => {
        if (!hasDataValue || !resultsValue?.provinces) return
        generateAllScopeNames(resultsValue, pipeline.formStore, pipeline.electionStore)
      },
      { immediate: true }
    )
  }

  return {
    baselineResults: pipeline.baselineResults,
    previousElectionResults: pipeline.previousElectionResults,
    electionStore: pipeline.electionStore,
    hasData: pipeline.hasData,
    partyMeta: pipeline.partyMeta,
    provinceRows: pipeline.provinceRows,
    results: pipeline.results,
    store: pipeline.formStore,
  }
}
