import { computed } from 'vue'
import { runPolls, pollingPromptPayload } from '../domain/elections/polling/runPolls'
import { useElectionPipeline } from './electionPipeline'
import { useElectionResults } from './useElectionResults'
import { usePollingStore } from '../stores/pollingStore'

// One poll simulation shared by every consumer (polls card, breakdown modal,
// broadcast, ticker) instead of a separate runPolls pass per component.
let shared = null

function sharedPollScopes(pipeline, pollingStore) {
  if (!shared || shared.pipeline !== pipeline) {
    shared = {
      pipeline,
      scopes: pipeline.runInScope(() => computed(() => runPolls({
        results: pipeline.results.value,
        baselineResults: pipeline.baselineResults.value,
        pollSeed: pollingStore.pollSeed,
      }))),
    }
  }
  return shared.scopes
}

function findScope(scopes = [], scope = 'national', targetName = null) {
  if (scope === 'overview' || scope === 'national') {
    return scopes.find((entry) => entry.scope === 'national') || null
  }

  if (scope === 'regional') {
    return scopes.find((entry) => entry.scope === 'regional' && entry.scopeKey === targetName)
      || scopes.find((entry) => entry.scope === 'regional')
      || null
  }

  if (scope === 'provincial') {
    const target = String(targetName ?? '')
    return scopes.find((entry) => entry.scope === 'provincial' && entry.scopeKey === target)
      || scopes.find((entry) => entry.scope === 'provincial' && entry.scopeLabel === target)
      || scopes.find((entry) => entry.scope === 'provincial')
      || null
  }

  return scopes.find((entry) => entry.scope === 'national') || null
}

export function usePolls() {
  const pollingStore = usePollingStore()
  // Installs the shared representative-naming watcher (side effect).
  useElectionResults()
  const scopes = sharedPollScopes(useElectionPipeline(), pollingStore)
  const regionalScopes = computed(() => scopes.value.filter((scope) => scope.scope === 'regional'))
  const provincialScopes = computed(() => scopes.value.filter((scope) => scope.scope === 'provincial'))
  const currentScope = computed(() => {
    if (pollingStore.view === 'regional') {
      return findScope(scopes.value, 'regional', pollingStore.regionName)
    }
    if (pollingStore.view === 'provincial') {
      return findScope(scopes.value, 'provincial', String(pollingStore.provinceIndex))
    }
    return findScope(scopes.value, 'national')
  })

  function scopeFor(scope = 'national', targetName = null) {
    return findScope(scopes.value, scope, targetName)
  }

  function pollingPayloadFor(scope = 'national', targetName = null) {
    return pollingPromptPayload(scopeFor(scope, targetName))
  }

  return {
    currentScope,
    pollingPayloadFor,
    pollingStore,
    provincialScopes,
    regionalScopes,
    scopeFor,
    scopes,
  }
}
