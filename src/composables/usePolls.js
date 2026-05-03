import { computed } from 'vue'
import { runPolls, pollingPromptPayload } from '../domain/elections/polling/runPolls'
import { useElectionResults } from './useElectionResults'
import { usePollingStore } from '../stores/pollingStore'

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
  const { baselineResults, results } = useElectionResults()

  const scopes = computed(() => runPolls({
    results: results.value,
    baselineResults: baselineResults.value,
    pollSeed: pollingStore.pollSeed,
  }))
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
