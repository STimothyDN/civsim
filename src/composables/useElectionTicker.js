import { computed, ref } from 'vue'
import { usePollingStore } from '../stores/pollingStore'

/**
 * Shared composable for election ticker state management.
 *
 * Eliminates the duplicated ticker refs and `showElectionTicker` function
 * from each election page.
 *
 * @param {Object} options
 * @param {import('vue').ComputedRef} options.results
 *   Reactive reference to the election results.
 * @param {string} [options.defaultScope='national']
 *   Default scope for the ticker (overview, national, regional, provincial).
 * @param {string|null} [options.defaultTargetName=null]
 *   Default target name for the ticker.
 * @param {Array<import('vue').ComputedRef|import('vue').Ref>} [options.extraKeyParts=[]]
 *   Additional reactive values to include in the ticker cache key
 *   (e.g. selectedRegion name, selectedProvince index).
 */
export function useElectionTicker({
  results,
  defaultScope = 'national',
  defaultTargetName = null,
  extraKeyParts = [],
}) {
  const pollingStore = usePollingStore()
  const tickerRequestId = ref(0)
  const tickerScope = ref(defaultScope)
  const tickerTargetName = ref(defaultTargetName)

  /** Cache key that changes when election config or scope changes. */
  const tickerKey = computed(() => [
    results.value.config.trendPackageId,
    results.value.config.seed,
    results.value.config.jitterSeed,
    ...extraKeyParts.map((part) => (typeof part === 'object' && part !== null && 'value' in part ? part.value : part) ?? ''),
    pollingStore.pollSeed,
  ].join('|'))

  /**
   * Trigger a new ticker request.
   * @param {string} [scope]
   * @param {string|null} [targetName]
   */
  function showElectionTicker(scope = defaultScope, targetName = null) {
    tickerScope.value = scope
    tickerTargetName.value = targetName
    tickerRequestId.value += 1
  }

  return {
    showElectionTicker,
    tickerKey,
    tickerRequestId,
    tickerScope,
    tickerTargetName,
  }
}
