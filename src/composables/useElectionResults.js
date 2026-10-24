import { watch } from 'vue'
import { useElectionPipeline } from './electionPipeline'
import { generateAllScopeNames } from '../domain/elections/representativeNames'

export function useElectionResults() {
  const pipeline = useElectionPipeline()

  // Install the post-results name generation watch exactly once per pipeline,
  // inside the pipeline's own effect scope: a single watcher serves every
  // consumer, and it outlives whichever component happened to ask first.
  if (!pipeline.nameWatcherInstalled) {
    pipeline.nameWatcherInstalled = true
    pipeline.runInScope(() => {
      watch(
        () => [pipeline.results.value, pipeline.hasData.value],
        ([resultsValue, hasDataValue]) => {
          if (!hasDataValue || !resultsValue?.provinces) return
          generateAllScopeNames(resultsValue, pipeline.formStore, pipeline.electionStore)
        },
        { immediate: true }
      )
      // Regenerate names when the naming config changes (it is not part of the
      // election results pipeline, so it needs its own trigger).
      watch(
        () => pipeline.formStore.currentData?.config?.naming,
        () => {
          const resultsValue = pipeline.results.value
          if (!pipeline.hasData.value || !resultsValue?.provinces) return
          generateAllScopeNames(resultsValue, pipeline.formStore, pipeline.electionStore)
        },
        { deep: true }
      )
    })
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
