import { watch } from 'vue'
import { requestElectionTicker } from '../domain/elections/narrativePlanner'
import { tickerLlmStatus } from '../components/elections/llmStatusCopy'
import { useElectionResults } from './useElectionResults'
import { usePolls } from './usePolls'
import { useUiStore } from '../stores/uiStore'

/**
 * Drives the global election ticker (rendered by AppTicker).
 *
 * Instantiated exactly once at the app shell (App.vue). It watches the
 * `uiStore.electionTicker.request` counter — bumped by the Election Ticker
 * button anywhere in the app — and, when it changes, calls the LLM with the
 * current election data for the requested scope. Resulting headlines are pushed
 * into the store, where they "load in" on top of the existing ticker rather than
 * replacing it.
 *
 * Living at the shell level (where the election data composables are valid)
 * means the button no longer needs to reach the generator through orphaned
 * component events — it just bumps a store counter.
 */
export function useGlobalElectionTicker() {
  const { baselineResults, previousElectionResults, results, electionStore, hasData } = useElectionResults()
  const { pollingPayloadFor } = usePolls()
  const uiStore = useUiStore()

  let activeToken = 0

  async function generate(scope, targetName) {
    if (!hasData.value || !results.value?.provinces?.length) {
      uiStore.showToast('Run an election before requesting the ticker.', 'error')
      return
    }

    const token = ++activeToken
    uiStore.setElectionTickerLoading(true)
    uiStore.setElectionTickerStatus(null)

    try {
      const items = await requestElectionTicker({
        results: results.value,
        baselineResults: electionStore.electionNumber > 0
          ? previousElectionResults.value
          : baselineResults.value,
        scope,
        targetName,
        polling: pollingPayloadFor(scope, targetName),
        representativeNames: electionStore.representativeNames,
        electionNumber: electionStore.electionNumber,
        onStatus: (status) => {
          if (token !== activeToken) return
          uiStore.setElectionTickerStatus(tickerLlmStatus(status))
        },
      })
      if (token !== activeToken) return
      uiStore.addElectionTickerItems(items)
    } catch (error) {
      if (token !== activeToken) return
      uiStore.showToast(error.message || 'Election ticker could not be generated.', 'error')
    } finally {
      if (token === activeToken) {
        uiStore.setElectionTickerLoading(false)
        uiStore.setElectionTickerStatus(null)
      }
    }
  }

  watch(
    () => uiStore.electionTicker.request,
    (request) => {
      if (!request) return
      generate(uiStore.electionTicker.scope, uiStore.electionTicker.targetName)
    }
  )
}
